import express from "express";
import {
  getUserGroups,
  createGroup,
  addMember,
  removeMember,
  leaveGroup,
  updateGroupPic,
} from "../controllers/group.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.get("/my-groups", protectRoute, getUserGroups);
router.post("/:groupId/add-member", protectRoute, addMember);
router.post("/:groupId/remove-member", protectRoute, removeMember); // ✅ NEW
router.post("/:groupId/leave", protectRoute, leaveGroup);
router.put("/:groupId/update-pic", protectRoute, updateGroupPic);

export default router;