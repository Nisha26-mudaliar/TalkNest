import { Navigate, Route, Routes } from "react-router";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import { useAuthStore } from "./store/useAuthStore";
import { useVideoCallStore } from "./store/useVideoCallStore";
import { useGroupCallStore } from "./store/useGroupCallStore"; // ✅ NEW
import { useEffect } from "react";
import PageLoader from "./components/PageLoader";
import IncomingCallModal from "./components/IncomingCallModal";
import VideoCallModal from "./components/VideoCallModal";
import IncomingGroupCallModal from "./components/Incominggroupcallmodal"; // ✅ NEW
import GroupVideoCallModal from "./components/Groupvideocallmodal"; // ✅ NEW
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./context/ThemeContext";
//import ThemePanel from "./components/ThemePanel";

function App() {
  const { checkAuth, isCheckingAuth, authUser, socket } = useAuthStore();

  // 🔹 1-to-1 call store
  const {
    subscribeToCallEvents,
    unsubscribeFromCallEvents,
    isReceivingCall,
    callAccepted,
    isCalling,
  } = useVideoCallStore();

  // 🔹 Group call store (NEW)
  const {
    subscribeToGroupCallEvents,
    unsubscribeFromGroupCallEvents,
    isInGroupCall,
    isGroupCallRinging,
  } = useGroupCallStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // ✅ Subscribe to 1-to-1 call events
  useEffect(() => {
    if (authUser && socket) {
      subscribeToCallEvents();
    }
    return () => {
      if (socket) unsubscribeFromCallEvents();
    };
  }, [authUser, socket]);

  // ✅ Subscribe to GROUP call events (MOST IMPORTANT FIX)
  useEffect(() => {
    if (authUser && socket) {
      subscribeToGroupCallEvents();
    }
    return () => {
      unsubscribeFromGroupCallEvents();
    };
  }, [authUser, socket]);

  if (isCheckingAuth) return <PageLoader />;

  const isInCall = callAccepted || isCalling;

  return (
    <ThemeProvider>
      {/* <ThemePanel /> */}

      <div className="min-h-screen bg-slate-900 relative flex items-center justify-center p-4 overflow-hidden">
        {/* DECORATORS */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        <div className="absolute top-0 -left-4 size-96 bg-pink-500 opacity-20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 -right-4 size-96 bg-cyan-500 opacity-20 blur-[100px] pointer-events-none" />

        <Routes>
          <Route path="/" element={authUser ? <ChatPage /> : <Navigate to={"/login"} />} />
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to={"/"} />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to={"/"} />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>

        {/* 🔹 1-to-1 Call Modals */}
        {isReceivingCall && <IncomingCallModal />}
        {isInCall && <VideoCallModal />}

        {/* 🔹 GROUP Call Modals (NEW) */}
        {isGroupCallRinging && <IncomingGroupCallModal />}
        {isInGroupCall && <GroupVideoCallModal />}

        <Toaster />
      </div>
    </ThemeProvider>
  );
}

export default App;