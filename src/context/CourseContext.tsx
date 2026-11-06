import AsyncStorage from "@react-native-async-storage/async-storage";
import { File } from "expo-file-system";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

export type Course = {
  id: string;
  title: string;
  instructor: string;
  category: string;
  level: string;
  lessons: number;
  duration: string;
  rating: string;
  students: string;
  image: string;
  icon: string;
  color: string;
  iconColor: string;

  // Class 6â€“12
  classId: number;
};

type CourseContextType = {
  courses: Course[];
  loading: boolean;

  addCourse: (
    course: Omit<Course, "id">
  ) => Promise<string | null>;

  updateCourse: (
    id: string,
    course: Omit<Course, "id">
  ) => Promise<boolean>;

  deleteCourse: (
    id: string
  ) => Promise<boolean>;

  uploadCourseImage: (
    courseId: string,
    imageUri: string
  ) => Promise<boolean>;

  refreshCourses: () => Promise<void>;

  // Exposed for admin screens
  loadCourses: () => Promise<void>;
};

const CourseContext =
  createContext<CourseContextType | undefined>(
    undefined
  );

const API_BASE_URL =
  "https://ramanujan-sybq.onrender.com/api";

const SERVER_BASE_URL =
  "https://ramanujan-sybq.onrender.com";

const getToken = async () => {
  return await AsyncStorage.getItem(
    "studypoint_token"
  );
};

/*
|--------------------------------------------------------------------------
| MAP COURSE
|--------------------------------------------------------------------------
*/

const mapCourse = (item: any): Course => {
  return {
    id:
      item?._id?.toString() ||
      item?.id?.toString() ||
      "",

    title: item?.title || "",

    instructor:
      item?.instructor ||
      "Instructor",

    category:
      item?.category ||
      "Development",

    level:
      item?.level ||
      "Beginner",

    lessons:
      Number(item?.lessons) || 0,

    duration:
      item?.duration ||
      "0h",

    rating:
      item?.rating !== undefined
        ? String(item.rating)
        : "0",

    students:
      item?.students !== undefined
        ? String(item.students)
        : "0",

    image: item?.image
      ? item.image.startsWith("http")
        ? item.image
        : `${SERVER_BASE_URL}${item.image}`
      : "",

    icon:
      item?.icon ||
      (item?.title
        ? item.title
            .substring(0, 2)
            .toUpperCase()
        : ""),

    color:
      item?.color ||
      "#DBEAFE",

    iconColor:
      item?.iconColor ||
      "#2563EB",

    classId:
      Number(item?.classId) || 0,
  };
};

/*
|--------------------------------------------------------------------------
| COURSE PROVIDER
|--------------------------------------------------------------------------
*/

