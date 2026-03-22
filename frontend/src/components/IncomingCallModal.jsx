import { Phone, PhoneOff } from "lucide-react";
import { useVideoCallStore } from "../store/useVideoCallStore";

function IncomingCallModal() {
  const { caller, acceptCall, rejectCall } = useVideoCallStore();

  if (!caller) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl p-8 w-80 shadow-2xl flex flex-col items-center gap-6">

        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-cyan-600 flex items-center justify-center text-white text-3xl font-bold animate-pulse">
          {caller.name?.charAt(0).toUpperCase()}
        </div>

        {/* Name */}
        <div className="text-center">
          <p className="text-slate-400 text-sm mb-1">Incoming video call</p>
          <h3 className="text-white text-xl font-bold">{caller.name}</h3>
        </div>

        {/* Buttons */}
        <div className="flex gap-8">
          {/* Reject */}
          <button
            onClick={rejectCall}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>

          {/* Accept */}
          <button
            onClick={acceptCall}
            className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors"
          >
            <Phone className="w-6 h-6 text-white" />
          </button>
        </div>

        <p className="text-slate-500 text-xs">Tap to accept or decline</p>
      </div>
    </div>
  );
}

export default IncomingCallModal;