import { Server } from "socket.io";
import http from "http";
import express from "express";
import mongoose from "mongoose";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import Message from "../models/Message.js";
import Group from "../models/Group.js"; // ✅ import Group model
import cloudinary from "./cloudinary.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ENV.CLIENT_URL],
    credentials: true,
  },
});

// store online users
const userSocketMap = {};

// ✅ Track active group calls: groupId → Set of userIds in the call
const groupCallParticipants = {};

// auth middleware
io.use(socketAuthMiddleware);

// get receiver socket
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", async (socket) => {
  console.log("User connected:", socket.user.fullName);

  const userId = socket.user._id.toString();

  // add user
  userSocketMap[userId] = socket.id;

  // send online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // ✅ FIX: Auto-join all groups the user belongs to on connect
  // This ensures they receive incomingGroupCall even if they haven't opened the group chat
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
    socket.join(groupId); // still keep this for explicit joins
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

  // Someone starts a group call — notify all members in the group room
  socket.on("startGroupCall", ({ groupId, groupName, startedByName }) => {
    // Init participant set for this group call
    if (!groupCallParticipants[groupId]) {
      groupCallParticipants[groupId] = new Set();
    }
    groupCallParticipants[groupId].add(userId);

    // ✅ Notify everyone else in the group room (now guaranteed since we auto-join on connect)
    socket.to(groupId).emit("incomingGroupCall", {
      groupId,
      groupName,
      startedBy: userId,
      startedByName,
    });
  });

  // Someone joins an ongoing group call
  socket.on("joinGroupCall", ({ groupId, joinerName }) => {
    if (!groupCallParticipants[groupId]) {
      groupCallParticipants[groupId] = new Set();
    }

    const existingParticipants = [...groupCallParticipants[groupId]];

    // Add joiner to participants
    groupCallParticipants[groupId].add(userId);

    // Tell all existing participants about the new joiner so they initiate offers
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

  // WebRTC offer — direct peer-to-peer signaling
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

  // WebRTC answer
  socket.on("groupCallAnswer", ({ to, answer, groupId }) => {
    const toSocketId = getReceiverSocketId(to);
    if (toSocketId) {
      io.to(toSocketId).emit("groupCallAnswer", {
        from: userId,
        answer,
        groupId,
      });
    }
  });

  // ICE candidate exchange
  socket.on("groupCallIce", ({ to, candidate, groupId }) => {
    const toSocketId = getReceiverSocketId(to);
    if (toSocketId) {
      io.to(toSocketId).emit("groupCallIce", {
        from: userId,
        candidate,
        groupId,
      });
    }
  });

  // Someone leaves the group call
  socket.on("leaveGroupCall", ({ groupId }) => {
    if (groupCallParticipants[groupId]) {
      groupCallParticipants[groupId].delete(userId);

      // Notify remaining participants
      groupCallParticipants[groupId].forEach((participantId) => {
        const socketId = getReceiverSocketId(participantId);
        if (socketId) {
          io.to(socketId).emit("groupCallParticipantLeft", { userId });
        }
      });

      // Clean up if call is empty
      if (groupCallParticipants[groupId].size === 0) {
        delete groupCallParticipants[groupId];
      }
    }
  });

  // ================= 1-ON-1 VIDEO CALL SIGNALING =================

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
    }
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    const targetSocketId = getReceiverSocketId(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("iceCandidate", { candidate });
    }
  });

  socket.on("endCall", ({ to }) => {
    const targetSocketId = getReceiverSocketId(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("callEnded");
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

    // ✅ Clean up any group calls this user was in
    Object.entries(groupCallParticipants).forEach(([groupId, participants]) => {
      if (participants.has(userId)) {
        participants.delete(userId);

        // Notify remaining participants
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