import { useRef, useState } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon, PaperclipIcon, FileIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  // ✅ File state
  const [filePreview, setFilePreview] = useState(null); // { base64, name, type }

  const fileInputRef = useRef(null);
  const docInputRef = useRef(null); // ✅ separate ref for documents

  const { selectedUser, selectedGroup, sendMessage, isSoundEnabled } =
    useChatStore();

  const { socket } = useAuthStore();

  if (!selectedUser && !selectedGroup) return null;

  const handleTyping = (e) => {
    setText(e.target.value);

    if (selectedUser) {
      socket.emit("typing", { receiverId: selectedUser._id });
      setTimeout(() => {
        socket.emit("stopTyping", { receiverId: selectedUser._id });
      }, 1000);
    }

    if (selectedGroup) {
      socket.emit("groupTyping", { groupId: selectedGroup._id });
      setTimeout(() => {
        socket.emit("groupStopTyping", { groupId: selectedGroup._id });
      }, 1000);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !filePreview) return;

    if (isSoundEnabled) playRandomKeyStrokeSound();

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
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (docInputRef.current) docInputRef.current.value = "";
  };

  // ✅ Handle image selection
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

  // ✅ Handle document selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxSize) {
      toast.error("File too large. Max size is 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview({
        base64: reader.result,
        name: file.name,
        type: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = () => {
    setFilePreview(null);
    if (docInputRef.current) docInputRef.current.value = "";
  };

  // ✅ Get icon color based on file type
  const getFileColor = (type) => {
    if (type?.includes("pdf")) return "text-red-400";
    if (type?.includes("word") || type?.includes("document")) return "text-blue-400";
    if (type?.includes("sheet") || type?.includes("excel")) return "text-green-400";
    return "text-slate-400";
  };

  return (
    <div className="p-4 border-t border-slate-700/50">

      {/* ✅ Image preview */}
      {imagePreview && (
        <div className="max-w-3xl mx-auto mb-3 flex items-center">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-slate-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center"
              type="button"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ✅ File preview */}
      {filePreview && (
        <div className="max-w-3xl mx-auto mb-3">
          <div className="relative inline-flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
            <FileIcon className={`w-5 h-5 ${getFileColor(filePreview.type)}`} />
            <span className="text-slate-200 text-sm truncate max-w-[200px]">
              {filePreview.name}
            </span>
            <button
              onClick={removeFile}
              className="ml-1 text-slate-400 hover:text-white"
              type="button"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSendMessage}
        className="max-w-3xl mx-auto flex space-x-2"
      >
        <input
          type="text"
          value={text}
          onChange={handleTyping}
          className="w-full bg-slate-800 text-white p-3 rounded-lg outline-none"
          placeholder={
            selectedGroup
              ? `Message ${selectedGroup.name}`
              : "Type your message..."
          }
        />

        {/* Hidden image input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
        />

        {/* ✅ Hidden document input */}
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
          ref={docInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Image button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-slate-800/50 text-slate-400 hover:text-cyan-400 px-3 rounded-lg transition-colors"
          title="Send image"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        {/* ✅ File/Document button */}
        <button
          type="button"
          onClick={() => docInputRef.current?.click()}
          className="bg-slate-800/50 text-slate-400 hover:text-cyan-400 px-3 rounded-lg transition-colors"
          title="Send file"
        >
          <PaperclipIcon className="w-5 h-5" />
        </button>

        {/* Send button */}
        <button
          type="submit"
          disabled={!text.trim() && !imagePreview && !filePreview}
          className="bg-cyan-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

export default MessageInput;