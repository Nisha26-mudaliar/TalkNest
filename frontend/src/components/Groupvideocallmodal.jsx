import { useEffect, useRef } from "react";
import {
  Mic, MicOff, Video, VideoOff,
  Monitor, MonitorOff, PhoneOff
} from "lucide-react";
import { useGroupCallStore } from "../store/useGroupCallStore";
import { useAuthStore } from "../store/useAuthStore";

// Single video tile for one participant
function VideoTile({ stream, name, muted = false, isCameraOn = true }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-800 aspect-video flex items-center justify-center">
      {stream && isCameraOn !== false ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-white text-2xl font-bold">
            {name?.charAt(0)?.toUpperCase()}
          </div>
          <VideoOff className="w-5 h-5 text-slate-500" />
        </div>
      )}
      {/* Name badge */}
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
        {name}
      </div>
    </div>
  );
}

function GroupVideoCallModal() {
  const {
    localStream,
    peers,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    groupCallInfo,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    endGroupCall,
  } = useGroupCallStore();

  const { authUser } = useAuthStore();

  // All tiles: local + all remote peers
  const peerList = Object.values(peers);
  const totalTiles = 1 + peerList.length; // +1 for local

  // Grid columns: 1 person = 1col, 2 = 2col, 3-4 = 2col, 5+ = 3col
  const gridCols =
    totalTiles === 1 ? "grid-cols-1" :
    totalTiles <= 4  ? "grid-cols-2" :
                       "grid-cols-3";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">

      {/* ===== HEADER ===== */}
      <div className="h-14 flex items-center justify-between px-6 bg-slate-900/80 border-b border-slate-700/50">
        <div>
          <p className="text-white font-medium">{groupCallInfo?.groupName}</p>
          <p className="text-slate-400 text-xs">{totalTiles} participant{totalTiles !== 1 ? "s" : ""}</p>
        </div>
        {/* Recording dot */}
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </div>
      </div>

      {/* ===== VIDEO GRID ===== */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className={`grid ${gridCols} gap-3 h-full`}>

          {/* Local tile */}
          <VideoTile
            stream={localStream}
            name="You"
            muted={true}
            isCameraOn={isCameraOn}
          />

          {/* Remote peer tiles */}
          {peerList.map((peer) => (
            <VideoTile
              key={peer.peerId}
              stream={peer.stream}
              name={peer.name}
              muted={false}
              isCameraOn={true}
            />
          ))}
        </div>
      </div>

      {/* ===== CONTROLS ===== */}
      <div className="h-24 bg-slate-900/90 backdrop-blur flex items-center justify-center gap-6 border-t border-slate-700/50">

        {/* Mic */}
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isMicOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-500 hover:bg-red-600"
          }`}
          title={isMicOn ? "Mute mic" : "Unmute mic"}
        >
          {isMicOn
            ? <Mic className="w-5 h-5 text-white" />
            : <MicOff className="w-5 h-5 text-white" />}
        </button>

        {/* Camera */}
        <button
          onClick={toggleCamera}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isCameraOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-500 hover:bg-red-600"
          }`}
          title={isCameraOn ? "Turn off camera" : "Turn on camera"}
        >
          {isCameraOn
            ? <Video className="w-5 h-5 text-white" />
            : <VideoOff className="w-5 h-5 text-white" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isScreenSharing ? "bg-cyan-600 hover:bg-cyan-700" : "bg-slate-700 hover:bg-slate-600"
          }`}
          title={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          {isScreenSharing
            ? <MonitorOff className="w-5 h-5 text-white" />
            : <Monitor className="w-5 h-5 text-white" />}
        </button>

        {/* End Call */}
        <button
          onClick={endGroupCall}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
          title="Leave call"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>

      </div>
    </div>
  );
}

export default GroupVideoCallModal;