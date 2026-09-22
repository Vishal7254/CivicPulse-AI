"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
    city: false,
    address: false,
    password: false,
    confirmPassword: false,
  });

  /* =========================
     VALIDATION
  ========================== */

  const nameValid =
    /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(name.trim());

  const emailValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const phoneValid = /^[6-9]\d{9}$/.test(phone);

  const cityValid =
    /^[A-Za-z]+(?:[\s-][A-Za-z]+)*$/.test(city.trim());

  const addressValid = address.trim().length >= 5;

  const passwordValid = password.length >= 8;

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  /* =========================
     PASSWORD STRENGTH
  ========================== */

  const getPasswordStrength = () => {
    if (!password) {
      return {
        score: 0,
        label: "",
        width: "0%",
      };
    }

    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) {
      return {
        score,
        label: "Weak",
        width: "25%",
      };
    }

    if (score <= 3) {
      return {
        score,
        label: "Good",
        width: "60%",
      };
    }

    return {
      score,
      label: "Strong",
      width: "100%",
    };
  };

  const passwordStrength = getPasswordStrength();

  /* =========================
     FIELD BLUR
  ========================== */

  const markTouched = (
    field:
      | "name"
      | "email"
      | "phone"
      | "city"
      | "address"
      | "password"
      | "confirmPassword"
  ) => {
    setTouched((previous) => ({
      ...previous,
      [field]: true,
    }));
  };

  /* =========================
     REGISTER
  ========================== */

  const handleRegister = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setErrorMessage("");

    setTouched({
      name: true,
      email: true,
      phone: true,
      city: true,
      address: true,
      password: true,
      confirmPassword: true,
    });

    if (!nameValid) {
      setErrorMessage(
        "Please enter a valid name using letters and spaces only."
      );
      return;
    }

    if (!emailValid) {
      setErrorMessage(
        "Please enter a valid email address."
      );
      return;
    }

    if (!phoneValid) {
      setErrorMessage(
        "Please enter a valid 10-digit Indian mobile number."
      );
      return;
    }

    if (!cityValid) {
      setErrorMessage(
        "Please enter a valid city name."
      );
      return;
    }

    if (!addressValid) {
      setErrorMessage(
        "Please enter a valid address."
      );
      return;
    }

    if (!passwordValid) {
      setErrorMessage(
        "Password must be at least 8 characters long."
      );
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            city: city.trim(),
            address: address.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Unable to create account."
        );
      }

      if (data.message === "Email already registered") {
        throw new Error("Email already registered.");
      }

      setSuccess(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     SUCCESS SCREEN
  ========================== */

  if (success) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#06101d] px-4 py-6">

        <div className="pointer-events-none absolute left-1/2 top-0 h-[550px] w-[750px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[140px]" />

        <div className="relative flex min-h-[calc(100vh-3rem)] items-center justify-center">

          <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-[0_35px_120px_rgba(0,0,0,0.45)]">

            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-8 pb-11 pt-12 text-center text-white">

              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/30 bg-white/15 text-5xl shadow-2xl backdrop-blur">
                ✓
              </div>

              <h1 className="relative mt-6 text-3xl font-bold">
                Account Created!
              </h1>

              <p className="relative mt-2 text-sm text-blue-100">
                Welcome to CivicPulse AI
              </p>
            </div>

            <div className="px-8 py-9 text-center">

              <h2 className="text-xl font-bold text-slate-900">
                You&apos;re ready to make an impact.
              </h2>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
                Your citizen account has been successfully
                created. Start reporting civic issues and
                track their resolution.
              </p>

              <div className="mt-7 space-y-3 text-left">

                <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-lg">
                    📍
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Report Civic Issues
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Submit problems with location details.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-lg">
                    📊
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Track Complaints
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Follow your complaint from start to finish.
                    </p>
                  </div>
                </div>

              </div>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="mt-7 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Continue to Login
                <span className="ml-2">→</span>
              </button>

            </div>
          </div>
        </div>
      </main>
    );
  }

  /* =========================
     REGISTRATION PAGE
  ========================== */

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06101d] px-3 py-4 sm:px-6 sm:py-8">

      {/* BACKGROUND GLOW */}

      <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-blue-600/20 blur-[130px]" />

      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-violet-600/20 blur-[130px]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl items-center">

        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-[0_35px_120px_rgba(0,0,0,0.45)] lg:grid-cols-[0.82fr_1.18fr]">

          {/* =====================================
              PREMIUM LEFT SECTION
          ====================================== */}

          <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#081a34] via-[#102b5d] to-[#21134f] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">

            {/* Decorative circles */}

            <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full border border-white/[0.08]" />

            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border border-white/[0.08]" />

            <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full border border-white/[0.07]" />

            <div className="relative">

              {/* BRAND */}

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl shadow-xl backdrop-blur">
                  🏛️
                </div>

                <div>
                  <h1 className="text-xl font-bold tracking-tight">
                    CivicPulse AI
                  </h1>

                  <p className="text-xs text-blue-200">
                    Smart Civic Management
                  </p>
                </div>

              </div>

              {/* HERO */}

              <div className="mt-24">

                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 backdrop-blur">

                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />

                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100">
                    Citizen Community
                  </span>

                </div>

                <h2 className="text-4xl font-bold leading-[1.08] xl:text-5xl">
                  Together,
                  <br />
                  we build
                  <br />
                  <span className="text-blue-300">
                    better cities.
                  </span>
                </h2>

                <p className="mt-7 max-w-md text-sm leading-7 text-blue-100/75">
                  A smarter way for citizens to report
                  public issues, follow their progress and
                  contribute to better communities.
                </p>

              </div>

              {/* FEATURES */}

              <div className="mt-12 space-y-3">

                <div className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition hover:bg-white/[0.1]">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-lg">
                    📍
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      Smart Issue Reporting
                    </p>

                    <p className="mt-1 text-xs text-blue-200/60">
                      Report problems with precise location.
                    </p>
                  </div>

                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-lg">
                    🤖
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      AI-Powered Analysis
                    </p>

                    <p className="mt-1 text-xs text-blue-200/60">
                      Intelligent detection helps identify issues.
                    </p>
                  </div>

                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-lg">
                    📈
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      Transparent Tracking
                    </p>

                    <p className="mt-1 text-xs text-blue-200/60">
                      Stay informed about every update.
                    </p>
                  </div>

                </div>

              </div>

            </div>

            {/* FOOTER */}

            <div className="relative mt-10 flex items-center justify-between border-t border-white/10 pt-6">

              <p className="text-[11px] text-blue-200/50">
                Smart city • Smart citizens • Real impact
              </p>

              <div className="flex gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              </div>

            </div>

          </section>

          {/* =====================================
              FORM SECTION
          ====================================== */}

          <section className="bg-white px-5 py-8 sm:px-10 sm:py-12 xl:px-14">

            <div className="mx-auto max-w-xl">

              {/* MOBILE BRAND */}

              <div className="mb-8 flex items-center gap-3 lg:hidden">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xl text-white shadow-lg">
                  🏛️
                </div>

                <div>
                  <h1 className="font-bold text-slate-900">
                    CivicPulse AI
                  </h1>

                  <p className="text-xs text-slate-500">
                    Smart Civic Management
                  </p>
                </div>

              </div>

              {/* HEADER */}

              <div className="mb-8">

                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">
                  Citizen Portal
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Create your account
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Join the community and help improve your city.
                </p>

              </div>

              {/* ERROR */}

              {errorMessage && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">

                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm text-red-600">
                    !
                  </div>

                  <p className="pt-1 text-sm font-medium text-red-700">
                    {errorMessage}
                  </p>

                </div>
              )}

              <form
                onSubmit={handleRegister}
                className="space-y-5"
              >

                {/* NAME + PHONE */}

                <div className="grid gap-5 sm:grid-cols-2">

                  {/* NAME */}

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Full Name
                    </label>

                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        const value =
                          e.target.value.replace(
                            /[^A-Za-z\s]/g,
                            ""
                          );

                        setName(value);
                      }}
                      onBlur={() => markTouched("name")}
                      placeholder="John Doe"
                      required
                      className={`h-12 w-full rounded-xl border bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:ring-4 ${
                        touched.name && !nameValid
                          ? "border-red-300 focus:border-red-500 focus:ring-red-50"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-50"
                      }`}
                    />

                    {touched.name && !nameValid && name && (
                      <p className="mt-1.5 text-[11px] font-medium text-red-600">
                        Use letters and spaces only.
                      </p>
                    )}
                  </div>

                  {/* PHONE */}

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Mobile Number
                    </label>

                    <div className="relative">

                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        +91
                      </span>

                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          const value =
                            e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 10);

                          setPhone(value);
                        }}
                        onBlur={() => markTouched("phone")}
                        placeholder="9876543210"
                        inputMode="numeric"
                        maxLength={10}
                        required
                        className={`h-12 w-full rounded-xl border bg-slate-50 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:ring-4 ${
                          touched.phone && !phoneValid
                            ? "border-red-300 focus:border-red-500 focus:ring-red-50"
                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-50"
                        }`}
                      />

                    </div>

                    <p className="mt-1.5 text-[11px] text-slate-400">
                      Enter exactly 10 digits.
                    </p>
                  </div>

                </div>

                {/* EMAIL */}

                <div>

                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                    Email Address
                  </label>

                  <div className="relative">

                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      ✉
                    </span>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      onBlur={() => markTouched("email")}
                      placeholder="you@example.com"
                      required
                      className={`h-12 w-full rounded-xl border bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:ring-4 ${
                        touched.email &&
                        !emailValid &&
                        email
                          ? "border-red-300 focus:border-red-500 focus:ring-red-50"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-50"
                      }`}
                    />

                  </div>

                  {touched.email &&
                    !emailValid &&
                    email && (
                      <p className="mt-1.5 text-[11px] font-medium text-red-600">
                        Enter a valid email address.
                      </p>
                    )}

                </div>

                {/* CITY */}

                <div>

                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                    City
                  </label>

                  <div className="relative">

                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      ◉
                    </span>

                    <input
                      type="text"
                      value={city}
                      onChange={(e) => {
                        const value =
                          e.target.value.replace(
                            /[^A-Za-z\s-]/g,
                            ""
                          );

                        setCity(value);
                      }}
                      onBlur={() => markTouched("city")}
                      placeholder="Ambala"
                      required
                      className={`h-12 w-full rounded-xl border bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:ring-4 ${
                        touched.city &&
                        !cityValid &&
                        city
                          ? "border-red-300 focus:border-red-500 focus:ring-red-50"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-50"
                      }`}
                    />

                  </div>

                </div>

                {/* ADDRESS */}

                <div>

                  <div className="mb-2 flex items-center justify-between">

                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Address
                    </label>

                    <span className="text-[10px] font-medium text-slate-400">
                      {address.length}/250
                    </span>

                  </div>

                  <textarea
                    value={address}
                    onChange={(e) =>
                      setAddress(
                        e.target.value.slice(0, 250)
                      )
                    }
                    onBlur={() => markTouched("address")}
                    placeholder="House No., Street, Area..."
                    required
                    rows={3}
                    maxLength={250}
                    className={`w-full resize-none rounded-xl border bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:ring-4 ${
                      touched.address &&
                      !addressValid &&
                      address
                        ? "border-red-300 focus:border-red-500 focus:ring-red-50"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-50"
                    }`}
                  />

                </div>

                {/* PASSWORD */}

                <div>

                  <div className="mb-2 flex items-center justify-between">

                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Password
                    </label>

                    <span className="text-[10px] font-medium text-slate-400">
                      Minimum 8 characters
                    </span>

                  </div>

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
                      onBlur={() =>
                        markTouched("password")
                      }
                      placeholder="Create a secure password"
                      minLength={8}
                      required
                      className={`h-12 w-full rounded-xl border bg-slate-50 px-4 pr-20 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:ring-4 ${
                        touched.password &&
                        !passwordValid &&
                        password
                          ? "border-red-300 focus:border-red-500 focus:ring-red-50"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-50"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          !showPassword
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                    >
                      {showPassword
                        ? "HIDE"
                        : "SHOW"}
                    </button>

                  </div>

                  {password && (
                    <div className="mt-3">

                      <div className="flex h-1.5 gap-1">

                        {[0, 1, 2, 3].map((item) => {

                          const active =
                            passwordStrength.width ===
                            "25%"
                              ? item === 0
                              : passwordStrength.width ===
                                  "60%"
                                ? item < 3
                                : item < 4;

                          return (
                            <div
                              key={item}
                              className={`flex-1 rounded-full transition ${
                                active
                                  ? "bg-blue-500"
                                  : "bg-slate-100"
                              }`}
                            />
                          );
                        })}

                      </div>

                      <div className="mt-2 flex items-center justify-between">

                        <span className="text-xs font-bold text-slate-500">
                          {passwordStrength.label}
                        </span>

                        <span className="text-[10px] text-slate-400">
                          Use uppercase, numbers & symbols
                        </span>

                      </div>

                    </div>
                  )}

                </div>

                {/* CONFIRM PASSWORD */}

                <div>

                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
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
                        setConfirmPassword(
                          e.target.value
                        )
                      }
                      onBlur={() =>
                        markTouched(
                          "confirmPassword"
                        )
                      }
                      placeholder="Re-enter your password"
                      minLength={8}
                      required
                      className={`h-12 w-full rounded-xl border bg-slate-50 px-4 pr-20 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                        confirmPassword &&
                        !passwordsMatch
                          ? "border-red-300 focus:border-red-500 focus:ring-red-50"
                          : passwordsMatch
                            ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-50"
                            : "border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-50"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                    >
                      {showConfirmPassword
                        ? "HIDE"
                        : "SHOW"}
                    </button>

                  </div>

                  {confirmPassword && (
                    <p
                      className={`mt-2 text-[11px] font-bold ${
                        passwordsMatch
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {passwordsMatch
                        ? "✓ Passwords match"
                        : "× Passwords do not match"}
                    </p>
                  )}

                </div>

                {/* SUBMIT BUTTON */}

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative mt-2 h-13 w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-200 transition duration-200 hover:-translate-y-0.5 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60"
                >

                  <span className="relative z-10">
                    {loading
                      ? "Creating your account..."
                      : "Create Citizen Account"}
                  </span>

                  {!loading && (
                    <span className="relative z-10 ml-2 inline-block transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  )}

                </button>

              </form>

              {/* LOGIN */}

              <div className="mt-7 text-center">

                <p className="text-sm text-slate-500">
                  Already have an account?{" "}

                  <button
                    type="button"
                    onClick={() =>
                      router.push("/login")
                    }
                    className="font-bold text-blue-600 transition hover:text-indigo-600"
                  >
                    Sign in
                  </button>
                </p>

              </div>

              {/* SECURITY */}

              <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-100 pt-6 text-[10px] font-medium text-slate-400">

                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100">
                  🔒
                </span>

                <span>
                  Your account information is securely handled.
                </span>

              </div>

            </div>

          </section>

        </div>
      </div>
    </main>
  );
}