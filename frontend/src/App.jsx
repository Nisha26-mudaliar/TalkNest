import { Navigate, Route, Routes } from "react-router";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import { useAuthStore } from "./store/useAuthStore";
import { useVideoCallStore } from "./store/useVideoCallStore";
import { useEffect } from "react";
import PageLoader from "./components/PageLoader";
import IncomingCallModal from "./components/IncomingCallModal";
import VideoCallModal from "./components/VideoCallModal";
import { Toaster } from "react-hot-toast";

function App() {
  const { checkAuth, isCheckingAuth, authUser, socket } = useAuthStore();
  const {
    subscribeToCallEvents,
    unsubscribeFromCallEvents,
    isReceivingCall,
    callAccepted,
    isCalling,
  } = useVideoCallStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // ✅ Only subscribe when socket is ready
  useEffect(() => {
    if (authUser && socket) {
      subscribeToCallEvents();
    }
    return () => {
      if (socket) unsubscribeFromCallEvents();
    };
  }, [authUser, socket]); // depends on both authUser AND socket

  if (isCheckingAuth) return <PageLoader />;

  const isInCall = callAccepted || isCalling;

  return (
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

      {/* ✅ Incoming call popup */}
      {isReceivingCall && <IncomingCallModal />}

      {/* ✅ Active video call screen */}
      {isInCall && <VideoCallModal />}

      <Toaster />
    </div>
  );
}

export default App;