import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState } from "react-native";
import { useAuth } from "./AuthContext";

type CourseProgress = {
  completedLessons: string[];
  learningTimeSeconds: number;
  totalLessons: number;
  completedCount: number;
  percentage: number;
  lastActivityAt?: string | null;
};

type ProgressData = {
  [courseId: string]: CourseProgress;
};

type BackendProgress = {
  _id?: string;

  student?: string | object;

  course:
    | string
    | {
        _id: string;
        title?: string;
        image?: string;
      };

  completedLessons?: Array<
    string | { _id: string }
  >;

  totalLessons?: number;

  completedCount?: number;

  percentage?: number;

  learningTimeSeconds?: number;

  lastCompletedLesson?:
    | string
    | {
        _id: string;
        title?: string;
        order?: number;
      }
    | null;

  lastActivityAt?: string | null;

  updatedAt?: string;

  createdAt?: string;
};

type ProgressContextType = {
  progress: ProgressData;

  refreshProgress: () => Promise<void>;

  markLessonComplete: (
    courseId: string,
    lessonId: string
  ) => Promise<void>;

  isLessonCompleted: (
    courseId: string,
    lessonId: string
  ) => boolean;

  getCompletedCount: (
    courseId: string
  ) => number;

  getProgressPercentage: (
    courseId: string,
    totalLessons?: number
  ) => number;

  addLearningTime: (
    courseId: string,
    seconds: number
  ) => Promise<void>;

  getLearningTime: (
    courseId: string
  ) => number;

  getTotalLearningTime: () => number;

  getCurrentStreak: () => number;
};

const ProgressContext =
  createContext<
    ProgressContextType | undefined
  >(undefined);

const API_BASE_URL =
  "https://ramanujan-sybq.onrender.com/api";

