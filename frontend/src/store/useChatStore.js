import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create(
  persist(
    (set, get) => ({
      hasHydrated: false,
      allContacts: [],
      chats: [],
      groups: [],
      messages: [],
      activeTab: "chats",
      selectedUser: null,
      selectedGroup: null,
      isUsersLoading: false,
      isMessagesLoading: false,
      isSoundEnabled: true,

      // ✅ Unread counts: { userId: count, groupId: count }
      unreadCounts: {},

      toggleSound: () => {
        set({ isSoundEnabled: !get().isSoundEnabled });
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      setSelectedUser: (user) => {
        const unreadCounts = { ...get().unreadCounts };
        delete unreadCounts[user._id];
        set((state) => ({
          ...state,
          selectedUser: { ...user },
          selectedGroup: null,
          messages: [],
          unreadCounts,
        }));
      },

      setSelectedGroup: (group) => {
        const unreadCounts = { ...get().unreadCounts };
        delete unreadCounts[group._id];
        set((state) => ({
          ...state,
          selectedGroup: { ...group },
          selectedUser: null,
          messages: [],
          unreadCounts,
        }));
      },

      // ================= CONTACTS =================
      getAllContacts: async () => {
        set({ isUsersLoading: true });
        try {
          const res = await axiosInstance.get("/messages/contacts");
          set({ allContacts: res.data });
        } catch (error) {
          toast.error(error.response?.data?.message || "Error loading contacts");
        } finally {
          set({ isUsersLoading: false });
        }
      },

      // ================= CHATS =================
      getMyChatPartners: async () => {
        const { authUser } = useAuthStore.getState();
        if (!authUser) return;
        set({ isUsersLoading: true, chats: [] });
        try {
          const res = await axiosInstance.get("/messages/chats");
          const filteredChats = res.data.filter((user) => user._id !== authUser._id);
          set({ chats: filteredChats });
        } catch (error) {
          console.log("Error fetching chats:", error);
        } finally {
          set({ isUsersLoading: false });
        }
      },

      // ================= GROUPS =================
      getMyGroups: async () => {
        try {
          const res = await axiosInstance.get("/groups/my-groups");
          set({ groups: res.data });
        } catch (error) {
          console.error("Group fetch error:", error);
        }
      },

      // ================= USER MESSAGES =================
      getMessagesByUserId: async (userId) => {
        set({ isMessagesLoading: true });
        try {
          const res = await axiosInstance.get(`/messages/${userId}`);
          set({ messages: res.data });
        } catch (error) {
          toast.error(error.response?.data?.message || "Error loading messages");
        } finally {
          set({ isMessagesLoading: false });
        }
      },

      // ================= GROUP MESSAGES =================
      getGroupMessages: async (groupId) => {
        set({ isMessagesLoading: true });
        try {
          const res = await axiosInstance.get(`/messages/group/${groupId}`);
          set({ messages: res.data });
        } catch (error) {
          console.error(error);
        } finally {
          set({ isMessagesLoading: false });
        }
      },

      // ================= SEND MESSAGE =================
      sendMessage: async (messageData) => {
        const { selectedUser, selectedGroup, messages } = get();
        const { authUser, socket } = useAuthStore.getState();

        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
          _id: tempId,
          senderId: authUser._id,
          text: messageData.text,
          image: messageData.image,
          createdAt: new Date().toISOString(),
          isOptimistic: true,
        };

        set({ messages: [...messages, optimisticMessage] });

        try {
          if (selectedUser) {
            const res = await axiosInstance.post(
              `/messages/send/${selectedUser._id}`,
              messageData
            );
            set({
              messages: get().messages
                .filter((m) => m._id !== tempId)
                .concat(res.data),
            });
          }

          if (selectedGroup) {
            socket.emit("sendGroupMessage", {
              groupId: selectedGroup._id,
              text: messageData.text,
            });
            set({
              messages: get().messages.filter((m) => m._id !== tempId),
            });
          }
        } catch (error) {
          set({
            messages: get().messages.filter((m) => m._id !== tempId),
          });
          toast.error("Message failed");
        }
      },

      // ================= DELETE FOR EVERYONE =================
      deleteMessage: async (messageId) => {
        try {
          await axiosInstance.delete(`/messages/${messageId}`);
          set({ messages: get().messages.filter((m) => m._id !== messageId) });
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to delete message");
        }
      },

      // ================= DELETE FOR ME =================
      deleteMessageForMe: async (messageId) => {
        try {
          await axiosInstance.patch(`/messages/${messageId}/delete-for-me`);
          set({ messages: get().messages.filter((m) => m._id !== messageId) });
        } catch (error) {
          toast.error("Failed to delete message");
        }
      },

      // ================= SOCKET =================
      subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;

        // ⭐ USER MESSAGE
        socket.on("newMessage", (newMessage) => {
          const { selectedUser, isSoundEnabled, unreadCounts, chats } = get();

          const isCurrentChat =
            selectedUser && newMessage.senderId === selectedUser._id;

          if (isCurrentChat) {
            set({ messages: [...get().messages, newMessage] });
          } else {
            // ✅ Increment unread count
            set({
              unreadCounts: {
                ...unreadCounts,
                [newMessage.senderId]: (unreadCounts[newMessage.senderId] || 0) + 1,
              },
            });

            // ✅ Plain text toast — no JSX needed
            const sender = chats.find((c) => c._id === newMessage.senderId);
            const senderName = sender?.fullName || "Someone";
            const preview = newMessage.image
              ? "📷 Photo"
              : newMessage.file
              ? "📎 File"
              : newMessage.text || "New message";

            toast(`💬 ${senderName}: ${preview}`, {
              duration: 4000,
              style: {
                background: "#1e293b",
                color: "#e2e8f0",
                border: "1px solid #334155",
                borderRadius: "12px",
              },
              icon: "🔔",
            });
          }

          if (isSoundEnabled) {
            new Audio("/sounds/notification.mp3").play().catch(() => {});
          }
        });

        // ⭐ GROUP MESSAGE
        socket.on("receiveGroupMessage", (msg) => {
          const { selectedGroup, isSoundEnabled, unreadCounts, groups } = get();
          const { authUser } = useAuthStore.getState();

          // Don't notify for your own messages
          if (msg.senderId?.toString() === authUser._id?.toString()) return;

          const isCurrentGroup =
            selectedGroup && msg.groupId === selectedGroup._id;

          if (isCurrentGroup) {
            set({ messages: [...get().messages, msg] });
          } else {
            // ✅ Increment unread count for group
            set({
              unreadCounts: {
                ...unreadCounts,
                [msg.groupId]: (unreadCounts[msg.groupId] || 0) + 1,
              },
            });

            // ✅ Plain text toast for group
            const group = groups.find((g) => g._id === msg.groupId);
            const groupName = group?.name || "Group";
            const preview = msg.text || "📎 File";

            toast(`👥 ${groupName} — ${msg.senderName || "Someone"}: ${preview}`, {
              duration: 4000,
              style: {
                background: "#1e293b",
                color: "#e2e8f0",
                border: "1px solid #7c3aed",
                borderRadius: "12px",
              },
              icon: "🔔",
            });
          }

          if (isSoundEnabled) {
            new Audio("/sounds/notification.mp3").play().catch(() => {});
          }
        });

        // ✅ DELETE FOR EVERYONE
        socket.on("messageDeleted", ({ messageId }) => {
          set({ messages: get().messages.filter((m) => m._id !== messageId) });
        });
      },

      unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("newMessage");
        socket.off("receiveGroupMessage");
        socket.off("messageDeleted");
      },
    }),
    {
      name: "chat-store",
      partialize: (state) => ({
        activeTab: state.activeTab,
        isSoundEnabled: state.isSoundEnabled,
        unreadCounts: state.unreadCounts,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hasHydrated = true;
      },
    }
  )
);