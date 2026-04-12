import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// ⭐ Get all contacts
export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
      isVerified: true,
    }).select("-password");
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.log("Error in getAllContacts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ⭐ Get messages (filter out deleted-for-me)
export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    await Message.updateMany(
      { senderId: userToChatId, receiverId: myId, status: { $ne: "seen" } },
      { $set: { status: "seen" } }
    );

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      deletedFor: { $ne: myId }, // ✅ exclude messages deleted for me
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ⭐ Send message (DM)
export const sendMessage = async (req, res) => {
  try {
    const { text, image, file, fileName, fileType } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !image && !file) {
      return res.status(400).json({ message: "Text, image or file is required." });
    }

    if (senderId.equals(receiverId)) {
      return res.status(400).json({ message: "Cannot send messages to yourself." });
    }

    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    let imageUrl;
    let fileUrl;

    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    if (file) {
      const uploadResponse = await cloudinary.uploader.upload(file, {
        resource_type: "raw",
        public_id: `chat_files/${Date.now()}_${fileName}`,
      });
      fileUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      file: fileUrl,
      fileName,
      fileType,
      status: "sent",
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      newMessage.status = "delivered";
      await newMessage.save();
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Delete for everyone — sender only
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the sender can delete for everyone" });
    }

    if (message.image) {
      const publicId = message.image.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }
    if (message.file) {
      const publicId = `chat_files/${message.file.split("chat_files/")[1]}`;
      await cloudinary.uploader.destroy(publicId, { resource_type: "raw" }).catch(() => {});
    }

    await Message.findByIdAndDelete(messageId);

    const otherUserId = message.receiverId;
    const otherSocketId = getReceiverSocketId(otherUserId?.toString());
    if (otherSocketId) {
      io.to(otherSocketId).emit("messageDeleted", { messageId });
    }

    const senderSocketId = getReceiverSocketId(userId.toString());
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageDeleted", { messageId });
    }

    res.status(200).json({ message: "Message deleted for everyone" });
  } catch (error) {
    console.log("Error in deleteMessage:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete for me only
export const deleteMessageForMe = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    res.status(200).json({ message: "Message deleted for you" });
  } catch (error) {
    console.log("Error in deleteMessageForMe:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ⭐ Get chat partners — FIXED: null checks for deleted users
export const getChatPartners = async (req, res) => {
  try {
    const userId = req.user._id;
    const messages = await Message.find({
      $and: [
        { $or: [{ senderId: userId }, { receiverId: userId }] },
        { groupId: { $exists: false } },
      ],
    }).populate("senderId receiverId", "fullName profilePic");

    const users = [];
    messages.forEach((msg) => {
      // ✅ FIX: null check before accessing ._id (handles deleted users)
      if (msg.senderId && msg.senderId._id.toString() !== userId.toString()) {
        users.push(msg.senderId);
      }
      if (msg.receiverId && msg.receiverId._id.toString() !== userId.toString()) {
        users.push(msg.receiverId);
      }
    });

    const uniqueUsers = Array.from(
      new Map(users.map((u) => [u._id.toString(), u])).values()
    );

    res.status(200).json(uniqueUsers);
  } catch (error) {
    console.log("ERROR IN getChatPartners:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ⭐ Send group message via HTTP — FIXED: image upload + populated socket emit
export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image, file, fileName, fileType } = req.body; // ✅ FIX 1: added image
    const { groupId } = req.params;
    const senderId = req.user._id;

    let imageUrl; // ✅ FIX 1: added imageUrl
    let fileUrl;

    // ✅ FIX 1: Upload image to Cloudinary if present
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // ✅ Upload file to Cloudinary if present
    if (file) {
      const uploadResponse = await cloudinary.uploader.upload(file, {
        resource_type: "raw",
        public_id: `chat_files/${Date.now()}_${fileName}`,
      });
      fileUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      groupId,
      text,
      image: imageUrl, // ✅ FIX 1: save image URL
      file: fileUrl,
      fileName,
      fileType,
    });

    await newMessage.save();

    // ✅ FIX 2: Populate sender before emitting so real-time message has senderName
    const populated = await Message.findById(newMessage._id)
      .populate("senderId", "fullName profilePic");

    const messageToEmit = {
      ...populated._doc,
      senderName: populated.senderId?.fullName,
      senderPic: populated.senderId?.profilePic,
      senderId: populated.senderId?._id,
    };

    io.to(groupId).emit("newGroupMessage", messageToEmit); // ✅ FIX 2: emit populated message
    res.status(201).json(messageToEmit); // ✅ consistent shape for HTTP response too
  } catch (error) {
    console.log("Error in sendGroupMessage:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get group messages with sender name populated
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    const messages = await Message.find({ groupId })
      .populate("senderId", "fullName profilePic");

    const messagesWithName = messages.map((msg) => ({
      ...msg._doc,
      senderName: msg.senderId?.fullName,
      senderPic: msg.senderId?.profilePic,
      senderId: msg.senderId?._id,
    }));

    res.status(200).json(messagesWithName);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { msgId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(msgId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Toggle: if user already reacted with same emoji, remove it
    const existingIndex = message.reactions.findIndex(
      (r) =>
        r.userId.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingIndex > -1) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    const receiverId = message.receiverId?.toString();
    if (receiverId) {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageReaction", {
          msgId: message._id,
          reactions: message.reactions,
        });
      }
    }

    res.json({ reactions: message.reactions });
  } catch (error) {
    console.error("Error in reactToMessage:", error);
    res.status(500).json({ error: error.message });
  }
};