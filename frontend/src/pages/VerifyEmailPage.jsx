import { useState } from "react";
import { useNavigate } from "react-router";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

function VerifyEmailPage() {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const navigate = useNavigate();

  const email = sessionStorage.getItem("verifyEmail") || "";

  const handleVerify = async () => {
    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }

    setIsVerifying(true);

    try {
      const res = await axiosInstance.post("/auth/verify-email", { otp });
      toast.success(res.data.message);
      sessionStorage.removeItem("verifyEmail");
      navigate("/login");
    } catch (error) {
      console.error("Verify error:", error);
      toast.error(error.response?.data?.message || "Invalid OTP");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Email not found. Please sign up again.");
      return;
    }

    setIsResending(true);

    try {
      const res = await axiosInstance.post("/auth/resend-otp", { email });
      toast.success(res.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend OTP");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-md shadow-xl">

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cyan-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📩</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-slate-400 text-sm">We sent a 6-digit verification code to</p>
          {email && <p className="text-cyan-400 font-medium text-sm mt-1">{email}</p>}
        </div>

        <div className="mb-6">
          <label className="block text-slate-300 text-sm mb-2 text-center">
            Enter your verification code
          </label>
          <input
            type="number"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            autoFocus
            className="w-full text-center text-2xl font-bold bg-slate-700 text-white border-2 border-slate-600 focus:border-cyan-500 rounded-xl p-4 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors mb-4"
        >
          {isVerifying ? "Verifying..." : "Verify Email"}
        </button>

        <div className="text-center">
          <p className="text-slate-400 text-sm">
            Didn't receive the code?{" "}
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-cyan-400 hover:text-cyan-300 font-medium disabled:opacity-50 transition-colors"
            >
              {isResending ? "Sending..." : "Resend OTP"}
            </button>
          </p>
        </div>

        <div className="text-center mt-4">
          <button
            onClick={() => navigate("/signup")}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            ← Back to Sign Up
          </button>
        </div>

      </div>
    </div>
  );
}

export default VerifyEmailPage;