export function CourseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [courses, setCourses] =
    useState<Course[]>([]);

  const [loading, setLoading] =
    useState(true);

  /*
   * Load courses when provider starts
   */
  useEffect(() => {
    loadCourses();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD COURSES
  |--------------------------------------------------------------------------
  */

  const loadCourses = async () => {
    try {
      setLoading(true);

      const token =
        await getToken();

      /*
       * Backend handles class restriction.
       *
       * Student:
       *   only own class courses
       *
       * Admin:
       *   all courses
       */

      const headers: HeadersInit = {
        "Content-Type":
          "application/json",
      };

      if (token) {
        headers.Authorization =
          `Bearer ${token}`;
      }

      const response =
        await fetch(
          `${API_BASE_URL}/courses`,
          {
            method: "GET",
            headers,
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        setCourses([]);

        return;
      }

      const backendCourses =
        Array.isArray(data.courses)
          ? data.courses.map(mapCourse)
          : [];

      setCourses(
        backendCourses
      );
    } catch (error) {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | REFRESH COURSES
  |--------------------------------------------------------------------------
  */

  const refreshCourses = async () => {
    await loadCourses();
  };

  /*
  |--------------------------------------------------------------------------
  | ADD COURSE
  |--------------------------------------------------------------------------
  */

  const addCourse = async (
    course: Omit<Course, "id">
  ): Promise<string | null> => {
    try {
      const token =
        await getToken();

      if (!token) {
        return null;
      }

      /*
       * Validate class
       */
      const classId =
        Number(course.classId);

      if (
        ![
          6,
          7,
          8,
          9,
          10,
          11,
          12,
        ].includes(classId)
      ) {
        return null;
      }

      const response =
        await fetch(
          `${API_BASE_URL}/courses`,
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
                course.title,

              /*
               * Current backend
               * requires description.
               */
              description:
                course.title,

              image: "",

              instructor:
                course.instructor,

              category:
                course.category,

              level:
                course.level,

              lessons:
                Number(
                  course.lessons
                ) || 0,

              duration:
                course.duration,

              rating:
                Number(
                  course.rating
                ) || 0,

              students:
                Number(
                  String(
                    course.students ||
                      "0"
                  ).replace(
                    /[^0-9.]/g,
                    ""
                  )
                ) || 0,

              icon:
                course.icon || "",

              color:
                course.color ||
                "#DBEAFE",

              iconColor:
                course.iconColor ||
                "#2563EB",

              // Class 6â€“12
              classId,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        return null;
      }

      await loadCourses();

      const createdCourseId =
        data?.course?._id
          ?.toString() ||
        data?.course?.id
          ?.toString() ||
        null;

      return createdCourseId;
    } catch (error) {
      return null;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UPDATE COURSE
  |--------------------------------------------------------------------------
  */

  const updateCourse = async (
    id: string,
    course: Omit<Course, "id">
  ): Promise<boolean> => {
    try {
      const token =
        await getToken();

      if (!token) {
        return false;
      }

      /*
       * Validate class
       */
      const classId =
        Number(course.classId);

      if (
        ![
          6,
          7,
          8,
          9,
          10,
          11,
          12,
        ].includes(classId)
      ) {

        return false;
      }

      const response =
        await fetch(
          `${API_BASE_URL}/courses/${id}`,
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
                course.title,

              description:
                course.title,

              image:
                course.image || "",

              instructor:
                course.instructor,

              category:
                course.category,

              level:
                course.level,

              lessons:
                Number(
                  course.lessons
                ) || 0,

              duration:
                course.duration,

              rating:
                Number(
                  course.rating
                ) || 0,

              students:
                Number(
                  String(
                    course.students ||
                      "0"
                  ).replace(
                    /[^0-9.]/g,
                    ""
                  )
                ) || 0,

              icon:
                course.icon || "",

              color:
                course.color ||
                "#DBEAFE",

              iconColor:
                course.iconColor ||
                "#2563EB",

              classId,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        return false;
      }

      await loadCourses();

      return true;
    } catch (error) {

      return false;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UPLOAD COURSE IMAGE
  |--------------------------------------------------------------------------
  */

  const uploadCourseImage =
    async (
      courseId: string,
      imageUri: string
    ): Promise<boolean> => {
      try {
        const token =
          await getToken();

        if (
          !token ||
          !courseId ||
          !imageUri
        ) {
          return false;
        }

        /*
         * Expo SDK 57 File API
         */
        const imageFile =
          new File(imageUri);

        const formData =
          new FormData();

        formData.append(
          "courseImage",
          imageFile
        );

        const response =
          await fetch(
            `${API_BASE_URL}/courses/${courseId}/image`,
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              body: formData,
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          return false;
        }

        await loadCourses();

        return true;
      } catch (error) {

        return false;
      }
    };

  /*
  |--------------------------------------------------------------------------
  | DELETE COURSE
  |--------------------------------------------------------------------------
  */

  const deleteCourse = async (
    id: string
  ): Promise<boolean> => {
    try {
      const token =
        await getToken();

      if (!token) {
        return false;
      }

      const response =
        await fetch(
          `${API_BASE_URL}/courses/${id}`,
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


        return false;
      }

      await loadCourses();

      return true;
    } catch (error) {


      return false;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | PROVIDER
  |--------------------------------------------------------------------------
  */

  return (
    <CourseContext.Provider
      value={{
        courses,
        loading,
        addCourse,
        updateCourse,
        deleteCourse,
        uploadCourseImage,
        refreshCourses,

        // IMPORTANT:
        // Expose loadCourses so admin screens
        // can manually reload courses.
        loadCourses,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

/*
|--------------------------------------------------------------------------
| USE COURSES
|--------------------------------------------------------------------------
*/

export function useCourses() {
  const context =
    useContext(
      CourseContext
    );

  if (!context) {
    throw new Error(
      "useCourses must be used inside CourseProvider"
    );
  }

  return context;
}
