import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useTheme } from "../context/ThemeContext";
import UsersLoadingSkeleton from "../components/UsersLoadingSkeleton";
import NoChatsFound from "../components/NoChatsFound";
import CreateGroupModal from "../components/CreateGroupModal";

function ChatsList() {
  const {
    getMyChatPartners,
    getMyGroups,
    chats,
    groups,
    isUsersLoading,
    isChatsReady,
    setSelectedUser,
    setSelectedGroup,
    unreadCounts,
  } = useChatStore();

  const { onlineUsers, authUser } = useAuthStore();
  const { accent } = useTheme();
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    if (authUser) {
      getMyChatPartners();
      getMyGroups();
    }
  }, [authUser]);

  const totalUnread = Object.values(unreadCounts || {}).reduce((a, b) => a + b, 0);

  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) TalkNest` : "TalkNest";
  }, [totalUnread]);

  if (isUsersLoading || !isChatsReady) return <UsersLoadingSkeleton />;

  const safeChats = chats.filter(
    (chat) => chat._id.toString() !== authUser._id.toString()
  );

  return (
    <>
      {/* Create Group Button */}
      <button
        onClick={() => setShowGroupModal(true)}
        className={`${accent.bg} ${accent.hover} px-3 py-2 rounded mb-3 w-full text-white font-medium transition-colors`}
      >
        + Create Group
      </button>

      {/* GROUPS */}
      {groups.length > 0 && (
        <>
          <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2 mt-3 px-1">
            Groups
          </h3>
          {groups.map((group) => {
            // ✅ FIX: use toString() so key matches the string stored in unreadCounts
            const unread = unreadCounts?.[group._id.toString()] || 0;
            return (
              <div
                key={group._id}
                className="bg-purple-500/10 hover:bg-purple-500/20 p-4 rounded-lg cursor-pointer transition-all duration-150 mb-2"
                onClick={() => setSelectedGroup(group)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div
                      className={`size-12 rounded-full overflow-hidden ${accent.bg} flex items-center justify-center text-white font-bold`}
                    >
                      {group.avatar && group.avatar !== "/group.png" ? (
                        <img
                          src={group.avatar}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        group.name?.charAt(0)
                      )}
                    </div>
                    {unread > 0 && (
                      <span
                        className={`absolute -top-1 -right-1 w-5 h-5 ${accent.bg} rounded-full text-white text-xs flex items-center justify-center font-bold`}
                      >
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-slate-200 font-medium truncate">{group.name}</h4>
                    {unread > 0 && (
                      <p className={`text-xs ${accent.text}`}>
                        {unread} new message{unread > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* USERS */}
      {safeChats.length === 0 && <NoChatsFound />}
      {safeChats.length > 0 && (
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2 mt-3 px-1">
          Direct Messages
        </h3>
      )}
      {safeChats.map((chat) => {
        // ✅ FIX: use toString() so key matches the string stored in unreadCounts
        const unread = unreadCounts?.[chat._id.toString()] || 0;
        return (
          <div
            key={chat._id}
            className={`${accent.soft} p-4 rounded-lg cursor-pointer transition-all duration-150 mb-2 hover:brightness-110`}
            onClick={() => setSelectedUser(chat)}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div
                  className={`avatar ${
                    onlineUsers.includes(chat._id) ? "online" : "offline"
                  }`}
                >
                  <div className="size-12 rounded-full">
                    <img
                      src={chat.profilePic || "/avatar.png"}
                      alt={chat.fullName}
                    />
                  </div>
                </div>
                {unread > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 w-5 h-5 ${accent.bg} rounded-full text-white text-xs flex items-center justify-center font-bold z-10`}
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4
                  className={`truncate font-medium ${
                    unread > 0 ? "text-white" : "text-slate-200"
                  }`}
                >
                  {chat.fullName}
                </h4>
                {unread > 0 && (
                  <p className={`text-xs ${accent.text}`}>
                    {unread} new message{unread > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {showGroupModal && (
        <CreateGroupModal onClose={() => setShowGroupModal(false)} />
      )}
    </>
  );
}

export default ChatsList;