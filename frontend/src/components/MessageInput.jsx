import { useEffect, useRef, useState } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import { useTheme } from "../context/ThemeContext";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon, PaperclipIcon, FileIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import EmojiPicker from "emoji-picker-react";

const SEND_ANIMATION = `
  @keyframes sendPop {
    0%   { transform: scale(1); }
    40%  { transform: scale(0.88) rotate(-6deg); }
    70%  { transform: scale(1.12) rotate(3deg); }
    100% { transform: scale(1) rotate(0deg); }
  }
  .send-pop { animation: sendPop 0.32s cubic-bezier(0.34, 1.2, 0.64, 1); }
`;

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const { accent } = useTheme();

  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sendAnim, setSendAnim] = useState(false);

  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const { selectedUser, selectedGroup, sendMessage, isSoundEnabled } = useChatStore();
  const { socket } = useAuthStore();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!selectedUser && !selectedGroup) return null;

  const handleEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (selectedUser) {
      socket.emit("typing", { receiverId: selectedUser._id });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", { receiverId: selectedUser._id });
      }, 1000);
    }
    if (selectedGroup) {
      socket.emit("groupTyping", { groupId: selectedGroup._id });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("groupStopTyping", { groupId: selectedGroup._id });
      }, 1000);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !filePreview) return;

    if (isSoundEnabled) playRandomKeyStrokeSound();

    setSendAnim(true);
    setTimeout(() => setSendAnim(false), 350);

    sendMessage({
      text: text.trim(),
      image: imagePreview,
      file: filePreview?.base64 || null,
      fileName: filePreview?.name || null,
      fileType: filePreview?.type || null,
    });

    setText("");
    setImagePreview(null);
    setFilePreview(null);
    setShowEmojiPicker(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (docInputRef.current) docInputRef.current.value = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max size is 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview({ base64: reader.result, name: file.name, type: file.type });
    };
    reader.readAsDataURL(file);
  };

  const getFileColor = (type) => {
    if (type?.includes("pdf"))    return "text-red-400";
    if (type?.includes("word") || type?.includes("document")) return "text-blue-400";
    if (type?.includes("sheet") || type?.includes("excel"))   return "text-green-400";
    return "text-slate-400";
  };

  return (
    <div className="p-4 border-t border-slate-700/50 relative">
      <style>{SEND_ANIMATION}</style>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-20 left-4 z-50">
          <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" height={400} width={320} />
        </div>
      )}

      {/* Image preview */}
      {imagePreview && (
        <div className="max-w-3xl mx-auto mb-3 flex items-center">
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-slate-700" />
            <button
              onClick={() => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center"
              type="button"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* File preview */}
      {filePreview && (
        <div className="max-w-3xl mx-auto mb-3">
          <div className="relative inline-flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
            <FileIcon className={`w-5 h-5 ${getFileColor(filePreview.type)}`} />
            <span className="text-slate-200 text-sm truncate max-w-[200px]">{filePreview.name}</span>
            <button
              onClick={() => { setFilePreview(null); if (docInputRef.current) docInputRef.current.value = ""; }}
              className="ml-1 text-slate-400 hover:text-white"
              type="button"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex space-x-2">
        <input
          type="text"
          value={text}
          onChange={handleTyping}
          className="w-full bg-slate-800 text-white p-3 rounded-lg outline-none transition-shadow focus:ring-1 focus:ring-slate-600"
          placeholder={selectedGroup ? `Message ${selectedGroup.name}` : "Type your message..."}
        />

        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" ref={docInputRef} onChange={handleFileChange} className="hidden" />

        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="bg-slate-800/50 text-slate-400 hover:text-slate-200 px-3 rounded-lg transition-colors text-lg"
          title="Emoji"
        >
          😊
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`bg-slate-800/50 text-slate-400 ${accent.text && `hover:${accent.text}`} px-3 rounded-lg transition-colors`}
          title="Send image"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => docInputRef.current?.click()}
          className={`bg-slate-800/50 text-slate-400 ${accent.text && `hover:${accent.text}`} px-3 rounded-lg transition-colors`}
          title="Send file"
        >
          <PaperclipIcon className="w-5 h-5" />
        </button>

        <button
          type="submit"
          disabled={!text.trim() && !imagePreview && !filePreview}
          className={`${accent.bg} ${accent.hover} text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors ${sendAnim ? "send-pop" : ""}`}
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

export default MessageInput;