import Group from "../models/Group.js";
import cloudinary from "../lib/cloudinary.js";
import mongoose from "mongoose";

// ✅ Helper to safely get ID as string
const toStr = (id) => {
  if (!id) return null;
  if (id._id) return id._id.toString(); // populated object
  return id.toString(); // ObjectId
};

// ⭐ Get groups of logged in user
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ members: userId })
      .populate("members", "fullName profilePic")
      .populate("admin", "fullName profilePic");
    res.status(200).json(groups);
  } catch (error) {
    console.log("Error fetching groups:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ⭐ Create group
export const createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;
    if (!name || !members || members.length === 0) {
      return res.status(400).json({ message: "Name and members required" });
    }
    const newGroup = new Group({
      name,
      members: [...members, req.user._id],
      admin: req.user._id,
    });
    await newGroup.save();
    const populatedGroup = await Group.findById(newGroup._id)
      .populate("members", "fullName profilePic")
      .populate("admin", "fullName profilePic");
    res.status(201).json(populatedGroup);
  } catch (error) {
    console.log("Error creating group:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Add member — admin only
export const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user._id.toString();

    console.log("ADD MEMBER:", { groupId, userId, requesterId });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const adminId = toStr(group.admin);
    console.log("adminId:", adminId, "requesterId:", requesterId);

    if (adminId !== requesterId) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    const memberIds = group.members.map((m) => toStr(m));
    if (memberIds.includes(userId)) {
      return res.status(400).json({ message: "User is already a member" });
    }

    group.members.push(new mongoose.Types.ObjectId(userId));
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName profilePic")
      .populate("admin", "fullName profilePic");

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error adding member:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Remove member — admin only
export const removeMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user._id.toString();

    console.log("REMOVE MEMBER:", { groupId, userId, requesterId });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const adminId = toStr(group.admin);
    console.log("adminId:", adminId, "requesterId:", requesterId, "match:", adminId === requesterId);

    if (adminId !== requesterId) {
      return res.status(403).json({ message: "Only admin can remove members" });
    }

    if (userId === requesterId) {
      return res.status(400).json({ message: "Admin cannot remove themselves. Use leave group instead." });
    }

    const memberIds = group.members.map((m) => toStr(m));
    if (!memberIds.includes(userId)) {
      return res.status(400).json({ message: "User is not a member" });
    }

    group.members = group.members.filter((m) => toStr(m) !== userId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName profilePic")
      .populate("admin", "fullName profilePic");

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error removing member:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Leave group — any member
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id.toString();

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const memberIds = group.members.map((m) => toStr(m));
    if (!memberIds.includes(userId)) {
      return res.status(400).json({ message: "You are not a member of this group" });
    }

    if (toStr(group.admin) === userId) {
      const remainingMembers = group.members.filter((m) => toStr(m) !== userId);
      if (remainingMembers.length === 0) {
        await Group.findByIdAndDelete(groupId);
        return res.status(200).json({ message: "Group deleted", deleted: true });
      }
      group.admin = remainingMembers[0];
    }

    group.members = group.members.filter((m) => toStr(m) !== userId);
    await group.save();

    res.status(200).json({ message: "Left group successfully" });
  } catch (error) {
    console.log("Error leaving group:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Change group pic — admin only
export const updateGroupPic = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { avatar } = req.body;
    const requesterId = req.user._id.toString();

    if (!avatar) return res.status(400).json({ message: "Avatar is required" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (toStr(group.admin) !== requesterId) {
      return res.status(403).json({ message: "Only admin can change group picture" });
    }

    const uploadResponse = await cloudinary.uploader.upload(avatar);
    group.avatar = uploadResponse.secure_url;
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName profilePic")
      .populate("admin", "fullName profilePic");

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error updating group pic:", error);
    res.status(500).json({ message: "Server error" });
  }
};