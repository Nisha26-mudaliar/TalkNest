import nodemailer from "nodemailer";
import { createWelcomeEmailTemplate } from "../emails/emailTemplates.js";

export const sendWelcomeEmail = async (email, name, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"TalkNest" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your TalkNest Verification Code",
      html: createWelcomeEmailTemplate(name, otp),
    });

    console.log("Verification OTP sent successfully");
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
};