import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

const API_BASE_URL =
  "http://192.168.31.222:5000/api";

export type Notification = {
  id: string;
  title: string;
  message: string;
  type:
    | "general"
    | "course"
    | "test"
    | "attendance"
    | "announcement"
    | "system";
  read: boolean;
  createdAt: string;
  relatedId?: string | null;
  relatedType?:
    | "course"
    | "test"
    | "attendance"
    | "none";
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;

  loadNotifications: () => Promise<void>;

  addNotification: (
    title: string,
    message: string,
    type?: Notification["type"]
  ) => Promise<void>;

  sendNotificationToUser: (
    email: string,
    title: string,
    message: string,
    type?: Notification["type"]
  ) => Promise<void>;

  sendNotificationToAllStudents: (
    emails: string[],
    title: string,
    message: string,
    type?: Notification["type"]
  ) => Promise<void>;

  markAsRead: (id: string) => Promise<void>;

  markAllAsRead: () => Promise<void>;

  deleteNotification: (
    id: string
  ) => Promise<void>;

  clearNotifications: () => Promise<void>;
};

const NotificationContext =
  createContext<
    NotificationContextType | undefined
  >(undefined);

const normalizeNotification = (
  item: any
): Notification => {
  return {
    id:
      item?._id?.toString() ||
      item?.id?.toString() ||
      "",
    title: item?.title || "",
    message: item?.message || "",
    type: item?.type || "general",
    read:
      item?.isRead ??
      item?.read ??
      false,
    createdAt:
      item?.createdAt ||
      new Date().toISOString(),
    relatedId:
      item?.relatedId?.toString() ||
      null,
    relatedType:
      item?.relatedType || "none",
  };
};

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [loading, setLoading] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | GET TOKEN
  |--------------------------------------------------------------------------
  */
  const getToken = async () => {
    return await AsyncStorage.getItem(
      "studypoint_token"
    );
  };

  /*
  |--------------------------------------------------------------------------
  | LOAD NOTIFICATIONS FROM BACKEND
  |--------------------------------------------------------------------------
  */
  const loadNotifications =
    useCallback(async () => {
      try {
        if (!user?.email) {
          setNotifications([]);
          return;
        }

        const token = await getToken();

        if (!token) {
          setNotifications([]);
          return;
        }

        setLoading(true);

        const response = await fetch(
          `${API_BASE_URL}/notifications/my-notifications`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to load notifications"
          );
        }

        const backendNotifications =
          Array.isArray(data?.notifications)
            ? data.notifications
            : [];

        const normalized =
          backendNotifications.map(
            normalizeNotification
          );

        setNotifications(normalized);
      } catch (error) {
        console.log(
          "Load notifications error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }, [user?.email]);

  /*
  |--------------------------------------------------------------------------
  | LOAD WHEN USER CHANGES / LOGS IN
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /*
  |--------------------------------------------------------------------------
  | ADD LOCAL NOTIFICATION
  |--------------------------------------------------------------------------
  |
  | This function is kept for existing screens
  | which may still call addNotification().
  |
  */
  const addNotification = async (
    title: string,
    message: string,
    type: Notification["type"] = "general"
  ) => {
    try {
      const token = await getToken();

      if (!token) {
        return;
      }

      /*
       * The backend create endpoint is admin-only.
       * Therefore normal student-side calls should not
       * create backend notifications.
       *
       * We keep this function for compatibility with
       * existing app screens.
       */
      const localNotification: Notification = {
        id: `local-${Date.now()}`,
        title,
        message,
        type,
        read: false,
        createdAt:
          new Date().toISOString(),
        relatedId: null,
        relatedType: "none",
      };

      setNotifications((previous) => [
        localNotification,
        ...previous,
      ]);
    } catch (error) {
      console.log(
        "Add notification error:",
        error
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | SEND NOTIFICATION TO SPECIFIC USER
  |--------------------------------------------------------------------------
  |
  | Admin notification screen currently uses this
  | function. It now talks directly to backend.
  |
  */
  const sendNotificationToUser =
    async (
      email: string,
      title: string,
      message: string,
      type: Notification["type"] = "general"
    ) => {
      try {
        if (!email) {
          throw new Error(
            "Student email is required"
          );
        }

        const token = await getToken();

        if (!token) {
          throw new Error(
            "Authentication token not found"
          );
        }

        /*
         * First get users from backend.
         */
        const usersResponse = await fetch(
          `${API_BASE_URL}/users`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const usersData =
          await usersResponse.json();

        if (!usersResponse.ok) {
          throw new Error(
            usersData?.message ||
              "Unable to fetch students"
          );
        }

        const users =
          Array.isArray(usersData)
            ? usersData
            : Array.isArray(
                usersData?.users
              )
            ? usersData.users
            : [];

        const student = users.find(
          (item: any) =>
            item?.email?.toLowerCase() ===
              email.toLowerCase() &&
            item?.role === "user"
        );

        if (!student) {
          throw new Error(
            "Student not found"
          );
        }

        const response = await fetch(
          `${API_BASE_URL}/notifications`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId:
                student._id ||
                student.id,
              sendTo: "specific",
              title: title.trim(),
              message: message.trim(),
              type:
                type === "system"
                  ? "general"
                  : type,
              relatedType: "none",
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to send notification"
          );
        }

        /*
         * Refresh notification list.
         */
        await loadNotifications();
      } catch (error) {
        console.log(
          "Send notification to user error:",
          error
        );

        throw error;
      }
    };

  /*
  |--------------------------------------------------------------------------
  | SEND NOTIFICATION TO ALL STUDENTS
  |--------------------------------------------------------------------------
  |
  | Emails are kept in the function signature so
  | existing Admin Notifications screen does not
  | break.
  |
  | Backend automatically finds all students.
  |
  */
  const sendNotificationToAllStudents =
    async (
      emails: string[],
      title: string,
      message: string,
      type: Notification["type"] = "general"
    ) => {
      try {
        const token = await getToken();

        if (!token) {
          throw new Error(
            "Authentication token not found"
          );
        }

        if (
          !emails ||
          emails.length === 0
        ) {
          throw new Error(
            "No students available"
          );
        }

        const response = await fetch(
          `${API_BASE_URL}/notifications`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sendTo: "all",
              title: title.trim(),
              message: message.trim(),
              type:
                type === "system"
                  ? "general"
                  : type,
              relatedType: "none",
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to send notification"
          );
        }

        /*
         * Refresh current user's notifications
         * if this context belongs to a student.
         */
        await loadNotifications();
      } catch (error) {
        console.log(
          "Send notification to all students error:",
          error
        );

        throw error;
      }
    };

  /*
  |--------------------------------------------------------------------------
  | MARK ONE AS READ
  |--------------------------------------------------------------------------
  */
  const markAsRead = async (
    id: string
  ) => {
    try {
      const token = await getToken();

      if (!token || !id) {
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/notifications/${id}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to mark notification as read"
        );
      }

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                read: true,
              }
            : notification
        )
      );
    } catch (error) {
      console.log(
        "Mark notification as read error:",
        error
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | MARK ALL AS READ
  |--------------------------------------------------------------------------
  */
  const markAllAsRead = async () => {
    try {
      const token = await getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/notifications/read-all`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to mark all notifications as read"
        );
      }

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          read: true,
        }))
      );
    } catch (error) {
      console.log(
        "Mark all notifications as read error:",
        error
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DELETE ONE NOTIFICATION
  |--------------------------------------------------------------------------
  */
  const deleteNotification = async (
    id: string
  ) => {
    try {
      const token = await getToken();

      if (!token || !id) {
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/notifications/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to delete notification"
        );
      }

      setNotifications((previous) =>
        previous.filter(
          (notification) =>
            notification.id !== id
        )
      );
    } catch (error) {
      console.log(
        "Delete notification error:",
        error
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DELETE ALL READ NOTIFICATIONS
  |--------------------------------------------------------------------------
  */
  const clearNotifications = async () => {
    try {
      const token = await getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/notifications/read`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to delete read notifications"
        );
      }

      setNotifications((previous) =>
        previous.filter(
          (notification) =>
            !notification.read
        )
      );
    } catch (error) {
      console.log(
        "Clear notifications error:",
        error
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UNREAD COUNT
  |--------------------------------------------------------------------------
  */
  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        loadNotifications,
        addNotification,
        sendNotificationToUser,
        sendNotificationToAllStudents,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context =
    useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider"
    );
  }

  return context;
}
