import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import { useAuthStore } from "../store/useAuthStore";

function ContactList() {
  const {
    getAllContacts,
    allContacts,
    setSelectedUser,
    isUsersLoading
  } = useChatStore();

  const { onlineUsers, authUser } = useAuthStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    getAllContacts();
  }, []);

  if (!authUser) return null;

  if (isUsersLoading) {
    return <UsersLoadingSkeleton />;
  }

  const filteredContacts = allContacts.filter((contact) =>
    contact._id !== authUser._id && // ✅ exclude yourself
    contact.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <input
        type="text"
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 p-2 rounded-lg bg-slate-800 text-white outline-none"
      />

      {filteredContacts.map((contact) => (
        <div
          key={contact._id}
          className="bg-cyan-500/10 p-4 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors"
          onClick={() => setSelectedUser(contact)}
        >
          <div className="flex items-center gap-3">
            <div
              className={`avatar ${
                onlineUsers.includes(contact._id) ? "online" : "offline"
              }`}
            >
              <div className="size-12 rounded-full">
                <img
                  src={contact.profilePic || "/avatar.png"}
                  alt={contact.fullName}
                />
              </div>
            </div>
            <h4 className="text-slate-200 font-medium">{contact.fullName}</h4>
          </div>
        </div>
      ))}

      {filteredContacts.length === 0 && (
        <p className="text-slate-400 text-center mt-4">
          No contacts found
        </p>
      )}
    </>
  );
}

export default ContactList;