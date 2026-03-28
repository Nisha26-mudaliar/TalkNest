import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useVideoCallStore } from "../store/useVideoCallStore";
import { useGroupCallStore } from "../store/useGroupCallStore";

import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatsList";
import ContactList from "../components/ContactList";
import ChatContainer from "../components/ChatContainer";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder";
import VideoCallModal from "../components/VideoCallModal";
import IncomingCallModal from "../components/IncomingCallModal";
import GroupVideoCallModal from "../components/Groupvideocallmodal";
import IncomingGroupCallModal from "../components/Incominggroupcallmodal";
import PageLoader from "../components/PageLoader"; // ✅ import PageLoader

function ChatPage() {
  const { activeTab, selectedUser, selectedGroup } = useChatStore();
  
  // ✅ also grab authUser so we can wait for both
  const { isCheckingAuth, authUser } = useAuthStore();

  const {
    isCalling,
    callAccepted,
    isReceivingCall,
    subscribeToCallEvents,
    unsubscribeFromCallEvents,
  } = useVideoCallStore();

  const {
    isInGroupCall,
    isGroupCallRinging,
    subscribeToGroupCallEvents,
    unsubscribeFromGroupCallEvents,
  } = useGroupCallStore();

  // Subscribe to 1-on-1 call events
  useEffect(() => {
    subscribeToCallEvents();
    return () => unsubscribeFromCallEvents();
  }, []);

  // Subscribe to group call events
  useEffect(() => {
    subscribeToGroupCallEvents();
    return () => unsubscribeFromGroupCallEvents();
  }, []);

  // ✅ FIX: show PageLoader until auth is fully confirmed
  // This prevents ChatsList from mounting with stale persisted data
  if (isCheckingAuth || !authUser) return <PageLoader />;

  const showVideoCall = isCalling || callAccepted;

  return (
    <div className="relative w-full max-w-6xl h-[800px]">
      <BorderAnimatedContainer>

        {/* LEFT SIDE */}
        <div className="w-80 bg-slate-800/50 backdrop-blur-sm flex flex-col">
          <ProfileHeader />
          <ActiveTabSwitch />

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className={activeTab === "chats" ? "block" : "hidden"}>
              <ChatsList />
            </div>

            <div className={activeTab === "contacts" ? "block" : "hidden"}>
              <ContactList />
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-sm">
          {selectedUser || selectedGroup ? <ChatContainer /> : <NoConversationPlaceholder />}
        </div>

      </BorderAnimatedContainer>

      {/* 1-ON-1 CALL MODALS */}
      {isReceivingCall && !callAccepted && <IncomingCallModal />}
      {showVideoCall && <VideoCallModal />}

      {/* GROUP CALL MODALS */}
      {isGroupCallRinging && !isInGroupCall && <IncomingGroupCallModal />}
      {isInGroupCall && <GroupVideoCallModal />}
    </div>
  );
}

export default ChatPage;