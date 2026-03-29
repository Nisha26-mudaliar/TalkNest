import { useState, useRef } from "react";
import { LogOutIcon, VolumeOffIcon, Volume2Icon, PencilIcon, CheckIcon, XIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useTheme } from "../context/ThemeContext";
import ThemePanel from "./ThemePanel";

const mouseClickSound = new Audio("/sounds/mouse-click.mp3");

const STATUSES = [
  { label: "Online",    emoji: "🟢" },
  { label: "Away",      emoji: "🌙" },
  { label: "Busy",      emoji: "⛔" },
  { label: "Invisible", emoji: "👻" },
];

function ProfileHeader() {
  const { logout, authUser, updateProfile } = useAuthStore();
  const { isSoundEnabled, toggleSound } = useChatStore();
  const { accent } = useTheme();

  const [selectedImg, setSelectedImg] = useState(null);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(STATUSES[0]);
  const [editingBio, setEditingBio] = useState(false);

  // ✅ FIX: initialize bio from authUser.bio (from DB), fallback to default
  const [bio, setBio] = useState(
    authUser?.bio || "Hey there! I'm using TalkNest ✨"
  );
  const [bioInput, setBioInput] = useState(bio);
  const [isSavingBio, setIsSavingBio] = useState(false);

  const fileInputRef = useRef(null);

  if (!authUser) return null;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  // ✅ FIX: actually save bio to DB via updateProfile
  const handleSaveBio = async () => {
    const trimmed = bioInput.trim();
    if (!trimmed) return;
    setIsSavingBio(true);
    try {
      await updateProfile({ bio: trimmed });
      setBio(trimmed); // update local display
    } catch (err) {
      console.error("Failed to save bio:", err);
    } finally {
      setIsSavingBio(false);
      setEditingBio(false);
    }
  };

  const handleCancelBio = () => {
    setBioInput(bio);
    setEditingBio(false);
  };

  const handleStatusSelect = (s) => {
    setCurrentStatus(s);
    setShowStatusMenu(false);
  };

  return (
    <>
      <div className="p-4 border-b border-slate-700/50 space-y-3">

        {/* Row 1: Avatar + Name + Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">

            {/* Avatar */}
            <div className="avatar online">
              <button
                className="size-12 rounded-full overflow-hidden relative group"
                onClick={() => fileInputRef.current.click()}
              >
                <img
                  src={selectedImg || authUser.profilePic || "/avatar.png"}
                  alt="User"
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                  <span className="text-white text-[10px] font-medium">Change</span>
                </div>
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Name + Status */}
            <div>
              <h3 className="text-slate-200 font-semibold text-sm max-w-[140px] truncate">
                {authUser.fullName}
              </h3>
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(p => !p)}
                  className="flex items-center gap-1 text-slate-400 text-xs hover:text-slate-200 transition-colors"
                >
                  <span>{currentStatus.emoji}</span>
                  <span>{currentStatus.label}</span>
                </button>
                {showStatusMenu && (
                  <div className="absolute left-0 top-6 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-40 overflow-hidden">
                    {STATUSES.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => handleStatusSelect(s)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-700 transition-colors
                          ${currentStatus.label === s.label ? "text-slate-200 font-medium" : "text-slate-400"}`}
                      >
                        <span>{s.emoji}</span> {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              className="text-slate-400 hover:text-slate-200 transition-colors"
              onClick={() => {
                mouseClickSound.currentTime = 0;
                mouseClickSound.play().catch(() => {});
                toggleSound();
              }}
              title={isSoundEnabled ? "Mute sounds" : "Enable sounds"}
            >
              {isSoundEnabled
                ? <Volume2Icon className="size-4" />
                : <VolumeOffIcon className="size-4" />}
            </button>

            <button
              className="text-slate-400 hover:text-slate-200 transition-colors"
              onClick={logout}
              title="Logout"
            >
              <LogOutIcon className="size-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Bio */}
        <div className="px-1">
          {editingBio ? (
            <div className="flex items-center gap-2">
              <input
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveBio();
                  if (e.key === "Escape") handleCancelBio();
                }}
                className="flex-1 text-xs bg-slate-800 text-slate-200 px-2 py-1.5 rounded-lg outline-none border border-slate-600 focus:border-slate-500"
                placeholder="Write a bio..."
                autoFocus
                maxLength={80}
                disabled={isSavingBio}
              />
              <button
                onClick={handleSaveBio}
                disabled={isSavingBio}
                className={`${accent.text} hover:opacity-80 transition-opacity`}
              >
                <CheckIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancelBio}
                disabled={isSavingBio}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setBioInput(bio); setEditingBio(true); }}
              className="flex items-center gap-1.5 group text-left w-full"
            >
              <p className="text-slate-400 text-xs truncate max-w-[220px] group-hover:text-slate-300 transition-colors">
                {bio}
              </p>
              <PencilIcon className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
            </button>
          )}
        </div>

      </div>

      {showThemePanel && <ThemePanel onClose={() => setShowThemePanel(false)} />}
    </>
  );
}

export default ProfileHeader;