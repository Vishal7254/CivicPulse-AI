"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, getImageUrl } from "@/lib/api";
import dynamic from "next/dynamic";

const IndiaComplaintMap = dynamic(
  () => import("@/components/IndiaComplaintMap"),
  { ssr: false }
);

const ComplaintLocationMap = dynamic(
  () => import("@/components/ComplaintLocationMap"),
  { ssr: false }
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
  landmark?: string;
  road: string | null;
  city: string | null;
  road_type?: string | null;
  road_distance_m?: number | null;
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
  feedback?: {
    id: number;
    rating: number;
    comment: string | null;
    user_id: number;
    created_at: string;
  }[];
};

type User = {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  address?: string;
  role?: string;
};

type Notification = {
  id: number;
  message: string;
  complaint_id?: number;
  created_at: string;
  is_read: boolean;
};

const departments = [
  "Roads",
  "Sanitation",
  "Water",
  "Electrical",
];

const statusLabel = (status: string) =>
  status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDate = (value?: string | null) => {
  if (!value) return "Not available";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const statusClass = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "verified":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "assigned":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "in_progress":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "resolved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

const priorityClass = (priority: string) => {
  switch (priority) {
    case "critical":
      return "bg-red-100 text-red-700 border-red-200";
    case "high":
      return "bg-orange-50 text-orange-700 border-orange-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

export default function Home() {
  const router = useRouter();

  const [activeSection, setActiveSection] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [analytics, setAnalytics] = useState<any>(null);
  const [aiAnalytics, setAiAnalytics] = useState<any>(null);
  const [priorityAnalytics, setPriorityAnalytics] = useState<any>(null);
  const [departmentAnalytics, setDepartmentAnalytics] =
    useState<any>(null);
  const [categoryAnalytics, setCategoryAnalytics] =
    useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [selectedComplaintId, setSelectedComplaintId] =
    useState<number | null>(null);

  const [expandedComplaintId, setExpandedComplaintId] =
    useState<number | null>(null);

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionTakenInput, setActionTakenInput] = useState("");

  const [actionDrafts, setActionDrafts] = useState<Record<number, string>>({});
  const [departmentDrafts, setDepartmentDrafts] = useState<Record<number, string>>({});
  const [officerDrafts, setOfficerDrafts] = useState<Record<number, string>>({});
  const [rejectionDrafts, setRejectionDrafts] = useState<Record<number, string>>({});

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [editingUserId, setEditingUserId] =
    useState<number | null>(null);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const [emailNotifications, setEmailNotifications] =
    useState(true);
  const [systemNotifications, setSystemNotifications] =
    useState(true);
  const [dashboardAutoRefresh, setDashboardAutoRefresh] =
    useState(true);

  /* =========================================================
     COUNTS
  ========================================================= */

  const totalComplaints =
    analytics?.total_complaints ?? complaints.length;

  const pendingComplaints =
    analytics?.pending ??
    complaints.filter((c) => c.status === "pending").length;

  const verifiedComplaints =
    analytics?.verified ??
    complaints.filter((c) => c.status === "verified").length;

  const assignedComplaints =
    analytics?.assigned ??
    complaints.filter((c) => c.status === "assigned").length;

  const inProgressComplaints =
    analytics?.in_progress ??
    complaints.filter((c) => c.status === "in_progress").length;

  const resolvedComplaints =
    analytics?.resolved ??
    complaints.filter((c) => c.status === "resolved").length;

  const rejectedComplaints =
    analytics?.rejected ??
    complaints.filter((c) => c.status === "rejected").length;

  const highPriorityComplaints =
    (analytics?.priority_wise_complaints?.high ?? 0) +
    (analytics?.priority_wise_complaints?.critical ?? 0) ||
    complaints.filter(
      (c) =>
        c.priority === "high" || c.priority === "critical"
    ).length;

  /* =========================================================
     FILTERED COMPLAINTS
  ========================================================= */

  const filteredComplaints = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return complaints.filter((complaint) => {
      const matchesSearch =
        !search ||
        complaint.title?.toLowerCase().includes(search) ||
        complaint.description?.toLowerCase().includes(search) ||
        complaint.category?.toLowerCase().includes(search) ||
        complaint.address?.toLowerCase().includes(search) ||
        String(complaint.id).includes(search);

      const matchesStatus =
        statusFilter === "all" ||
        complaint.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        complaint.priority === priorityFilter;

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
  }, [
    complaints,
    searchTerm,
    statusFilter,
    priorityFilter,
    departmentFilter,
  ]);

  const selectedComplaint =
    selectedComplaintId !== null
      ? complaints.find(
        (complaint) => complaint.id === selectedComplaintId
      ) ?? null
      : null;

  const latestComplaint =
    selectedComplaint ??
    (complaints.length
      ? [...complaints].sort((a, b) => b.id - a.id)[0]
      : null);

  /* =========================================================
     MESSAGE HELPERS
  ========================================================= */

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage("");

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage("");

    window.setTimeout(() => {
      setErrorMessage("");
    }, 4000);
  };

  /* =========================================================
     AUTH
  ========================================================= */

  const token = () =>
    localStorage.getItem("access_token");

  const authHeaders = () => ({
    Authorization: `Bearer ${token()}`,
  });

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_name");
    router.push("/login");
  };
  /* =========================================================
     FETCH ALL ADMIN DATA
  ========================================================= */

  const fetchData = async () => {
    try {
      setLoading(true);

      const accessToken = token();

      if (!accessToken) {
        router.push("/login");
        return;
      }

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      };

      /* =====================================================
         AUTHENTICATE VIA /me & VALIDATE ADMIN ROLE
      ===================================================== */

      const meResponse = await fetch(`${API_BASE_URL}/me`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (meResponse.status === 401) {
        logout();
        return;
      }

      if (meResponse.status === 403) {
        showError("Access denied. Admin privileges required.");
        router.push("/citizen");
        return;
      }

      if (!meResponse.ok) {
        logout();
        return;
      }

      const meUser: User = await meResponse.json();
      setCurrentUser(meUser);

      if (meUser.role !== "admin") {
        console.error("Admin access denied. Current role:", meUser.role);
        showError("Access denied. Admin privileges required.");
        router.push("/citizen");
        return;
      }

      /* =====================================================
         COMPLAINTS
      ===================================================== */

      const complaintsResponse = await fetch(
        `${API_BASE_URL}/complaints`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

      if (complaintsResponse.status === 401) {
        logout();
        return;
      }

      if (complaintsResponse.ok) {
        const data = await complaintsResponse.json();

        const complaintList: Complaint[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.complaints)
            ? data.complaints
            : [];

        setComplaints(complaintList);
      } else {
        console.error(
          "Complaints error:",
          complaintsResponse.status
        );
      }

      /* =====================================================
         USERS
      ===================================================== */

      const usersResponse = await fetch(
        `${API_BASE_URL}/users`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

      if (usersResponse.status === 401) {
        logout();
        return;
      }

      if (usersResponse.ok) {
        const data = await usersResponse.json();

        const userList = Array.isArray(data)
          ? data
          : Array.isArray(data?.users)
            ? data.users
            : [];

        setUsers(userList);
      } else {
        console.error(
          "Users error:",
          usersResponse.status
        );
      }

      /* =====================================================
         ANALYTICS SUMMARY (TOTAL, STATUS, PRIORITY, DEPT, CATEGORY, AVG TIME)
      ===================================================== */

      const summaryResponse = await fetch(
        `${API_BASE_URL}/admin/analytics/summary`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

      if (summaryResponse.status === 401) {
        logout();
        return;
      }

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setAnalytics(summaryData);
        setPriorityAnalytics({
          priority_wise_complaints:
            summaryData.priority_wise_complaints || {},
        });
        setDepartmentAnalytics({
          department_wise_complaints:
            summaryData.department_wise_complaints || {},
        });
        setCategoryAnalytics({
          category_wise_complaints:
            summaryData.category_wise_complaints || {},
        });
      } else {
        console.error(
          "Summary analytics error:",
          summaryResponse.status
        );
      }

      /* =====================================================
         AI ANALYTICS
      ===================================================== */

      const aiResponse = await fetch(
        `${API_BASE_URL}/admin/analytics/ai`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

      if (aiResponse.status === 401) {
        logout();
        return;
      }

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        setAiAnalytics(aiData);
      } else {
        console.error(
          "AI analytics error:",
          aiResponse.status
        );
      }

      /* =====================================================
         NOTIFICATIONS
      ===================================================== */

      const notificationsResponse = await fetch(
        `${API_BASE_URL}/notifications`,
        {
          headers,
          cache: "no-store",
        }
      );

      if (notificationsResponse.status === 401) {
        logout();
        return;
      }

      if (notificationsResponse.ok) {
        const notifData = await notificationsResponse.json();
        setNotifications(
          Array.isArray(notifData) ? notifData : []
        );
      }

      console.log(
        "Admin dashboard data loaded successfully."
      );

    } catch (error) {
      console.error(
        "Admin dashboard fetch error:",
        error
      );

      showError(
        "Unable to connect to backend server. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  };
  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications`,
        {
          headers: authHeaders(),
          cache: "no-store",
        }
      );

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.ok) {
        const data = await response.json();

        setNotifications(
          Array.isArray(data) ? data : []
        );
      }
    } catch (error) {
      console.error(
        "Notification fetch failed:",
        error
      );
    }
  };

  /* =========================================================
     VERIFY
  ========================================================= */

  const verifyComplaint = async (
    complaintId: number
  ) => {
    try {
      setUpdatingId(complaintId);

      const response = await fetch(
        `${API_BASE_URL}/complaints/${complaintId}/verify`,
        {
          method: "PATCH",
          headers: authHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to verify complaint."
        );
      }

      setComplaints((previous) =>
        previous.map((complaint) =>
          complaint.id === complaintId
            ? {
              ...complaint,
              status: "verified",
              verified_at:
                data.verified_at ??
                complaint.verified_at,
            }
            : complaint
        )
      );

      showSuccess(
        "Complaint verified successfully."
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to verify complaint."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* =========================================================
     REJECT
  ========================================================= */

  const rejectComplaint = async (
    complaintId: number,
    customReason?: string
  ) => {
    const reasonText = (
      customReason !== undefined
        ? customReason
        : (rejectionDrafts[complaintId] ?? rejectionReason)
    ).trim();

    if (!reasonText) {
      showError("Please enter the rejection reason.");
      return;
    }

    try {
      setUpdatingId(complaintId);

      const response = await fetch(
        `${API_BASE_URL}/complaints/${complaintId}/reject`,
        {
          method: "PATCH",
          headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rejection_reason: reasonText,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to reject complaint."
        );
      }

      setComplaints((previous) =>
        previous.map((complaint) =>
          complaint.id === complaintId
            ? {
              ...complaint,
              status: "rejected",
              rejection_reason: reasonText,
            }
            : complaint
        )
      );

      setRejectionDrafts((previous) => {
        const next = { ...previous };
        delete next[complaintId];
        return next;
      });
      setRejectionReason("");

      showSuccess(
        "Complaint rejected successfully."
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to reject complaint."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* =========================================================
     DEPARTMENT
  ========================================================= */

  const assignDepartment = async (
    complaintId: number,
    department: string
  ) => {
    if (!department) {
      showError("Please select a department.");
      return;
    }

    try {
      setUpdatingId(complaintId);

      const response = await fetch(
        `${API_BASE_URL}/complaints/${complaintId}/department`,
        {
          method: "PATCH",
          headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            department,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Failed to assign department."
        );
      }

      setComplaints((previous) =>
        previous.map((complaint) =>
          complaint.id === complaintId
            ? {
              ...complaint,
              department,
              department_assigned_at:
                data.department_assigned_at ??
                complaint.department_assigned_at,
            }
            : complaint
        )
      );

      showSuccess(
        "Department assigned successfully."
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to assign department."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* =========================================================
     OFFICER
  ========================================================= */

  const assignOfficer = async (
    complaintId: number,
    officerId: number
  ) => {
    try {
      setUpdatingId(complaintId);

      const response = await fetch(
        `${API_BASE_URL}/complaints/${complaintId}/officer`,
        {
          method: "PATCH",
          headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            officer_id: officerId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Failed to assign officer."
        );
      }

      setComplaints((previous) =>
        previous.map((complaint) =>
          complaint.id === complaintId
            ? {
              ...complaint,
              assigned_to: officerId,
              status: "assigned",
              officer_assigned_at:
                data.officer_assigned_at ??
                complaint.officer_assigned_at,
            }
            : complaint
        )
      );

      showSuccess(
        "Officer assigned successfully."
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to assign officer."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* =========================================================
     WORKFLOW
  ========================================================= */

  const updateWorkflowStatus = async (
    complaintId: number,
    status: string
  ) => {
    try {
      setUpdatingId(complaintId);

      const response = await fetch(
        `${API_BASE_URL}/complaints/${complaintId}/workflow-status`,
        {
          method: "PATCH",
          headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Failed to update workflow status."
        );
      }

      setComplaints((previous) =>
        previous.map((complaint) =>
          complaint.id === complaintId
            ? {
              ...complaint,
              status,
              resolved_at:
                status === "resolved"
                  ? data.resolved_at ??
                  complaint.resolved_at
                  : complaint.resolved_at,
              in_progress_at:
                status === "in_progress"
                  ? data.in_progress_at ??
                  complaint.in_progress_at
                  : complaint.in_progress_at,
            }
            : complaint
        )
      );

      showSuccess(
        `Complaint moved to ${statusLabel(status)}.`
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to update status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* =========================================================
     ACTION TAKEN
  ========================================================= */

  const recordActionTaken = async (
    complaintId: number,
    customAction?: string
  ) => {
    const actionText = (
      customAction !== undefined
        ? customAction
        : (actionDrafts[complaintId] ?? actionTakenInput)
    ).trim();

    if (!actionText) {
      showError("Please enter the action taken.");
      return;
    }

    try {
      setUpdatingId(complaintId);

      const response = await fetch(
        `${API_BASE_URL}/complaints/${complaintId}/action`,
        {
          method: "PATCH",
          headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action_taken: actionText,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Failed to record action taken."
        );
      }

      const savedAction = data.action_taken ?? actionText;

      setComplaints((previous) =>
        previous.map((complaint) =>
          complaint.id === complaintId
            ? {
              ...complaint,
              action_taken: savedAction,
              action_taken_at:
                data.action_taken_at ??
                complaint.action_taken_at,
            }
            : complaint
        )
      );

      setActionDrafts((previous) => ({
        ...previous,
        [complaintId]: savedAction,
      }));
      setActionTakenInput(savedAction);

      showSuccess(
        "Action taken recorded successfully."
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to record action."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* =========================================================
     USER UPDATE
  ========================================================= */

  const updateUser = async (
    userId: number,
    data: {
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
            ...authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail ||
          "Failed to update user."
        );
      }

      setUsers((previous) =>
        previous.map((user) =>
          user.id === userId
            ? { ...user, ...data }
            : user
        )
      );

      if (currentUser?.id === userId) {
        setCurrentUser({
          ...currentUser,
          ...data,
        });
      }

      setEditingUserId(null);

      showSuccess(
        "User updated successfully."
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to update user."
      );
    }
  };

  /* =========================================================
     DELETE USER
  ========================================================= */

  const deleteUser = async (userId: number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${userId}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to delete user."
        );
      }

      setUsers((previous) =>
        previous.filter((user) => user.id !== userId)
      );

      showSuccess(
        "User deleted successfully."
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to delete user."
      );
    }
  };

  /* =========================================================
     NOTIFICATION READ
  ========================================================= */

  const markNotificationRead = async (
    notificationId: number
  ) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: authHeaders(),
        }
      );

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.ok) {
        setNotifications((previous) =>
          previous.map((notification) =>
            notification.id === notificationId
              ? {
                ...notification,
                is_read: true,
              }
              : notification
          )
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/read-all`,
        {
          method: "PATCH",
          headers: authHeaders(),
        }
      );

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.ok) {
        setNotifications((previous) =>
          previous.map((notification) => ({
            ...notification,
            is_read: true,
          }))
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeSection === "notifications") {
      fetchNotifications();
    }
  }, [activeSection]);

  useEffect(() => {
    if (!dashboardAutoRefresh) return;

    const interval = window.setInterval(() => {
      if (activeSection === "dashboard") {
        fetchData();
      }
    }, 60000);

    return () => window.clearInterval(interval);
  }, [dashboardAutoRefresh, activeSection]);

  /* =========================================================
     NAVIGATION
  ========================================================= */

  const navigate = (section: string) => {
    setActiveSection(section);
    setMenuOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =========================================================
     COMPLAINT ACTION PANEL
  ========================================================= */

  const ComplaintActions = ({
    complaint,
  }: {
    complaint: Complaint;
  }) => {
    const busy = updatingId === complaint.id;

    const currentRejection =
      rejectionDrafts[complaint.id] ?? (selectedComplaintId === complaint.id ? rejectionReason : "");

    const currentDepartment =
      departmentDrafts[complaint.id] ?? (complaint.department || "");

    const currentOfficer =
      officerDrafts[complaint.id] ??
      (complaint.assigned_to ? String(complaint.assigned_to) : "");

    const currentActionText =
      actionDrafts[complaint.id] !== undefined
        ? actionDrafts[complaint.id]
        : (complaint.action_taken || "");

    const hasActionText = Boolean(currentActionText.trim());
    const hasSavedAction = Boolean(complaint.action_taken && complaint.action_taken.trim());

    const assignedOfficerUser = users.find(
      (user) => user.id === complaint.assigned_to
    );

    return (
      <div className="mt-5 border-t border-slate-200 pt-5">
        <p className="mb-3 text-sm font-bold text-slate-800">
          Government Workflow
        </p>

        {complaint.status === "pending" && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                verifyComplaint(complaint.id)
              }
              disabled={busy}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? "Verifying..." : "✓ Verify"}
            </button>

            <div className="w-full rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="mb-2 text-sm font-semibold text-red-800">
                Reject Complaint
              </p>

              <textarea
                value={currentRejection}
                onChange={(event) => {
                  setRejectionDrafts((prev) => ({
                    ...prev,
                    [complaint.id]: event.target.value,
                  }));
                }}
                rows={3}
                placeholder="Enter rejection reason..."
                className="w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />

              <button
                type="button"
                onClick={() =>
                  rejectComplaint(complaint.id, currentRejection)
                }
                disabled={busy || !currentRejection.trim()}
                className="mt-3 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        )}

        {complaint.status === "verified" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="mb-3 text-sm font-bold text-blue-800">
                Assign Department
              </p>

              <select
                value={currentDepartment}
                onChange={(event) => {
                  setDepartmentDrafts((prev) => ({
                    ...prev,
                    [complaint.id]: event.target.value,
                  }));
                }}
                className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="">
                  Select Department
                </option>

                {departments.map((department) => (
                  <option
                    key={department}
                    value={department}
                  >
                    {department}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  assignDepartment(
                    complaint.id,
                    currentDepartment
                  )
                }
                disabled={busy || !currentDepartment}
                className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy
                  ? "Assigning..."
                  : "Assign Department"}
              </button>
            </div>

            {complaint.department && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="mb-3 text-sm font-bold text-indigo-800">
                  Assign Officer
                </p>

                <select
                  value={currentOfficer}
                  onChange={(event) => {
                    setOfficerDrafts((prev) => ({
                      ...prev,
                      [complaint.id]: event.target.value,
                    }));
                  }}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">
                    Select Officer
                  </option>

                  {users
                    .filter(
                      (user) =>
                        user.role === "officer"
                    )
                    .map((user) => (
                      <option
                        key={user.id}
                        value={user.id}
                      >
                        {user.name ||
                          `Officer #${user.id}`}{" "}
                        (#{user.id})
                      </option>
                    ))}

                  {users.filter(
                    (user) =>
                      user.role === "officer"
                  ).length === 0 && (
                      <option value="11">
                        Road Officer (#11)
                      </option>
                    )}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    assignOfficer(
                      complaint.id,
                      Number(currentOfficer)
                    )
                  }
                  disabled={busy || !currentOfficer}
                  className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {busy
                    ? "Assigning..."
                    : "Assign Officer"}
                </button>
              </div>
            )}
          </div>
        )}

        {complaint.status === "assigned" && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-sm font-bold text-indigo-800">
              Officer Assigned
            </p>

            <p className="mt-1 text-sm text-indigo-700">
              {assignedOfficerUser?.name ||
                `Officer #${complaint.assigned_to}`}{" "}
              (#{complaint.assigned_to}) is assigned to this complaint.
            </p>

            <button
              type="button"
              onClick={() =>
                updateWorkflowStatus(
                  complaint.id,
                  "in_progress"
                )
              }
              disabled={busy}
              className="mt-3 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy
                ? "Starting..."
                : "Start Processing"}
            </button>
          </div>
        )}

        {complaint.status === "in_progress" && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <p className="mb-3 text-sm font-bold text-orange-800">
              Work In Progress
            </p>

            <textarea
              value={currentActionText}
              onChange={(event) => {
                setActionDrafts((prev) => ({
                  ...prev,
                  [complaint.id]: event.target.value,
                }));
              }}
              rows={4}
              placeholder="Describe the action taken..."
              className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />

            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => recordActionTaken(complaint.id, currentActionText)}
                disabled={busy || !hasActionText}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? "Saving..." : "Save Action"}
              </button>

              <button
                type="button"
                onClick={() =>
                  updateWorkflowStatus(
                    complaint.id,
                    "resolved"
                  )
                }
                disabled={busy || !hasSavedAction}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? "Resolving..." : "Resolve Complaint"}
              </button>
            </div>

            {!hasSavedAction && (
              <p className="mt-2 text-xs text-slate-500">
                {hasActionText
                  ? "Click 'Save Action' to record the action before resolving."
                  : "Enter and save the action taken before resolving the complaint."}
              </p>
            )}
          </div>
        )}

        {complaint.status === "resolved" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            <p>✓ Complaint resolved. No further action required.</p>
            {complaint.action_taken && (
              <div className="mt-3 rounded-lg border border-emerald-300 bg-white p-3 text-slate-800">
                <p className="text-xs font-bold text-emerald-800">
                  Recorded Action Taken:
                </p>
                <p className="mt-1 text-sm font-normal text-slate-700">
                  {complaint.action_taken}
                </p>
              </div>
            )}
          </div>
        )}

        {complaint.status === "rejected" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            <p>✕ Complaint rejected.</p>

            {complaint.rejection_reason && (
              <div className="mt-3 rounded-lg border border-red-300 bg-white p-3 text-slate-800">
                <p className="text-xs font-bold text-red-800">
                  Rejection Reason:
                </p>
                <p className="mt-1 text-sm font-normal text-slate-700">
                  {complaint.rejection_reason}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /* =========================================================
     SIDEBAR ITEM
  ========================================================= */

  const NavItem = ({
    section,
    icon,
    label,
  }: {
    section: string;
    icon: string;
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => navigate(section)}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${activeSection === section
          ? "bg-blue-600 text-white shadow-md"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  );

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* MOBILE TOP BAR */}

      <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg shadow-sm"
        >
          ☰
        </button>

        <div className="font-bold">
          CivicPulse AI
        </div>

        <div className="w-10" />
      </div>

      {/* MOBILE OVERLAY */}

      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${menuOpen
          ? "translate-x-0"
          : "-translate-x-full"
          }`}
      >
        <div className="border-b border-slate-800 px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-xl">
              🏛️
            </div>

            <div>
              <h1 className="text-lg font-extrabold">
                CivicPulse AI
              </h1>

              <p className="text-xs text-slate-400">
                Smart Civic Management
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:hidden"
            >
              ✕
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          <NavItem
            section="dashboard"
            icon="📊"
            label="Dashboard"
          />

          <NavItem
            section="complaints"
            icon="📋"
            label="Complaints"
          />

          <NavItem
            section="users"
            icon="👥"
            label="Users"
          />

          <NavItem
            section="notifications"
            icon="🔔"
            label="Notifications"
          />

          <NavItem
            section="profile"
            icon="👤"
            label="Profile"
          />

          <NavItem
            section="settings"
            icon="⚙️"
            label="Settings"
          />
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 rounded-xl bg-slate-900 p-4">
            <p className="text-xs text-slate-500">
              Logged in as
            </p>

            <p className="mt-1 text-sm font-bold">
              {currentUser?.name ||
                "Administrator"}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}

      <main className="min-h-screen px-4 pb-10 pt-24 sm:px-6 lg:ml-72 lg:px-8 lg:pt-8">
        {/* TOASTS */}

        {successMessage && (
          <div className="fixed right-4 top-20 z-[100] max-w-sm rounded-2xl border border-emerald-200 bg-white px-5 py-4 text-sm font-semibold text-emerald-700 shadow-xl lg:right-8 lg:top-6">
            ✓ {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="fixed right-4 top-20 z-[100] max-w-sm rounded-2xl border border-red-200 bg-white px-5 py-4 text-sm font-semibold text-red-700 shadow-xl lg:right-8 lg:top-6">
            ✕ {errorMessage}
          </div>
        )}

        {/* HEADER */}

        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              CivicPulse AI
            </p>

            <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {activeSection === "dashboard"
                ? "Administration Dashboard"
                : activeSection ===
                  "complaints"
                  ? "Complaint Management"
                  : activeSection === "users"
                    ? "User Management"
                    : activeSection ===
                      "notifications"
                      ? "Notifications"
                      : activeSection ===
                        "profile"
                        ? "Administrator Profile"
                        : "Settings"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Smart civic complaint management
              system
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm sm:block">
              <p className="text-sm font-bold">
                {currentUser?.name ||
                  "Administrator"}
              </p>

              <p className="text-xs text-slate-500">
                Administrator
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </header>

        {/* LOADING */}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-4 text-sm font-medium text-slate-500">
              Loading CivicPulse AI dashboard...
            </p>
          </div>
        ) : (
          <>
            {/* =================================================
                DASHBOARD
            ================================================= */}

            {activeSection === "dashboard" && (
              <div className="space-y-6">
                {/* KPI CARDS */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Total Complaints",
                      value: totalComplaints,
                      icon: "📋",
                      tone: "blue",
                    },
                    {
                      label: "Pending",
                      value: pendingComplaints,
                      icon: "⏳",
                      tone: "amber",
                    },
                    {
                      label: "In Progress",
                      value: inProgressComplaints,
                      icon: "🔧",
                      tone: "orange",
                    },
                    {
                      label: "Resolved",
                      value: resolvedComplaints,
                      icon: "✓",
                      tone: "emerald",
                    },
                    {
                      label: "Verified",
                      value: verifiedComplaints,
                      icon: "🔎",
                      tone: "blue",
                    },
                    {
                      label: "Assigned",
                      value: assignedComplaints,
                      icon: "👤",
                      tone: "indigo",
                    },
                    {
                      label: "High Priority",
                      value: highPriorityComplaints,
                      icon: "⚠️",
                      tone: "red",
                    },
                    {
                      label: "Rejected",
                      value: rejectedComplaints,
                      icon: "✕",
                      tone: "rose",
                    },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.label}
                      onClick={() =>
                        navigate("complaints")
                      }
                      className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-500">
                            {item.label}
                          </p>

                          <p className="mt-2 text-3xl font-extrabold text-slate-900">
                            {item.value}
                          </p>
                        </div>

                        <span className="rounded-xl bg-slate-100 px-3 py-2 text-lg">
                          {item.icon}
                        </span>
                      </div>

                      <p className="mt-4 text-xs font-semibold text-blue-600 opacity-0 transition group-hover:opacity-100">
                        View complaints →
                      </p>
                    </button>
                  ))}
                </div>

                {/* RESOLUTION */}

                <div className="grid gap-5 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold">
                          Resolution Overview
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Current complaint resolution
                          performance
                        </p>
                      </div>

                      <span className="rounded-xl bg-purple-50 px-3 py-2 text-purple-600">
                        📈
                      </span>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-xl bg-purple-50 p-5">
                        <p className="text-xs font-semibold text-purple-600">
                          Resolution Rate
                        </p>

                        <p className="mt-2 text-3xl font-extrabold text-purple-700">
                          {totalComplaints
                            ? Math.round(
                              (resolvedComplaints /
                                totalComplaints) *
                              100
                            )
                            : 0}
                          %
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-5">
                        <p className="text-xs font-semibold text-slate-500">
                          Avg. Resolution Time
                        </p>

                        <p className="mt-2 text-3xl font-extrabold text-slate-800">
                          {analytics?.average_resolution_time_hours ??
                            0}
                          <span className="ml-1 text-sm font-semibold">
                            hrs
                          </span>
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-50 p-5">
                        <p className="text-xs font-semibold text-emerald-600">
                          Resolved
                        </p>

                        <p className="mt-2 text-3xl font-extrabold text-emerald-700">
                          {resolvedComplaints}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI */}

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold">
                          AI Detection
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Road damage analysis
                        </p>
                      </div>

                      <span className="rounded-xl bg-blue-50 px-3 py-2">
                        🤖
                      </span>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                          AI Detected
                        </span>

                        <b className="text-lg">
                          {aiAnalytics?.ai_detected_complaints ??
                            0}
                        </b>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                          Potholes
                        </span>

                        <b className="text-lg">
                          {aiAnalytics?.total_potholes_detected ??
                            0}
                        </b>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                          Avg. Confidence
                        </span>

                        <b className="text-lg text-purple-600">
                          {aiAnalytics?.average_ai_confidence_percent ??
                            0}
                          %
                        </b>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PRIORITY + DEPARTMENT */}

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold">
                      Priority Breakdown
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Complaints by priority
                    </p>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-500">
                          Normal
                        </p>

                        <p className="mt-2 text-2xl font-extrabold">
                          {priorityAnalytics
                            ?.priority_wise_complaints
                            ?.normal ?? 0}
                        </p>
                      </div>

                      <div className="rounded-xl bg-orange-50 p-4">
                        <p className="text-xs font-semibold text-orange-600">
                          High
                        </p>

                        <p className="mt-2 text-2xl font-extrabold text-orange-700">
                          {priorityAnalytics
                            ?.priority_wise_complaints
                            ?.high ?? 0}
                        </p>
                      </div>

                      <div className="rounded-xl bg-red-50 p-4">
                        <p className="text-xs font-semibold text-red-600">
                          Critical
                        </p>

                        <p className="mt-2 text-2xl font-extrabold text-red-700">
                          {priorityAnalytics
                            ?.priority_wise_complaints
                            ?.critical ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold">
                      Department Breakdown
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Complaints by department
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {departments.map(
                        (department) => (
                          <div
                            key={department}
                            className="rounded-xl bg-slate-50 p-4"
                          >
                            <p className="text-xs font-semibold text-slate-500">
                              {department}
                            </p>

                            <p className="mt-2 text-2xl font-extrabold">
                              {departmentAnalytics
                                ?.department_wise_complaints?.[
                                department
                              ] ?? 0}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* MAP */}

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-6 py-5">
                    <h3 className="text-lg font-bold">
                      India Civic Complaint Map
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Live GPS-based view of civic
                      complaints
                    </p>
                  </div>

                  <div className="p-4 sm:p-6">
                    <IndiaComplaintMap
                      complaints={complaints}
                    />
                  </div>
                </div>

                {/* RECENT */}

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">
                        Latest Complaint
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Most recent citizen report
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate("complaints")
                      }
                      className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      View All
                    </button>
                  </div>

                  {latestComplaint ? (
                    <div className="rounded-2xl border border-slate-200 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                            Complaint #
                            {latestComplaint.id}
                          </span>

                          <h4 className="mt-3 text-xl font-bold">
                            {latestComplaint.title}
                          </h4>

                          <p className="mt-2 text-sm text-slate-500">
                            {latestComplaint.category}{" "}
                            •{" "}
                            {latestComplaint.address}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${priorityClass(
                              latestComplaint.priority
                            )}`}
                          >
                            {latestComplaint.priority.toUpperCase()}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                              latestComplaint.status
                            )}`}
                          >
                            {statusLabel(
                              latestComplaint.status
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs text-slate-500">
                            Department
                          </p>

                          <p className="mt-1 font-bold">
                            {latestComplaint.department ||
                              "Not assigned"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs text-slate-500">
                            Officer
                          </p>

                          <p className="mt-1 font-bold">
                            {latestComplaint.assigned_to
                              ? `Officer #${latestComplaint.assigned_to}`
                              : "Not assigned"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs text-slate-500">
                            AI Detection
                          </p>

                          <p className="mt-1 font-bold">
                            {latestComplaint.ai_detected
                              ? "Detected"
                              : "Not detected"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs text-slate-500">
                            Confidence
                          </p>

                          <p className="mt-1 font-bold">
                            {latestComplaint.ai_confidence !=
                              null
                              ? `${(
                                latestComplaint.ai_confidence *
                                100
                              ).toFixed(1)}%`
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                      No complaints found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =================================================
                COMPLAINTS
            ================================================= */}

            {activeSection === "complaints" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5">
                    <h3 className="text-xl font-bold">
                      Complaint Management
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Search, filter, verify, assign
                      and resolve citizen complaints.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-500">
                        Search
                      </label>

                      <input
                        value={searchTerm}
                        onChange={(event) =>
                          setSearchTerm(
                            event.target.value
                          )
                        }
                        placeholder="Search complaints..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-500">
                        Status
                      </label>

                      <select
                        value={statusFilter}
                        onChange={(event) =>
                          setStatusFilter(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="all">
                          All Status
                        </option>
                        <option value="pending">
                          Pending
                        </option>
                        <option value="verified">
                          Verified
                        </option>
                        <option value="assigned">
                          Assigned
                        </option>
                        <option value="in_progress">
                          In Progress
                        </option>
                        <option value="resolved">
                          Resolved
                        </option>
                        <option value="rejected">
                          Rejected
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-500">
                        Priority
                      </label>

                      <select
                        value={priorityFilter}
                        onChange={(event) =>
                          setPriorityFilter(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="all">
                          All Priority
                        </option>
                        <option value="critical">
                          Critical
                        </option>
                        <option value="high">
                          High
                        </option>
                        <option value="normal">
                          Normal
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-500">
                        Department
                      </label>

                      <select
                        value={departmentFilter}
                        onChange={(event) =>
                          setDepartmentFilter(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="all">
                          All Departments
                        </option>

                        {departments.map(
                          (department) => (
                            <option
                              key={department}
                              value={department}
                            >
                              {department}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                          setPriorityFilter("all");
                          setDepartmentFilter(
                            "all"
                          );
                        }}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 text-xs font-semibold text-slate-500">
                    Showing{" "}
                    {filteredComplaints.length} of{" "}
                    {complaints.length} complaints
                  </div>
                </div>

                {filteredComplaints.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <div className="text-4xl">
                      📋
                    </div>

                    <p className="mt-3 font-bold text-slate-700">
                      No complaints found
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Try changing your search or
                      filters.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredComplaints.map(
                      (complaint) => {
                        const expanded =
                          expandedComplaintId ===
                          complaint.id;

                        const imageUrl =
                          getImageUrl(
                            complaint.image_url
                          );

                        return (
                          <article
                            key={complaint.id}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                          >
                            <div className="p-5 sm:p-6">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                                      Complaint #
                                      {complaint.id}
                                    </span>

                                    <span
                                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${priorityClass(
                                        complaint.priority
                                      )}`}
                                    >
                                      {complaint.priority.toUpperCase()}
                                    </span>

                                    <span
                                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(
                                        complaint.status
                                      )}`}
                                    >
                                      {statusLabel(
                                        complaint.status
                                      )}
                                    </span>
                                  </div>

                                  <h3 className="mt-3 text-lg font-bold text-slate-900">
                                    {complaint.title}
                                  </h3>

                                  <p className="mt-1 text-sm font-medium text-blue-600">
                                    {complaint.category}
                                  </p>

                                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                                    {
                                      complaint.description
                                    }
                                  </p>

                                  <p className="mt-3 text-xs text-slate-400">
                                    Submitted:{" "}
                                    {formatDate(
                                      complaint.created_at
                                    )}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedComplaintId(
                                      expanded
                                        ? null
                                        : complaint.id
                                    )
                                  }
                                  className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  {expanded
                                    ? "Hide Details"
                                    : "View Details"}
                                </button>
                              </div>

                              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-xl bg-slate-50 p-4">
                                  <p className="text-xs text-slate-500">
                                    Department
                                  </p>

                                  <p className="mt-1 text-sm font-bold">
                                    {complaint.department ||
                                      "Not assigned"}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                  <p className="text-xs text-slate-500">
                                    Officer
                                  </p>

                                  <p className="mt-1 text-sm font-bold">
                                    {complaint.assigned_to
                                      ? `Officer #${complaint.assigned_to}`
                                      : "Not assigned"}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                  <p className="text-xs text-slate-500">
                                    AI Detection
                                  </p>

                                  <p className="mt-1 text-sm font-bold">
                                    {complaint.ai_detected
                                      ? "Detected"
                                      : "Not detected"}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                  <p className="text-xs text-slate-500">
                                    AI Confidence
                                  </p>

                                  <p className="mt-1 text-sm font-bold">
                                    {complaint.ai_confidence !=
                                      null
                                      ? `${(
                                        complaint.ai_confidence *
                                        100
                                      ).toFixed(1)}%`
                                      : "N/A"}
                                  </p>
                                </div>
                              </div>

                              {expanded && (
                                <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">
                                  {/* DESCRIPTION */}

                                  <div>
                                    <p className="mb-2 text-sm font-bold text-slate-800">
                                      Description
                                    </p>

                                    <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                                      {
                                        complaint.description
                                      }
                                    </div>
                                  </div>

                                  {/* IMAGE */}

                                  {imageUrl && (
                                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                      <div className="border-b border-slate-200 bg-white px-4 py-3">
                                        <p className="text-sm font-bold">
                                          Complaint Image
                                        </p>

                                        <p className="mt-0.5 text-xs text-slate-400">
                                          Uploaded evidence
                                        </p>
                                      </div>

                                      <div className="flex min-h-[220px] items-center justify-center bg-slate-100 p-3 sm:min-h-[300px]">
                                        <img
                                          src={imageUrl}
                                          alt={`Complaint #${complaint.id}`}
                                          className="max-h-[500px] w-full rounded-xl object-contain"
                                          loading="lazy"
                                          onError={(event) => {
                                            event.currentTarget.style.display =
                                              "none";
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* LOCATION */}

                                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="mb-3 text-sm font-bold">
                                      📍 Complaint Location
                                    </p>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div>
                                        <p className="text-xs text-slate-500">
                                          Address
                                        </p>

                                        <p className="mt-1 text-sm font-semibold">
                                          {
                                            complaint.address
                                          }
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-xs text-slate-500">
                                          Road
                                        </p>

                                        <p className="mt-1 text-sm font-semibold">
                                          {complaint.road ||
                                            "Not available"}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-xs text-slate-500">
                                          City
                                        </p>

                                        <p className="mt-1 text-sm font-semibold">
                                          {complaint.city ||
                                            "Not available"}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-xs text-slate-500">
                                          GPS
                                        </p>

                                        <p className="mt-1 text-sm font-semibold">
                                          {
                                            complaint.latitude
                                          }
                                          ,{" "}
                                          {
                                            complaint.longitude
                                          }
                                        </p>
                                      </div>
                                    </div>

                                    {complaint.latitude !=
                                      null &&
                                      complaint.longitude !=
                                      null && (
                                        <div className="mt-4 overflow-hidden rounded-xl">
                                          <ComplaintLocationMap
                                            latitude={
                                              complaint.latitude
                                            }
                                            longitude={
                                              complaint.longitude
                                            }
                                            complaintId={
                                              complaint.id
                                            }
                                            road={
                                              complaint.road
                                            }
                                            landmark={
                                              complaint.landmark
                                            }
                                            road_type={
                                              complaint.road_type
                                            }
                                            road_distance_m={
                                              complaint.road_distance_m
                                            }
                                            city={
                                              complaint.city
                                            }
                                            state={
                                              complaint.state
                                            }
                                            address={
                                              complaint.address
                                            }
                                          />
                                        </div>
                                      )}
                                  </div>

                                  {/* AI DETAILS */}

                                  <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
                                    <p className="text-sm font-bold text-purple-900">
                                      🤖 AI Detection
                                    </p>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                      <div className="rounded-xl bg-white p-4">
                                        <p className="text-xs text-slate-500">
                                          Detection Type
                                        </p>

                                        <p className="mt-1 text-sm font-bold capitalize">
                                          {complaint.ai_detection_type?.replaceAll(
                                            "_",
                                            " "
                                          ) ||
                                            "Not detected"}
                                        </p>
                                      </div>

                                      <div className="rounded-xl bg-white p-4">
                                        <p className="text-xs text-slate-500">
                                          Detection Count
                                        </p>

                                        <p className="mt-1 text-sm font-bold">
                                          {
                                            complaint.ai_detection_count
                                          }
                                        </p>
                                      </div>

                                      <div className="rounded-xl bg-white p-4">
                                        <p className="text-xs text-slate-500">
                                          Confidence
                                        </p>

                                        <p className="mt-1 text-sm font-bold">
                                          {complaint.ai_confidence !=
                                            null
                                            ? `${(
                                              complaint.ai_confidence *
                                              100
                                            ).toFixed(
                                              1
                                            )}%`
                                            : "N/A"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* TIMELINE */}

                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-sm font-bold">
                                      Workflow Timeline
                                    </p>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                      {[
                                        [
                                          "Verified",
                                          complaint.verified_at,
                                        ],
                                        [
                                          "Department Assigned",
                                          complaint.department_assigned_at,
                                        ],
                                        [
                                          "Officer Assigned",
                                          complaint.officer_assigned_at,
                                        ],
                                        [
                                          "Work Started",
                                          complaint.in_progress_at,
                                        ],
                                        [
                                          "Action Taken",
                                          complaint.action_taken_at,
                                        ],
                                        [
                                          "Resolved",
                                          complaint.resolved_at,
                                        ],
                                      ].map(
                                        ([label, date]) => (
                                          <div
                                            key={label}
                                            className="rounded-xl bg-white p-4"
                                          >
                                            <p className="text-xs text-slate-500">
                                              {label}
                                            </p>

                                            <p className="mt-1 text-sm font-semibold">
                                              {formatDate(
                                                date
                                              )}
                                            </p>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>

                                  <ComplaintActions
                                    complaint={
                                      complaint
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          </article>
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
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-xl font-bold">
                        Notifications
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Recent civic complaint
                        updates
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                        {
                          notifications.filter(
                            (item) =>
                              !item.is_read
                          ).length
                        }{" "}
                        Unread
                      </span>

                      {notifications.some(
                        (item) => !item.is_read
                      ) && (
                          <button
                            type="button"
                            onClick={
                              markAllNotificationsRead
                            }
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                          >
                            Mark all as read
                          </button>
                        )}
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {notifications.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                        <div className="text-4xl">
                          🔔
                        </div>

                        <p className="mt-3 font-bold">
                          No notifications
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          You are all caught up.
                        </p>
                      </div>
                    ) : (
                      notifications.map(
                        (notification) => (
                          <button
                            type="button"
                            key={notification.id}
                            onClick={() =>
                              markNotificationRead(
                                notification.id
                              )
                            }
                            className={`w-full rounded-2xl border p-4 text-left transition ${notification.is_read
                              ? "border-slate-200 bg-white hover:bg-slate-50"
                              : "border-blue-200 bg-blue-50/60 hover:bg-blue-100/60"
                              }`}
                          >
                            <div className="flex gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                                🔔
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">
                                  {
                                    notification.message
                                  }
                                </p>

                                <p className="mt-2 text-xs text-slate-400">
                                  {notification.complaint_id
                                    ? `Complaint #${notification.complaint_id} • `
                                    : ""}
                                  {formatDate(
                                    notification.created_at
                                  )}
                                </p>
                              </div>

                              {!notification.is_read && (
                                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                              )}
                            </div>
                          </button>
                        )
                      )
                    )}
                  </div>
                </div>
              )}

            {/* =================================================
                USERS
            ================================================= */}

            {activeSection === "users" && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5 sm:p-6">
                  <h3 className="text-xl font-bold">
                    User Management
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage citizens, officers and
                    administrators.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500">
                          ID
                        </th>

                        <th className="px-4 py-3 text-xs font-bold text-slate-500">
                          Name
                        </th>

                        <th className="px-4 py-3 text-xs font-bold text-slate-500">
                          Email
                        </th>

                        <th className="px-4 py-3 text-xs font-bold text-slate-500">
                          Phone
                        </th>

                        <th className="px-4 py-3 text-xs font-bold text-slate-500">
                          Role
                        </th>

                        <th className="px-4 py-3 text-xs font-bold text-slate-500">
                          City
                        </th>

                        <th className="px-4 py-3 text-xs font-bold text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="border-t border-slate-100 transition hover:bg-slate-50"
                        >
                          <td className="px-4 py-4 font-semibold">
                            #{user.id}
                          </td>

                          <td className="px-4 py-4 font-semibold">
                            {user.name || "—"}
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {user.email || "—"}
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {user.phone || "—"}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${user.role ===
                                "admin"
                                ? "bg-purple-100 text-purple-700"
                                : user.role ===
                                  "officer"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-emerald-100 text-emerald-700"
                                }`}
                            >
                              {user.role ||
                                "citizen"}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {user.city || "—"}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUserId(
                                    user.id
                                  );
                                  setEditName(
                                    user.name ||
                                    ""
                                  );
                                  setEditPhone(
                                    user.phone ||
                                    ""
                                  );
                                  setEditCity(
                                    user.city ||
                                    ""
                                  );
                                  setEditAddress(
                                    user.address ||
                                    ""
                                  );
                                }}
                                className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100"
                              >
                                Edit
                              </button>

                              {user.id !== 5 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteUser(
                                      user.id
                                    )
                                  }
                                  className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}

                      {users.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            No users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {editingUserId && (
                  <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6">
                    <div className="mb-4">
                      <h4 className="font-bold">
                        Edit User #{editingUserId}
                      </h4>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={editName}
                        onChange={(event) =>
                          setEditName(
                            event.target.value
                          )
                        }
                        placeholder="Name"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />

                      <input
                        value={editPhone}
                        onChange={(event) =>
                          setEditPhone(
                            event.target.value
                          )
                        }
                        placeholder="Phone"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />

                      <input
                        value={editCity}
                        onChange={(event) =>
                          setEditCity(
                            event.target.value
                          )
                        }
                        placeholder="City"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />

                      <input
                        value={editAddress}
                        onChange={(event) =>
                          setEditAddress(
                            event.target.value
                          )
                        }
                        placeholder="Address"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!editingUserId)
                            return;

                          updateUser(
                            editingUserId,
                            {
                              name: editName,
                              phone: editPhone,
                              city: editCity,
                              address: editAddress,
                            }
                          );
                        }}
                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                      >
                        Save Changes
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setEditingUserId(null)
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =================================================
                PROFILE
            ================================================= */}

            {activeSection === "profile" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl">
                        👤
                      </div>

                      <div>
                        <h3 className="text-xl font-bold">
                          My Profile
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Administrator account
                          information
                        </p>
                      </div>
                    </div>

                    {!editingUserId ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentUser)
                            return;

                          setEditingUserId(
                            currentUser.id
                          );
                          setEditName(
                            currentUser.name || ""
                          );
                          setEditPhone(
                            currentUser.phone || ""
                          );
                          setEditCity(
                            currentUser.city || ""
                          );
                          setEditAddress(
                            currentUser.address ||
                            ""
                          );
                        }}
                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Edit Profile
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingUserId(null)
                          }
                          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!currentUser)
                              return;

                            updateUser(
                              currentUser.id,
                              {
                                name: editName,
                                phone: editPhone,
                                city: editCity,
                                address: editAddress,
                              }
                            );
                          }}
                          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="text-base font-bold">
                    Personal Information
                  </h4>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold text-slate-500">
                        Full Name
                      </label>

                      {editingUserId ===
                        currentUser?.id ? (
                        <input
                          value={editName}
                          onChange={(event) =>
                            setEditName(
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        />
                      ) : (
                        <div className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold">
                          {currentUser?.name ||
                            "Not available"}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500">
                        Email
                      </label>

                      <div className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold">
                        {currentUser?.email ||
                          "Not available"}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500">
                        Phone
                      </label>

                      {editingUserId ===
                        currentUser?.id ? (
                        <input
                          value={editPhone}
                          onChange={(event) =>
                            setEditPhone(
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        />
                      ) : (
                        <div className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold">
                          {currentUser?.phone ||
                            "Not available"}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500">
                        City
                      </label>

                      {editingUserId ===
                        currentUser?.id ? (
                        <input
                          value={editCity}
                          onChange={(event) =>
                            setEditCity(
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        />
                      ) : (
                        <div className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold">
                          {currentUser?.city ||
                            "Not available"}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-500">
                        Address
                      </label>

                      {editingUserId ===
                        currentUser?.id ? (
                        <textarea
                          value={editAddress}
                          onChange={(event) =>
                            setEditAddress(
                              event.target.value
                            )
                          }
                          rows={3}
                          className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        />
                      ) : (
                        <div className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold">
                          {currentUser?.address ||
                            "Not available"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="text-base font-bold">
                    Account Information
                  </h4>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">
                        Role
                      </p>

                      <p className="mt-1 font-bold">
                        Administrator
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">
                        Account Type
                      </p>

                      <p className="mt-1 font-bold">
                        Government Administration
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-4">
                      <p className="text-xs text-emerald-600">
                        System Access
                      </p>

                      <p className="mt-1 font-bold text-emerald-700">
                        ● Active
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================
                SETTINGS
            ================================================= */}

            {activeSection === "settings" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xl font-bold">
                    Settings
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage your administration
                    preferences.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="font-bold">
                    Account Security
                  </h4>

                  <div className="mt-4 flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        Change Password
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Update your account password
                        securely.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          "/forgot-password"
                        )
                      }
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                    >
                      Change Password
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="font-bold">
                    Application Preferences
                  </h4>

                  <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200">
                    {[
                      {
                        title:
                          "Email Notifications",
                        description:
                          "Receive important complaint and system updates by email.",
                        value:
                          emailNotifications,
                        setValue:
                          setEmailNotifications,
                      },
                      {
                        title:
                          "System Notifications",
                        description:
                          "Receive complaint workflow notifications.",
                        value:
                          systemNotifications,
                        setValue:
                          setSystemNotifications,
                      },
                      {
                        title:
                          "Dashboard Auto Refresh",
                        description:
                          "Refresh dashboard data automatically.",
                        value:
                          dashboardAutoRefresh,
                        setValue:
                          setDashboardAutoRefresh,
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            {item.title}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            item.setValue(
                              (previous) =>
                                !previous
                            )
                          }
                          className={`rounded-full px-4 py-2 text-xs font-bold ${item.value
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                            }`}
                        >
                          {item.value
                            ? "Enabled"
                            : "Disabled"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="font-bold">
                    System Information
                  </h4>

                  <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm font-semibold">
                        Application
                      </span>

                      <span className="text-sm text-slate-500">
                        CivicPulse AI
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm font-semibold">
                        Version
                      </span>

                      <span className="text-sm text-slate-500">
                        1.0.0
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm font-semibold">
                        Environment
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        Development
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm font-semibold">
                        Backend Status
                      </span>

                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        Operational
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}