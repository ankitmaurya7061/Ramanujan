import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type UserRole = "user" | "admin";

export type User = {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  classId?: number;
  profilePhoto?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<User | null>;

  signup: (
    name: string,
    email: string,
    password: string
  ) => Promise<boolean>;

  updateUser: (
    name: string,
    email: string
  ) => Promise<boolean>;

  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<boolean>;

  getAllUsers: () => Promise<User[]>;

  deleteUser: (
    email: string
  ) => Promise<boolean>;

  logout: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  "https://ramanujan-sybq.onrender.com/api"
).trim().replace(/\/+$/, "");

const TOKEN_KEY = "studypoint_token";
const CURRENT_USER_KEY = "currentUser";

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  // --------------------------------------------------
  // LOAD LOGGED-IN USER
  // --------------------------------------------------

  const loadUser = async () => {
    try {
      const token =
        await AsyncStorage.getItem(
          TOKEN_KEY
        );

      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/users/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        await AsyncStorage.removeItem(
          TOKEN_KEY
        );

        await AsyncStorage.removeItem(
          CURRENT_USER_KEY
        );

        setUser(null);
        setLoading(false);

        return;
      }

      const loggedInUser: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,

        classId:
          data.user.classId !== null &&
          data.user.classId !== undefined
            ? Number(data.user.classId)
            : undefined,

        profilePhoto:
          data.user.profilePhoto || "",
      };

      console.log(
        "Logged in user:",
        loggedInUser
      );

      console.log(
        "Student classId:",
        loggedInUser.classId
      );

      setUser(loggedInUser);

      await AsyncStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify(
          loggedInUser
        )
      );

      setLoading(false);
    } catch (error) {
      console.log(
        "Failed to load user:",
        error
      );

      try {
        const savedUser =
          await AsyncStorage.getItem(
            CURRENT_USER_KEY
          );

        if (savedUser) {
          const parsedUser =
            JSON.parse(savedUser);

          const normalizedUser: User = {
            ...parsedUser,

            classId:
              parsedUser.classId !==
                null &&
              parsedUser.classId !==
                undefined
                ? Number(
                    parsedUser.classId
                  )
                : undefined,
          };

          setUser(
            normalizedUser
          );
        }
      } catch (cacheError) {
        console.log(
          "Cache user error:",
          cacheError
        );
      }

      setLoading(false);
    }
  };

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------
const login = async (
  email: string,
  password: string
): Promise<User | null> => {
  const loginUrl = `${API_BASE_URL}/auth/login`;

  try {
    console.log("LOGIN API URL:", loginUrl);

    const response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    console.log("LOGIN HTTP STATUS:", response.status);

    const responseText = await response.text();

    let data: any;

    try {
      data = JSON.parse(responseText);
    } catch {
      console.error(
        "Login API returned invalid response:",
        responseText
      );
      return null;
    }

    if (!response.ok || !data.success) {
      console.log(
        "Login failed:",
        response.status,
        data.message
      );
      return null;
    }

    if (!data.token || !data.user) {
      console.error("Login response missing token or user.");
      return null;
    }

    await AsyncStorage.setItem(
      TOKEN_KEY,
      data.token
    );

    const loggedInUser: User = {
      id: data.user.id
        ? String(data.user.id)
        : data.user._id
          ? String(data.user._id)
          : undefined,

      name: data.user.name,
      email: data.user.email,
      role: data.user.role,

      classId:
        data.user.classId !== null &&
        data.user.classId !== undefined
          ? Number(data.user.classId)
          : undefined,

      profilePhoto: data.user.profilePhoto || "",
    };

    setUser(loggedInUser);

    await AsyncStorage.setItem(
      CURRENT_USER_KEY,
      JSON.stringify(loggedInUser)
    );

    console.log("LOGIN SUCCESS:", loggedInUser.email);
    console.log("Login classId:", loggedInUser.classId);

    return loggedInUser;
  } catch (error) {
    console.error("LOGIN NETWORK ERROR:", error);
    return null;
  }
};

  // --------------------------------------------------
  // SIGNUP
  // --------------------------------------------------

  const signup = async (
    name: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/signup`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        console.log(
          "Signup failed:",
          data.message
        );

        return false;
      }

      return true;
    } catch (error) {
      console.log(
        "Signup error:",
        error
      );

      return false;
    }
  };

  // --------------------------------------------------
  // UPDATE USER
  // --------------------------------------------------

  const updateUser = async (
    name: string,
    email: string
  ): Promise<boolean> => {
    try {
      const token =
        await AsyncStorage.getItem(
          TOKEN_KEY
        );

      if (!token) {
        return false;
      }

      const response = await fetch(
        `${API_BASE_URL}/users/me`,
        {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name,
            email,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        console.log(
          "Update user failed:",
          data.message
        );

        return false;
      }

      const updatedUser: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,

        classId:
          data.user.classId !== null &&
          data.user.classId !== undefined
            ? Number(data.user.classId)
            : user?.classId,

        profilePhoto:
          data.user.profilePhoto ||
          user?.profilePhoto ||
          "",
      };

      setUser(updatedUser);

      await AsyncStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify(
          updatedUser
        )
      );

      return true;
    } catch (error) {
      console.log(
        "Update user error:",
        error
      );

      return false;
    }
  };

  // --------------------------------------------------
  // CHANGE PASSWORD
  // --------------------------------------------------

  const changePassword =
    async (
      currentPassword: string,
      newPassword: string
    ): Promise<boolean> => {
      try {
        const token =
          await AsyncStorage.getItem(
            TOKEN_KEY
          );

        if (!token) {
          return false;
        }

        const response =
          await fetch(
            `${API_BASE_URL}/users/change-password`,
            {
              method: "PUT",

              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                currentPassword,
                newPassword,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          console.log(
            "Change password failed:",
            data.message
          );

          return false;
        }

        return true;
      } catch (error) {
        console.log(
          "Change password error:",
          error
        );

        return false;
      }
    };

  // --------------------------------------------------
  // GET ALL USERS
  // ADMIN ONLY
  // --------------------------------------------------

  const getAllUsers =
    async (): Promise<User[]> => {
      try {
        const token =
          await AsyncStorage.getItem(
            TOKEN_KEY
          );

        if (!token) {
          return [];
        }

        const response =
          await fetch(
            `${API_BASE_URL}/users`,
            {
              method: "GET",

              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          console.log(
            "Get users failed:",
            data.message
          );

          return [];
        }

        return (
          data.users || []
        ).map(
          (item: any): User => ({
            id:
              item.id ||
              (
                item._id
                  ? String(item._id)
                  : ""
              ),

            name:
              item.name,

            email:
              item.email,

            role:
              item.role,

            classId:
              item.classId !==
                null &&
              item.classId !==
                undefined
                ? Number(
                    item.classId
                  )
                : undefined,

            profilePhoto:
              item.profilePhoto ||
              "",
          })
        );
      } catch (error) {
        console.log(
          "Get all users error:",
          error
        );

        return [];
      }
    };

  // --------------------------------------------------
  // DELETE USER
  // ADMIN ONLY
  // --------------------------------------------------

  const deleteUser = async (
    email: string
  ): Promise<boolean> => {
    try {
      const token =
        await AsyncStorage.getItem(
          TOKEN_KEY
        );

      if (!token) {
        return false;
      }

      const encodedEmail =
        encodeURIComponent(
          email
            .trim()
            .toLowerCase()
        );

      const response =
        await fetch(
          `${API_BASE_URL}/users/${encodedEmail}`,
          {
            method: "DELETE",

            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        console.log(
          "Delete user failed:",
          data.message
        );

        return false;
      }

      return true;
    } catch (error) {
      console.log(
        "Delete user error:",
        error
      );

      return false;
    }
  };

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const logout =
    async (): Promise<void> => {
      try {
        setUser(null);

        await AsyncStorage.removeItem(
          TOKEN_KEY
        );

        await AsyncStorage.removeItem(
          CURRENT_USER_KEY
        );
      } catch (error) {
        console.log(
          "Logout error:",
          error
        );
      }
    };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        updateUser,
        changePassword,
        getAllUsers,
        deleteUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
