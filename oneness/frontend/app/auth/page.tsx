"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { playSound } from "@/lib/sounds";

type Step = "phone" | "otp";

export default function AuthPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOtp() {
    playSound("tap");
    setError("");
    if (!phone.match(/^\+[1-9]\d{6,14}$/)) {
      setError("Enter phone in E.164 format: +919876543210");
      return;
    }
    setLoading(true);
    try {
      await api.sendOtp(phone);
      setStep("otp");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    playSound("tap");
    setError("");
    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, otp);
      setSession(res.access_token, res.refresh_token, res.user_id);
      playSound("success");
      if (res.is_new_user) {
        router.push("/onboarding");
      } else {
        router.push("/sangha");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-light text-amber-300 tracking-widest">ONENESS</h1>
          <p className="text-zinc-500 text-sm mt-2 tracking-wide">
            A path for conscious connection
          </p>
        </div>

        {step === "phone" ? (
          <div className="space-y-4">
            <label className="block text-zinc-400 text-sm mb-1">
              Mobile number (with country code)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400 transition-colors"
              onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full bg-amber-400 text-black font-medium py-3 rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send OTP"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-zinc-400 text-sm mb-1">
              Enter the 6-digit code sent to {phone}
            </label>
            <input
              type="number"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest placeholder-zinc-600 focus:outline-none focus:border-amber-400 transition-colors"
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length < 6}
              className="w-full bg-amber-400 text-black font-medium py-3 rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Continue"}
            </button>
            <button
              onClick={() => { playSound("tap"); setStep("phone"); setOtp(""); setError(""); }}
              className="w-full text-zinc-500 text-sm py-2 hover:text-zinc-300 transition-colors"
            >
              ← Change number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
