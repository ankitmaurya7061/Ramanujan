import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

export type Lesson = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  duration: string;
  videoUrl: string;
  notesUrl: string;
  order: number;
  status: "draft" | "published";
};

type LessonContextType = {
  lessons: Lesson[];
  loading: boolean;

  getCourseLessons: (
    courseId: string
  ) => Lesson[];

  loadCourseLessons: (
    courseId: string
  ) => Promise<Lesson[]>;

  addLesson: (
    lesson: Omit<Lesson, "id">
  ) => Promise<boolean>;

  updateLesson: (
    id: string,
    lesson: Omit<Lesson, "id">
  ) => Promise<boolean>;

  deleteLesson: (
    id: string
  ) => Promise<boolean>;

  refreshLessons: (
    courseId?: string
  ) => Promise<void>;
};

const LessonContext =
  createContext<LessonContextType | undefined>(
    undefined
  );

const API_BASE_URL =
  "https://ramanujan-sybq.onrender.com/api";

const getToken = async () => {
  return await AsyncStorage.getItem(
    "studypoint_token"
  );
};

/*
|--------------------------------------------------------------------------
| MAP BACKEND LESSON
|--------------------------------------------------------------------------
*/

const mapLesson = (item: any): Lesson => {
  return {
    id: item._id,

    courseId:
      item.course?._id ||
      item.course ||
      "",

    title:
      item.title || "",

    description:
      item.description || "",

    duration:
      item.duration || "0 min",

    videoUrl:
      item.videoUrl || "",

    notesUrl:
      item.notesUrl || "",

    order:
      Number(item.order) || 1,

    status:
      item.status === "published"
        ? "published"
        : "draft",
  };
};

/*
|--------------------------------------------------------------------------
| PROVIDER
|--------------------------------------------------------------------------
*/

export function LessonProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lessons, setLessons] =
    useState<Lesson[]>([]);

  const [loading, setLoading] =
    useState(true);

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOADING
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setLoading(false);
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD LESSONS OF COURSE
  |--------------------------------------------------------------------------
  */

  const loadCourseLessons = async (
    courseId: string
  ): Promise<Lesson[]> => {
    try {
      if (!courseId) {
        return [];
      }

      setLoading(true);

      const token =
        await getToken();

      if (!token) {
        console.log(
          "Lesson load failed: token not found"
        );
        return [];
      }

      const response =
        await fetch(
          `${API_BASE_URL}/lessons/course/${courseId}`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,

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
          "Lesson API failed:",
          data?.message
        );

        return [];
      }

      /*
      IMPORTANT:

      Backend student API is responsible
      for returning only lessons that the
      student is allowed to access.

      Therefore we do NOT filter status here.
      */

      const backendLessons =
        (data.lessons || [])
          .map(mapLesson)
          .sort(
            (a: Lesson, b: Lesson) =>
              a.order - b.order
          );

      setLessons(
        (currentLessons) => {
          const otherLessons =
            currentLessons.filter(
              (lesson) =>
                lesson.courseId !==
                courseId
            );

          return [
            ...otherLessons,
            ...backendLessons,
          ];
        }
      );

      return backendLessons;

    } catch (error) {
      console.log(
        "Load Course Lessons Error:",
        error
      );

      return [];

    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | GET LESSONS FROM LOCAL STATE
  |--------------------------------------------------------------------------
  */

  const getCourseLessons = (
    courseId: string
  ): Lesson[] => {
    return lessons
      .filter(
        (lesson) =>
          lesson.courseId ===
          courseId
      )
      .sort(
        (a, b) =>
          a.order - b.order
      );
  };

  /*
  |--------------------------------------------------------------------------
  | ADD LESSON
  |--------------------------------------------------------------------------
  */

  const addLesson = async (
    lesson: Omit<Lesson, "id">
  ): Promise<boolean> => {
    try {
      const token =
        await getToken();

      if (!token) {
        return false;
      }

      const response =
        await fetch(
          `${API_BASE_URL}/lessons`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              title:
                lesson.title,

              description:
                lesson.description,

              videoUrl:
                lesson.videoUrl,

              notesUrl:
                lesson.notesUrl,

              duration:
                lesson.duration,

              course:
                lesson.courseId,

              order:
                lesson.order,

              /*
              New lessons should be
              immediately available
              to students.
              */
              status:
                lesson.status ||
                "published",
            }),
          }
        );

      const data =
        await response.json();

      console.log(
        "ADD LESSON RESPONSE:",
        data
      );

      if (
        !response.ok ||
        !data.success
      ) {
        console.log(
          "Add lesson failed:",
          data?.message
        );

        return false;
      }

      await loadCourseLessons(
        lesson.courseId
      );

      return true;

    } catch (error) {
      console.log(
        "Add Lesson Error:",
        error
      );

      return false;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UPDATE LESSON
  |--------------------------------------------------------------------------
  */

  const updateLesson = async (
    id: string,
    lesson: Omit<Lesson, "id">
  ): Promise<boolean> => {
    try {
      const token =
        await getToken();

      if (!token) {
        return false;
      }

      const response =
        await fetch(
          `${API_BASE_URL}/lessons/${id}`,
          {
            method: "PUT",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              title:
                lesson.title,

              description:
                lesson.description,

              videoUrl:
                lesson.videoUrl,

              notesUrl:
                lesson.notesUrl,

              duration:
                lesson.duration,

              order:
                lesson.order,

              status:
                lesson.status ||
                "published",
            }),
          }
        );

      const data =
        await response.json();

      console.log(
        "UPDATE LESSON RESPONSE:",
        data
      );

      if (
        !response.ok ||
        !data.success
      ) {
        console.log(
          "Update lesson failed:",
          data?.message
        );

        return false;
      }

      await loadCourseLessons(
        lesson.courseId
      );

      return true;

    } catch (error) {
      console.log(
        "Update Lesson Error:",
        error
      );

      return false;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DELETE LESSON
  |--------------------------------------------------------------------------
  */

  const deleteLesson = async (
    id: string
  ): Promise<boolean> => {
    try {
      const token =
        await getToken();

      if (!token) {
        return false;
      }

      const lesson =
        lessons.find(
          (item) =>
            item.id === id
        );

      const response =
        await fetch(
          `${API_BASE_URL}/lessons/${id}`,
          {
            method: "DELETE",

            headers: {
              Authorization:
                `Bearer ${token}`,

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
          "Delete lesson failed:",
          data?.message
        );

        return false;
      }

      if (lesson) {
        await loadCourseLessons(
          lesson.courseId
        );
      } else {
        setLessons(
          (currentLessons) =>
            currentLessons.filter(
              (item) =>
                item.id !== id
            )
        );
      }

      return true;

    } catch (error) {
      console.log(
        "Delete Lesson Error:",
        error
      );

      return false;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | REFRESH LESSONS
  |--------------------------------------------------------------------------
  */

  const refreshLessons = async (
    courseId?: string
  ): Promise<void> => {
    if (courseId) {
      await loadCourseLessons(
        courseId
      );
    } else {
      setLessons([]);
    }
  };

  return (
    <LessonContext.Provider
      value={{
        lessons,
        loading,

        getCourseLessons,
        loadCourseLessons,

        addLesson,
        updateLesson,
        deleteLesson,

        refreshLessons,
      }}
    >
      {children}
    </LessonContext.Provider>
  );
}

/*
|--------------------------------------------------------------------------
| HOOK
|--------------------------------------------------------------------------
*/

export function useLessons() {
  const context =
    useContext(
      LessonContext
    );

  if (!context) {
    throw new Error(
      "useLessons must be used inside LessonProvider"
    );
  }

  return context;
}
