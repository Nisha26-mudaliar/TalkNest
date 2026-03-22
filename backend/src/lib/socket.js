import { Server } from "socket.io";
import http from "http";
import express from "express";
import mongoose from "mongoose";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import Message from "../models/Message.js";

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

// auth middleware
io.use(socketAuthMiddleware);

// get receiver socket
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.user.fullName);

  const userId = socket.user._id.toString();

  // add user
  userSocketMap[userId] = socket.id;

  // send online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

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

  // ================= GROUP =================
  socket.on("joinGroup", (groupId) => {
    socket.join(groupId);
  });

  socket.on("sendGroupMessage", async (data) => {
    try {
      const newMessage = await Message.create({
        groupId: new mongoose.Types.ObjectId(data.groupId),
        senderId: userId,
        text: data.text,
      });

      const message = {
        ...newMessage._doc,
        senderName: socket.user.fullName,
      };

      io.to(data.groupId).emit("receiveGroupMessage", message);
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("groupTyping", ({ groupId }) => {
    socket.to(groupId).emit("groupTyping", { userId });
  });

  socket.on("groupStopTyping", ({ groupId }) => {
    socket.to(groupId).emit("groupStopTyping", { userId });
  });

  // ================= VIDEO CALL SIGNALING =================

  // 1️⃣ Caller initiates call
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

  // 2️⃣ Receiver answers call
  socket.on("answerCall", ({ to, answer }) => {
    const callerSocketId = getReceiverSocketId(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callAnswered", { answer });
    }
  });

  // 3️⃣ ICE candidates exchange (both sides)
  socket.on("iceCandidate", ({ to, candidate }) => {
    const targetSocketId = getReceiverSocketId(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("iceCandidate", { candidate });
    }
  });

  // 4️⃣ End call (either side)
  socket.on("endCall", ({ to }) => {
    const targetSocketId = getReceiverSocketId(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("callEnded");
    }
  });

  // 5️⃣ Reject call
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
  });
});

export { io, app, server };