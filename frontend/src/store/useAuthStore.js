import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { persist } from "zustand/middleware";

const BASE_URL =
  import.meta.env.MODE === "development" ? "http://localhost:5000" : "/";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      authUser: null,
      // ✅ FIX: always start as true — we must verify with server before rendering anything
      isCheckingAuth: true,
      isSigningUp: false,
      isLoggingIn: false,
      socket: null,
      onlineUsers: [],

      // CHECK AUTH
      checkAuth: async () => {
        // ✅ FIX: explicitly set isCheckingAuth true at start of every check
        set({ isCheckingAuth: true });
        try {
          const res = await axiosInstance.get("/auth/check");
          set({ authUser: res.data });
          get().connectSocket();
        } catch (error) {
          console.log("Error in authCheck:", error);
          set({ authUser: null });
        } finally {
          // ✅ Only set false AFTER server responds — this is the gate
          set({ isCheckingAuth: false });
        }
      },

      // SIGNUP
      signup: async (data) => {
        set({ isSigningUp: true });
        try {
          const res = await axiosInstance.post("/auth/signup", data);
          toast.success(res.data.message);
          sessionStorage.setItem("verifyEmail", data.email);
          window.location.href = "/verify-email";
        } catch (error) {
          toast.error(error.response?.data?.message || "Signup failed");
        } finally {
          set({ isSigningUp: false });
        }
      },

      // LOGIN
      login: async (data) => {
        set({ isLoggingIn: true });
        try {
          const res = await axiosInstance.post("/auth/login", data);
          set({ authUser: res.data });
          toast.success("Logged in successfully");
          get().connectSocket();
        } catch (error) {
          toast.error(error.response?.data?.message || "Login failed");
        } finally {
          set({ isLoggingIn: false });
        }
      },

      // LOGOUT
      logout: async () => {
        try {
          await axiosInstance.post("/auth/logout");
          set({ authUser: null });
          toast.success("Logged out successfully");
          get().disconnectSocket();
        } catch (error) {
          toast.error("Error logging out");
          console.log("Logout error:", error);
        }
      },

      // UPDATE PROFILE
      updateProfile: async (data) => {
        try {
          const res = await axiosInstance.put("/auth/update-profile", data);
          set({ authUser: res.data });
          toast.success("Profile updated successfully");
        } catch (error) {
          console.log("Error in update profile:", error);
          toast.error(error.response?.data?.message);
        }
      },

      // SOCKET CONNECT
      connectSocket: () => {
        const { authUser } = get();
        if (!authUser || get().socket?.connected) return;
        const socket = io(BASE_URL, {
          withCredentials: true,
        });
        socket.connect();
        set({ socket });
        socket.on("getOnlineUsers", (userIds) => {
          set({ onlineUsers: userIds });
        });
      },

      // SOCKET DISCONNECT
      disconnectSocket: () => {
        if (get().socket?.connected) get().socket.disconnect();
      },
    }),
    {
      name: "auth-storage",
      // ✅ Only persist authUser — never persist isCheckingAuth
      partialize: (state) => ({ authUser: state.authUser }),
      // ✅ FIX: when store rehydrates from localStorage, force isCheckingAuth
      // back to true so we always wait for server verification
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isCheckingAuth = true;
        }
      },
    }
  )
);