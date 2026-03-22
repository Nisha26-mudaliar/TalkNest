import { useEffect, useRef } from "react";
import {
  Mic, MicOff, Video, VideoOff,
  Monitor, MonitorOff, PhoneOff
} from "lucide-react";
import { useVideoCallStore } from "../store/useVideoCallStore";

function VideoCallModal() {
  const {
    localStream,
    remoteStream,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    receiver,
    caller,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    endCall,
  } = useVideoCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const otherPersonName = receiver?.name || caller?.name || "User";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">

      {/* ===== VIDEO AREA ===== */}
      <div className="flex-1 relative">

        {/* Remote video (full screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Remote name overlay */}
        <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {otherPersonName}
        </div>

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-24 right-4 w-36 h-48 rounded-xl overflow-hidden border-2 border-slate-600 shadow-xl">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!isCameraOn && (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-slate-400" />
            </div>
          )}
          <div className="absolute bottom-1 left-0 right-0 text-center text-white text-xs bg-black/40">
            You
          </div>
        </div>
      </div>

      {/* ===== CONTROLS ===== */}
      <div className="h-24 bg-slate-900/90 backdrop-blur flex items-center justify-center gap-6">

        {/* Mic toggle */}
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isMicOn
              ? "bg-slate-700 hover:bg-slate-600"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {isMicOn
            ? <Mic className="w-5 h-5 text-white" />
            : <MicOff className="w-5 h-5 text-white" />
          }
        </button>

        {/* Camera toggle */}
        <button
          onClick={toggleCamera}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isCameraOn
              ? "bg-slate-700 hover:bg-slate-600"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {isCameraOn
            ? <Video className="w-5 h-5 text-white" />
            : <VideoOff className="w-5 h-5 text-white" />
          }
        </button>

        {/* Screen share toggle */}
        <button
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isScreenSharing
              ? "bg-cyan-600 hover:bg-cyan-700"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          {isScreenSharing
            ? <MonitorOff className="w-5 h-5 text-white" />
            : <Monitor className="w-5 h-5 text-white" />
          }
        </button>

        {/* End call */}
        <button
          onClick={endCall}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>

      </div>
    </div>
  );
}

export default VideoCallModal;