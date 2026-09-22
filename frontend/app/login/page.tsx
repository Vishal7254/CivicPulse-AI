"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.access_token) {
        throw new Error(
          data.message || data.detail || "Invalid email or password"
        );
      }

      localStorage.setItem("access_token", data.access_token);
      if (data.role) {
        localStorage.setItem("user_role", data.role);
      }
      if (data.name) {
        localStorage.setItem("user_name", data.name);
      }

      if (data.role === "citizen") {
        router.push("/citizen");
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Branding */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl text-white shadow-lg">
            🏛️
          </div>

          <h1 className="text-3xl font-bold text-slate-800">
            CivicPulse AI
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Smart Civic Complaint Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-800">
              Administrator Login
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Sign in to access the administration panel
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >
            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="admin@example.com"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>

              <div className="relative">
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-20 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Action Links */}
            <div className="flex items-center justify-between text-xs pt-1">
              <Link
                href="/forgot-password"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Forgot password?
              </Link>
              <Link
                href="/register"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Create citizen account →
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Signing in..."
                : "Sign In"}
            </button>
          </form>

          {/* Security note */}
          <div className="mt-6 border-t border-slate-200 pt-5 text-center">
            <p className="text-xs text-slate-500">
              Access for Citizens & Administrators
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © 2026 CivicPulse AI
        </p>

      </div>
    </main>
  );
}