import { useState, useEffect } from "react";
import { axiosInstance } from "../lib/axios";
import { X } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

function CreateGroupModal({ onClose }) {
  const [groupName, setGroupName] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const { getMyGroups, setSelectedGroup } = useChatStore();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await axiosInstance.get("/messages/contacts");
    setUsers(res.data);
  };

  const toggleMember = (id) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter((m) => m !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  const handleCreateGroup = async () => {
    try {
      const res = await axiosInstance.post("/groups/create", {
        name: groupName,
        members: selectedMembers,
      });

      // ✅ Refresh the groups list in the sidebar
      await getMyGroups();

      // ✅ Open the newly created group chat immediately
      setSelectedGroup(res.data);

      onClose();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 p-6 rounded-xl w-96 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-bold mb-4 text-white">
          Create Group
        </h2>

        <input
          type="text"
          placeholder="Group Name"
          className="w-full p-2 mb-4 bg-slate-800 rounded text-white"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />

        <div className="max-h-40 overflow-y-auto mb-4">
          {users.map((user) => (
            <div key={user._id} className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                onChange={() => toggleMember(user._id)}
              />
              <span className="text-slate-200">{user.fullName}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleCreateGroup}
          className="w-full bg-cyan-600 hover:bg-cyan-700 p-2 rounded text-white font-medium"
        >
          Create Group
        </button>
      </div>
    </div>
  );
}

export default CreateGroupModal;