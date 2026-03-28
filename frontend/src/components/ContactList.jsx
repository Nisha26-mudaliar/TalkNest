import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { useTheme } from "../context/ThemeContext";

function ContactList() {
  const {
    getAllContacts,
    allContacts,
    setSelectedUser,
    isUsersLoading,
  } = useChatStore();

  const { onlineUsers, authUser } = useAuthStore();
  const { accent } = useTheme();
  const [search, setSearch] = useState("");

  useEffect(() => {
    // ✅ Only fetch when authUser is confirmed (ChatPage already guarantees this)
    if (authUser) getAllContacts();
  }, [authUser]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;

  const filteredContacts = allContacts.filter(
    (contact) =>
      contact._id !== authUser._id &&
      contact.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 px-4 py-2.5 rounded-lg bg-slate-800 text-white placeholder-slate-400 outline-none focus:ring-1 focus:ring-cyan-500 transition"
      />

      {/* Section Label */}
      {filteredContacts.length > 0 && (
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2 px-1">
          Contacts
        </h3>
      )}

      {/* Contact Cards */}
      {filteredContacts.map((contact) => (
        <div
          key={contact._id}
          className="bg-cyan-500/10 hover:bg-cyan-500/20 p-4 rounded-lg cursor-pointer transition-all duration-150 mb-2"
          onClick={() => setSelectedUser(contact)}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div
                className={`avatar ${
                  onlineUsers.includes(contact._id) ? "online" : "offline"
                }`}
              >
                <div className="size-12 rounded-full overflow-hidden">
                  <img
                    src={contact.profilePic || "/avatar.png"}
                    alt={contact.fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-slate-200 font-medium truncate">
                {contact.fullName}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {onlineUsers.includes(contact._id) ? (
                  <span className="text-green-400">● Online</span>
                ) : (
                  <span className="text-slate-500">● Offline</span>
                )}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Empty State */}
      {filteredContacts.length === 0 && (
        <p className="text-slate-400 text-center mt-6 text-sm">
          No contacts found
        </p>
      )}
    </>
  );
}

export default ContactList;