"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Something went wrong.");
      }

      setMessage(
        "If this email is registered, a password reset link has been sent."
      );
      setEmail("");
    } catch (err: any) {
      setError(err.message || "Unable to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">

          {/* Logo / Heading */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white text-2xl font-bold">
              C
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Forgot Password?
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Enter your registered email address and we&apos;ll send you a
              password reset link.
            </p>
          </div>

          {/* Success Message */}
          {message && (
            <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/login")}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← Back to Login
            </button>
          </div>

        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © 2026 CivicPulse AI. All rights reserved.
        </p>
      </div>
    </main>
  );
}