export function ProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  const [progress, setProgress] =
    useState<ProgressData>({});

  /* =====================================================
     CONVERT BACKEND DATA
  ===================================================== */

  const convertBackendProgress = (
    backendProgress: BackendProgress[]
  ): ProgressData => {
    const converted: ProgressData = {};

    backendProgress.forEach((item) => {
      const courseId =
        typeof item.course === "string"
          ? item.course
          : item.course?._id;

      if (!courseId) {
        return;
      }

      const completedLessons =
        Array.isArray(
          item.completedLessons
        )
          ? item.completedLessons
              .map((lesson) =>
                typeof lesson === "string"
                  ? lesson
                  : lesson?._id
              )
              .filter(
                (
                  lessonId
                ): lessonId is string =>
                  Boolean(lessonId)
              )
          : [];

      const totalLessons =
        Number(item.totalLessons) || 0;

      const completedCount = Math.min(
        Number(item.completedCount) ||
          completedLessons.length,
        totalLessons || Infinity
      );

      const calculatedPercentage =
        totalLessons > 0
          ? Math.min(
              100,
              Math.round(
                (completedCount /
                  totalLessons) *
                  100
              )
            )
          : 0;

      converted[courseId] = {
        completedLessons,

        learningTimeSeconds:
          Number(
            item.learningTimeSeconds
          ) || 0,

        totalLessons,

        completedCount,

        percentage:
          item.percentage !== undefined
            ? Math.min(
                100,
                Math.round(
                  Number(item.percentage) ||
                    0
                )
              )
            : calculatedPercentage,

        lastActivityAt:
          item.lastActivityAt ||
          item.updatedAt ||
          null,
      };
    });

    return converted;
  };

  /* =====================================================
     GET TOKEN
  ===================================================== */

  const getToken = async () => {
    try {
      const AsyncStorage =
        require(
          "@react-native-async-storage/async-storage"
        ).default;

      return await AsyncStorage.getItem(
        "studypoint_token"
      );
    } catch {
      return null;
    }
  };

  /* =====================================================
     LOAD PROGRESS FROM BACKEND
  ===================================================== */

  const loadProgress = useCallback(
    async () => {
      try {
        if (!user) {
          setProgress({});
          return;
        }

        const token = await getToken();

        if (!token) {
          setProgress({});
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/progress/my-progress`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to load learning progress"
          );
        }

        const backendProgress =
          Array.isArray(data.progress)
            ? data.progress
            : [];

        const converted =
          convertBackendProgress(
            backendProgress
          );

        setProgress(converted);
      } catch (error) {
        console.log(
          "Failed to load backend progress:",
          error
        );
      }
    },
    [user?._id, user?.email]
  );

  /* =====================================================
     PUBLIC REFRESH FUNCTION
  ===================================================== */

  const refreshProgress = useCallback(
    async () => {
      await loadProgress();
    },
    [loadProgress]
  );

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  /* =====================================================
     REFRESH WHEN APP BECOMES ACTIVE
  ===================================================== */

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        "change",
        (nextState) => {
          if (nextState === "active") {
            loadProgress();
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, [loadProgress]);

  /* =====================================================
     MARK LESSON COMPLETE
  ===================================================== */

  const markLessonComplete = async (
    courseId: string,
    lessonId: string
  ) => {
    try {
      if (
        !user ||
        !courseId ||
        !lessonId
      ) {
        return;
      }

      const token = await getToken();

      if (!token) {
        return;
      }

      /*
       * Already completed locally
       */

      if (
        progress[courseId]?.completedLessons.includes(
          lessonId
        )
      ) {
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/progress/complete`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            courseId,
            lessonId,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to mark lesson complete"
        );
      }

      /*
       * Immediately update local state
       * from backend response.
       */

      if (data.progress) {
        const converted =
          convertBackendProgress([
            data.progress,
          ]);

        setProgress(
          (previousProgress) => ({
            ...previousProgress,
            ...converted,
          })
        );
      }

      /*
       * Then refresh from backend so
       * every course stays synchronized.
       */

      await loadProgress();
    } catch (error) {
      console.log(
        "Failed to complete lesson:",
        error
      );
    }
  };

  /* =====================================================
     ADD LEARNING TIME
  ===================================================== */

  const addLearningTime = async (
    courseId: string,
    seconds: number
  ) => {
    try {
      if (
        !user ||
        !courseId ||
        !Number.isFinite(seconds) ||
        seconds <= 0
      ) {
        return;
      }

      const token = await getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/progress/learning-time`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            courseId,
            seconds: Math.floor(seconds),
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to update learning time"
        );
      }

      if (data.progress) {
        const converted =
          convertBackendProgress([
            data.progress,
          ]);

        setProgress(
          (previousProgress) => ({
            ...previousProgress,
            ...converted,
          })
        );
      }

      await loadProgress();
    } catch (error) {
      console.log(
        "Failed to update learning time:",
        error
      );
    }
  };

  /* =====================================================
     LESSON COMPLETED?
  ===================================================== */

  const isLessonCompleted = (
    courseId: string,
    lessonId: string
  ) => {
    return (
      progress[
        courseId
      ]?.completedLessons.includes(
        lessonId
      ) || false
    );
  };

  /* =====================================================
     COMPLETED COUNT
  ===================================================== */

  const getCompletedCount = (
    courseId: string
  ) => {
    return (
      progress[courseId]
        ?.completedCount ??
      progress[courseId]
        ?.completedLessons.length ??
      0
    );
  };

  /* =====================================================
     COURSE PROGRESS
  ===================================================== */

  const getProgressPercentage = (
    courseId: string,
    totalLessons?: number
  ) => {
    const courseProgress =
      progress[courseId];

    /*
     * Most reliable:
     * use backend percentage.
     */

    if (
      courseProgress &&
      courseProgress.totalLessons > 0
    ) {
      return Math.min(
        100,
        Math.round(
          courseProgress.percentage
        )
      );
    }

    /*
     * Fallback if backend doesn't have
     * totalLessons yet.
     */

    const total =
      totalLessons ||
      courseProgress?.totalLessons ||
      0;

    if (total === 0) {
      return 0;
    }

    const completed =
      getCompletedCount(courseId);

    return Math.min(
      100,
      Math.round(
        (completed / total) * 100
      )
    );
  };

  /* =====================================================
     COURSE LEARNING TIME
  ===================================================== */

  const getLearningTime = (
    courseId: string
  ) => {
    return (
      progress[courseId]
        ?.learningTimeSeconds || 0
    );
  };

  /* =====================================================
     TOTAL LEARNING TIME
  ===================================================== */

  const getTotalLearningTime = () => {
    return Object.values(
      progress
    ).reduce(
      (total, course) =>
        total +
        (course.learningTimeSeconds || 0),
      0
    );
  };

  /* =====================================================
     CURRENT STREAK
  ===================================================== */

  const getCurrentStreak = () => {
    const activityDates =
      Object.values(progress)
        .map(
          (course) =>
            course.lastActivityAt
        )
        .filter(
          (date): date is string =>
            Boolean(date)
        )
        .map(
          (date) =>
            new Date(date)
              .toISOString()
              .split("T")[0]
        );

    if (
      activityDates.length === 0
    ) {
      return 0;
    }

    const uniqueDates = [
      ...new Set(activityDates),
    ].sort(
      (a, b) =>
        new Date(b).getTime() -
        new Date(a).getTime()
    );

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const latestDate = new Date(
      uniqueDates[0]
    );

    latestDate.setHours(
      0,
      0,
      0,
      0
    );

    const difference = Math.floor(
      (today.getTime() -
        latestDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (difference > 1) {
      return 0;
    }

    let streak = 1;

    for (
      let i = 1;
      i < uniqueDates.length;
      i++
    ) {
      const current = new Date(
        uniqueDates[i - 1]
      );

      const previous = new Date(
        uniqueDates[i]
      );

      current.setHours(
        0,
        0,
        0,
        0
      );

      previous.setHours(
        0,
        0,
        0,
        0
      );

      const dayDifference =
        Math.floor(
          (current.getTime() -
            previous.getTime()) /
            (1000 * 60 * 60 * 24)
        );

      if (dayDifference === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  /* =====================================================
     PROVIDER
  ===================================================== */

  return (
    <ProgressContext.Provider
      value={{
        progress,

        refreshProgress,

        markLessonComplete,

        isLessonCompleted,

        getCompletedCount,

        getProgressPercentage,

        addLearningTime,

        getLearningTime,

        getTotalLearningTime,

        getCurrentStreak,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useProgress() {
  const context =
    useContext(ProgressContext);

  if (!context) {
    throw new Error(
      "useProgress must be used inside ProgressProvider"
    );
  }

  return context;
}
