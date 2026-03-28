import { Phone, PhoneOff, Users } from "lucide-react";
import { useGroupCallStore } from "../store/useGroupCallStore";

function IncomingGroupCallModal() {
  const { isGroupCallRinging, groupCallInfo, joinGroupCall, declineGroupCall } =
    useGroupCallStore();

  if (!isGroupCallRinging || !groupCallInfo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl p-8 w-80 shadow-2xl flex flex-col items-center gap-6">

        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center animate-pulse">
          <Users className="w-9 h-9 text-white" />
        </div>

        {/* Info */}
        <div className="text-center">
          <p className="text-slate-400 text-sm mb-1">Incoming group video call</p>
          <h3 className="text-white text-xl font-bold">{groupCallInfo.groupName}</h3>
          <p className="text-slate-400 text-sm mt-1">
            Started by <span className="text-slate-200">{groupCallInfo.startedByName}</span>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-8">
          {/* Decline */}
          <button
            onClick={declineGroupCall}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
            title="Decline"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>

          {/* Join */}
          <button
            onClick={joinGroupCall}
            className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors"
            title="Join call"
          >
            <Phone className="w-6 h-6 text-white" />
          </button>
        </div>

        <p className="text-slate-500 text-xs">Tap to join or decline</p>
      </div>
    </div>
  );
}

export default IncomingGroupCallModal;