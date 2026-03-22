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
      isCheckingAuth: true,
      isSigningUp: false,
      isLoggingIn: false,
      socket: null,
      onlineUsers: [],

      // CHECK AUTH
      checkAuth: async () => {
        try {
          const res = await axiosInstance.get("/auth/check");

          set({ authUser: res.data });

          get().connectSocket();
        } catch (error) {
          console.log("Error in authCheck:", error);
          set({ authUser: null });
        } finally {
          set({ isCheckingAuth: false });
        }
      },

      // SIGNUP ✅ now redirects to /verify-email with email saved
      signup: async (data) => {
        set({ isSigningUp: true });

        try {
          const res = await axiosInstance.post("/auth/signup", data);

          toast.success(res.data.message);

          // ✅ Save email so VerifyEmailPage can read it
          sessionStorage.setItem("verifyEmail", data.email);

          // ✅ Go to OTP verify page instead of login
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
      partialize: (state) => ({ authUser: state.authUser }),
      // only persist authUser
    }
  )
);