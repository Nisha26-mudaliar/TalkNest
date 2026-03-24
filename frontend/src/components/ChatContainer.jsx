import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useTheme } from "../context/ThemeContext";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageReactions from "./Messagereactions";
import { format } from "date-fns";
import { FileIcon, DownloadIcon, Trash2Icon, Check, CheckCheck } from "lucide-react";

// Animation keyframes injected once
const MSG_ANIMATION = `
  @keyframes msgSlideIn {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
  }
  .msg-animate {
    animation: msgSlideIn 0.28s cubic-bezier(0.34, 1.1, 0.64, 1) both;
  }
`;

function MessageStatus({ status, isMyMessage }) {
  if (!isMyMessage) return null;
  if (status === "seen")      return <CheckCheck className="w-3.5 h-3.5 text-cyan-300 inline ml-1" />;
  if (status === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-slate-400 inline ml-1" />;
  return <Check className="w-3.5 h-3.5 text-slate-400 inline ml-1" />;
}

function ChatContainer() {
  const {
    selectedUser,
    selectedGroup,
    getMessagesByUserId,
    getGroupMessages,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage,
    deleteMessageForMe,
    reactToMessage,
  } = useChatStore();

  const { authUser, socket } = useAuthStore();
  const { accent } = useTheme();

  const messageEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [menuMsgId, setMenuMsgId] = useState(null);
  // Track which messages are "new" (added after initial load) for animation
  const [animatedIds, setAnimatedIds] = useState(new Set());
  const prevCountRef = useRef(0);

  const myId = authUser?._id?.toString();

  useEffect(() => {
    if (selectedUser) getMessagesByUserId(selectedUser._id);
    if (selectedGroup) {
      getGroupMessages(selectedGroup._id);
      socket?.emit("joinGroup", selectedGroup._id);
    }
    subscribeToMessages();
    prevCountRef.current = 0;
    setAnimatedIds(new Set());
    return () => unsubscribeFromMessages();
  }, [selectedUser, selectedGroup]);

  // Animate only newly arriving messages, not the initial batch
  useEffect(() => {
    if (messages.length > prevCountRef.current && prevCountRef.current > 0) {
      const newIds = messages.slice(prevCountRef.current).map(m => m._id);
      setAnimatedIds(prev => {
        const next = new Set(prev);
        newIds.forEach(id => next.add(id));
        return next;
      });
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket || !selectedUser) return;
    socket.on("typing",     ({ senderId }) => { if (senderId === selectedUser._id) setIsTyping(true);  });
    socket.on("stopTyping", ({ senderId }) => { if (senderId === selectedUser._id) setIsTyping(false); });
    return () => { socket.off("typing"); socket.off("stopTyping"); };
  }, [socket, selectedUser]);

  useEffect(() => {
    const handleClick = () => setMenuMsgId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const getFileColor = (type) => {
    if (type?.includes("pdf"))    return "text-red-400";
    if (type?.includes("word") || type?.includes("document")) return "text-blue-400";
    if (type?.includes("sheet") || type?.includes("excel"))   return "text-green-400";
    return "text-slate-300";
  };

  const getFileLabel = (type) => {
    if (type?.includes("pdf"))          return "PDF";
    if (type?.includes("word") || type?.includes("document")) return "Word";
    if (type?.includes("sheet") || type?.includes("excel"))   return "Excel";
    if (type?.includes("presentation") || type?.includes("powerpoint")) return "PowerPoint";
    if (type?.includes("zip"))  return "ZIP";
    if (type?.includes("text")) return "Text";
    return "File";
  };

  return (
    <>
      {/* Inject animation CSS once */}
      <style>{MSG_ANIMATION}</style>

      <ChatHeader />

      <div className="flex-1 px-6 overflow-y-auto py-8">
        {!selectedUser && !selectedGroup ? (
          <NoChatHistoryPlaceholder name="Select a conversation" />
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => {
              const senderId =
                msg.senderId?._id?.toString() ||
                msg.senderId?.toString() ||
                "";
              const isMyMessage = myId && senderId && myId === senderId;
              const shouldAnimate = animatedIds.has(msg._id);

              return (
                <div
                  key={msg._id}
                  className={`chat ${isMyMessage ? "chat-end" : "chat-start"} ${shouldAnimate ? "msg-animate" : ""}`}
                >
                  <div className="chat-bubble-wrapper relative group">
                    <div
                      className={`chat-bubble ${
                        isMyMessage
                          ? `${accent.bg} text-white`
                          : "bg-slate-800 text-slate-200"
                      }`}
                    >
                      {/* Group sender name */}
                      {selectedGroup && msg.senderName && (
                        <p className={`text-xs mb-1 ${accent.text}`}>{msg.senderName}</p>
                      )}

                      {/* Image */}
                      {msg.image && (
                        <img
                          src={msg.image}
                          alt="sent image"
                          className="max-w-xs rounded-lg mb-1 cursor-pointer transition-transform hover:scale-[1.02]"
                          onClick={() => window.open(msg.image, "_blank")}
                        />
                      )}

                      {/* File */}
                      {msg.file && (
                        <a
                          href={msg.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={msg.fileName}
                          className="flex items-center gap-3 bg-black/20 hover:bg-black/30 transition-colors rounded-lg px-3 py-2 mb-1 max-w-xs"
                        >
                          <FileIcon className={`w-8 h-8 flex-shrink-0 ${getFileColor(msg.fileType)}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{msg.fileName || "File"}</p>
                            <p className="text-xs opacity-60">{getFileLabel(msg.fileType)}</p>
                          </div>
                          <DownloadIcon className="w-4 h-4 opacity-60 flex-shrink-0" />
                        </a>
                      )}

                      {/* Text */}
                      {msg.text && <p>{msg.text}</p>}

                      {/* Timestamp + status */}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <p className="text-xs opacity-70">
                          {format(new Date(msg.createdAt), "hh:mm a")}
                        </p>
                        {!selectedGroup && (
                          <MessageStatus status={msg.status} isMyMessage={isMyMessage} />
                        )}
                      </div>
                    </div>

                    {/* Reactions */}
                    <MessageReactions
                      msgId={msg._id}
                      reactions={msg.reactions || []}
                      isMyMessage={isMyMessage}
                      onReact={(msgId, emoji) => reactToMessage(msgId, emoji)}
                    />

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuMsgId(menuMsgId === msg._id ? null : msg._id);
                      }}
                      className={`absolute top-0 ${
                        isMyMessage ? "-left-8" : "-right-8"
                      } opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400`}
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </button>

                    {/* Delete menu */}
                    {menuMsgId === msg._id && (
                      <div
                        className={`absolute top-6 ${
                          isMyMessage ? "-left-40" : "-right-40"
                        } z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden w-40`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => { deleteMessageForMe(msg._id); setMenuMsgId(null); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                          🙈 Delete for me
                        </button>
                        {isMyMessage && (
                          <button
                            onClick={() => { deleteMessage(msg._id); setMenuMsgId(null); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700 transition-colors border-t border-slate-700"
                          >
                            🗑️ Delete for everyone
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && selectedUser && (
              <div className="chat chat-start msg-animate">
                <div className="chat-bubble bg-slate-800 text-slate-400 text-sm flex items-center gap-1">
                  <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span>
                </div>
              </div>
            )}

            <div ref={messageEndRef} />
          </div>
        )}
      </div>

      <MessageInput />
    </>
  );
}

export default ChatContainer;