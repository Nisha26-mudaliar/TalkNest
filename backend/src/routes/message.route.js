import express from "express";
import {
  getAllContacts,
  getChatPartners,
  getMessagesByUserId,
  sendMessage,
  getGroupMessages,
  deleteMessage,
  deleteMessageForMe,
  reactToMessage,
} from "../controllers/message.controller.js";

import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute);

router.get("/contacts", getAllContacts);
router.get("/chats", getChatPartners);
router.get("/:id", getMessagesByUserId);
router.post("/send/:id", sendMessage);

// ⭐ group messages
router.get("/group/:groupId", getGroupMessages);

// ✅ Delete for everyone (sender only)
router.delete("/:messageId", deleteMessage);

// ✅ Delete for me only
router.patch("/:messageId/delete-for-me", deleteMessageForMe);

// ✅ React to a message
router.post("/react/:msgId", reactToMessage);

export default router;