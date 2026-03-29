import { Server } from "socket.io";
import http from "http";
import express from "express";
import mongoose from "mongoose";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import Message from "../models/Message.js";
import Group from "../models/Group.js";
import cloudinary from "./cloudinary.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ENV.CLIENT_URL],
    credentials: true,
  },
});

const userSocketMap = {};

// Track active group calls: groupId → Set of userIds in the call
const groupCallParticipants = {};

// ✅ Track call start times: "userId-userId" → startTime (for 1-on-1)
const callStartTimes = {};

// ✅ Track group call start times: groupId → startTime
const groupCallStartTimes = {};

io.use(socketAuthMiddleware);

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// ✅ Helper: format seconds into "mm:ss" or "hh:mm:ss"
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

io.on("connection", async (socket) => {
  console.log("User connected:", socket.user.fullName);

  const userId = socket.user._id.toString();
  userSocketMap[userId] = socket.id;
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Auto-join all groups on connect
  try {
    const userGroups = await Group.find({ members: socket.user._id }).select("_id");
    userGroups.forEach((group) => {
      socket.join(group._id.toString());
    });
  } catch (err) {
    console.log("Error auto-joining groups:", err);
  }

  // ================= PRIVATE TYPING =================
  socket.on("typing", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId: userId });
    }
  });

  socket.on("stopTyping", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", { senderId: userId });
    }
  });

  // ================= GROUP CHAT =================
  socket.on("joinGroup", (groupId) => {
    socket.join(groupId);
  });

  socket.on("sendGroupMessage", async (data) => {
    try {
      let fileUrl;
      if (data.file) {
        const uploadResponse = await cloudinary.uploader.upload(data.file, {
          resource_type: "raw",
          public_id: `chat_files/${Date.now()}_${data.fileName}`,
        });
        fileUrl = uploadResponse.secure_url;
      }

      const newMessage = await Message.create({
        groupId: new mongoose.Types.ObjectId(data.groupId),
        senderId: userId,
        text: data.text,
        file: fileUrl,
        fileName: data.fileName,
        fileType: data.fileType,
      });

      const message = {
        ...newMessage._doc,
        senderName: socket.user.fullName,
        senderPic: socket.user.profilePic,
      };

      io.to(data.groupId).emit("receiveGroupMessage", message);
    } catch (error) {
      console.log("sendGroupMessage error:", error);
    }
  });

  socket.on("groupTyping", ({ groupId }) => {
    socket.to(groupId).emit("groupTyping", { userId });
  });

  socket.on("groupStopTyping", ({ groupId }) => {
    socket.to(groupId).emit("groupStopTyping", { userId });
  });

  // ================= GROUP VIDEO CALL =================
  socket.on("startGroupCall", ({ groupId, groupName, startedByName }) => {
    if (!groupCallParticipants[groupId]) {
      groupCallParticipants[groupId] = new Set();
    }
    groupCallParticipants[groupId].add(userId);

    // ✅ Record start time
    groupCallStartTimes[groupId] = Date.now();

    socket.to(groupId).emit("incomingGroupCall", {
      groupId,
      groupName,
      startedBy: userId,
      startedByName,
    });
  });

  socket.on("joinGroupCall", ({ groupId, joinerName }) => {
    if (!groupCallParticipants[groupId]) {
      groupCallParticipants[groupId] = new Set();
    }
    const existingParticipants = [...groupCallParticipants[groupId]];
    groupCallParticipants[groupId].add(userId);

    existingParticipants.forEach((participantId) => {
      const participantSocketId = getReceiverSocketId(participantId);
      if (participantSocketId) {
        io.to(participantSocketId).emit("groupCallNewJoiner", {
          joinerId: userId,
          joinerName,
        });
      }
    });
  });

  socket.on("groupCallOffer", ({ to, offer, groupId }) => {
    const toSocketId = getReceiverSocketId(to);
    if (toSocketId) {
      io.to(toSocketId).emit("groupCallOffer", {
        from: userId,
        fromName: socket.user.fullName,
        offer,
        groupId,
      });
    }
  });

  socket.on("groupCallAnswer", ({ to, answer, groupId }) => {
    const toSocketId = getReceiverSocketId(to);
    if (toSocketId) {
      io.to(toSocketId).emit("groupCallAnswer", { from: userId, answer, groupId });
    }
  });

  socket.on("groupCallIce", ({ to, candidate, groupId }) => {
    const toSocketId = getReceiverSocketId(to);
    if (toSocketId) {
      io.to(toSocketId).emit("groupCallIce", { from: userId, candidate, groupId });
    }
  });

  // ✅ Someone leaves the group call — save call message if last person leaving
  socket.on("leaveGroupCall", async ({ groupId }) => {
    if (groupCallParticipants[groupId]) {
      groupCallParticipants[groupId].delete(userId);

      // Notify remaining participants
      groupCallParticipants[groupId].forEach((participantId) => {
        const socketId = getReceiverSocketId(participantId);
        if (socketId) {
          io.to(socketId).emit("groupCallParticipantLeft", { userId });
        }
      });

      // ✅ If last person left, save call ended message to DB
      if (groupCallParticipants[groupId].size === 0) {
        delete groupCallParticipants[groupId];

        try {
          const startTime = groupCallStartTimes[groupId];
          const durationSecs = startTime
            ? Math.floor((Date.now() - startTime) / 1000)
            : 0;
          delete groupCallStartTimes[groupId];

          const callMessage = await Message.create({
            groupId: new mongoose.Types.ObjectId(groupId),
            senderId: userId,
            text: ` Group video call ended • ${formatDuration(durationSecs)}`,
            messageType: "call",
          });

          const msgToEmit = {
            ...callMessage._doc,
            senderName: socket.user.fullName,
            senderPic: socket.user.profilePic,
          };

          io.to(groupId).emit("receiveGroupMessage", msgToEmit);
        } catch (err) {
          console.log("Error saving group call message:", err);
        }
      }
    }
  });

  // ================= 1-ON-1 VIDEO CALL =================
  socket.on("callUser", ({ to, offer, callerName }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incomingCall", {
        from: userId,
        callerName,
        offer,
      });
    }
  });

  socket.on("answerCall", ({ to, answer }) => {
    const callerSocketId = getReceiverSocketId(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callAnswered", { answer });

      // ✅ Record call start time when answered
      const key = [userId, to].sort().join("-");
      callStartTimes[key] = Date.now();
    }
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    const targetSocketId = getReceiverSocketId(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("iceCandidate", { candidate });
    }
  });

  // ✅ End call — save call message to both users' chat
  socket.on("endCall", async ({ to }) => {
    const targetSocketId = getReceiverSocketId(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("callEnded");
    }

    try {
      const key = [userId, to].sort().join("-");
      const startTime = callStartTimes[key];
      const durationSecs = startTime
        ? Math.floor((Date.now() - startTime) / 1000)
        : 0;
      delete callStartTimes[key];

      const callMessage = await Message.create({
        senderId: userId,
        receiverId: to,
        text: ` Video call ended • ${formatDuration(durationSecs)}`,
        messageType: "call",
      });

      // ✅ Emit to both users so it appears in their chat immediately
      const senderSocketId = getReceiverSocketId(userId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("newMessage", callMessage);
      }
      if (targetSocketId) {
        io.to(targetSocketId).emit("newMessage", callMessage);
      }
    } catch (err) {
      console.log("Error saving call message:", err);
    }
  });

  socket.on("rejectCall", ({ to }) => {
    const callerSocketId = getReceiverSocketId(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callRejected");
    }
  });

  // ================= DISCONNECT =================
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.user.fullName);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    Object.entries(groupCallParticipants).forEach(([groupId, participants]) => {
      if (participants.has(userId)) {
        participants.delete(userId);
        participants.forEach((participantId) => {
          const socketId = getReceiverSocketId(participantId);
          if (socketId) {
            io.to(socketId).emit("groupCallParticipantLeft", { userId });
          }
        });
        if (participants.size === 0) {
          delete groupCallParticipants[groupId];
        }
      }
    });
  });
});

export { io, app, server };