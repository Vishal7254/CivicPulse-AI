"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleResetPassword = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: token,
            new_password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to reset password."
        );
      }

      setMessage(
        "Password reset successful. Redirecting to login..."
      );

      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">

      <div className="w-full max-w-md">

        {/* Branding */}
        <div className="text-center mb-8">

          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white text-2xl font-bold">
            C
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            CivicPulse AI
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Reset your password
          </p>

        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-100">

          <h2 className="text-xl font-semibold text-gray-900">
            Create New Password
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Enter a new password for your CivicPulse AI account.
          </p>

          <form
            onSubmit={handleResetPassword}
            className="mt-6 space-y-5"
          >

            {/* Password */}
            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                New Password
              </label>

              <div className="relative">

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter new password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-16 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-600"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>

              </div>

            </div>

            {/* Confirm Password */}
            <div>

              <label className="mb-2 block text-sm font-medium text-gray-900">
                Confirm Password
              </label>

              <div className="relative">

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Confirm new password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-16 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-600"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>

              </div>

            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Success */}
            {message && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Resetting Password..."
                : "Reset Password"}
            </button>

          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← Back to Login
            </button>

          </div>

        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          © 2026 CivicPulse AI
        </p>

      </div>

    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <p className="text-gray-500">Loading...</p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}