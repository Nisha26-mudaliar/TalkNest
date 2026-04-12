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
      isChatsReady: false,

      unreadCounts: {},

      toggleSound: () => {
        set({ isSoundEnabled: !get().isSoundEnabled });
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      // ✅ FIX: null-safe setSelectedUser
      setSelectedUser: (user) => {
        if (!user) {
          set({ selectedUser: null, selectedGroup: null, messages: [] });
          return;
        }
        const unreadCounts = { ...get().unreadCounts };
        delete unreadCounts[user._id.toString()];
        set({
          selectedUser: { ...user },
          selectedGroup: null,
          messages: [],
          unreadCounts,
        });
      },

      // ✅ FIX: null-safe setSelectedGroup
      setSelectedGroup: (group) => {
        if (!group) {
          set({ selectedGroup: null, selectedUser: null, messages: [] });
          return;
        }
        const unreadCounts = { ...get().unreadCounts };
        delete unreadCounts[group._id.toString()];
        set({
          selectedGroup: { ...group },
          selectedUser: null,
          messages: [],
          unreadCounts,
        });
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
        set({ isUsersLoading: true, chats: [], isChatsReady: false });
        try {
          const res = await axiosInstance.get("/messages/chats");
          const filteredChats = res.data.filter(
            (user) => user._id.toString() !== authUser._id.toString()
          );
          set({ chats: filteredChats });
        } catch (error) {
          console.log("Error fetching chats:", error);
        } finally {
          set({ isUsersLoading: false, isChatsReady: true });
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
          file: messageData.file,
          fileName: messageData.fileName,
          fileType: messageData.fileType,
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
              image: messageData.image,
              file: messageData.file,
              fileName: messageData.fileName,
              fileType: messageData.fileType,
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

      // ================= REACT TO MESSAGE =================
      reactToMessage: async (msgId, emoji) => {
        try {
          const res = await axiosInstance.post(`/messages/react/${msgId}`, { emoji });
          set((state) => ({
            messages: state.messages.map((m) =>
              m._id === msgId ? { ...m, reactions: res.data.reactions } : m
            ),
          }));
        } catch (error) {
          toast.error("Failed to react");
        }
      },

      // ================= SOCKET =================
      subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;

        socket.on("newMessage", (newMessage) => {
          const { selectedUser, isSoundEnabled, unreadCounts, chats } = get();

          const senderId = newMessage.senderId?.toString();
          const selectedUserId = selectedUser?._id?.toString();
          const isCurrentChat = selectedUser && senderId === selectedUserId;

          if (isCurrentChat) {
            set({ messages: [...get().messages, newMessage] });
          } else {
            set({
              unreadCounts: {
                ...unreadCounts,
                [senderId]: (unreadCounts[senderId] || 0) + 1,
              },
            });

            if (newMessage.messageType === "call") return;

            const sender = chats.find((c) => c._id.toString() === senderId);
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

        socket.on("receiveGroupMessage", (msg) => {
          const { selectedGroup, isSoundEnabled, unreadCounts, groups, messages } = get();
          const { authUser } = useAuthStore.getState();

          const senderId = msg.senderId?.toString();
          const authUserId = authUser._id?.toString();
          const msgGroupId = msg.groupId?.toString();
          const selectedGroupId = selectedGroup?._id?.toString();
          const isCurrentGroup = selectedGroup && msgGroupId === selectedGroupId;

          if (isCurrentGroup) {
            const hasTempMessage = messages.some(
              (m) => m.isOptimistic && senderId === authUserId
            );
            if (hasTempMessage && senderId === authUserId) {
              set({
                messages: [
                  ...messages.filter((m) => !m.isOptimistic),
                  msg,
                ],
              });
            } else {
              set({ messages: [...get().messages, msg] });
            }
          } else {
            if (senderId === authUserId) return;

            set({
              unreadCounts: {
                ...unreadCounts,
                [msgGroupId]: (unreadCounts[msgGroupId] || 0) + 1,
              },
            });

            if (msg.messageType === "call") return;

            const group = groups.find((g) => g._id.toString() === msgGroupId);
            const groupName = group?.name || "Group";
            const preview = msg.image
              ? "📷 Photo"
              : msg.file
              ? `📎 ${msg.fileName || "File"}`
              : msg.text || "New message";

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

          if (isSoundEnabled && senderId !== authUserId) {
            new Audio("/sounds/notification.mp3").play().catch(() => {});
          }
        });

        socket.on("messageDeleted", ({ messageId }) => {
          set({ messages: get().messages.filter((m) => m._id !== messageId) });
        });

        socket.on("messageReaction", ({ msgId, reactions }) => {
          set((state) => ({
            messages: state.messages.map((m) =>
              m._id === msgId ? { ...m, reactions } : m
            ),
          }));
        });
      },

      unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("newMessage");
        socket.off("receiveGroupMessage");
        socket.off("messageDeleted");
        socket.off("messageReaction");
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
        if (state) {
          state.hasHydrated = true;
          state.chats = [];
          state.groups = [];
          state.messages = [];
          state.allContacts = [];
          state.isUsersLoading = false;
          state.isChatsReady = false;
        }
      },
    }
  )
);