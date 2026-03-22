import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
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
    setSelectedUser,
    setSelectedGroup,
    unreadCounts,
  } = useChatStore();

  const { onlineUsers, authUser } = useAuthStore();
  const [showGroupModal, setShowGroupModal] = useState(false);

  // ✅ ALL hooks must be before any early return
  useEffect(() => {
    if (authUser) {
      getMyChatPartners();
      getMyGroups();
    }
  }, [authUser]);

  const totalUnread = Object.values(unreadCounts || {}).reduce((a, b) => a + b, 0);

  // ✅ Update browser tab title
  useEffect(() => {
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) TalkNest`;
    } else {
      document.title = "TalkNest";
    }
  }, [totalUnread]);

  // ✅ Early returns AFTER all hooks
  if (isUsersLoading || !authUser) {
    return <UsersLoadingSkeleton />;
  }

  const safeChats = chats.filter((chat) => chat._id !== authUser._id);

  return (
    <>
      {/* Create Group Button */}
      <button
        onClick={() => setShowGroupModal(true)}
        className="bg-cyan-600 px-3 py-2 rounded mb-3 w-full text-white font-medium"
      >
        + Create Group
      </button>

      {/* ================= GROUPS ================= */}
      {groups.length > 0 && (
        <>
          <h3 className="text-slate-400 text-sm mb-2 mt-3">GROUPS</h3>
          {groups.map((group) => {
            const unread = unreadCounts?.[group._id] || 0;
            return (
              <div
                key={group._id}
                className="bg-purple-500/10 p-4 rounded-lg cursor-pointer hover:bg-purple-500/20 transition-colors mb-2"
                onClick={() => setSelectedGroup(group)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="size-12 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center text-white font-bold">
                      {group.avatar && group.avatar !== "/group.png" ? (
                        <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
                      ) : (
                        group.name?.charAt(0)
                      )}
                    </div>
                    {/* ✅ Unread badge */}
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-slate-200 font-medium truncate">{group.name}</h4>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ================= USERS ================= */}
      {safeChats.length === 0 && <NoChatsFound />}

      {safeChats.map((chat) => {
        const unread = unreadCounts?.[chat._id] || 0;
        return (
          <div
            key={chat._id}
            className="bg-cyan-500/10 p-4 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors mb-2"
            onClick={() => setSelectedUser(chat)}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className={`avatar ${onlineUsers.includes(chat._id) ? "online" : "offline"}`}>
                  <div className="size-12 rounded-full">
                    <img src={chat.profilePic || "/avatar.png"} alt={chat.fullName} />
                  </div>
                </div>
                {/* ✅ Unread badge */}
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full text-white text-xs flex items-center justify-center font-bold z-10">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className={`truncate font-medium ${unread > 0 ? "text-white" : "text-slate-200"}`}>
                  {chat.fullName}
                </h4>
                {unread > 0 && (
                  <p className="text-xs text-cyan-400">
                    {unread} new message{unread > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Group Modal */}
      {showGroupModal && (
        <CreateGroupModal onClose={() => setShowGroupModal(false)} />
      )}
    </>
  );
}

export default ChatsList;