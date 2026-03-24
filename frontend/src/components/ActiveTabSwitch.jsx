import { useChatStore } from "../store/useChatStore";
import { useTheme } from "../context/ThemeContext";

function ActiveTabSwitch() {
  const { activeTab, setActiveTab } = useChatStore();
  const { accent } = useTheme();

  return (
    <div className="tabs tabs-boxed bg-transparent p-2 m-2">
      <button
        onClick={() => setActiveTab("chats")}
        className={`tab transition-colors ${
          activeTab === "chats"
            ? `${accent.soft} ${accent.text} font-medium`
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        Chats
      </button>

      <button
        onClick={() => setActiveTab("contacts")}
        className={`tab transition-colors ${
          activeTab === "contacts"
            ? `${accent.soft} ${accent.text} font-medium`
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        Contacts
      </button>
    </div>
  );
}

export default ActiveTabSwitch;