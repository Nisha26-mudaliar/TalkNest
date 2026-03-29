import { sendWelcomeEmail } from "../emails/emailHandlers.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { ENV } from "../lib/env.js";
import cloudinary from "../lib/cloudinary.js";
import crypto from "crypto";

/* ===========================
   SIGNUP
=========================== */
export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (existingUser && !existingUser.isVerified) {
      existingUser.password = hashedPassword;
      existingUser.fullName = fullName;
      existingUser.verificationToken = otp;
      existingUser.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
      await existingUser.save();

      await sendWelcomeEmail(existingUser.email, existingUser.fullName, otp);

      return res.status(200).json({
        message: "OTP resent. Please check your email.",
      });
    }

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken: otp,
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
    });

    await newUser.save();

    try {
      await sendWelcomeEmail(newUser.email, newUser.fullName, otp);
    } catch (error) {
      console.error("Failed to send verification email:", error);
    }

    res.status(201).json({
      message: "Signup successful. Please check your email for the OTP.",
    });

  } catch (error) {
    console.log("Error in signup controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ===========================
   VERIFY EMAIL (OTP)
=========================== */
export const verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    const user = await User.findOne({
      verificationToken: otp,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired OTP. Please try again.",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;

    await user.save();

    res.status(200).json({
      message: "Email verified successfully! You can now login.",
    });

  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ===========================
   RESEND OTP
=========================== */
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.verificationToken = otp;
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    await sendWelcomeEmail(user.email, user.fullName, otp);

    res.status(200).json({ message: "OTP resent successfully!" });

  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ===========================
   LOGIN
=========================== */
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        message: "Please verify your email before logging in.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      bio: user.bio, // ✅ include bio in login response
    });

  } catch (error) {
    console.error("Error in login controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ===========================
   LOGOUT
=========================== */
export const logout = (_, res) => {
  res.cookie("jwt", "", { maxAge: 0 });
  res.status(200).json({ message: "Logged out successfully" });
};

/* ===========================
   UPDATE PROFILE
=========================== */
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio } = req.body; // ✅ accept both profilePic and bio
    const userId = req.user._id;

    // Build update object dynamically
    const updates = {};

    // ✅ Handle profilePic update
    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      updates.profilePic = uploadResponse.secure_url;
    }

    // ✅ Handle bio update
    if (bio !== undefined) {
      updates.bio = bio.trim().slice(0, 80); // enforce max length server-side too
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true }
    );

    res.status(200).json(updatedUser);

  } catch (error) {
    console.log("Error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ===========================
   CHECK AUTH
=========================== */
export const checkAuth = async (req, res) => {
  try {
    // ✅ Return full user including bio
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};