import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";

// ICE servers (STUN only)
const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useGroupCallStore = create((set, get) => ({
  // ========== STATE ==========
  isInGroupCall: false,
  isGroupCallRinging: false,
  groupCallInfo: null, // { groupId, groupName, startedBy, startedByName }

  localStream: null,
  screenStream: null,

  // Map of peerId → { pc, stream, name, peerId }
  peers: {},

  isMicOn: true,
  isCameraOn: true,
  isScreenSharing: false,

  // ========== START GROUP CALL (initiator) ==========
  startGroupCall: async (group) => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      set({
        localStream: stream,
        isInGroupCall: true,
        isGroupCallRinging: false,
        groupCallInfo: {
          groupId: group._id,
          groupName: group.name,
          startedBy: authUser._id,
          startedByName: authUser.fullName,
        },
        peers: {},
        isMicOn: true,
        isCameraOn: true,
        isScreenSharing: false,
      });

      socket.emit("startGroupCall", {
        groupId: group._id,
        groupName: group.name,
        startedByName: authUser.fullName,
      });
    } catch (err) {
      console.error("startGroupCall error:", err);
    }
  },

  // ========== JOIN GROUP CALL (joiner side) ==========
  joinGroupCall: async () => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    const { groupCallInfo } = get();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      set({
        localStream: stream,
        isInGroupCall: true,
        isGroupCallRinging: false,
        peers: {},
        isMicOn: true,
        isCameraOn: true,
        isScreenSharing: false,
      });

      socket.emit("joinGroupCall", {
        groupId: groupCallInfo.groupId,
        joinerName: authUser.fullName,
      });
    } catch (err) {
      console.error("joinGroupCall error:", err);
    }
  },

  // ========== DECLINE CALL ==========
  declineGroupCall: () => {
    set({ isGroupCallRinging: false, groupCallInfo: null });
  },

  // ========== CREATE PEER CONNECTION ==========
  createPeerConnection: async (peerId, peerName, isInitiator) => {
    const socket = useAuthStore.getState().socket;
    const { localStream, peers, groupCallInfo } = get();

    if (peers[peerId]) return;

    const pc = new RTCPeerConnection(ICE_CONFIG);

    localStream?.getTracks().forEach((track) => pc.addTrack(track, localStream));

    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
      set((state) => ({
        peers: {
          ...state.peers,
          [peerId]: { ...state.peers[peerId], stream: remoteStream },
        },
      }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("groupCallIce", {
          to: peerId,
          candidate: event.candidate,
          groupId: groupCallInfo?.groupId,
        });
      }
    };

    // ✅ Handle connection state changes for better reliability
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        get().removePeer(peerId);
      }
    };

    set((state) => ({
      peers: {
        ...state.peers,
        [peerId]: { pc, stream: remoteStream, name: peerName, peerId },
      },
    }));

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("groupCallOffer", {
        to: peerId,
        offer,
        groupId: groupCallInfo?.groupId,
      });
    }

    return pc;
  },

  // ========== HANDLE INCOMING OFFER ==========
  handleOffer: async (fromId, fromName, offer) => {
    const socket = useAuthStore.getState().socket;
    const { groupCallInfo } = get();

    const pc = await get().createPeerConnection(fromId, fromName, false);
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("groupCallAnswer", {
      to: fromId,
      answer,
      groupId: groupCallInfo?.groupId,
    });
  },

  // ========== HANDLE INCOMING ANSWER ==========
  handleAnswer: async (fromId, answer) => {
    const { peers } = get();
    const peer = peers[fromId];
    if (peer?.pc) {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  },

  // ========== HANDLE ICE CANDIDATE ==========
  handleIceCandidate: async (fromId, candidate) => {
    const { peers } = get();
    const peer = peers[fromId];
    if (peer?.pc) {
      try {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("ICE error:", e);
      }
    }
  },

  // ========== REMOVE A PEER ==========
  removePeer: (peerId) => {
    const { peers } = get();
    if (peers[peerId]) {
      peers[peerId].pc?.close();
      const updated = { ...peers };
      delete updated[peerId];
      set({ peers: updated });
    }
  },

  // ========== END CALL ==========
  endGroupCall: () => {
    const socket = useAuthStore.getState().socket;
    const { localStream, screenStream, peers, groupCallInfo } = get();

    if (groupCallInfo?.groupId) {
      socket.emit("leaveGroupCall", { groupId: groupCallInfo.groupId });
    }

    Object.values(peers).forEach(({ pc }) => pc?.close());
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());

    set({
      isInGroupCall: false,
      isGroupCallRinging: false,
      groupCallInfo: null,
      localStream: null,
      screenStream: null,
      peers: {},
      isMicOn: true,
      isCameraOn: true,
      isScreenSharing: false,
    });
  },

  // ========== TOGGLE MIC ==========
  toggleMic: () => {
    const { localStream, isMicOn } = get();
    localStream?.getAudioTracks().forEach((t) => (t.enabled = !isMicOn));
    set({ isMicOn: !isMicOn });
  },

  // ========== TOGGLE CAMERA ==========
  toggleCamera: () => {
    const { localStream, isCameraOn } = get();
    localStream?.getVideoTracks().forEach((t) => (t.enabled = !isCameraOn));
    set({ isCameraOn: !isCameraOn });
  },

  // ========== SCREEN SHARE ==========
  startScreenShare: async () => {
    const { peers, localStream } = get();
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      Object.values(peers).forEach(({ pc }) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });

      screenTrack.onended = () => get().stopScreenShare();
      set({ isScreenSharing: true, screenStream });
    } catch (err) {
      console.error("Screen share error:", err);
    }
  },

  stopScreenShare: async () => {
    const { peers, localStream, screenStream } = get();
    screenStream?.getTracks().forEach((t) => t.stop());

    const cameraTrack = localStream?.getVideoTracks()[0];
    Object.values(peers).forEach(({ pc }) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender && cameraTrack) sender.replaceTrack(cameraTrack);
    });

    set({ isScreenSharing: false, screenStream: null });
  },

  // ========== SOCKET LISTENERS ==========
  subscribeToGroupCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return; // ✅ guard: don't crash if socket not ready

    // ✅ Remove old listeners first to prevent duplicates on re-subscribe
    socket.off("incomingGroupCall");
    socket.off("groupCallNewJoiner");
    socket.off("groupCallOffer");
    socket.off("groupCallAnswer");
    socket.off("groupCallIce");
    socket.off("groupCallParticipantLeft");
    socket.off("groupCallEnded");

    socket.on("incomingGroupCall", ({ groupId, groupName, startedBy, startedByName }) => {
      const { isInGroupCall } = get();
      if (isInGroupCall) return; // already in a call, ignore
      set({
        isGroupCallRinging: true,
        groupCallInfo: { groupId, groupName, startedBy, startedByName },
      });
    });

    socket.on("groupCallNewJoiner", ({ joinerId, joinerName }) => {
      const { isInGroupCall } = get();
      if (!isInGroupCall) return;
      get().createPeerConnection(joinerId, joinerName, true);
    });

    socket.on("groupCallOffer", ({ from, fromName, offer }) => {
      get().handleOffer(from, fromName, offer);
    });

    socket.on("groupCallAnswer", ({ from, answer }) => {
      get().handleAnswer(from, answer);
    });

    socket.on("groupCallIce", ({ from, candidate }) => {
      get().handleIceCandidate(from, candidate);
    });

    socket.on("groupCallParticipantLeft", ({ userId }) => {
      get().removePeer(userId);
    });

    socket.on("groupCallEnded", () => {
      get().endGroupCall();
    });
  },

  unsubscribeFromGroupCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("incomingGroupCall");
    socket.off("groupCallNewJoiner");
    socket.off("groupCallOffer");
    socket.off("groupCallAnswer");
    socket.off("groupCallIce");
    socket.off("groupCallParticipantLeft");
    socket.off("groupCallEnded");
  },
}));