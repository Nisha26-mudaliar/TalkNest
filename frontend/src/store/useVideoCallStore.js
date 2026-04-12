import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";

export const useVideoCallStore = create((set, get) => ({
  // ========== STATE ==========
  localStream: null,
  remoteStream: null,
  peerConnection: null,

  isCalling: false,        // I am calling someone
  isReceivingCall: false,  // someone is calling me
  callAccepted: false,     // call is active

  caller: null,            // { id, name } of the person calling me
  receiver: null,          // { id, name } of the person I am calling

  incomingOffer: null,     // WebRTC offer from caller

  isMicOn: true,
  isCameraOn: true,
  isScreenSharing: false,

  screenStream: null,

  // ========== ICE CONFIG ==========
  iceServers: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  },

  // ========== HELPER: Get media stream with fallbacks ==========
  getMediaStream: async () => {
    // 1. Try video + audio
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      console.warn("Camera + mic denied or unavailable, trying audio only:", err);
    }

    // 2. Try audio only
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      // Mark camera as off since we couldn't get it
      set({ isCameraOn: false });
      return audioStream;
    } catch (err) {
      console.warn("Audio also denied or unavailable, using empty stream:", err);
    }

    // 3. Fallback: silent empty stream so the call still connects
    set({ isCameraOn: false, isMicOn: false });
    return new MediaStream();
  },

  // ========== START CALL (Caller side) ==========
  startCall: async (receiverUser) => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;

    // Get local camera + mic (with graceful fallback)
    const stream = await get().getMediaStream();

    const pc = new RTCPeerConnection(get().iceServers);

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // When remote stream arrives
    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      set({ remoteStream });
    };

    // Send ICE candidates to receiver
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("iceCandidate", {
          to: receiverUser._id,
          candidate: event.candidate,
        });
      }
    };

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send call to receiver
    socket.emit("callUser", {
      to: receiverUser._id,
      offer,
      callerName: authUser.fullName,
    });

    set({
      localStream: stream,
      remoteStream,
      peerConnection: pc,
      isCalling: true,
      receiver: { id: receiverUser._id, name: receiverUser.fullName },
    });
  },

  // ========== ACCEPT CALL (Receiver side) ==========
  acceptCall: async () => {
    const socket = useAuthStore.getState().socket;
    const { caller, incomingOffer } = get();

    // Get local camera + mic (with graceful fallback)
    const stream = await get().getMediaStream();

    const pc = new RTCPeerConnection(get().iceServers);

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      set({ remoteStream });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("iceCandidate", {
          to: caller.id,
          candidate: event.candidate,
        });
      }
    };

    // Set remote description from caller's offer
    await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));

    // Create answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Send answer back to caller
    socket.emit("answerCall", {
      to: caller.id,
      answer,
    });

    set({
      localStream: stream,
      remoteStream,
      peerConnection: pc,
      callAccepted: true,
      isReceivingCall: false,
    });
  },

  // ========== REJECT CALL ==========
  rejectCall: () => {
    const socket = useAuthStore.getState().socket;
    const { caller } = get();

    socket.emit("rejectCall", { to: caller.id });

    set({
      isReceivingCall: false,
      caller: null,
      incomingOffer: null,
    });
  },

  // ========== END CALL ==========
  endCall: () => {
    const socket = useAuthStore.getState().socket;
    const { peerConnection, localStream, screenStream, receiver, caller } = get();

    const otherUserId = receiver?.id || caller?.id;

    if (otherUserId) {
      socket.emit("endCall", { to: otherUserId });
    }

    // Stop all tracks
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    peerConnection?.close();

    set({
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      isCalling: false,
      isReceivingCall: false,
      callAccepted: false,
      caller: null,
      receiver: null,
      incomingOffer: null,
      isMicOn: true,
      isCameraOn: true,
      isScreenSharing: false,
      screenStream: null,
    });
  },

  // ========== TOGGLE MIC ==========
  toggleMic: () => {
    const { localStream, isMicOn } = get();
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !isMicOn;
    });
    set({ isMicOn: !isMicOn });
  },

  // ========== TOGGLE CAMERA ==========
  toggleCamera: () => {
    const { localStream, isCameraOn } = get();
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !isCameraOn;
    });
    set({ isCameraOn: !isCameraOn });
  },

  // ========== SCREEN SHARE ==========
  startScreenShare: async () => {
    const { peerConnection, localStream } = get();

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });

    const screenTrack = screenStream.getVideoTracks()[0];

    // Replace camera track with screen track in peer connection
    const sender = peerConnection
      ?.getSenders()
      .find((s) => s.track?.kind === "video");

    if (sender) {
      sender.replaceTrack(screenTrack);
    }

    // When user stops screen share from browser UI
    screenTrack.onended = () => {
      get().stopScreenShare();
    };

    set({ isScreenSharing: true, screenStream });
  },

  stopScreenShare: async () => {
    const { peerConnection, localStream, screenStream } = get();

    screenStream?.getTracks().forEach((t) => t.stop());

    // Switch back to camera
    const cameraTrack = localStream?.getVideoTracks()[0];
    const sender = peerConnection
      ?.getSenders()
      .find((s) => s.track?.kind === "video");

    if (sender && cameraTrack) {
      sender.replaceTrack(cameraTrack);
    }

    set({ isScreenSharing: false, screenStream: null });
  },

  // ========== SOCKET LISTENERS ==========
  subscribeToCallEvents: () => {
    const socket = useAuthStore.getState().socket;

    // Incoming call
    socket.on("incomingCall", ({ from, callerName, offer }) => {
      set({
        isReceivingCall: true,
        caller: { id: from, name: callerName },
        incomingOffer: offer,
      });
    });

    // Call answered — caller sets remote description
    socket.on("callAnswered", async ({ answer }) => {
      const { peerConnection } = get();
      await peerConnection?.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      set({ callAccepted: true, isCalling: false });
    });

    // ICE candidate received
    socket.on("iceCandidate", async ({ candidate }) => {
      const { peerConnection } = get();
      try {
        await peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("ICE error:", e);
      }
    });

    // Call ended by other side
    socket.on("callEnded", () => {
      get().endCall();
    });

    // Call rejected by receiver
    socket.on("callRejected", () => {
      get().endCall();
    });
  },

  unsubscribeFromCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("incomingCall");
    socket.off("callAnswered");
    socket.off("iceCandidate");
    socket.off("callEnded");
    socket.off("callRejected");
  },
}));