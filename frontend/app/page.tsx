"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, getImageUrl } from "@/lib/api";

import dynamic from "next/dynamic";

const BiharRoadMap = dynamic(
  () => import("../components/BiharRoadMap"),
  {
    ssr: false,
  }
);
type Complaint = {
  id: number;
  user_id: number;
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  address: string;

  road: string | null;
  city: string | null;
  state: string | null;
  country: string | null;

  image_url: string | null;

  status: string;
  priority: string;

  pothole_count: number;
  ai_confidence: number | null;
  ai_detected: boolean;
  ai_detection_type: string | null;
  ai_detection_count: number;
  ai_detections: string | null;

  verified_by: number | null;
  verified_at: string | null;
  department_assigned_at: string | null;
  officer_assigned_at: string | null;
  in_progress_at: string | null;
  action_taken_at: string | null;

  department: string | null;
  assigned_to: number | null;

  rejection_reason: string | null;
  action_taken: string | null;

  resolved_at: string | null;

  created_at: string;
  updated_at: string;
  feedback: {
    id: number;
    rating: number;
    comment: string | null;
    user_id: number;
    created_at: string;
  }[];
};

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [systemNotifications, setSystemNotifications] = useState(true);
  const [dashboardAutoRefresh, setDashboardAutoRefresh] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | null>(null);
  const [aiAnalytics, setAiAnalytics] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [priorityAnalytics, setPriorityAnalytics] = useState<any>(null);

  const [departmentAnalytics, setDepartmentAnalytics] = useState<any>(null);
  const [categoryAnalytics, setCategoryAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [expandedComplaintId, setExpandedComplaintId] =
    useState<number | null>(null);

  const [successMessage, setSuccessMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [actionTakenInput, setActionTakenInput] = useState("");

  // =====================================================
  // DASHBOARD COUNTS
  // =====================================================

  const totalComplaints =
    analytics?.total_complaints ?? complaints.length;

  const pendingComplaints =
    analytics?.pending ??
    complaints.filter(
      (complaint) => complaint.status === "pending"
    ).length;

  const inProgressComplaints =
    analytics?.in_progress ??
    complaints.filter(
      (complaint) => complaint.status === "in_progress"
    ).length;

  const assignedComplaints =
    analytics?.assigned ??
    complaints.filter(
      (complaint) => complaint.status === "assigned"
    ).length;

  const resolvedComplaints =
    analytics?.resolved ??
    complaints.filter(
      (complaint) => complaint.status === "resolved"
    ).length;

  const highPriorityComplaints =
    analytics?.priority_wise_complaints
      ? (analytics.priority_wise_complaints.high ?? 0) +
      (analytics.priority_wise_complaints.critical ?? 0)
      : complaints.filter(
        (complaint) =>
          complaint.priority === "high" ||
          complaint.priority === "critical"
      ).length;

  const latestComplaint =
    selectedComplaintId !== null
      ? complaints.find(
        (complaint) => complaint.id === selectedComplaintId
      ) || null
      : complaints.length > 0
        ? complaints.reduce((latest, complaint) =>
          complaint.id > latest.id ? complaint : latest
        )
        : null;


  // =====================================================
  // VERIFY COMPLAINT
  // =====================================================

  const verifyComplaint = async (complaintId: number) => {
    try {
      setUpdatingId(complaintId);
      setSuccessMessage("");
      setErrorMessage("");

      const response = await fetch(
        `${API_BASE_URL}/complaints/${complaintId}/verify`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "access_token"
            )}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to verify complaint"
        );
      }

      setSuccessMessage("Complaint verified successfully.");

      // Refresh complaints
      window.location.reload();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const assignDepartment = async (
    complaintId: number,
    department: string
  ) => {
    try {
      setUpdatingId(complaintId);
      setSuccessMessage("");
      setErrorMessage("");

      const response = await fetch(
        `${API_BASE_URL}/complaints/${complaintId}/department`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "access_token"
            )}`,
          },
          body: JSON.stringify({
            department: department,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to assign department"
        );
      }

      setSuccessMessage("Department assigned successfully.");
      setComplaints((previousComplaints) =>
        previousComplaints.map((complaint) =>
          complaint.id === complaintId
            ? {
              ...complaint,
              action_taken: actionTakenInput.trim(),
              action_taken_at: new Date().toISOString(),
            }
            : complaint
        )
      );
      setSelectedDepartment(department);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const assignOfficer = async (
    complaintId: number,
    officerId: number
  ) => {
    try {
      setUpdatingId(complaintId);
      setSuccessMessage("");
      setErrorMessage("");

      const response = await fetch(
        `${API_BASE_URL}/complaints/${complaintId}/officer`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "access_token"
            )}`,
          },
          body: JSON.stringify({
            officer_id: officerId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to assign officer"
        );
      }

      setSuccessMessage("Officer assigned successfully.");

      setComplaints((previousComplaints) =>
        previousComplaints.map((complaint) =>
          complaint.id === complaintId
            ? {
              ...complaint,
              assigned_to: officerId,
              status: "assigned",
            }
            : complaint
        )
      );

      setSelectedOfficer(String(officerId));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setUpdatingId(null);
    }
  };


  // =====================================================
  // GOVERNMENT WORKFLOW STATUS
  // =====================================================

  const updateWorkflowStatus = async (
    complaintId: number,
    newStatus: string
  ) => {
    try {
      setUpdatingId(complaintId);
      setSuccessMessage("");
      setErrorMessage("");

      const response = await fetch(
        `${API_BASE_URL}/complaints/${complaintId}/workflow-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "access_token"
            )}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to update workflow status"
        );
      }

      setComplaints((previousComplaints) =>
        previousComplaints.map((complaint) =>
          complaint.id === complaintId
            ? {
              ...complaint,
              status: newStatus,
              ...(newStatus === "resolved"
                ? {
                  resolved_at:
                    data.resolved_at ||
                    complaint.resolved_at,
                }
                : {}),
            }
            : complaint
        )
      );

      setSuccessMessage(
        `Complaint moved to ${newStatus.replace("_", " ")}.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setUpdatingId(null);
    }
  };
  // =====================================================
  // REJECT COMPLAINT
  // =====================================================

  const rejectComplaint = async (complaintId: number) => {
    if (!rejectionReason.trim()) {
      setErrorMessage("Please enter the rejection reason.");
      return;
    }

    try {
      setUpdatingId(complaintId);
      setSuccessMessage("");
      setErrorMessage("");

      const response = await fetch(
        `${API_BASE_URL}/complaints/${complaintId}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "access_token"
            )}`,
          },
          body: JSON.stringify({
            rejection_reason: rejectionReason.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to reject complaint"
        );
      }

      setComplaints((previousComplaints) =>
        previousComplaints.map((complaint) =>
          complaint.id === complaintId
            ? {
              ...complaint,
              status: "rejected",
              rejection_reason: rejectionReason.trim(),
            }
            : complaint
        )
      );

      setRejectionReason("");
      setSuccessMessage("Complaint rejected successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setUpdatingId(null);
    }
  };
  const deleteUser = async (userId: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this user?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "access_token"
            )}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to delete user"
        );
      }

      setUsers((previousUsers) =>
        previousUsers.filter((user) => user.id !== userId)
      );

      setSuccessMessage("User deleted successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    }
  };
  const updateUser = async (
    userId: number,
    userData: {
      name: string;
      phone: string;
      city: string;
      address: string;
    }
  ) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "access_token"
            )}`,
          },
          body: JSON.stringify(userData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to update user"
        );
      }

      setUsers((previousUsers) =>
        previousUsers.map((user) =>
          user.id === userId
            ? {
              ...user,
              ...userData,
            }
            : user
        )
      );

      setSuccessMessage("User updated successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    }
  };


  // =====================================================
  // RECORD ACTION TAKEN
  // =====================================================

  const recordActionTaken = async (complaintId: number) => {
    if (!actionTakenInput.trim()) {
      setErrorMessage("Please enter the action taken.");
      return;
    }

    try {
      setUpdatingId(complaintId);
      setSuccessMessage("");
      setErrorMessage("");

      const response = await fetch(
        `${API_BASE_URL}/complaints/${complaintId}/action`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "access_token"
            )}`,
          },
          body: JSON.stringify({
            action_taken: actionTakenInput.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to record action taken"
        );
      }

      setComplaints((previousComplaints) =>
        previousComplaints.map((complaint) =>
          complaint.id === complaintId
            ? {
              ...complaint,
              action_taken: actionTakenInput.trim(),
            }
            : complaint
        )
      );

      setSuccessMessage("Action taken recorded successfully.");
      setActionTakenInput("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setUpdatingId(null);
    }
  };


  // =====================================================
  // FETCH COMPLAINTS
  // =====================================================

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          router.push("/login");
          return;
        }

        // =====================================================
        // FETCH COMPLAINTS
        // =====================================================

        const response = await fetch(
          `${API_BASE_URL}/complaints`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          localStorage.removeItem("access_token");
          router.push("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            `HTTP error: ${response.status}`
          );
        }

        const data: Complaint[] =
          await response.json();

        setComplaints(data);

        // =====================================================
        // FETCH USERS
        // =====================================================

        const usersResponse = await fetch(
          `${API_BASE_URL}/users`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (usersResponse.ok) {
          const usersData =
            await usersResponse.json();

          setUsers(usersData);

          try {
            const payload = JSON.parse(
              atob(token.split(".")[1])
            );

            const loggedInUser = usersData.find(
              (user: any) =>
                user.id === Number(payload.user_id)
            );

            if (loggedInUser) {
              setCurrentUser(loggedInUser);
            }
          } catch (error) {
            console.error(
              "Failed to identify current user:",
              error
            );
          }
        }
        // =====================================================
        // COMPLAINT ANALYTICS
        // =====================================================

        const analyticsResponse = await fetch(
          `${API_BASE_URL}/admin/analytics/complaints`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (analyticsResponse.ok) {
          const analyticsData =
            await analyticsResponse.json();

          console.log("DASHBOARD ANALYTICS:", analyticsData);

          setAnalytics(analyticsData);
        }

        // =====================================================
        // AI ANALYTICS
        // =====================================================

        const aiAnalyticsResponse = await fetch(
          `${API_BASE_URL}/admin/analytics/ai`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (aiAnalyticsResponse.ok) {
          const aiAnalyticsData =
            await aiAnalyticsResponse.json();

          setAiAnalytics(aiAnalyticsData);
        }

        // =====================================================
        // AVERAGE RESOLUTION TIME
        // =====================================================

        const resolutionTimeResponse = await fetch(
          `${API_BASE_URL}/admin/analytics/average-resolution-time`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (resolutionTimeResponse.ok) {
          const resolutionTimeData =
            await resolutionTimeResponse.json();

          setAnalytics((previousAnalytics: any) => ({
            ...previousAnalytics,
            average_resolution_time_hours:
              resolutionTimeData.average_resolution_time_hours,
          }));

          // =====================================================
          // PRIORITY ANALYTICS
          // =====================================================

          const priorityResponse = await fetch(
            `${API_BASE_URL}/admin/analytics/priorities`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (priorityResponse.ok) {
            const priorityData =
              await priorityResponse.json();

            setPriorityAnalytics(priorityData);
          }

          // =====================================================
          // DEPARTMENT ANALYTICS
          // =====================================================

          const departmentResponse = await fetch(
            `${API_BASE_URL}/admin/analytics/departments`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (departmentResponse.ok) {
            const departmentData =
              await departmentResponse.json();

            setDepartmentAnalytics(departmentData);
          }

          // =====================================================
          // CATEGORY ANALYTICS
          // =====================================================

          const categoryResponse = await fetch(
            `${API_BASE_URL}/admin/analytics/categories`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (categoryResponse.ok) {
            const categoryData =
              await categoryResponse.json();

            setCategoryAnalytics(categoryData);
          }
        }

        // =====================================================
        // LATEST COMPLAINT
        // =====================================================

        const latest =
          data.length > 0
            ? data.reduce(
              (currentLatest, complaint) =>
                complaint.id > currentLatest.id
                  ? complaint
                  : currentLatest
            )
            : null;

        if (latest) {
          setSelectedDepartment(
            latest.department || ""
          );

          setSelectedOfficer(
            latest.assigned_to
              ? String(latest.assigned_to)
              : ""
          );

          setActionTakenInput(
            latest.action_taken || ""
          );
        }

      } catch (error) {
        console.error(
          "Failed to fetch complaints:",
          error
        );

        setErrorMessage(
          "Unable to connect to backend server. Please make sure FastAPI (port 8000) is running."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          router.push("/login");
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/notifications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          localStorage.removeItem("access_token");
          router.push("/login");
          return;
        }

        if (response.ok) {
          const notificationsData =
            await response.json();

          setNotifications(notificationsData);
        }
      } catch (error) {
        console.error(
          "Failed to fetch notifications:",
          error
        );
      }
    };

    if (activeSection === "notifications") {
      fetchNotifications();
    }
  }, [activeSection, router]);
  const filteredComplaints = complaints.filter((complaint) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !search ||
      complaint.title.toLowerCase().includes(search) ||
      complaint.address.toLowerCase().includes(search) ||
      complaint.category.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "all" || complaint.status === statusFilter;

    const matchesPriority =
      priorityFilter === "all" || complaint.priority === priorityFilter;

    const matchesDepartment =
      departmentFilter === "all" ||
      complaint.department === departmentFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesDepartment
    );
  });

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100 font-sans text-slate-900 antialiased">

      {/* =====================================================
          SUCCESS MESSAGE
      ===================================================== */}

      {successMessage && (
        <div className="fixed left-4 right-4 top-20 z-50 rounded-lg bg-green-100 px-5 py-3 text-sm font-semibold text-green-700 shadow-lg sm:left-auto sm:right-6 sm:top-6">
          ✓ {successMessage}
        </div>
      )}

      {/* =====================================================
          ERROR MESSAGE
      ===================================================== */}

      {errorMessage && (
        <div className="fixed left-4 right-4 top-20 z-50 rounded-lg bg-red-100 px-5 py-3 text-sm font-semibold text-red-700 shadow-lg sm:left-auto sm:right-6 sm:top-6">
          ✕ {errorMessage}
        </div>
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}
      {/* Mobile navigation controls */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <div className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm"
          aria-label="Open navigation menu"
        >
          ☰
        </button>
        <div className="text-sm font-bold text-slate-900">CivicPulse AI</div>
        <div className="w-10" />
      </div>

      <aside className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-slate-950 text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close navigation menu"
          >
            ✕
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 21V10L8 6V21M8 21V4L13 2V21M13 21V8L18 5V21M18 21H21"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 14H6M10 11H11M15 14H16M19 11H20"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                CivicPulse AI
              </h1>
              <p className="break-words text-xs text-slate-400">
                Smart Civic Management
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">

          {/* Dashboard */}
          <button
            type="button"
            onClick={() => {
              setActiveSection("dashboard");
              setActiveTab("Dashboard");
              setMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${activeSection === "dashboard"
              ? "bg-blue-600 text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
          >
            <span>📊</span>
            Dashboard
          </button>

          {/* Complaints */}
          <button
            type="button"
            onClick={() => {
              setActiveSection("complaints");
              setActiveTab("Complaints");
              setMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${activeSection === "complaints"
              ? "bg-blue-600 text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
          >
            <span>📋</span>
            Complaints
          </button>

          {/* Users */}
          <button
            type="button"
            onClick={() => {
              setActiveSection("users");
              setActiveTab("Users");
              setMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${activeSection === "users"
              ? "bg-blue-600 text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
          >
            <span>👥</span>
            Users
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => {
              setActiveSection("notifications");
              setActiveTab("Notifications");
              setMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${activeSection === "notifications"
              ? "bg-blue-600 text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
          >
            <span>🔔</span>
            Notifications
          </button>

          {/* Profile */}
          <button
            type="button"
            onClick={() => {
              setActiveSection("profile");
              setActiveTab("Profile");
              setMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${activeSection === "profile"
              ? "bg-blue-600 text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
          >
            <span>👤</span>
            Profile
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => {
              setActiveSection("settings");
              setActiveTab("Settings");
              setMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${activeSection === "settings"
              ? "bg-blue-600 text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
          >
            <span>⚙️</span>
            Settings
          </button>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-slate-800 p-4">

          <div className="mb-3 rounded-lg bg-slate-900 px-4 py-3">
            <p className="text-xs text-slate-400">
              Logged in as
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              Administrator
            </p>
          </div>

          {/* Existing Logout Logic */}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("access_token");
              router.push("/login");
            }}
            className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
          >
            <span>🚪</span>
            Sign Out
          </button>

        </div>
      </aside>
      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="ml-0 min-h-screen overflow-x-hidden px-4 pb-8 pt-20 sm:px-6 lg:ml-64 lg:p-8">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h2 className="text-3xl font-bold">
              {activeTab}
            </h2>

            <p className="mt-1 text-slate-500">
              CivicPulse AI administration panel
            </p>

          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white px-4 py-2 shadow-sm">

              <p className="text-sm font-medium">
                Admin
              </p>

              <p className="text-xs text-slate-500">
                Administrator
              </p>

            </div>

            <button
              onClick={() => {
                localStorage.removeItem("access_token");
                router.push("/login");
              }}
              className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition shadow-sm"
              title="Logout"
            >
              Logout
            </button>
          </div>

        </div>

        {/* =====================================================
            LOADING
        ===================================================== */}

        {loading && (
          <div className="rounded-xl bg-white p-6 shadow-sm">

            <p className="text-slate-500">
              Loading complaints...
            </p>

          </div>
        )}

        {/* =====================================================
            DASHBOARD
        ===================================================== */}

        {!loading &&
          activeTab === "Dashboard" && (
            <>

              {/* ================= INTERACTIVE STATISTICS ================= */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

                {/* TOTAL */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection("complaints");
                    setActiveTab("Complaints");
                  }}
                  className="group rounded-xl bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        Total Complaints
                      </p>

                      <h3 className="mt-2 text-3xl font-bold text-blue-600">
                        {totalComplaints}
                      </h3>
                    </div>

                    <span className="rounded-lg bg-blue-50 px-2.5 py-2 text-blue-600">
                      📋
                    </span>
                  </div>

                  <p className="mt-4 text-xs font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                    View all complaints →
                  </p>
                </button>

                {/* PENDING */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection("complaints");
                    setActiveTab("Complaints");
                  }}
                  className="group rounded-xl bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        Pending
                      </p>

                      <h3 className="mt-2 text-3xl font-bold text-yellow-600">
                        {pendingComplaints}
                      </h3>
                    </div>

                    <span className="rounded-lg bg-yellow-50 px-2.5 py-2 text-yellow-600">
                      ⏳
                    </span>
                  </div>

                  <p className="mt-4 text-xs font-medium text-yellow-600 opacity-0 transition-opacity group-hover:opacity-100">
                    Needs attention →
                  </p>
                </button>


                {/* IN PROGRESS */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection("complaints");
                    setActiveTab("Complaints");
                  }}
                  className="group rounded-xl bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        In Progress
                      </p>

                      <h3 className="mt-2 text-3xl font-bold text-blue-600">
                        {inProgressComplaints}
                      </h3>
                    </div>

                    <span className="rounded-lg bg-blue-50 px-2.5 py-2 text-blue-600">
                      ⚙️
                    </span>
                  </div>

                  <p className="mt-4 text-xs font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                    View active work →
                  </p>
                </button>


                {/* ASSIGNED */}
                <button
                  onClick={() => {
                    setActiveSection("complaints");
                    setActiveTab("Complaints");
                  }}
                  className="group rounded-xl bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        Assigned
                      </p>

                      <h3 className="mt-2 text-3xl font-bold text-indigo-600">
                        {assignedComplaints}
                      </h3>
                    </div>

                    <span className="rounded-lg bg-indigo-50 px-2.5 py-2 text-indigo-600">
                      👤
                    </span>
                  </div>

                  <p className="mt-4 text-xs font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                    View assigned work →
                  </p>
                </button>


                {/* HIGH PRIORITY */}
                <button
                  onClick={() => {
                    setActiveSection("complaints");
                    setActiveTab("Complaints");
                  }}
                  className="group rounded-xl bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        High Priority
                      </p>

                      <h3 className="mt-2 text-3xl font-bold text-red-600">
                        {highPriorityComplaints}
                      </h3>
                    </div>

                    <span className="rounded-lg bg-red-50 px-2.5 py-2 text-red-600">
                      ⚠️
                    </span>
                  </div>

                  <p className="mt-4 text-xs font-medium text-red-600 opacity-0 transition-opacity group-hover:opacity-100">
                    Review urgent issues →
                  </p>
                </button>


                {/* RESOLVED */}
                <button
                  onClick={() => {
                    setActiveSection("complaints");
                    setActiveTab("Complaints");
                  }}
                  className="group rounded-xl bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        Resolved
                      </p>

                      <h3 className="mt-2 text-3xl font-bold text-green-600">
                        {resolvedComplaints}
                      </h3>
                    </div>

                    <span className="rounded-lg bg-green-50 px-2.5 py-2 text-green-600">
                      ✓
                    </span>
                  </div>

                  <p className="mt-4 text-xs font-medium text-green-600 opacity-0 transition-opacity group-hover:opacity-100">
                    View resolved cases →
                  </p>
                </button>
                {/* RESOLUTION RATE */}
                <button
                  onClick={() => {
                    setActiveSection("complaints");
                    setActiveTab("Complaints");
                  }}
                  className="group rounded-xl bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        Resolution Rate
                      </p>
                      <h3 className="mt-2 text-3xl font-bold text-purple-600">
                        {analytics?.total_complaints
                          ? Math.round(
                            (analytics.resolved / analytics.total_complaints) * 100
                          )
                          : 0}%
                      </h3>
                    </div>

                    <span className="rounded-lg bg-purple-50 px-2.5 py-2 text-purple-600">
                      📈
                    </span>
                  </div>

                  <p className="mt-4 text-xs font-medium text-purple-600 opacity-0 transition-opacity group-hover:opacity-100">
                    View resolution analytics →
                  </p>
                </button>

              </div>
              {/* ================= ANALYTICS SUMMARY ================= */}
              <div className="mt-8 grid grid-cols-1 gap-5">
                <div className="rounded-xl bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    Avg. Resolution Time
                  </p>

                  <h3 className="mt-2 text-3xl font-bold text-purple-600">
                    {analytics?.average_resolution_time_hours ?? 0} hrs
                  </h3>

                  <p className="mt-2 text-xs text-slate-400">
                    Average time taken to resolve complaints
                  </p>
                </div>
              </div>
              {/* ================= PRIORITY ANALYTICS ================= */}
              <div className="mt-5 rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h3 className="text-lg font-semibold">
                    Priority Breakdown
                  </h3>
                  <p className="text-sm text-slate-500">
                    Complaints by priority level
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Normal
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-700">
                      {priorityAnalytics?.priority_wise_complaints?.normal ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg bg-orange-50 p-4">
                    <p className="text-xs font-medium text-orange-600">
                      High
                    </p>
                    <p className="mt-2 text-2xl font-bold text-orange-600">
                      {priorityAnalytics?.priority_wise_complaints?.high ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-xs font-medium text-red-600">
                      Critical
                    </p>
                    <p className="mt-2 text-2xl font-bold text-red-600">
                      {priorityAnalytics?.priority_wise_complaints?.critical ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* ================= DEPARTMENT ANALYTICS ================= */}
              <div className="mt-5 rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h3 className="text-lg font-semibold">
                    Department Breakdown
                  </h3>

                  <p className="text-sm text-slate-500">
                    Complaints handled by each department
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-xs font-medium text-blue-600">
                      Roads
                    </p>

                    <p className="mt-2 text-2xl font-bold text-blue-700">
                      {departmentAnalytics?.department_wise_complaints?.Roads ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg bg-green-50 p-4">
                    <p className="text-xs font-medium text-green-600">
                      Sanitation
                    </p>

                    <p className="mt-2 text-2xl font-bold text-green-700">
                      {departmentAnalytics?.department_wise_complaints?.Sanitation ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg bg-purple-50 p-4">
                    <p className="text-xs font-medium text-purple-600">
                      Water
                    </p>

                    <p className="mt-2 text-2xl font-bold text-purple-700">
                      {departmentAnalytics?.department_wise_complaints?.Water ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg bg-amber-50 p-4">
                    <p className="text-xs font-medium text-amber-600">
                      Electrical
                    </p>

                    <p className="mt-2 text-2xl font-bold text-amber-700">
                      {departmentAnalytics?.department_wise_complaints?.Electrical ?? 0}
                    </p>
                  </div>
                </div>
              </div>
              {/* ================= CATEGORY ANALYTICS ================= */}
              <div className="mt-5 rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h3 className="text-lg font-semibold">
                    Category Breakdown
                  </h3>
                  <p className="text-sm text-slate-500">
                    Complaints by civic issue category
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(
                    categoryAnalytics?.category_wise_complaints ?? {}
                  ).map(([category, count]) => (
                    <div
                      key={category}
                      className="rounded-lg bg-slate-50 p-4"
                    >
                      <p className="text-xs font-medium text-slate-500">
                        {category}
                      </p>

                      <p className="mt-2 text-2xl font-bold text-slate-700">
                        {String(count)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ================= AI ANALYTICS ================= */}

              <div className="mt-5 rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h3 className="text-lg font-semibold">
                    AI Detection Analytics
                  </h3>

                  <p className="text-sm text-slate-500">
                    AI-based civic issue detection performance
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-xs font-medium text-blue-600">
                      AI Detected Complaints
                    </p>

                    <p className="mt-2 text-2xl font-bold text-blue-700">
                      {aiAnalytics?.ai_detected_complaints ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-xs font-medium text-red-600">
                      Total Potholes Detected
                    </p>

                    <p className="mt-2 text-2xl font-bold text-red-700">
                      {aiAnalytics?.total_potholes_detected ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg bg-purple-50 p-4">
                    <p className="text-xs font-medium text-purple-600">
                      Average AI Confidence
                    </p>

                    <p className="mt-2 text-2xl font-bold text-purple-700">
                      {aiAnalytics?.average_ai_confidence_percent ?? 0}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-4">
                    <p className="text-xs font-medium text-emerald-600">
                      Detection Types
                    </p>

                    <div className="mt-2 space-y-1">
                      {aiAnalytics?.detection_type_breakdown &&
                        Object.entries(aiAnalytics.detection_type_breakdown).length > 0 ? (
                        Object.entries(aiAnalytics.detection_type_breakdown).map(
                          ([type, count]) => (
                            <div
                              key={type}
                              className="flex items-center justify-between gap-3"
                            >
                              <span className="text-sm font-medium capitalize text-slate-700">
                                {type.replaceAll("_", " ")}
                              </span>

                              <span className="text-lg font-bold text-emerald-700">
                                {Number(count)}
                              </span>
                            </div>
                          )
                        )
                      ) : (
                        <span className="text-sm text-slate-500">
                          No AI detections
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* ================= STATUS ANALYTICS ================= */}
              <div className="mt-5 rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h3 className="text-lg font-semibold">
                    Status Breakdown
                  </h3>

                  <p className="text-sm text-slate-500">
                    Current complaint status distribution
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <div className="rounded-lg bg-amber-50 p-4">
                    <p className="text-xs font-medium text-amber-600">
                      Pending
                    </p>
                    <p className="mt-2 text-2xl font-bold text-amber-700">
                      {analytics?.pending ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-xs font-medium text-blue-600">
                      Verified
                    </p>
                    <p className="mt-2 text-2xl font-bold text-blue-700">
                      {analytics?.verified ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg bg-indigo-50 p-4">
                    <p className="text-xs font-medium text-indigo-600">
                      Assigned
                    </p>
                    <p className="mt-2 text-2xl font-bold text-indigo-700">
                      {analytics?.assigned ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg bg-orange-50 p-4">
                    <p className="text-xs font-medium text-orange-600">
                      In Progress
                    </p>
                    <p className="mt-2 text-2xl font-bold text-orange-700">
                      {analytics?.in_progress ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg bg-green-50 p-4">
                    <p className="text-xs font-medium text-green-600">
                      Resolved
                    </p>
                    <p className="mt-2 text-2xl font-bold text-green-700">
                      {analytics?.resolved ?? 0}                    </p>
                  </div>

                  <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-xs font-medium text-red-600">
                      Rejected
                    </p>
                    <p className="mt-2 text-2xl font-bold text-red-700">
                      {analytics?.rejected ?? 0}
                    </p>
                  </div>
                </div>
              </div>
              {/* ================= BIHAR ROAD DAMAGE MAP ================= */}

              <div className="mt-8">
                <BiharRoadMap complaints={complaints} />
              </div>

              {/* ================= RECENT COMPLAINT ================= */}

              <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">

                <div className="mb-5 flex items-center justify-between">

                  <div>

                    <h3 className="text-xl font-semibold">
                      Recent Complaints
                    </h3>

                    <p className="text-sm text-slate-500">
                      Latest citizen reports
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      setActiveTab("Complaints")
                    }
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    View All
                  </button>

                </div>

                {latestComplaint ? (
                  <>

                    <div className="rounded-lg border border-slate-200 p-5">

                      <div className="flex flex-col justify-between gap-4 md:flex-row">

                        <div>

                          <p className="text-sm text-slate-500">
                            Complaint #{latestComplaint.id}
                          </p>

                          <h4 className="mt-1 text-lg font-semibold">
                            {latestComplaint.title}
                          </h4>

                          <p className="mt-1 break-words text-sm text-slate-500">
                            {latestComplaint.category} •{" "}
                            {latestComplaint.address}
                          </p>

                        </div>

                        <div>

                          <span
                            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${latestComplaint.status ===
                              "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : latestComplaint.status ===
                                "in_progress"
                                ? "bg-blue-100 text-blue-700"
                                : latestComplaint.status ===
                                  "resolved"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                          >
                            {latestComplaint.status
                              .replace("_", " ")
                              .toUpperCase()}
                          </span>

                        </div>

                      </div>

                    </div>

                    {/* AI INFORMATION */}

                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">

                      {/* AI Detection */}
                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          AI Detection
                        </p>

                        <p className="mt-1 font-semibold">
                          {latestComplaint.ai_detected
                            ? "Issue Detected"
                            : "No Issue Detected"}
                        </p>
                      </div>

                      {/* Detection Type */}
                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Detection Type
                        </p>

                        <p className="mt-1 font-semibold capitalize">
                          {latestComplaint.ai_detection_type
                            ? latestComplaint.ai_detection_type
                            : "N/A"}
                        </p>
                      </div>

                      {/* Detection Count */}
                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Detection Count
                        </p>

                        <p className="mt-1 font-semibold">
                          {latestComplaint.ai_detection_count ?? 0}
                        </p>
                      </div>

                      {/* Confidence */}
                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Confidence
                        </p>

                        <p className="mt-1 font-semibold">
                          {latestComplaint.ai_confidence !== null &&
                            latestComplaint.ai_confidence !== undefined
                            ? `${(
                              latestComplaint.ai_confidence * 100
                            ).toFixed(1)}%`
                            : "N/A"}
                        </p>
                      </div>

                    </div>
                    {/* GOVERNMENT WORKFLOW */}

                    <div className="mt-6 border-t border-slate-200 pt-6">

                      <h3 className="mb-4 text-lg font-semibold text-slate-800">
                        Government Workflow
                      </h3>

                      {/* Department */}
                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Department
                        </p>

                        <p className="mt-1 font-semibold">
                          {latestComplaint.department || "Not assigned"}
                        </p>
                      </div>
                      {/* Department Assigned At */}
                      <div className="mt-4 rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Department Assigned At
                        </p>
                        <p className="mt-1 font-semibold">
                          {latestComplaint.department_assigned_at
                            ? new Date(latestComplaint.department_assigned_at).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                            })
                            : "Not assigned"}
                        </p>
                      </div>
                      {/* Assigned Officer */}
                      <div className="mt-4 rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Assigned Officer
                        </p>

                        <p className="mt-1 font-semibold">
                          {latestComplaint.assigned_to
                            ? `Officer #${latestComplaint.assigned_to}`
                            : "Not assigned"}
                        </p>
                      </div>
                      {/* Officer Assigned At */}
                      <div className="mt-4 rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Officer Assigned At
                        </p>
                        <p className="mt-1 font-semibold">
                          {latestComplaint.officer_assigned_at
                            ? new Date(latestComplaint.officer_assigned_at).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                            })
                            : "Not assigned"}
                        </p>
                      </div>
                      {/* Work Started At */}
                      <div className="mt-4 rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Work Started At
                        </p>
                        <p className="mt-1 font-semibold">
                          {latestComplaint.in_progress_at
                            ? new Date(latestComplaint.in_progress_at).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                            })
                            : "Not started"}
                        </p>
                      </div>
                      {/* Action Taken At */}
                      <div className="mt-4 rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Action Taken At
                        </p>
                        <p className="mt-1 font-semibold">
                          {latestComplaint.action_taken_at
                            ? new Date(latestComplaint.action_taken_at).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                            })
                            : "Not recorded"}
                        </p>
                      </div>
                      {/* Verified By */}
                      <div className="mt-4 rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Verified By
                        </p>

                        <p className="mt-1 font-semibold">
                          {latestComplaint.verified_by
                            ? `Admin #${latestComplaint.verified_by}`
                            : "Not verified"}
                        </p>
                      </div>
                      {/* Verified At */}
                      <div className="mt-4 rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Verified At
                        </p>

                        <p className="mt-1 font-semibold">

                          {latestComplaint.verified_at
                            ? new Date(latestComplaint.verified_at).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                            })
                            : "Not verified"}
                        </p>
                      </div>
                      {/* Action Taken */}
                      <div className="mt-4 rounded-lg bg-slate-50 p-4 md:col-span-2">
                        <p className="text-xs text-slate-500">
                          Action Taken
                        </p>

                        <p className="mt-1 font-semibold">
                          {latestComplaint.action_taken ||
                            "No action recorded"}
                        </p>
                      </div>
                      {/* Resolved At */}
                      <div className="mt-4 rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Resolved At
                        </p>

                        <p className="mt-1 font-semibold">
                          {latestComplaint.resolved_at
                            ? new Date(latestComplaint.resolved_at).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                            })
                            : "Not resolved"}
                        </p>
                      </div>
                      {/* Rejection Reason */}
                      {latestComplaint.rejection_reason && (
                        <div className="mt-4 rounded-lg bg-slate-50 p-4">
                          <p className="text-xs text-slate-500">
                            Rejection Reason
                          </p>

                          <p className="mt-1 font-semibold">
                            {latestComplaint.rejection_reason}
                          </p>
                        </div>
                      )}


                      {/* Admin Actions */}
                      <div className="mt-6">

                        <h4 className="mb-3 text-sm font-semibold text-slate-700">
                          Admin Actions
                        </h4>


                        {latestComplaint.status === "pending" && (
                          <button
                            onClick={() => verifyComplaint(latestComplaint.id)}
                            disabled={updatingId === latestComplaint.id}
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingId === latestComplaint.id
                              ? "Verifying..."
                              : "Verify Complaint"}
                          </button>
                        )}

                        {latestComplaint.status === "verified" && (
                          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="mb-3 text-sm font-semibold text-slate-700">
                              Assign Department
                            </p>

                            <div className="flex flex-col gap-3 sm:flex-row">
                              <select
                                id="department"
                                value={selectedDepartment}
                                onChange={(e) =>
                                  setSelectedDepartment(e.target.value)
                                }
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              >
                                <option value="" disabled>
                                  Select Department
                                </option>
                                <option value="Roads">Roads</option>
                                <option value="Sanitation">Sanitation</option>
                                <option value="Water">Water</option>
                                <option value="Electrical">Electrical</option>
                              </select>

                              <button
                                onClick={() => {
                                  if (!selectedDepartment) {
                                    setErrorMessage("Please select a department.");
                                    return;
                                  }

                                  assignDepartment(
                                    latestComplaint.id,
                                    selectedDepartment
                                  );
                                }}
                                disabled={updatingId === latestComplaint.id}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {updatingId === latestComplaint.id
                                  ? "Assigning..."
                                  : "Assign Department"}
                              </button>

                            </div>

                          </div>
                        )}

                        {(latestComplaint.status === "pending" ||
                          latestComplaint.status === "verified") && (
                            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                              <p className="mb-3 text-sm font-semibold text-red-800">
                                Reject Complaint
                              </p>

                              <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Enter the reason for rejecting this complaint..."
                                rows={3}
                                className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                              />

                              <button
                                onClick={() => rejectComplaint(latestComplaint.id)}
                                disabled={
                                  updatingId === latestComplaint.id ||
                                  !rejectionReason.trim()
                                }
                                className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {updatingId === latestComplaint.id
                                  ? "Rejecting..."
                                  : "Reject Complaint"}
                              </button>
                            </div>
                          )}
                        {latestComplaint.status === "verified" &&
                          latestComplaint.department && (
                            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <p className="mb-3 text-sm font-semibold text-slate-700">
                                Assign Officer
                              </p>

                              <div className="flex flex-col gap-3 sm:flex-row">
                                <select
                                  id="officer"
                                  value={selectedOfficer}
                                  onChange={(e) =>
                                    setSelectedOfficer(e.target.value)
                                  }
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                >
                                  <option value="" disabled>
                                    Select Officer
                                  </option>

                                  <option value="11">
                                    Road Officer (#11)
                                  </option>
                                </select>

                                <button
                                  onClick={() => {
                                    if (!selectedOfficer) {
                                      setErrorMessage("Please select an officer.");
                                      return;
                                    }

                                    assignOfficer(
                                      latestComplaint.id,
                                      Number(selectedOfficer)
                                    );
                                  }}
                                  disabled={updatingId === latestComplaint.id}
                                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {updatingId === latestComplaint.id
                                    ? "Assigning..."
                                    : "Assign Officer"}
                                </button>
                              </div>
                            </div>
                          )}

                        {latestComplaint.status === "assigned" && (
                          <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                            <p className="mb-3 text-sm font-semibold text-indigo-800">
                              Officer Assigned
                            </p>
                            <p className="mb-4 text-sm text-indigo-700">
                              Officer #{latestComplaint.assigned_to} is assigned to this complaint. Start processing when field work begins.
                            </p>
                            <button
                              onClick={() =>
                                updateWorkflowStatus(
                                  latestComplaint.id,
                                  "in_progress"
                                )
                              }
                              disabled={updatingId === latestComplaint.id}
                              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {updatingId === latestComplaint.id
                                ? "Starting..."
                                : "Start Processing"}
                            </button>
                          </div>
                        )}

                        {latestComplaint.status === "in_progress" && (
                          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                            <p className="mb-3 text-sm font-semibold text-blue-800">
                              Complaint In Progress
                            </p>

                            <textarea
                              value={actionTakenInput}
                              onChange={(e) =>
                                setActionTakenInput(e.target.value)
                              }
                              placeholder="Describe the action taken by the department/officer..."
                              rows={4}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />

                            <div className="mt-3 flex flex-wrap gap-3">
                              <button
                                onClick={() =>
                                  recordActionTaken(latestComplaint.id)
                                }
                                disabled={updatingId === latestComplaint.id}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {updatingId === latestComplaint.id
                                  ? "Saving..."
                                  : "Save Action Taken"}
                              </button>

                              <button
                                onClick={() =>
                                  updateWorkflowStatus(
                                    latestComplaint.id,
                                    "resolved"
                                  )
                                }
                                disabled={
                                  updatingId === latestComplaint.id ||
                                  !latestComplaint.action_taken
                                }
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {updatingId === latestComplaint.id
                                  ? "Resolving..."
                                  : "Resolve Complaint"}
                              </button>
                            </div>

                            {!latestComplaint.action_taken && (
                              <p className="mt-3 text-xs text-slate-500">
                                Save the action taken before resolving the complaint.
                              </p>
                            )}
                          </div>
                        )}

                        {latestComplaint.status === "resolved" && (
                          <p className="text-sm text-green-600">
                            Complaint resolved. No further action required.
                          </p>
                        )}

                        {latestComplaint.status === "rejected" && (
                          <p className="text-sm text-red-600">
                            Complaint rejected. No further action required.
                          </p>
                        )}
                      </div>
                    </div>
                  </>

                ) : (
                  <div className="rounded-lg border border-slate-200 p-5">

                    <p className="text-slate-500">
                      No complaints found.
                    </p>

                  </div>
                )}

              </div>


            </>
          )}
        {!loading && activeTab === "Notifications" && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold">
                  Notifications
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Recent updates related to civic complaints
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600">
                  {notifications.filter(
                    (notification) => !notification.is_read
                  ).length}{" "}
                  Unread
                </div>

                {notifications.some(
                  (notification) => !notification.is_read
                ) && (
                    <button
                      type="button"
                      onClick={async () => {
                        const token = localStorage.getItem("access_token");

                        if (!token) {
                          router.push("/login");
                          return;
                        }

                        try {
                          const response = await fetch(
                            `${API_BASE_URL}/notifications/read-all`,
                            {
                              method: "PATCH",
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                            }
                          );

                          if (response.ok) {
                            setNotifications((previous) =>
                              previous.map((notification) => ({
                                ...notification,
                                is_read: true,
                              }))
                            );
                          }
                        } catch (error) {
                          console.error(
                            "Failed to mark all notifications as read:",
                            error
                          );
                        }
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Mark all as read
                    </button>
                  )}
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center">
                <div className="text-4xl">🔔</div>
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No notifications
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  You are all caught up.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={async () => {
                      if (notification.is_read) return;

                      const token = localStorage.getItem("access_token");

                      if (!token) {
                        router.push("/login");
                        return;
                      }

                      try {
                        const response = await fetch(
                          `${API_BASE_URL}/notifications/${notification.id}/read`,
                          {
                            method: "PATCH",
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                          }
                        );

                        if (response.ok) {
                          setNotifications((previous) =>
                            previous.map((item) =>
                              item.id === notification.id
                                ? { ...item, is_read: true }
                                : item
                            )
                          );
                        }
                      } catch (error) {
                        console.error(
                          "Failed to mark notification as read:",
                          error
                        );
                      }
                    }}
                    className={`w-full rounded-lg border p-3 sm:p-4 text-left transition ${notification.is_read
                      ? "border-slate-200 bg-white"
                      : "border-blue-200 bg-blue-50/50 hover:bg-blue-100/50"
                      }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        🔔
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {notification.message}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          Complaint #{notification.complaint_id}
                          {" • "}
                          {new Date(
                            notification.created_at
                          ).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>

                      {!notification.is_read && (
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}


        {/* =====================================================
                       PROFILE
          ===================================================== */}

        {!loading && activeSection === "profile" && (
          <div className="space-y-6">

            {/* PROFILE HEADER */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <img
                    src="/profile_photo.jpeg"
                    alt="Profile"
                    className="h-16 w-16 rounded-full border-2 border-slate-200 object-cover"
                  />

                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      My Profile
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Manage your personal account information
                    </p>
                  </div>
                </div>

                {!editingUserId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUserId(currentUser?.id || null);
                      setEditName(currentUser?.name || "");
                      setEditPhone(currentUser?.phone || "");
                      setEditCity(currentUser?.city || "");
                      setEditAddress(currentUser?.address || "");
                    }}
                    className="w-full shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 sm:w-auto"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUserId(null);
                        setEditName(currentUser?.name || "");
                        setEditPhone(currentUser?.phone || "");
                        setEditCity(currentUser?.city || "");
                        setEditAddress(currentUser?.address || "");
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!currentUser?.id) return;

                        const token = localStorage.getItem("access_token");

                        if (!token) {
                          router.push("/login");
                          return;
                        }

                        if (!editName.trim()) {
                          setErrorMessage("Name is required.");
                          return;
                        }

                        if (editPhone && editPhone.length !== 10) {
                          setErrorMessage(
                            "Phone number must contain exactly 10 digits."
                          );
                          return;
                        }

                        if (!editCity.trim()) {
                          setErrorMessage("City is required.");
                          return;
                        }

                        try {
                          const response = await fetch(
                            `${API_BASE_URL}/users/${currentUser.id}`,
                            {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                name: editName.trim(),
                                phone: editPhone.trim(),
                                city: editCity.trim(),
                                address: editAddress.trim(),
                              }),
                            }
                          );

                          const data = await response.json();

                          if (!response.ok) {
                            setErrorMessage(
                              data.detail || "Unable to update profile."
                            );
                            return;
                          }

                          const updatedUser = {
                            ...currentUser,
                            name: editName.trim(),
                            phone: editPhone.trim(),
                            city: editCity.trim(),
                            address: editAddress.trim(),
                          };

                          setCurrentUser(updatedUser);

                          setUsers((previous) =>
                            previous.map((user) =>
                              user.id === currentUser.id
                                ? updatedUser
                                : user
                            )
                          );

                          setEditingUserId(null);
                          setSuccessMessage(
                            "Profile updated successfully."
                          );
                          setErrorMessage("");

                          setTimeout(() => {
                            setSuccessMessage("");
                          }, 3000);
                        } catch (error) {
                          console.error(
                            "Failed to update profile:",
                            error
                          );

                          setErrorMessage(
                            "Unable to update profile. Please try again."
                          );
                        }
                      }}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* PROFILE INFORMATION */}


            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h4 className="text-base font-semibold text-slate-900">
                  Personal Information
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  Your registered account details
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

                {/* NAME */}
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Full Name
                  </label>

                  {editingUserId === currentUser?.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        maxLength={50}
                        onChange={(e) => {
                          const value = e.target.value;

                          if (/^[A-Za-z ]*$/.test(value)) {
                            setEditName(value);
                          }
                        }}
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        placeholder="Enter your full name"
                      />

                      <p className="mt-1.5 text-xs text-slate-400">
                        Only letters and spaces are allowed.
                      </p>
                    </>
                  ) : (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                      {currentUser?.name || "Not available"}
                    </div>
                  )}
                </div>

                {/* EMAIL */}
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Email Address
                  </label>

                  <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="truncate text-sm text-slate-800">
                      {currentUser?.email || "Not available"}
                    </span>

                    <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                      Verified
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-400">
                    Email address is linked to your account and cannot be edited.
                  </p>
                </div>

                {/* PHONE */}
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Phone Number
                  </label>

                  {editingUserId === currentUser?.id ? (
                    <>
                      <input
                        type="tel"
                        value={editPhone}
                        maxLength={10}
                        inputMode="numeric"
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setEditPhone(value.slice(0, 10));
                        }}
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        placeholder="Enter 10-digit phone number"
                      />

                      <p className="mt-1.5 text-xs text-slate-400">
                        Enter exactly 10 digits.
                      </p>
                    </>
                  ) : (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                      {currentUser?.phone || "Not available"}
                    </div>
                  )}
                </div>

                {/* CITY */}
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    City
                  </label>

                  {editingUserId === currentUser?.id ? (
                    <>
                      <input
                        type="text"
                        value={editCity}
                        maxLength={50}
                        onChange={(e) => {
                          const value = e.target.value;

                          if (/^[A-Za-z ]*$/.test(value)) {
                            setEditCity(value);
                          }
                        }}
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        placeholder="Enter your city"
                      />

                      <p className="mt-1.5 text-xs text-slate-400">
                        Only letters and spaces are allowed.
                      </p>
                    </>
                  ) : (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                      {currentUser?.city || "Not available"}
                    </div>
                  )}
                </div>

                {/* ADDRESS */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">
                    Address
                  </label>

                  {editingUserId === currentUser?.id ? (
                    <>
                      <textarea
                        value={editAddress}
                        maxLength={200}
                        rows={3}
                        onChange={(e) => {
                          setEditAddress(e.target.value.slice(0, 200));
                        }}
                        className="mt-2 w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        placeholder="Enter your complete address"
                      />

                      <p className="mt-1.5 text-xs text-slate-400">
                        Maximum 200 characters.
                      </p>
                    </>
                  ) : (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                      {currentUser?.address || "Not available"}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* ACCOUNT INFORMATION */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h4 className="text-base font-semibold text-slate-900">
                  Account Information
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

                {/* ROLE */}
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Role
                  </label>

                  <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
                    Administrator
                  </div>
                </div>

                {/* ACCOUNT TYPE */}
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Account Type
                  </label>

                  <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                    Government Administration
                  </div>
                </div>

                {/* SYSTEM ACCESS */}
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    System Access
                  </label>

                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Active
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}
        {/* =====================================================
                    SETTINGS
                ===================================================== */}

        {!loading && activeSection === "settings" && (
          <div className="space-y-6">

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">
                Settings
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Manage your account and application preferences
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h4 className="text-base font-semibold text-slate-900">
                Account Security
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Manage your password and account security settings
              </p>

              <div className="mt-5 flex flex-col gap-4 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Change Password
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Update your account password securely
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Change Password
                </button>
              </div>
            </div>
            {/* APPLICATION PREFERENCES */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div>
                <h4 className="text-base font-semibold text-slate-900">
                  Application Preferences
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  Customize your CivicPulse AI administration experience.
                </p>
              </div>

              <div className="mt-5 divide-y divide-slate-200 rounded-lg border border-slate-200">

                {/* Email Notifications */}
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Email Notifications
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Receive important complaint and system updates by email.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setEmailNotifications((previous) => !previous)
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${emailNotifications
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                      }`}
                  >
                    {emailNotifications ? "Enabled" : "Disabled"}
                  </button>
                </div>

                {/* System Notifications */}
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      System Notifications
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Receive notifications for complaint workflow updates.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSystemNotifications((previous) => !previous)
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${systemNotifications
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                      }`}
                  >
                    {systemNotifications ? "Enabled" : "Disabled"}
                  </button>
                </div>

                {/* Dashboard Auto Refresh */}
                <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Dashboard Auto Refresh
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Automatically refresh dashboard information when required.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setDashboardAutoRefresh((previous) => !previous)
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${dashboardAutoRefresh
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                      }`}
                  >
                    {dashboardAutoRefresh ? "Enabled" : "Disabled"}
                  </button>
                </div>

              </div>
            </div>

            {/* SYSTEM INFORMATION */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div>
                <h4 className="text-base font-semibold text-slate-900">
                  System Information
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  Information about the CivicPulse AI administration platform.
                </p>
              </div>

              <div className="mt-5 divide-y divide-slate-200 rounded-lg border border-slate-200">

                {/* Application */}
                <div className="flex items-center justify-between gap-4 p-4">
                  <span className="text-sm font-medium text-slate-700">
                    Application
                  </span>

                  <span className="text-sm text-slate-500">
                    CivicPulse AI
                  </span>
                </div>

                {/* Version */}
                <div className="flex items-center justify-between gap-4 p-4">
                  <span className="text-sm font-medium text-slate-700">
                    Version
                  </span>

                  <span className="text-sm text-slate-500">
                    1.0.0
                  </span>
                </div>

                {/* Environment */}
                <div className="flex items-center justify-between gap-4 p-4">
                  <span className="text-sm font-medium text-slate-700">
                    Environment
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Development
                  </span>
                </div>

                {/* Backend Status */}
                <div className="flex items-center justify-between gap-4 p-4">
                  <span className="text-sm font-medium text-slate-700">
                    Backend Status
                  </span>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Operational
                  </span>
                </div>

              </div>
            </div>

          </div>
        )}
        {/* =====================================================
            COMPLAINT MANAGEMENT
        ===================================================== */}

        {!loading &&
          activeTab === "Complaints" && (

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">
                    Search
                  </label>

                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search complaints..."
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">
                    Status
                  </label>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">
                    Priority
                  </label>

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All Priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">
                    Department
                  </label>

                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All Departments</option>
                    <option value="Roads">Roads</option>
                    <option value="Sanitation">Sanitation</option>
                    <option value="Water">Water</option>
                    <option value="Electrical">Electrical</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">
                    Actions
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setPriorityFilter("all");
                      setDepartmentFilter("all");
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Clear Filters
                  </button>
                </div>

              </div>
              <h3 className="text-xl font-semibold">
                Complaint Management
              </h3>

              <p className="mt-2 text-slate-500">
                All citizen complaints will appear here.
              </p>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Showing {filteredComplaints.length} of {complaints.length} complaints
              </p>

              <div className="mt-6 space-y-4">

                {filteredComplaints.length > 0 ? (

                  filteredComplaints.map((complaint) => (

                    <div
                      key={complaint.id}
                      className="rounded-lg border border-slate-200 p-5"
                    >

                      {/* =================================================
                          COMPLAINT HEADER
                      ================================================= */}

                      <div className="flex flex-col justify-between gap-4 md:flex-row">

                        <div className="min-w-0">

                          <p className="text-sm text-slate-500">
                            Complaint #{complaint.id}
                          </p>

                          <h4 className="mt-1 text-lg font-semibold text-slate-900">
                            {complaint.title}
                          </h4>

                          <p className="mt-1 break-words text-sm text-slate-500">
                            {complaint.category} •{" "}
                            {complaint.address}
                          </p>

                          <p className="mt-3 text-sm text-slate-600">
                            {complaint.description}
                          </p>

                          <p className="mt-2 text-xs text-slate-400">
                            Submitted:{" "}
                            {new Date(
                              complaint.created_at
                            ).toLocaleString()}
                          </p>

                        </div>

                        {/* PRIORITY + STATUS */}

                        <div className="flex h-fit flex-wrap items-start justify-start gap-2 md:justify-end">

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${complaint.priority ===
                              "critical"
                              ? "bg-red-200 text-red-800"
                              : complaint.priority ===
                                "high"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-700"
                              }`}
                          >
                            {complaint.priority.toUpperCase()}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${complaint.status ===
                              "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : complaint.status ===
                                "in_progress"
                                ? "bg-blue-100 text-blue-700"
                                : complaint.status ===
                                  "resolved"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                          >
                            {complaint.status
                              .replace("_", " ")
                              .toUpperCase()}
                          </span>

                        </div>

                      </div>

                      {/* =================================================
                          LOCATION
                          MAP IS NOT HERE
                          ================================================= */}

                      <div className="mt-4 rounded-lg bg-slate-50 p-4">

                        <p className="text-xs font-semibold text-slate-500">
                          Location
                        </p>

                        <p className="mt-1 break-words text-sm font-medium text-slate-700">
                          {complaint.address}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Latitude:{" "}
                          {complaint.latitude} • Longitude:{" "}
                          {complaint.longitude}
                        </p>

                        <a
                          href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          📍 Open Location
                        </a>

                      </div>

                      {/* =================================================
                          WORKFLOW ACTIONS
                      ================================================= */}

                      <div className="mt-4 flex flex-wrap items-center gap-3">

                        {complaint.status === "pending" && (
                          <button
                            onClick={() => verifyComplaint(complaint.id)}
                            disabled={updatingId === complaint.id}
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingId === complaint.id
                              ? "Verifying..."
                              : "Verify Complaint"}
                          </button>
                        )}

                        {complaint.status === "verified" && (
                          <span className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                            Verified — open Details to assign department and officer
                          </span>
                        )}

                        {complaint.status === "assigned" && (
                          <button
                            onClick={() =>
                              updateWorkflowStatus(
                                complaint.id,
                                "in_progress"
                              )
                            }
                            disabled={updatingId === complaint.id}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingId === complaint.id
                              ? "Starting..."
                              : "Start Processing"}
                          </button>
                        )}

                        {complaint.status === "in_progress" && (
                          <span className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                            In Progress — open Details to record action and resolve
                          </span>
                        )}

                        {complaint.status === "resolved" && (
                          <span className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                            Resolved — no further action required
                          </span>
                        )}

                        {complaint.status === "rejected" && (
                          <span className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                            Rejected — no further action required
                          </span>
                        )}

                      </div>

                      {/* =================================================
                          VIEW DETAILS BUTTON
                      ================================================= */}

                      <button
                        onClick={() => {
                          const isOpening =
                            expandedComplaintId !== complaint.id;

                          setExpandedComplaintId(
                            isOpening ? complaint.id : null
                          );

                          if (isOpening) {
                            setSelectedComplaintId(complaint.id);
                          }
                        }}
                        className="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {expandedComplaintId ===
                          complaint.id
                          ? "Hide Details"
                          : "View Details"}
                      </button>
                      {/* =================================================
                          EXPANDED DETAILS
                          IMAGE + MAP + AI
                          ================================================= */}

                      {expandedComplaintId === complaint.id && (
                        <div className="mt-4 space-y-4">

                          {/* ================= IMAGE + MAP ================= */}

                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

                            {/* COMPLAINT IMAGE */}
                            {complaint.image_url &&
                              complaint.category === "Road Damage" && (
                                <div className="rounded-lg border border-slate-200 bg-white p-4">

                                  <p className="mb-3 text-xs font-semibold text-slate-500">
                                    Complaint Image
                                  </p>

                                  <div className="flex h-56 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                                    <img
                                      src={getImageUrl(complaint.image_url) || ""}
                                      alt={`Complaint ${complaint.id}`}
                                      className="h-full w-full object-contain"
                                    />
                                  </div>

                                </div>
                              )}

                            {/* LOCATION MAP */}
                            <div className="rounded-lg border border-slate-200 bg-white p-4">

                              <div className="mb-3 flex items-center justify-between">

                                <p className="text-xs font-semibold text-slate-500">
                                  Complaint Location Map
                                </p>

                                <a
                                  href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                  📍 Open Location
                                </a>

                              </div>

                              <iframe
                                title={`Complaint ${complaint.id} Location`}
                                src={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}&output=embed`}
                                className="h-56 w-full rounded-lg border border-slate-200"
                                loading="lazy"
                              />

                            </div>

                          </div>
                          {/* ================= LOCATION ================= */}

                          <div className="rounded-lg border border-slate-200 bg-white p-4">

                            <div className="flex items-center justify-between">

                              <div>

                                <p className="text-xs font-semibold text-slate-500">
                                  📍 Location
                                </p>

                                <p className="mt-1 break-words text-sm font-medium text-slate-700">
                                  {complaint.address}
                                </p>

                              </div>

                              <a
                                href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                              >
                                🗺️ View Map
                              </a>

                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">

                              {/* ROAD */}
                              <div className="rounded-lg bg-slate-50 p-3">

                                <p className="text-xs text-slate-500">
                                  Road
                                </p>

                                <p className="mt-1 text-sm font-medium text-slate-700">
                                  {complaint.road || "Not available"}
                                </p>

                              </div>

                              {/* CITY */}
                              <div className="rounded-lg bg-slate-50 p-3">

                                <p className="text-xs text-slate-500">
                                  City
                                </p>

                                <p className="mt-1 text-sm font-medium text-slate-700">
                                  {complaint.city || "Not available"}
                                </p>

                              </div>

                              {/* STATE */}
                              <div className="rounded-lg bg-slate-50 p-3">

                                <p className="text-xs text-slate-500">
                                  State
                                </p>

                                <p className="mt-1 text-sm font-medium text-slate-700">
                                  {complaint.state || "Not available"}
                                </p>

                              </div>

                              {/* COUNTRY */}
                              <div className="rounded-lg bg-slate-50 p-3">

                                <p className="text-xs text-slate-500">
                                  Country
                                </p>

                                <p className="mt-1 text-sm font-medium text-slate-700">
                                  {complaint.country || "Not available"}
                                </p>

                              </div>

                            </div>

                            {/* COORDINATES */}

                            <div className="mt-3 flex gap-6 text-xs text-slate-500">

                              <span>
                                Latitude: {Number(complaint.latitude).toFixed(6)}
                              </span>

                              <span>
                                Longitude: {Number(complaint.longitude).toFixed(6)}
                              </span>

                            </div>

                          </div>

                          {/* ================================
     AI DETECTION DETAILS
================================= */}

                          <div className="rounded-lg bg-slate-50 p-4">

                            <p className="text-xs font-semibold text-slate-500">
                              AI Detection Details
                            </p>

                            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-4">

                              {/* DETECTION STATUS */}
                              <div>
                                <p className="text-xs text-slate-500">
                                  Detection Status
                                </p>

                                <p
                                  className={`mt-1 text-sm font-semibold ${complaint.ai_detected
                                    ? "text-red-600"
                                    : "text-green-600"
                                    }`}
                                >
                                  {complaint.ai_detected
                                    ? "Issue Detected"
                                    : "No Issue Detected"}
                                </p>
                              </div>

                              {/* DETECTION TYPE */}
                              <div>
                                <p className="text-xs text-slate-500">
                                  Detection Type
                                </p>

                                <p className="mt-1 text-sm font-semibold capitalize text-slate-700">
                                  {complaint.ai_detection_type || "N/A"}
                                </p>
                              </div>

                              {/* DETECTION COUNT */}
                              <div>
                                <p className="text-xs text-slate-500">
                                  Detection Count
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-700">
                                  {complaint.ai_detection_count ?? 0}
                                </p>
                              </div>

                              {/* AI CONFIDENCE */}
                              <div>
                                <p className="text-xs text-slate-500">
                                  AI Confidence
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-700">
                                  {complaint.ai_confidence !== null &&
                                    complaint.ai_confidence !== undefined
                                    ? `${(complaint.ai_confidence * 100).toFixed(1)}%`
                                    : "N/A"}
                                </p>

                                {complaint.ai_confidence !== null &&
                                  complaint.ai_confidence !== undefined && (
                                    <p className="mt-1 text-xs text-slate-500">
                                      {complaint.ai_confidence >= 0.8
                                        ? "High Confidence"
                                        : complaint.ai_confidence >= 0.5
                                          ? "Medium Confidence"
                                          : "Low Confidence"}
                                    </p>
                                  )}

                                {complaint.ai_confidence !== null &&
                                  complaint.ai_confidence !== undefined && (
                                    <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                                      <div
                                        className="h-2 rounded-full bg-blue-600"
                                        style={{
                                          width: `${Math.min(
                                            Math.max(
                                              complaint.ai_confidence * 100,
                                              0
                                            ),
                                            100
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                  )}
                              </div>

                            </div>

                          </div>
                          {/* ================================
       GOVERNMENT WORKFLOW TIMELINE
            ================================ */}

                          <div className="rounded-lg border border-slate-200 bg-white p-4">

                            <p className="text-xs font-semibold text-slate-500">
                              Government Workflow
                            </p>

                            <div className="mt-5">

                              {/* CREATED */}
                              <div className="relative flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                                    ✓
                                  </div>
                                  <div className="mt-1 h-full w-px bg-slate-200" />
                                </div>

                                <div className="pb-6">
                                  <p className="text-sm font-semibold text-slate-800">
                                    Complaint Created
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {complaint.created_at
                                      ? new Date(complaint.created_at).toLocaleString("en-IN", {
                                        timeZone: "Asia/Kolkata",
                                      })
                                      : "Not available"}
                                  </p>
                                </div>
                              </div>

                              {/* VERIFIED */}
                              <div className="relative flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full ${complaint.verified_at
                                      ? "bg-green-100 text-green-600"
                                      : "bg-slate-100 text-slate-400"
                                      }`}
                                  >
                                    {complaint.verified_at ? "✓" : "○"}
                                  </div>
                                  <div className="mt-1 h-full w-px bg-slate-200" />
                                </div>

                                <div className="pb-6">
                                  <p className="text-sm font-semibold text-slate-800">
                                    Complaint Verified
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {complaint.verified_at
                                      ? new Date(complaint.verified_at).toLocaleString("en-IN", {
                                        timeZone: "Asia/Kolkata",
                                      })
                                      : "Not verified"}
                                  </p>

                                  {complaint.verified_by && (
                                    <p className="mt-1 text-xs text-slate-500">
                                      Verified By: {complaint.verified_by}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* DEPARTMENT */}
                              <div className="relative flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full ${complaint.department_assigned_at
                                      ? "bg-green-100 text-green-600"
                                      : "bg-slate-100 text-slate-400"
                                      }`}
                                  >
                                    {complaint.department_assigned_at ? "✓" : "○"}
                                  </div>
                                  <div className="mt-1 h-full w-px bg-slate-200" />
                                </div>

                                <div className="pb-6">
                                  <p className="text-sm font-semibold text-slate-800">
                                    Department Assigned
                                  </p>

                                  <p className="mt-1 text-sm font-medium text-slate-700">
                                    {complaint.department || "Not assigned"}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {complaint.department_assigned_at
                                      ? new Date(
                                        complaint.department_assigned_at
                                      ).toLocaleString("en-IN", {
                                        timeZone: "Asia/Kolkata",
                                      })
                                      : "Not assigned"}
                                  </p>
                                </div>
                              </div>

                              {/* OFFICER */}
                              <div className="relative flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full ${complaint.officer_assigned_at
                                      ? "bg-green-100 text-green-600"
                                      : "bg-slate-100 text-slate-400"
                                      }`}
                                  >
                                    {complaint.officer_assigned_at ? "✓" : "○"}
                                  </div>
                                  <div className="mt-1 h-full w-px bg-slate-200" />
                                </div>

                                <div className="pb-6">
                                  <p className="text-sm font-semibold text-slate-800">
                                    Officer Assigned
                                  </p>

                                  <p className="mt-1 text-sm font-medium text-slate-700">
                                    {complaint.assigned_to
                                      ? `Officer #${complaint.assigned_to}`
                                      : "Not assigned"}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {complaint.officer_assigned_at
                                      ? new Date(
                                        complaint.officer_assigned_at
                                      ).toLocaleString("en-IN", {
                                        timeZone: "Asia/Kolkata",
                                      })
                                      : "Not assigned"}
                                  </p>
                                </div>
                              </div>

                              {/* WORK STARTED */}
                              <div className="relative flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full ${complaint.in_progress_at
                                      ? "bg-green-100 text-green-600"
                                      : "bg-slate-100 text-slate-400"
                                      }`}
                                  >
                                    {complaint.in_progress_at ? "✓" : "○"}
                                  </div>
                                  <div className="mt-1 h-full w-px bg-slate-200" />
                                </div>

                                <div className="pb-6">
                                  <p className="text-sm font-semibold text-slate-800">
                                    Work Started
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {complaint.in_progress_at
                                      ? new Date(
                                        complaint.in_progress_at
                                      ).toLocaleString("en-IN", {
                                        timeZone: "Asia/Kolkata",
                                      })
                                      : "Not started"}
                                  </p>
                                </div>
                              </div>

                              {/* ACTION TAKEN */}
                              <div className="relative flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full ${complaint.action_taken_at
                                      ? "bg-green-100 text-green-600"
                                      : "bg-slate-100 text-slate-400"
                                      }`}
                                  >
                                    {complaint.action_taken_at ? "✓" : "○"}
                                  </div>
                                  <div className="mt-1 h-full w-px bg-slate-200" />
                                </div>

                                <div className="pb-6">
                                  <p className="text-sm font-semibold text-slate-800">
                                    Action Taken
                                  </p>

                                  <p className="mt-1 text-sm text-slate-700">
                                    {complaint.action_taken || "Not recorded"}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {complaint.action_taken_at
                                      ? new Date(
                                        complaint.action_taken_at
                                      ).toLocaleString("en-IN", {
                                        timeZone: "Asia/Kolkata",
                                      })
                                      : "Not recorded"}

                                  </p>

                                </div>
                              </div>

                              {/* RESOLVED */}
                              <div className="relative flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full ${complaint.resolved_at
                                      ? "bg-green-100 text-green-600"
                                      : "bg-slate-100 text-slate-400"
                                      }`}
                                  >
                                    {complaint.resolved_at ? "✓" : "○"}
                                  </div>
                                </div>

                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    Resolved
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {complaint.resolved_at
                                      ? new Date(
                                        complaint.resolved_at
                                      ).toLocaleString("en-IN", {
                                        timeZone: "Asia/Kolkata",
                                      })
                                      : "Not resolved"}
                                  </p>
                                </div>
                              </div>

                            </div>
                          </div>

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
                                {complaint.feedback.map((feedback: any) => (
                                  <div
                                    key={feedback.id}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4"
                                  >
                                    <p className="text-xs font-medium text-slate-400">
                                      Rating
                                    </p>

                                    <div className="mt-1 flex items-center gap-2">
                                      <span className="text-lg font-bold text-amber-500">
                                        {"★".repeat(feedback.rating)}
                                      </span>

                                      <span className="text-xs font-semibold text-slate-500">
                                        {feedback.rating}/5
                                      </span>
                                    </div>

                                    {feedback.created_at && (
                                      <p className="mt-2 text-xs text-slate-400">
                                        {new Date(feedback.created_at).toLocaleString("en-IN")}
                                      </p>
                                    )}

                                    {feedback.comment && (
                                      <div className="mt-3 rounded-md bg-white p-3">
                                        <p className="text-xs font-medium text-slate-400">
                                          Citizen Comment
                                        </p>

                                        <p className="mt-1 break-words text-sm leading-5 text-slate-700">
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
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md">
                    <p className="text-slate-500">
                      No complaints found.
                    </p>
                  </div>
                )}

              </div>

            </div>

          )}

        {/* =====================================================
              USERS
          ===================================================== */}

        {!loading && activeTab === "Users" && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-xl font-semibold">
                User Management
              </h3>

              <p className="mt-2 text-slate-500">
                Manage registered CivicPulse AI users.
              </p>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="min-w-[1000px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 font-semibold text-slate-500">
                      ID
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-500">
                      Name
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-500">
                      Email
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-500">
                      Phone
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-500">
                      Role
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-500">
                      City
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-500">
                      Address
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.length > 0 ? (
                    users.map((user) => [
                      <tr
                        key={user.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 font-medium text-slate-700">
                          #{user.id}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-900">
                          {user.name || "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                          {user.email || "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                          {user.phone || "—"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${user.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : user.role === "officer"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                              }`}
                          >
                            {user.role}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                          {user.city || "—"}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {user.address || "—"}
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUserId(user.id);
                              setEditName(user.name || "");
                              setEditPhone(user.phone || "");
                              setEditCity(user.city || "");
                              setEditAddress(user.address || "");
                            }}
                            className="mr-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                          >
                            Edit
                          </button>

                          {user.id !== 5 && (
                            <button
                              type="button"
                              onClick={() => deleteUser(user.id)}
                              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>,

                      editingUserId === user.id && (
                        <tr key={`edit-${user.id}`}>
                          <td colSpan={8} className="px-4 py-4">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder="Name"
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                />

                                <input
                                  type="text"
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value)}
                                  placeholder="Phone"
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                />

                                <input
                                  type="text"
                                  value={editCity}
                                  onChange={(e) => setEditCity(e.target.value)}
                                  placeholder="City"
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                />

                                <input
                                  type="text"
                                  value={editAddress}
                                  onChange={(e) => setEditAddress(e.target.value)}
                                  placeholder="Address"
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                />
                              </div>

                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await updateUser(user.id, {
                                      name: editName,
                                      phone: editPhone,
                                      city: editCity,
                                      address: editAddress,
                                    });
                                    setEditingUserId(null);
                                  }}
                                  className="mr-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                >
                                  Save Changes
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setEditingUserId(null)}
                                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ),
                    ])
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}


      </main>

    </div>
  );
}