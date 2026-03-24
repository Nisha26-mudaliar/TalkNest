import { useState } from "react";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

function MessageReactions({ msgId, reactions = [], isMyMessage, onReact }) {
  const [showBar, setShowBar] = useState(false);

  // Group reactions: { "❤️": 2, "👍": 1 }
  const grouped = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowBar(true)}
      onMouseLeave={() => setShowBar(false)}
    >
      {/* Quick reaction bar — appears on hover */}
      {showBar && (
        <div
          className={`absolute -top-10 ${isMyMessage ? "right-0" : "left-0"} 
            flex gap-1 bg-slate-800 border border-slate-700 rounded-full px-2 py-1 shadow-xl z-50`}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(msgId, emoji);
                setShowBar(false);
              }}
              className="text-base hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Floating reactions below bubble */}
      {Object.keys(grouped).length > 0 && (
        <div
          className={`flex flex-wrap gap-1 mt-1 ${
            isMyMessage ? "justify-end" : "justify-start"
          }`}
        >
          {Object.entries(grouped).map(([emoji, count]) => (
            <span
              key={emoji}
              onClick={() => onReact(msgId, emoji)}
              className="cursor-pointer bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5 text-sm flex items-center gap-1 hover:border-cyan-500 transition-colors"
            >
              {emoji}
              {count > 1 && (
                <span className="text-xs text-slate-400">{count}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default MessageReactions;