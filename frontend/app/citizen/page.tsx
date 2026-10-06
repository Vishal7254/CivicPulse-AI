"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Complaint = {
  id: number;
  user_id?: number | null;
  title: string;
  description?: string | null;
  category?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  road?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  image_url?: string | null;
  status: string;
  priority?: string | null;
  pothole_count?: number | null;
  ai_confidence?: number | null;
  department?: string | null;
  assigned_to?: number | null;
  rejection_reason?: string | null;
  action_taken?: string | null;
  resolved_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Notification = {
  id: number;
  complaint_id?: number | null;
  message: string;
  type?: string;
  is_read: boolean;
  created_at: string;
};

type Section =
  | "dashboard"
  | "submit"
  | "complaints"
  | "notifications"
  | "profile";

const API_BASE_URL = "http://127.0.0.1:8000";

function statusClass(status?: string | null) {
  switch ((status || "").toLowerCase().replace(/-/g, "_")) {
    case "pending":
      return "bg-yellow-100 text-yellow-700";
    case "verified":
      return "bg-blue-100 text-blue-700";
    case "assigned":
      return "bg-purple-100 text-purple-700";
    case "in_progress":
      return "bg-orange-100 text-orange-700";
    case "action_taken":
      return "bg-indigo-100 text-indigo-700";
    case "resolved":
      return "bg-green-100 text-green-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatStatus(status?: string | null) {
  if (!status) return "Unknown";

  return status
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(date?: string | null) {
  if (!date) return "Not available";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return date;
  }

  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;

  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://")
  ) {
    return imageUrl;
  }

  let clean = imageUrl.replace(/\\/g, "/");

  clean = clean.replace(/^\/+/, "");
  clean = clean.replace(/^app\/+/i, "");
  clean = clean.replace(/^uploads\/+/i, "");

  return `${API_BASE_URL}/uploads/${clean}`;
}

export default function CitizenDashboard() {
  const [activeSection, setActiveSection] =
    useState<Section>("dashboard");

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [complaints, setComplaints] =
    useState<Complaint[]>([]);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] =
    useState<number | null>(null);

  /* =====================================================
     USER
  ===================================================== */

  const [user, setUser] = useState<{
    id: number;
    name: string;
    email: string;
    role: string;
  } | null>(null);

  /* =====================================================
     COMPLAINT FORM
  ===================================================== */

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");

  const [category, setCategory] =
    useState("Road Damage");

  const [image, setImage] =
    useState<File | null>(null);

  const [landmark, setLandmark] =
    useState("");

  /* =====================================================
     LOCATION
  ===================================================== */

  const [latitude, setLatitude] =
    useState<number | null>(null);

  const [longitude, setLongitude] =
    useState<number | null>(null);

  const [address, setAddress] =
    useState("");

  const [road, setRoad] =
    useState("");

  const [roadType, setRoadType] =
    useState("");

  const [roadDistance, setRoadDistance] =
    useState<number | null>(null);

  const [city, setCity] =
    useState("");

  const [state, setState] =
    useState("");

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationError, setLocationError] =
    useState("");

  /* =====================================================
     SUBMIT
  ===================================================== */

  const [submitting, setSubmitting] =
    useState(false);

  const [submitMessage, setSubmitMessage] =
    useState("");

  const [submitError, setSubmitError] =
    useState("");

  /* =====================================================
     VOICE
  ===================================================== */

  const [listeningField, setListeningField] =
    useState<"title" | "description" | null>(
      null
    );

  const recognitionRef = useRef<any>(null);

  /* =====================================================
     TOKEN
  ===================================================== */

  const getToken = () => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem(
      "access_token"
    );
  };

  /* =====================================================
     FETCH CURRENT USER
  ===================================================== */

  const fetchCurrentUser = async () => {
    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (response.status === 401) {
        localStorage.removeItem(
          "access_token"
        );

        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "Failed to fetch user:",
          data
        );
        return;
      }

      setUser(data);
    } catch (error) {
      console.error(
        "Current user error:",
        error
      );
    }
  };

  /* =====================================================
     FETCH COMPLAINTS
  ===================================================== */

  const fetchComplaints = async () => {
    const token = getToken();

    if (!token) {
      setComplaints([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/complaints`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (response.status === 401) {
        localStorage.removeItem(
          "access_token"
        );

        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "Complaint fetch failed:",
          data
        );

        setComplaints([]);
        return;
      }

      const result = Array.isArray(data)
        ? data
        : Array.isArray(data?.complaints)
        ? data.complaints
        : [];

      setComplaints(result);
    } catch (error) {
      console.error(
        "Complaint fetch error:",
        error
      );

      setComplaints([]);
    }
  };

  /* =====================================================
     FETCH NOTIFICATIONS
  ===================================================== */

  const fetchNotifications = async () => {
    const token = getToken();

    if (!token) {
      setNotifications([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (response.status === 401) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "Notification fetch failed:",
          data
        );

        setNotifications([]);
        return;
      }

      const result = Array.isArray(data)
        ? data
        : Array.isArray(data?.notifications)
        ? data.notifications
        : [];

      setNotifications(result);
    } catch (error) {
      console.error(
        "Notification fetch error:",
        error
      );

      setNotifications([]);
    }
  };

  /* =====================================================
     AUTOMATIC LOCATION
  ===================================================== */

  const detectLocation = () => {
    if (
      typeof window === "undefined" ||
      !navigator.geolocation
    ) {
      setLocationError(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat =
          position.coords.latitude;

        const lng =
          position.coords.longitude;

        setLatitude(lat);
        setLongitude(lng);

        try {
          const response = await fetch(
            `${API_BASE_URL}/reverse-geocode?latitude=${lat}&longitude=${lng}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

          let data: any = null;

          try {
            data = await response.json();
          } catch {
            data = null;
          }

          if (!response.ok) {
            throw new Error(
              data?.detail ||
                "Unable to fetch location details."
            );
          }

          setAddress(
            data?.display_name || ""
          );

          setRoad(
            data?.road || ""
          );

          setRoadType(
            data?.road_type || ""
          );

          setRoadDistance(
            data?.road_distance_m ?? null
          );

          setCity(
            data?.city || ""
          );

          setState(
            data?.state || ""
          );

          console.log(
            "Location detected:",
            {
              latitude: lat,
              longitude: lng,
              address:
                data?.display_name,
              road: data?.road,
              city: data?.city,
              state: data?.state,
            }
          );
        } catch (error) {
          console.error(
            "Reverse geocoding error:",
            error
          );

          setLocationError(
            "GPS detected, but address details could not be fetched."
          );
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error(
          "Location error:",
          error
        );

        if (error.code === 1) {
          setLocationError(
            "Location permission denied. Please allow location access."
          );
        } else if (error.code === 2) {
          setLocationError(
            "Unable to determine your location."
          );
        } else if (error.code === 3) {
          setLocationError(
            "Location request timed out. Please try again."
          );
        } else {
          setLocationError(
            "Unable to detect your location."
          );
        }

        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  /* =====================================================
     AUTO DETECT WHEN SUBMIT PAGE OPENS
  ===================================================== */

  useEffect(() => {
    if (
      activeSection === "submit" &&
      latitude === null &&
      longitude === null &&
      !locationLoading
    ) {
      detectLocation();
    }
  }, [activeSection]);

  /* =====================================================
     VOICE INPUT
  ===================================================== */

  const startVoiceInput = (
    field: "title" | "description"
  ) => {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSubmitError(
        "Voice input is not supported. Please use Google Chrome."
      );
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognitionRef.current =
      recognition;

    setListeningField(field);
    setSubmitError("");

    recognition.onresult = (
      event: any
    ) => {
      const text =
        event?.results?.[0]?.[0]
          ?.transcript || "";

      if (!text) return;

      if (field === "title") {
        setTitle((old) =>
          old
            ? `${old} ${text}`
            : text
        );
      } else {
        setDescription((old) =>
          old
            ? `${old} ${text}`
            : text
        );
      }
    };

    recognition.onerror = () => {
      setSubmitError(
        "Unable to capture voice. Please allow microphone access."
      );

      setListeningField(null);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setListeningField(null);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (error) {
      console.error(
        "Voice start error:",
        error
      );

      setListeningField(null);
    }
  };

  /* =====================================================
     SUBMIT COMPLAINT
  ===================================================== */

  const handleComplaintSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setSubmitMessage("");
    setSubmitError("");

    if (!title.trim()) {
      setSubmitError(
        "Please enter complaint title or use the voice button."
      );
      return;
    }

    if (!description.trim()) {
      setSubmitError(
        "Please enter complaint description or use the voice button."
      );
      return;
    }

    if (
      latitude === null ||
      longitude === null
    ) {
      setSubmitError(
        "Location is required. Please click Detect My Location."
      );

      detectLocation();
      return;
    }

    const token = getToken();

    if (!token) {
      setSubmitError(
        "Session expired. Please login again."
      );
      return;
    }

    try {
      setSubmitting(true);

      const formData =
        new FormData();

      formData.append(
        "title",
        title.trim()
      );

      formData.append(
        "description",
        description.trim()
      );

      formData.append(
        "category",
        category
      );

      formData.append(
        "latitude",
        String(latitude)
      );

      formData.append(
        "longitude",
        String(longitude)
      );

      formData.append(
        "address",
        address.trim()
      );

      formData.append(
        "landmark",
        landmark.trim()
      );

      if (road) {
        formData.append(
          "road",
          road
        );
      }

      if (city) {
        formData.append(
          "city",
          city
        );
      }

      if (state) {
        formData.append(
          "state",
          state
        );
      }

      if (image) {
        formData.append(
          "image",
          image
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/complaints`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          body: formData,
        }
      );

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      console.log(
        "Complaint submission response:",
        data
      );

      if (response.status === 401) {
        localStorage.removeItem(
          "access_token"
        );

        window.location.href =
          "/login";

        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            "Complaint submission failed."
        );
      }

      const complaintId =
        data?.complaint_id ??
        data?.id ??
        data?.complaint?.id;

      setSubmitMessage(
        complaintId
          ? `Complaint submitted successfully! Complaint #${complaintId}`
          : "Complaint submitted successfully!"
      );

      setTitle("");
      setDescription("");
      setCategory("Road Damage");
      setImage(null);
      setLandmark("");

      await fetchComplaints();
      await fetchNotifications();

      setActiveSection(
        "complaints"
      );
    } catch (error) {
      console.error(
        "Complaint submission error:",
        error
      );

      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to submit complaint."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =====================================================
     MARK NOTIFICATION READ
  ===================================================== */

  const markNotificationAsRead =
    async (
      notificationId: number
    ) => {
      const token = getToken();

      if (!token) return;

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/notifications/${notificationId}/read`,
            {
              method: "PATCH",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                Accept:
                  "application/json",
              },
            }
          );

        if (response.ok) {
          setNotifications(
            (old) =>
              old.map((item) =>
                item.id ===
                notificationId
                  ? {
                      ...item,
                      is_read: true,
                    }
                  : item
              )
          );
        }
      } catch (error) {
        console.error(
          "Mark notification error:",
          error
        );
      }
    };

  /* =====================================================
     LOGOUT
  ===================================================== */

  const logout = () => {
    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem(
      "user_role"
    );

    localStorage.removeItem(
      "user_name"
    );

    window.location.href =
      "/login";
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      await Promise.all([
        fetchCurrentUser(),
        fetchComplaints(),
        fetchNotifications(),
      ]);

      setLoading(false);
    };

    load();
  }, []);

  /* =====================================================
     STATISTICS
  ===================================================== */

  const total =
    complaints.length;

  const pending =
    complaints.filter(
      (c) =>
        c.status?.toLowerCase() ===
        "pending"
    ).length;

  const verified =
    complaints.filter(
      (c) =>
        c.status?.toLowerCase() ===
        "verified"
    ).length;

  const assigned =
    complaints.filter(
      (c) =>
        c.status?.toLowerCase() ===
        "assigned"
    ).length;

  const inProgress =
    complaints.filter(
      (c) =>
        c.status
          ?.toLowerCase()
          .replace(/-/g, "_") ===
        "in_progress"
    ).length;

  const resolved =
    complaints.filter(
      (c) =>
        c.status?.toLowerCase() ===
        "resolved"
    ).length;

  const unreadNotifications =
    notifications.filter(
      (n) => !n.is_read
    ).length;

  const latestComplaints =
    useMemo(
      () =>
        [...complaints]
          .sort(
            (a, b) =>
              new Date(
                b.created_at || 0
              ).getTime() -
              new Date(
                a.created_at || 0
              ).getTime()
          )
          .slice(0, 5),
      [complaints]
    );

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const changeSection = (
    section: Section
  ) => {
    setActiveSection(section);
    setMobileMenuOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="mt-4 text-sm font-semibold text-slate-600">
            Loading CivicPulse AI...
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* MOBILE HEADER */}

      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm lg:hidden">
        <button
          type="button"
          onClick={() =>
            setMobileMenuOpen(true)
          }
          className="rounded-lg bg-blue-600 px-3 py-2 text-white"
        >
          ☰
        </button>

        <div className="text-center">
          <p className="font-extrabold">
            CivicPulse AI
          </p>

          <p className="text-[10px] text-slate-500">
            Citizen Portal
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
        >
          Logout
        </button>
      </header>

      {/* MOBILE MENU */}

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() =>
              setMobileMenuOpen(false)
            }
          />

          <aside className="relative h-full w-72 bg-white p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-slate-900">
                  CivicPulse AI
                </h2>

                <p className="text-xs text-slate-500">
                  Citizen Portal
                </p>
              </div>

              <button
                onClick={() =>
                  setMobileMenuOpen(false)
                }
                className="text-xl"
              >
                ✕
              </button>
            </div>

            <nav className="space-y-2">
              {[
                ["dashboard", "🏠 Dashboard"],
                ["submit", "📝 Submit Complaint"],
                ["complaints", "📋 My Complaints"],
                ["notifications", "🔔 Notifications"],
                ["profile", "👤 Profile"],
              ].map(
                ([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      changeSection(
                        key as Section
                      )
                    }
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm font-bold ${
                      activeSection === key
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </nav>
          </aside>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}

      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-white p-5 lg:block">
        <div className="mb-8">
          <h1 className="text-xl font-extrabold text-blue-600">
            CivicPulse AI
          </h1>

          <p className="text-xs text-slate-500">
            Citizen Portal
          </p>
        </div>

        <nav className="space-y-2">
          {[
            ["dashboard", "🏠 Dashboard"],
            ["submit", "📝 Submit Complaint"],
            ["complaints", "📋 My Complaints"],
            ["notifications", "🔔 Notifications"],
            ["profile", "👤 Profile"],
          ].map(
            ([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  changeSection(
                    key as Section
                  )
                }
                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-bold ${
                  activeSection === key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}

                {key ===
                  "notifications" &&
                  unreadNotifications >
                    0 && (
                    <span className="float-right rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">
                      {unreadNotifications}
                    </span>
                  )}
              </button>
            )
          )}
        </nav>

        <div className="absolute bottom-5 left-5 right-5">
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}

      <main className="min-h-screen lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8">

          {/* HEADER */}

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">
                Citizen Dashboard
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage your civic complaints
                and track government action.
              </p>
            </div>

            <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] text-slate-400">
                Logged in as
              </p>

              <p className="text-sm font-bold text-slate-800">
                {user?.name ||
                  "Citizen"}
              </p>
            </div>
          </div>

          {/* =================================================
              DASHBOARD
          ================================================= */}

          {activeSection ===
            "dashboard" && (
            <div className="space-y-5">

              <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-lg">
                <p className="text-sm text-blue-100">
                  Welcome back 👋
                </p>

                <h3 className="mt-1 text-2xl font-extrabold">
                  {user?.name ||
                    "Citizen"}
                </h3>

                <p className="mt-2 max-w-2xl text-sm text-blue-100">
                  Report civic problems,
                  track your complaints,
                  and stay updated with
                  every action.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    changeSection(
                      "submit"
                    )
                  }
                  className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-blue-600"
                >
                  + Submit Complaint
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">

                {[
                  [
                    "Total",
                    total,
                    "📋",
                    "text-slate-900",
                  ],
                  [
                    "Pending",
                    pending,
                    "⏳",
                    "text-yellow-600",
                  ],
                  [
                    "Verified",
                    verified,
                    "🔎",
                    "text-blue-600",
                  ],
                  [
                    "Assigned",
                    assigned,
                    "👨‍💼",
                    "text-purple-600",
                  ],
                  [
                    "In Progress",
                    inProgress,
                    "🔧",
                    "text-orange-600",
                  ],
                  [
                    "Resolved",
                    resolved,
                    "✅",
                    "text-green-600",
                  ],
                ].map(
                  (item) => (
                    <div
                      key={item[0]}
                      className="rounded-xl border bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">
                          {item[2]}
                        </span>

                        <span className="text-xs text-slate-400">
                          {item[0]}
                        </span>
                      </div>

                      <p
                        className={`mt-3 text-2xl font-extrabold ${item[3]}`}
                      >
                        {item[1]}
                      </p>

                      <p className="text-xs text-slate-500">
                        {item[0]} complaints
                      </p>
                    </div>
                  )
                )}
              </div>

              <div className="grid gap-5 lg:grid-cols-2">

                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold">
                      Recent Complaints
                    </h3>

                    <button
                      type="button"
                      onClick={() =>
                        changeSection(
                          "complaints"
                        )
                      }
                      className="text-xs font-bold text-blue-600"
                    >
                      View All
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {latestComplaints.length ===
                    0 ? (
                      <p className="py-8 text-center text-sm text-slate-400">
                        No complaints yet.
                      </p>
                    ) : (
                      latestComplaints.map(
                        (complaint) => (
                          <div
                            key={
                              complaint.id
                            }
                            className="rounded-xl border p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold">
                                  {
                                    complaint.title
                                  }
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  Complaint #
                                  {
                                    complaint.id
                                  }
                                </p>
                              </div>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(
                                  complaint.status
                                )}`}
                              >
                                {formatStatus(
                                  complaint.status
                                )}
                              </span>
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <h3 className="font-extrabold">
                    Quick Actions
                  </h3>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">

                    <button
                      type="button"
                      onClick={() =>
                        changeSection(
                          "submit"
                        )
                      }
                      className="rounded-xl bg-blue-600 p-4 text-left text-white"
                    >
                      <p className="text-lg">
                        📝
                      </p>

                      <p className="mt-2 font-bold">
                        Report Problem
                      </p>

                      <p className="mt-1 text-xs text-blue-100">
                        Submit a new civic
                        complaint.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        changeSection(
                          "notifications"
                        )
                      }
                      className="rounded-xl bg-slate-100 p-4 text-left"
                    >
                      <p className="text-lg">
                        🔔
                      </p>

                      <p className="mt-2 font-bold">
                        Notifications
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {unreadNotifications}{" "}
                        unread updates.
                      </p>
                    </button>

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* =================================================
              SUBMIT
          ================================================= */}

          {activeSection ===
            "submit" && (
            <div className="mx-auto max-w-3xl">

              <div className="mb-5">
                <h3 className="text-2xl font-extrabold">
                  Submit Complaint
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Tell us about the civic
                  problem. You can type or
                  speak the title and
                  description.
                </p>
              </div>

              {submitMessage && (
                <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
                  ✅ {submitMessage}
                </div>
              )}

              {submitError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  ⚠️ {submitError}
                </div>
              )}

              <form
                onSubmit={
                  handleComplaintSubmit
                }
                className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
              >

                {/* TITLE */}

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Complaint Title *
                  </label>

                  <div className="flex gap-2">
                    <input
                      value={title}
                      onChange={(e) =>
                        setTitle(
                          e.target.value
                        )
                      }
                      placeholder="Example: Large pothole on main road"
                      className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        startVoiceInput(
                          "title"
                        )
                      }
                      className={`rounded-xl px-4 text-lg ${
                        listeningField ===
                        "title"
                          ? "bg-red-500 text-white"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {listeningField ===
                      "title"
                        ? "⏹"
                        : "🎤"}
                    </button>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-400">
                    Type it or click 🎤 and
                    speak.
                  </p>
                </div>

                {/* DESCRIPTION */}

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Description *
                  </label>

                  <div className="flex gap-2">
                    <textarea
                      value={description}
                      onChange={(e) =>
                        setDescription(
                          e.target.value
                        )
                      }
                      rows={5}
                      placeholder="Describe the problem..."
                      className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        startVoiceInput(
                          "description"
                        )
                      }
                      className={`h-12 rounded-xl px-4 text-lg ${
                        listeningField ===
                        "description"
                          ? "bg-red-500 text-white"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {listeningField ===
                      "description"
                        ? "⏹"
                        : "🎤"}
                    </button>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-400">
                    Type or use voice input.
                  </p>
                </div>

                {/* CATEGORY */}

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Category
                  </label>

                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option>
                      Road Damage
                    </option>

                    <option>
                      Garbage
                    </option>

                    <option>
                      Street Light
                    </option>

                    <option>
                      Water Supply
                    </option>

                    <option>
                      Drainage
                    </option>

                    <option>
                      Traffic
                    </option>

                    <option>
                      Other
                    </option>
                  </select>
                </div>

                {/* IMAGE */}

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Problem Image
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setImage(
                        e.target.files?.[0] ||
                          null
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm"
                  />

                  {image && (
                    <p className="mt-2 text-xs text-green-600">
                      Selected:{" "}
                      {image.name}
                    </p>
                  )}
                </div>

                {/* LANDMARK */}

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Landmark
                  </label>

                  <input
                    value={landmark}
                    onChange={(e) =>
                      setLandmark(
                        e.target.value
                      )
                    }
                    placeholder="Example: Near college gate"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {/* LOCATION */}

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-extrabold text-blue-900">
                        📍 Complaint Location
                      </h4>

                      <p className="mt-1 text-xs text-blue-700">
                        Your location is
                        detected automatically
                        when this page opens.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        detectLocation
                      }
                      disabled={
                        locationLoading
                      }
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {locationLoading
                        ? "Detecting..."
                        : "📍 Detect My Location"}
                    </button>
                  </div>

                  {locationError && (
                    <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                      {locationError}
                    </div>
                  )}

                  {latitude !== null &&
                    longitude !==
                      null && (
                      <div className="mt-4 space-y-3">

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl bg-white p-3">
                            <p className="text-[10px] text-slate-400">
                              Latitude
                            </p>

                            <p className="text-sm font-bold">
                              {latitude}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white p-3">
                            <p className="text-[10px] text-slate-400">
                              Longitude
                            </p>

                            <p className="text-sm font-bold">
                              {longitude}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl bg-white p-3">
                          <p className="text-[10px] text-slate-400">
                            Address
                          </p>

                          <p className="mt-1 text-sm font-semibold">
                            {address ||
                              "Address not available"}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl bg-white p-3">
                            <p className="text-[10px] text-slate-400">
                              Road
                            </p>

                            <p className="text-xs font-bold">
                              {road ||
                                "Not available"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white p-3">
                            <p className="text-[10px] text-slate-400">
                              City
                            </p>

                            <p className="text-xs font-bold">
                              {city ||
                                "Not available"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white p-3">
                            <p className="text-[10px] text-slate-400">
                              State
                            </p>

                            <p className="text-xs font-bold">
                              {state ||
                                "Not available"}
                            </p>
                          </div>
                        </div>

                        {roadDistance !==
                          null && (
                          <p className="text-xs text-blue-700">
                            Road distance:
                            {" "}
                            {roadDistance}
                            {" "}
                            meters
                          </p>
                        )}

                        <a
                          href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-xs font-bold text-blue-600 underline"
                        >
                          Open location in
                          Google Maps →
                        </a>
                      </div>
                    )}
                </div>

                {/* SUBMIT */}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting
                    ? "Submitting Complaint..."
                    : "🚀 Submit Complaint"}
                </button>

              </form>
            </div>
          )}

          {/* =================================================
              COMPLAINTS
          ================================================= */}

          {activeSection ===
            "complaints" && (
            <div>

              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-2xl font-extrabold">
                    My Complaints
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Track all your submitted
                    complaints.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    await fetchComplaints();
                    setLoading(false);
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"
                >
                  🔄 Refresh
                </button>
              </div>

              {complaints.length ===
              0 ? (
                <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
                  <p className="text-4xl">
                    📋
                  </p>

                  <h4 className="mt-3 font-extrabold">
                    No complaints yet
                  </h4>

                  <p className="mt-1 text-sm text-slate-500">
                    Submit your first civic
                    complaint.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      changeSection(
                        "submit"
                      )
                    }
                    className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
                  >
                    Submit Complaint
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {complaints.map(
                    (complaint) => {
                      const imageUrl =
                        getImageUrl(
                          complaint.image_url
                        );

                      const expanded =
                        expandedId ===
                        complaint.id;

                      return (
                        <div
                          key={
                            complaint.id
                          }
                          className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                        >

                          <div className="p-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                              <div>
                                <p className="text-xs font-bold text-slate-400">
                                  Complaint #
                                  {
                                    complaint.id
                                  }
                                </p>

                                <h4 className="mt-1 text-lg font-extrabold">
                                  {
                                    complaint.title
                                  }
                                </h4>

                                <p className="mt-1 text-xs text-slate-500">
                                  {formatDate(
                                    complaint.created_at
                                  )}
                                </p>
                              </div>

                              <span
                                className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${statusClass(
                                  complaint.status
                                )}`}
                              >
                                {formatStatus(
                                  complaint.status
                                )}
                              </span>
                            </div>

                            <p className="mt-4 text-sm leading-6 text-slate-600">
                              {
                                complaint.description
                              }
                            </p>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">

                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-[10px] text-slate-400">
                                  Category
                                </p>

                                <p className="mt-1 text-xs font-bold">
                                  {
                                    complaint.category ||
                                    "Not assigned"
                                  }
                                </p>
                              </div>

                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-[10px] text-slate-400">
                                  Priority
                                </p>

                                <p className="mt-1 text-xs font-bold">
                                  {
                                    complaint.priority ||
                                    "Not assigned"
                                  }
                                </p>
                              </div>

                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-[10px] text-slate-400">
                                  Department
                                </p>

                                <p className="mt-1 text-xs font-bold">
                                  {
                                    complaint.department ||
                                    "Not assigned"
                                  }
                                </p>
                              </div>

                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId(
                                  expanded
                                    ? null
                                    : complaint.id
                                )
                              }
                              className="mt-4 text-xs font-bold text-blue-600"
                            >
                              {expanded
                                ? "Hide Details ↑"
                                : "View Details ↓"}
                            </button>
                          </div>

                          {expanded && (
                            <div className="border-t bg-slate-50 p-5">

                              {imageUrl && (
                                <div className="mb-5">
                                  <p className="mb-2 text-xs font-bold text-slate-500">
                                    Complaint Image
                                  </p>

                                  <img
                                    src={
                                      imageUrl
                                    }
                                    alt="Complaint"
                                    className="max-h-80 w-full rounded-xl object-cover sm:w-96"
                                    onError={(
                                      e
                                    ) => {
                                      e.currentTarget.style.display =
                                        "none";
                                    }}
                                  />
                                </div>
                              )}

                              <div className="grid gap-3 sm:grid-cols-2">

                                <div className="rounded-xl bg-white p-4">
                                  <p className="text-[10px] text-slate-400">
                                    Location
                                  </p>

                                  <p className="mt-1 text-sm font-semibold">
                                    {complaint.address ||
                                      [
                                        complaint.road,
                                        complaint.city,
                                        complaint.state,
                                      ]
                                        .filter(
                                          Boolean
                                        )
                                        .join(
                                          ", "
                                        ) ||
                                      "Location not available"}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-white p-4">
                                  <p className="text-[10px] text-slate-400">
                                    Coordinates
                                  </p>

                                  <p className="mt-1 text-sm font-semibold">
                                    {complaint.latitude !==
                                      null &&
                                    complaint.latitude !==
                                      undefined
                                      ? `${complaint.latitude}, ${complaint.longitude}`
                                      : "Not available"}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-white p-4">
                                  <p className="text-[10px] text-slate-400">
                                    AI Potholes
                                  </p>

                                  <p className="mt-1 text-sm font-bold">
                                    {
                                      complaint.pothole_count ??
                                      0
                                    }
                                  </p>
                                </div>

                                <div className="rounded-xl bg-white p-4">
                                  <p className="text-[10px] text-slate-400">
                                    AI Confidence
                                  </p>

                                  <p className="mt-1 text-sm font-bold">
                                    {complaint.ai_confidence !==
                                    null &&
                                    complaint.ai_confidence !==
                                      undefined
                                      ? `${(
                                          complaint.ai_confidence *
                                          100
                                        ).toFixed(
                                          1
                                        )}%`
                                      : "Not available"}
                                  </p>
                                </div>

                              </div>

                              {complaint.latitude !==
                                null &&
                                complaint.latitude !==
                                  undefined &&
                                complaint.longitude !==
                                  null &&
                                complaint.longitude !==
                                  undefined && (
                                  <a
                                    href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 inline-block text-xs font-bold text-blue-600 underline"
                                  >
                                    📍 Open Complaint
                                    Location
                                  </a>
                                )}

                              {complaint.action_taken && (
                                <div className="mt-4 rounded-xl bg-green-50 p-4">
                                  <p className="text-xs font-bold text-green-700">
                                    Action Taken
                                  </p>

                                  <p className="mt-1 text-sm text-green-800">
                                    {
                                      complaint.action_taken
                                    }
                                  </p>
                                </div>
                              )}

                              {complaint.rejection_reason && (
                                <div className="mt-4 rounded-xl bg-red-50 p-4">
                                  <p className="text-xs font-bold text-red-700">
                                    Rejection Reason
                                  </p>

                                  <p className="mt-1 text-sm text-red-800">
                                    {
                                      complaint.rejection_reason
                                    }
                                  </p>
                                </div>
                              )}

                            </div>
                          )}

                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}

          {/* =================================================
              NOTIFICATIONS
          ================================================= */}

          {activeSection ===
            "notifications" && (
            <div>

              <div className="mb-5">
                <h3 className="text-2xl font-extrabold">
                  Notifications
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Updates about your complaints.
                </p>
              </div>

              {notifications.length ===
              0 ? (
                <div className="rounded-2xl border bg-white p-10 text-center">
                  <p className="text-4xl">
                    🔔
                  </p>

                  <p className="mt-3 font-bold">
                    No notifications
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(
                    (notification) => (
                      <button
                        key={
                          notification.id
                        }
                        type="button"
                        onClick={() =>
                          !notification.is_read &&
                          markNotificationAsRead(
                            notification.id
                          )
                        }
                        className={`w-full rounded-2xl border p-4 text-left ${
                          notification.is_read
                            ? "bg-white"
                            : "border-blue-200 bg-blue-50"
                        }`}
                      >
                        <div className="flex gap-3">

                          <div className="text-xl">
                            {notification.is_read
                              ? "🔔"
                              : "🔵"}
                          </div>

                          <div className="flex-1">
                            <p className="text-sm font-semibold">
                              {
                                notification.message
                              }
                            </p>

                            <p className="mt-1 text-[11px] text-slate-400">
                              {formatDate(
                                notification.created_at
                              )}
                            </p>
                          </div>

                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* =================================================
              PROFILE
          ================================================= */}

          {activeSection ===
            "profile" && (
            <div className="mx-auto max-w-2xl">

              <h3 className="text-2xl font-extrabold">
                My Profile
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Your CivicPulse account details.
              </p>

              <div className="mt-5 rounded-2xl border bg-white p-6 shadow-sm">

                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl">
                  👤
                </div>

                <div className="mt-6 space-y-4">

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] text-slate-400">
                      User ID
                    </p>

                    <p className="mt-1 font-bold">
                      {user?.id ||
                        "Not available"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] text-slate-400">
                      Name
                    </p>

                    <p className="mt-1 font-bold">
                      {user?.name ||
                        "Not available"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] text-slate-400">
                      Email
                    </p>

                    <p className="mt-1 font-bold">
                      {user?.email ||
                        "Not available"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] text-slate-400">
                      Role
                    </p>

                    <p className="mt-1 font-bold capitalize">
                      {user?.role ||
                        "citizen"}
                    </p>
                  </div>

                </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}