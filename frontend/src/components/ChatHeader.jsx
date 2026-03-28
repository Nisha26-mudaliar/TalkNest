import { XIcon, Video, Users, UserPlus, LogOut, Camera, UserMinus } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useVideoCallStore } from "../store/useVideoCallStore";
import { useGroupCallStore } from "../store/useGroupCallStore";
import { useTheme } from "../context/ThemeContext";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const getId = (member) => {
  if (!member) return null;
  if (typeof member === "string") return member;
  if (member._id) return member._id.toString();
  return member.toString();
};

function ChatHeader() {
  const {
    selectedUser,
    selectedGroup,
    setSelectedUser,
    setSelectedGroup,
    getMyGroups,
  } = useChatStore();

  const { onlineUsers, authUser } = useAuthStore();
  const { startCall } = useVideoCallStore();
  const { startGroupCall } = useGroupCallStore(); // ✅ group call
  const { accent } = useTheme();

  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [selectedNewMember, setSelectedNewMember] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const avatarInputRef = useRef(null);

  const isOnline = selectedUser && onlineUsers.includes(selectedUser._id);
  const members = selectedGroup?.members || [];
  const memberCount = members.length;

  const myId = authUser?._id?.toString();
  const adminId = getId(selectedGroup?.admin);
  const isAdmin = selectedGroup && adminId === myId;

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        setSelectedUser(null);
        setSelectedGroup(null);
      }
    };
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, []);

  useEffect(() => {
    const handleClick = () => {
      setShowMembers(false);
      setShowAddMember(false);
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (showAddMember) {
      axiosInstance.get("/messages/contacts").then((res) => {
        const existingIds = members.map((m) => getId(m));
        const filtered = res.data.filter(
          (c) => !existingIds.includes(c._id.toString())
        );
        setContacts(filtered);
      });
    }
  }, [showAddMember]);

  const handleAddMember = async () => {
    if (!selectedNewMember) return;
    setIsUpdating(true);
    try {
      const res = await axiosInstance.post(
        `/groups/${selectedGroup._id}/add-member`,
        { userId: selectedNewMember }
      );
      toast.success("Member added!");
      setSelectedGroup(res.data);
      setShowAddMember(false);
      setSelectedNewMember("");
      getMyGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from the group?`)) return;
    try {
      const res = await axiosInstance.post(
        `/groups/${selectedGroup._id}/remove-member`,
        { userId: memberId }
      );
      toast.success(`${memberName} removed`);
      setSelectedGroup(res.data);
      getMyGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    try {
      await axiosInstance.post(`/groups/${selectedGroup._id}/leave`);
      toast.success("You left the group");
      setSelectedGroup(null);
      getMyGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave group");
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await axiosInstance.put(
          `/groups/${selectedGroup._id}/update-pic`,
          { avatar: reader.result }
        );
        toast.success("Group picture updated!");
        setSelectedGroup(res.data);
        getMyGroups();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to update picture");
      }
    };
    reader.readAsDataURL(file);
  };

  if (!selectedUser && !selectedGroup) return null;

  return (
    <div className="relative">
      <div className="flex justify-between items-center bg-slate-800/50 border-b border-slate-700/50 px-6 py-3">

        <div className="flex items-center space-x-3">

          {/* USER AVATAR */}
          {selectedUser && (
            <div className={`avatar ${isOnline ? "online" : "offline"}`}>
              <div className="w-12 rounded-full">
                <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
              </div>
            </div>
          )}

          {/* GROUP AVATAR */}
          {selectedGroup && (
            <div className="relative">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden ${accent.bg}`}>
                {selectedGroup.avatar && selectedGroup.avatar !== "/group.png" ? (
                  <img src={selectedGroup.avatar} alt={selectedGroup.name} className="w-full h-full object-cover" />
                ) : (
                  selectedGroup.name?.charAt(0)
                )}
              </div>
              {isAdmin && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }}
                    className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    title="Change group picture"
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                  <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarChange} className="hidden" />
                </>
              )}
            </div>
          )}

          <div>
            <h3 className="text-slate-200 font-medium">
              {selectedGroup ? selectedGroup.name : selectedUser.fullName}
            </h3>
            {selectedUser && (
              <p className="text-slate-400 text-sm">{isOnline ? "Online" : "Offline"}</p>
            )}
            {selectedGroup && members.length > 0 && (
              <p className="text-slate-400 text-xs truncate max-w-xs">
                {members.map((m) => getId(m) === myId ? "You" : m.fullName).join(", ")}
              </p>
            )}
            {selectedGroup && members.length === 0 && (
              <p className="text-slate-400 text-sm">Group chat</p>
            )}
          </div>
        </div>

        {/* RIGHT BUTTONS */}
        <div className="flex items-center gap-2">
          {selectedGroup && isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowAddMember(p => !p); setShowMembers(false); }}
              className={`w-9 h-9 rounded-full ${accent.soft} ${accent.softHover} flex items-center justify-center transition-colors`}
              title="Add member"
            >
              <UserPlus className={`w-4 h-4 ${accent.text}`} />
            </button>
          )}

          {selectedGroup && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowMembers(p => !p); setShowAddMember(false); }}
              className="w-9 h-9 rounded-full bg-purple-600/20 hover:bg-purple-600/40 flex items-center justify-center transition-colors relative"
              title="View members"
            >
              <Users className="w-4 h-4 text-purple-400" />
              <span className={`absolute -top-1 -right-1 w-4 h-4 ${accent.bg} rounded-full text-white text-[10px] flex items-center justify-center`}>
                {memberCount}
              </span>
            </button>
          )}

          {selectedGroup && (
            <button
              onClick={(e) => { e.stopPropagation(); handleLeaveGroup(); }}
              className="w-9 h-9 rounded-full bg-red-600/20 hover:bg-red-600/40 flex items-center justify-center transition-colors"
              title="Leave group"
            >
              <LogOut className="w-4 h-4 text-red-400" />
            </button>
          )}

          {/* ✅ GROUP VIDEO CALL BUTTON */}
          {selectedGroup && (
            <button
              onClick={(e) => { e.stopPropagation(); startGroupCall(selectedGroup); }}
              className={`w-9 h-9 rounded-full ${accent.soft} ${accent.softHover} flex items-center justify-center transition-colors`}
              title="Start group video call"
            >
              <Video className={`w-5 h-5 ${accent.text}`} />
            </button>
          )}

          {/* 1-on-1 VIDEO CALL BUTTON (unchanged) */}
          {selectedUser && (
            <button
              onClick={() => startCall(selectedUser)}
              className={`w-9 h-9 rounded-full ${accent.soft} ${accent.softHover} flex items-center justify-center transition-colors`}
              title="Start video call"
            >
              <Video className={`w-5 h-5 ${accent.text}`} />
            </button>
          )}

          <button onClick={() => { setSelectedUser(null); setSelectedGroup(null); }}>
            <XIcon className="w-5 h-5 text-slate-400 hover:text-slate-200 cursor-pointer" />
          </button>
        </div>
      </div>

      {/* Members dropdown */}
      {showMembers && selectedGroup && (
        <div
          className="absolute right-24 top-16 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-64 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 border-b border-slate-700">
            <p className="text-slate-300 text-sm font-semibold">Members ({memberCount})</p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {members.map((member) => {
              const memberId = getId(member);
              const isMe = memberId === myId;
              const isMemberAdmin = memberId === adminId;
              const isMemberOnline = onlineUsers.includes(memberId);
              return (
                <div
                  key={memberId}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/50 transition-colors group"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={member.profilePic || "/avatar.png"}
                      alt={member.fullName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    {isMemberOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-800" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm truncate">
                      {isMe ? "You" : member.fullName}
                    </p>
                    {isMemberAdmin && (
                      <p className={`${accent.text} text-xs`}>Admin</p>
                    )}
                  </div>
                  {isAdmin && !isMe && !isMemberAdmin && (
                    <button
                      onClick={() => handleRemoveMember(memberId, member.fullName)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400"
                      title={`Remove ${member.fullName}`}
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add member dropdown */}
      {showAddMember && selectedGroup && isAdmin && (
        <div
          className="absolute right-36 top-16 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-64 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 border-b border-slate-700">
            <p className="text-slate-300 text-sm font-semibold">Add Member</p>
          </div>
          <div className="p-3">
            <select
              value={selectedNewMember}
              onChange={(e) => setSelectedNewMember(e.target.value)}
              className="w-full bg-slate-700 text-slate-200 rounded-lg p-2 text-sm outline-none mb-3"
            >
              <option value="">Select a contact...</option>
              {contacts.map((contact) => (
                <option key={contact._id} value={contact._id}>
                  {contact.fullName}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddMember}
              disabled={!selectedNewMember || isUpdating}
              className={`w-full ${accent.bg} ${accent.hover} disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors`}
            >
              {isUpdating ? "Adding..." : "Add to Group"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatHeader;