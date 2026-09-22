"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
export default function CitizenComplaint() {
  const router = useRouter();

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Road Damage");
  const [image, setImage] = useState<File | null>(null);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [road, setRoad] = useState("");

  const [city, setCity] = useState("");

  const [state, setState] = useState("");

  const [address, setAddress] = useState("");

  const [myComplaints, setMyComplaints] = useState<any[]>([]);

  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<
    Record<number, number>
  >({});

  const [feedbackMessage, setFeedbackMessage] = useState<
    Record<number, string>
  >({});
  const [submittedFeedback, setSubmittedFeedback] = useState<
    Record<number, boolean>
  >({});
  const fetchMyComplaints = async () => {

    try {

      setLoadingComplaints(true);

      const token = localStorage.getItem("access_token");

      if (!token) {
        return;
      }

      const response = await fetch(
        "http://127.0.0.1:8000/complaints",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load complaints."
        );
      }

      setMyComplaints(
        Array.isArray(data) ? data : data.complaints || []
      );

      console.log("My Complaints API Response:", data);

    } catch (error) {

      console.error(
        "Failed to fetch complaints:",
        error
      );

    } finally {

      setLoadingComplaints(false);

    }

  };


  useEffect(() => {
    fetchMyComplaints();
  }, []);


  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [submittedComplaintId, setSubmittedComplaintId] =
    useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<
    "title" | "description" | null
  >(null);
  const [voiceLanguage, setVoiceLanguage] = useState("hi-IN");

  const startVoiceInput = (
    target: "title" | "description"
  ) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessage(
        "Voice input is not supported in this browser."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = voiceLanguage;
    recognition.interimResults = false;
    recognition.continuous = false;

    setVoiceTarget(target);
    setIsListening(true);
    setMessage("");

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;

      if (target === "title") {
        setTitle(text);
      } else {
        setDescription(text);
      }
    };

    recognition.onerror = () => {
      setMessage("Voice input failed. Please try again.");
      setIsListening(false);
      setVoiceTarget(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceTarget(null);
    };

    recognition.start();
  };

  const getComplaintTimeline = (complaint: any) => {
    const timeline = [
      {
        label: "Submitted",
        date: complaint.created_at,
        completed: !!complaint.created_at,
      },
      {
        label: "Verified",
        date: complaint.verified_at,
        completed: !!complaint.verified_at,
      },
      {
        label: "Department Assigned",
        date: complaint.department_assigned_at,
        completed: !!complaint.department_assigned_at,
      },
      {
        label: "Officer Assigned",
        date: complaint.officer_assigned_at,
        completed: !!complaint.officer_assigned_at,
      },
      {
        label: "In Progress",
        date: complaint.in_progress_at,
        completed: !!complaint.in_progress_at,
      },
      {
        label: "Action Taken",
        date: complaint.action_taken_at,
        completed: !!complaint.action_taken_at,
      },
      {
        label: "Resolved",
        date: complaint.resolved_at,
        completed: !!complaint.resolved_at,
      },
    ];

    return timeline;
  };

  const submitFeedback = async (complaintId: number) => {
    const rating = feedbackRating[complaintId];

    if (!rating) {
      setFeedbackMessage((prev) => ({
        ...prev,
        [complaintId]: "Please select a rating first.",
      }));
      return;
    }

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setFeedbackMessage((prev) => ({
          ...prev,
          [complaintId]: "Please login again.",
        }));
        return;
      }

      const response = await fetch(
        `http://127.0.0.1:8000/complaints/${complaintId}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rating: rating,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setFeedbackMessage((prev) => ({
          ...prev,
          [complaintId]:
            data.detail || "Failed to submit feedback.",
        }));
        return;
      }

      setFeedbackMessage((prev) => ({
        ...prev,
        [complaintId]: "Feedback submitted successfully.",
      }));

      setFeedbackRating((prev) => {
        const updated = { ...prev };
        delete updated[complaintId];
        return updated;
      });

      setSubmittedFeedback((prev) => ({
        ...prev,
        [complaintId]: true,
      }));

    } catch (error) {
      console.error("Feedback submission failed:", error);

      setFeedbackMessage((prev) => ({
        ...prev,
        [complaintId]:
          "Something went wrong. Please try again.",
      }));
    }
  };
  // =========================
  // BIHAR TEST LOCATION
  // DEVELOPMENT ONLY
  // =========================

  const setBiharTestLocation = async () => {
    if (window.location.hostname !== "localhost") {
      return;
    }

    const lat = 26.806594;
    const lon = 84.510134;

    setLatitude(lat);
    setLongitude(lon);
    setLocationError("");
    setMessage("");
    setLocationLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=en`
      );

      if (!response.ok) {
        throw new Error("Bihar test location lookup failed");
      }

      const data = await response.json();
      const location = data.address || {};

      setRoad(
        location.road ||
        location.street ||
        location.highway ||
        location.road_name ||
        "Road name unavailable"
      );

      setCity(
        location.city ||
        location.town ||
        location.village ||
        location.municipality ||
        location.city_district ||
        location.suburb ||
        location.district ||
        location.state_district ||
        location.county ||
        "City not found"
      );

      setState(
        location.state ||
        "Bihar"
      );

      setAddress(
        data.display_name ||
        `${lat}, ${lon}`
      );

    } catch (error) {
      console.error("Bihar test location error:", error);

      setRoad("Test Road");
      setCity("Bettiah");
      setState("Bihar");
      setAddress("Bettiah, West Champaran, Bihar, India");

    } finally {
      setLocationLoading(false);
    }
  };

  // =========================
  // GET CURRENT LOCATION
  // =========================

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    setLocationLoading(true);
    setLocationError("");
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setLatitude(lat);
        setLongitude(lon);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=en`
          );

          if (!response.ok) {
            throw new Error("Location lookup failed");
          }

          const data = await response.json();
          const location = data.address || {};

          const detectedRoad =
            location.road ||
            location.street ||
            location.highway ||
            location.road_name ||
            location.residential ||
            "Road name unavailable";

          const detectedCity =
            location.city ||
            location.town ||
            location.village ||
            location.municipality ||
            location.city_district ||
            location.suburb ||
            location.district ||
            location.state_district ||
            location.county ||
            "City not found";

          const detectedState =
            location.state ||
            "State not found";

          const detectedAddress =
            data.display_name ||
            `${lat}, ${lon}`;

          setRoad(detectedRoad);
          setCity(detectedCity);
          setState(detectedState);
          setAddress(detectedAddress);
        } catch (error) {
          console.error(
            "Reverse geocoding error:",
            error
          );

          setLocationError(
            "Location found, but address could not be detected."
          );
        } finally {
          setLocationLoading(false);
        }
      },

      (error) => {
        console.error(
          "Geolocation error:",
          error
        );

        setLocationLoading(false);

        if (error.code === 1) {
          setLocationError(
            "Location permission denied. Please allow location access."
          );
        } else if (error.code === 2) {
          setLocationError(
            "Unable to detect your location."
          );
        } else if (error.code === 3) {
          setLocationError(
            "Location request timed out."
          );
        } else {
          setLocationError(
            "Unable to detect location."
          );
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // =========================
  // SUBMIT COMPLAINT
  // =========================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setMessage("");

    if (!title.trim()) {
      setMessage("Please enter complaint title.");
      return;
    }

    if (!description.trim()) {
      setMessage(
        "Please enter complaint description."
      );
      return;
    }

    if (
      latitude === null ||
      longitude === null
    ) {
      setMessage(
        "Please detect your location before submitting."
      );
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append("title", title);
      formData.append(
        "description",
        description
      );
      formData.append("category", category);
      formData.append(
        "latitude",
        latitude.toString()
      );
      formData.append(
        "longitude",
        longitude.toString()
      );
      formData.append("address", address);

      if (image) {
        formData.append("image", image);
      }

      const token =
        localStorage.getItem(
          "access_token"
        );

      const response = await fetch(
        "http://127.0.0.1:8000/complaints",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      console.log(
        "COMPLAINT CREATED:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.detail ||
          data.message ||
          "Complaint submission failed."
        );
      }

      // =========================
      // GET COMPLAINT ID SAFELY
      // =========================

      const complaintId =
        data.complaint_id ??
        data.id ??
        data.complaint?.id;

      if (
        complaintId !== undefined &&
        complaintId !== null
      ) {
        setSubmittedComplaintId(Number(complaintId));

        setMessage(
          `Complaint submitted successfully! Complaint #${complaintId}`
        );
      } else {
        setMessage(
          "Complaint submitted successfully!"
        );

        console.warn(
          "Complaint ID was not returned by backend:",
          data
        );
      }

      // Clear form
      setTitle("");
      setDescription("");
      setCategory("Road Damage");
      setImage(null);
    } catch (error) {
      console.error(
        "Complaint submission error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to submit complaint."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">

      <div className="mx-auto max-w-3xl">

        {/* HEADER */}
        <div className="mb-5 rounded-xl bg-white p-5 shadow-sm">

          <h1 className="text-2xl font-bold text-slate-900">
            CivicPulse AI
          </h1>

          <p className="mt-1 text-slate-500">
            Submit a Civic Complaint
          </p>

        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white p-5 shadow-sm"
        >

          {/* TITLE */}
          <div className="mb-4">

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Complaint Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="Example: Large pothole on road"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => startVoiceInput("title")}
              disabled={isListening}
              className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isListening && voiceTarget === "title"
                ? "🎤 Listening..."
                : "🎤 Speak Title"}
            </button>
            <div className="mb-3">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Voice Language
              </label>

              <select
                value={voiceLanguage}
                onChange={(e) => setVoiceLanguage(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="hi-IN">Hindi (हिन्दी)</option>
                <option value="en-IN">English</option>
                <option value="ur-PK">Urdu (اردو)</option>
                <option value="pa-IN">Punjabi (ਪੰਜਾਬੀ)</option>
                <option value="bn-IN">Bengali (বাংলা)</option>
                <option value="mr-IN">Marathi (मराठी)</option>
                <option value="ta-IN">Tamil (தமிழ்)</option>
                <option value="te-IN">Telugu (తెలుగు)</option>
                <option value="gu-IN">Gujarati (ગુજરાતી)</option>
                <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
                <option value="ml-IN">Malayalam (മലയാളം)</option>
              </select>
            </div>


          </div>

          {/* DESCRIPTION */}
          <div className="mb-4">

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Describe the problem..."
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => startVoiceInput("description")}
              disabled={isListening}
              className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isListening && voiceTarget === "description"
                ? "🎤 Listening..."
                : "🎤 Speak Description"}
            </button>

          </div>

          {/* CATEGORY */}
          <div className="mb-4">

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Category
            </label>

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
            >
              <option value="Road Damage">
                Road Damage
              </option>

              <option value="Street Light">
                Street Light
              </option>

              <option value="Water Supply">
                Water Supply
              </option>

              <option value="Garbage">
                Garbage
              </option>

              <option value="Other">
                Other
              </option>
            </select>

          </div>

          {/* IMAGE / CAMERA */}

          <div className="mb-4">

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Complaint Image
            </label>

            <div className="flex flex-wrap gap-3">

              {/* Take Photo */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                📷 Take Photo
              </button>

              {/* Upload Image */}
              <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                📁 Upload Image

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setImage(e.target.files?.[0] || null)
                  }
                  className="hidden"
                />
              </label>

            </div>

            {/* Camera input */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) =>
                setImage(e.target.files?.[0] || null)
              }
              className="hidden"
            />

            {/* Selected image */}
            {image && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">

                <p className="text-xs font-semibold text-slate-500">
                  Selected Image
                </p>

                <p className="mt-1 break-all text-sm font-medium text-slate-700">
                  {image.name}
                </p>

              </div>
            )}

          </div>

          {/* LOCATION */}
          <div className="mb-4 rounded-lg bg-slate-50 p-4">

            <div className="flex flex-wrap items-center justify-between gap-3">

              <div>

                <p className="text-sm font-semibold text-slate-700">
                  📍 Complaint Location
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Your location will be detected automatically.
                </p>

              </div>

              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {locationLoading
                  ? "Detecting..."
                  : "📍 Detect My Location"}
              </button>
              {process.env.NODE_ENV === "development" && (
                <button
                  type="button"
                  onClick={setBiharTestLocation}
                  disabled={locationLoading}
                  className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                >
                  🧪 Test Bihar Location
                </button>
              )}

            </div>

            {/* LOCATION ERROR */}
            {locationError && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {locationError}
              </p>
            )}

            {/* LOCATION DETAILS */}
            {latitude !== null &&
              longitude !== null && (

                <div className="mt-4 space-y-3">

                  {/* ROAD */}
                  <div>
                    <p className="text-xs text-slate-500">
                      Road
                    </p>

                    <p className="font-semibold text-slate-800">
                      {road || "Detecting road..."}
                    </p>
                  </div>

                  {/* CITY */}
                  <div>
                    <p className="text-xs text-slate-500">
                      City
                    </p>

                    <p className="font-semibold text-slate-800">
                      {city || "Detecting city..."}
                    </p>
                  </div>

                  {/* STATE */}
                  <div>
                    <p className="text-xs text-slate-500">
                      State
                    </p>

                    <p className="font-semibold text-slate-800">
                      {state || "Detecting state..."}
                    </p>
                  </div>

                  {/* COORDINATES */}
                  <div>
                    <p className="text-xs text-slate-500">
                      Coordinates
                    </p>

                    <p className="text-sm text-slate-700">
                      Latitude:{" "}
                      {latitude.toFixed(6)}
                      {" • "}
                      Longitude:{" "}
                      {longitude.toFixed(6)}
                    </p>
                  </div>

                  {/* FULL ADDRESS */}
                  <div>
                    <p className="text-xs text-slate-500">
                      Full Address
                    </p>

                    <p className="text-sm leading-6 text-slate-700">
                      {address}
                    </p>
                  </div>

                  {/* MAP LINK */}
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                  >
                    🗺️ View Location on Map
                  </a>

                </div>
              )}

          </div>

          {/* MESSAGE */}
          {message && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800">
                {message}
              </p>

              {submittedComplaintId !== null && (
                <button
                  type="button"
                  onClick={() => router.push("/citizen")}
                  className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  View My Complaints
                </button>
              )}
            </div>
          )}
          {/* SUBMIT */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Submitting Complaint..."
              : "Submit Complaint"}
          </button>

        </form>

      </div>


      {/* MY COMPLAINTS */}

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              My Complaints
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Track the status of your submitted complaints.
            </p>
          </div>

          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
            {myComplaints.length}
          </span>
        </div>

        {loadingComplaints ? (
          <p className="text-sm text-slate-500">
            Loading your complaints...
          </p>
        ) : myComplaints.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
            <p className="text-sm text-slate-500">
              You have not submitted any complaints yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {myComplaints.map((complaint) => (
              <div
                key={complaint.id}
                className="rounded-xl border border-slate-200 p-4 transition hover:shadow-sm"
              >
                {/* COMPLAINT HEADER */}

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">

                  {/* Top row */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                    <div className="min-w-0">

                      <div className="mb-2 flex flex-wrap items-center gap-2">

                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                          Complaint #{complaint.id}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${complaint.status === "resolved"
                            ? "bg-green-100 text-green-700"
                            : complaint.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : complaint.status === "verified"
                                ? "bg-blue-100 text-blue-700"
                                : complaint.status === "assigned"
                                  ? "bg-purple-100 text-purple-700"
                                  : complaint.status === "in_progress"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-red-100 text-red-700"
                            }`}
                        >
                          {complaint.status.replace("_", " ")}
                        </span>

                      </div>

                      <h3 className="text-lg font-bold text-slate-800">
                        {complaint.title}
                      </h3>

                      <p className="mt-1 text-sm font-medium text-slate-500">
                        {complaint.category}
                      </p>

                    </div>

                    {/* Priority */}
                    <span
                      className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold capitalize ${complaint.priority === "critical"
                        ? "bg-red-100 text-red-700"
                        : complaint.priority === "high"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      {complaint.priority} priority
                    </span>

                  </div>

                  {/* Description */}
                  <div className="mt-4 rounded-lg bg-slate-50 p-3">
                    <p className="text-sm leading-6 text-slate-600">
                      {complaint.description}
                    </p>
                  </div>

                  {/* Location */}
                  {complaint.address && (
                    <div className="mt-4 flex items-start gap-2">

                      <span className="mt-0.5 text-base">
                        📍
                      </span>

                      <p className="text-sm leading-5 text-slate-600">
                        {complaint.address}
                      </p>

                    </div>
                  )}

                  {/* Quick information */}
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-medium text-slate-400">
                        AI Detection
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {complaint.pothole_count ?? 0} pothole
                        {(complaint.pothole_count ?? 0) !== 1 ? "s" : ""} detected
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-medium text-slate-400">
                        Department
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {complaint.department || "Not assigned"}
                      </p>
                    </div>

                  </div>

                </div>
                {/* COMPLAINT TIMELINE */}

                <div className="mt-5 border-t border-slate-200 pt-5">

                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">
                        Complaint Progress
                      </h4>

                      <p className="mt-1 text-xs text-slate-400">
                        Track your complaint journey
                      </p>
                    </div>

                    <span className="text-xs font-semibold text-slate-400">
                      {getComplaintTimeline(complaint).filter(
                        (step) => step.completed
                      ).length}
                      /
                      {getComplaintTimeline(complaint).length}
                    </span>
                  </div>

                  <div className="overflow-x-auto pb-2">

                    <div className="flex min-w-[650px] items-start">

                      {getComplaintTimeline(complaint).map((step, index) => (
                        <div
                          key={step.label}
                          className="relative flex flex-1 flex-col items-center"
                        >

                          {/* Connector */}
                          {index <
                            getComplaintTimeline(complaint).length - 1 && (
                              <div
                                className={`absolute left-1/2 top-4 h-0.5 w-full ${step.completed &&
                                  getComplaintTimeline(complaint)[index + 1]
                                    .completed
                                  ? "bg-green-400"
                                  : "bg-slate-200"
                                  }`}
                              />
                            )}

                          {/* Step circle */}
                          <div
                            className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${step.completed
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-slate-200 bg-white text-slate-400"
                              }`}
                          >
                            {step.completed ? "✓" : index + 1}
                          </div>

                          {/* Label */}
                          <p
                            className={`mt-2 text-center text-[11px] font-semibold ${step.completed
                              ? "text-slate-700"
                              : "text-slate-400"
                              }`}
                          >
                            {step.label}
                          </p>

                          {/* Date */}
                          {step.date && (
                            <p className="mt-1 text-center text-[10px] text-slate-400">
                              {new Date(step.date).toLocaleDateString("en-IN")}
                            </p>
                          )}

                        </div>
                      ))}

                    </div>

                  </div>

                </div>
                {/* GOVERNMENT ACTION DETAILS */}

                {(complaint.department ||
                  complaint.assigned_to ||
                  complaint.action_taken) && (
                    <div className="mt-5 border-t border-slate-200 pt-5">

                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-700">
                            Government Action
                          </h4>

                          <p className="mt-1 text-xs text-slate-400">
                            Current handling details
                          </p>
                        </div>

                        {complaint.status === "resolved" && (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            ✓ Completed
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                        {/* Department */}
                        {complaint.department && (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-400">
                              Department
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {complaint.department}
                            </p>
                          </div>
                        )}

                        {/* Officer */}
                        {complaint.assigned_to && (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-400">
                              Assigned Officer
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              Officer #{complaint.assigned_to}
                            </p>
                          </div>
                        )}

                      </div>

                      {/* Action Taken */}
                      {complaint.action_taken && (
                        <div className="mt-3 rounded-lg border border-green-100 bg-green-50 p-4">

                          <div className="flex items-start gap-3">

                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm text-green-600">
                              ✓
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-green-700">
                                Action Taken
                              </p>

                              <p className="mt-1 text-sm leading-5 text-slate-700">
                                {complaint.action_taken}
                              </p>

                              {complaint.action_taken_at && (
                                <p className="mt-2 text-xs text-slate-400">
                                  {new Date(
                                    complaint.action_taken_at
                                  ).toLocaleString("en-IN")}
                                </p>
                              )}
                            </div>

                          </div>

                        </div>
                      )}

                    </div>
                  )}
                {/* CITIZEN FEEDBACK */}

                {complaint.status === "resolved" && (
                  <div className="mt-5 border-t border-slate-200 pt-5">

                    {submittedFeedback[complaint.id] ? (

                      /* AFTER SUBMISSION */
                      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg text-green-600">
                          ✓
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-green-800">
                            Feedback Submitted
                          </h4>

                          <p className="mt-1 text-xs text-green-700">
                            Thank you for helping improve civic services.
                          </p>
                        </div>

                      </div>

                    ) : (

                      /* BEFORE SUBMISSION */
                      <div>

                        <div className="mb-4">
                          <h4 className="text-sm font-bold text-slate-700">
                            Rate this resolution
                          </h4>

                          <p className="mt-1 text-xs text-slate-500">
                            How was your experience?
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">

                          <div className="flex gap-1">

                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                type="button"
                                aria-label={`Rate ${rating} out of 5`}
                                onClick={() =>
                                  setFeedbackRating((prev) => ({
                                    ...prev,
                                    [complaint.id]: rating,
                                  }))
                                }
                                className={`text-2xl transition-all duration-200 ${feedbackRating[complaint.id] >= rating
                                  ? "scale-110 text-amber-400"
                                  : "text-slate-300 hover:scale-110 hover:text-amber-300"
                                  }`}
                              >
                                ★
                              </button>
                            ))}

                          </div>

                          <button
                            type="button"
                            onClick={() => submitFeedback(complaint.id)}
                            disabled={!feedbackRating[complaint.id]}
                            className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Submit Feedback
                          </button>

                        </div>

                        {feedbackRating[complaint.id] && (
                          <p className="mt-2 text-xs text-slate-500">
                            Selected rating:{" "}
                            <span className="font-semibold text-amber-500">
                              {feedbackRating[complaint.id]} / 5
                            </span>
                          </p>
                        )}

                        {feedbackMessage[complaint.id] && (
                          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                            {feedbackMessage[complaint.id]}
                          </p>
                        )}

                      </div>

                    )}

                  </div>
                )}
                {/* ADMIN VIEW - CITIZEN FEEDBACK */}
                {complaint.feedback && complaint.feedback.length > 0 && (
                  <div className="mt-5 border-t border-slate-200 pt-5">
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-700">
                        Citizen Feedback
                      </h4>
                      <p className="mt-1 text-xs text-slate-400">
                        Feedback submitted by the citizen
                      </p>
                    </div>

                    <div className="space-y-3">
                      {(complaint.feedback || []).map((feedback: any) => (
                        <div
                          key={feedback.id}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-slate-400">
                                Rating
                              </p>

                              <div className="mt-1 flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg tracking-wide">
                                    <span className="text-amber-400">
                                      {"★".repeat(feedback.rating)}
                                    </span>
                                    <span className="text-slate-300">
                                      {"★".repeat(5 - feedback.rating)}
                                    </span>
                                  </span>

                                  <span className="text-xs font-semibold text-slate-600">
                                    {feedback.rating}/5
                                  </span>
                                </div>

                                <span className="text-xs font-semibold text-slate-600">
                                  {feedback.rating}/5
                                </span>
                              </div>
                            </div>

                            {feedback.created_at && (
                              <span className="text-xs text-slate-400">
                                {new Date(feedback.created_at).toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>

                          {feedback.comment && (
                            <div className="mt-3 rounded-md bg-white p-3">
                              <p className="text-xs font-semibold text-slate-400">
                                Citizen Comment
                              </p>

                              <p className="mt-1 text-sm text-slate-700">
                                {feedback.comment}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>


    </main>
  );
}