import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AttendanceStatus = "present" | "absent";

export type AttendanceRecord = {
  id: string;
  studentEmail: string;
  studentName: string;
  courseId: string;
  date: string;
  status: AttendanceStatus;
};

type AttendanceContextType = {
  attendance: AttendanceRecord[];

  markAttendance: (
    studentEmail: string,
    studentName: string,
    courseId: string,
    date: string,
    status: AttendanceStatus
  ) => Promise<void>;

  markAttendanceBatch: (
    records: {
      studentEmail: string;
      studentName: string;
      courseId: string;
      date: string;
      status: AttendanceStatus;
    }[]
  ) => Promise<void>;

  getStudentAttendance: (
    studentEmail: string,
    courseId?: string
  ) => AttendanceRecord[];

  getCourseAttendance: (
    courseId: string,
    date?: string
  ) => AttendanceRecord[];

  getCourseAttendanceFromServer: (
    courseId: string,
    date: string
  ) => Promise<{
    records: AttendanceRecord[];
    locked: boolean;
  }>;

  getStudentCoursePercentage: (
    studentEmail: string,
    courseId: string
  ) => number;

  getStudentOverallPercentage: (
    studentEmail: string
  ) => number;

  deleteAttendance: (id: string) => Promise<void>;

  refreshAttendance: () => Promise<void>;
};

const AttendanceContext =
  createContext<AttendanceContextType | undefined>(
    undefined
  );

const API_BASE_URL =
  "http://192.168.31.222:5000/api";

const TOKEN_KEY = "studypoint_token";

const ADMIN_CACHE_KEY =
  "attendanceRecords_admin_cache";

export function AttendanceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [attendance, setAttendance] =
    useState<AttendanceRecord[]>([]);

  // ======================================================
  // GET TOKEN
  // ======================================================

  const getToken = useCallback(async () => {
    return AsyncStorage.getItem(TOKEN_KEY);
  }, []);

  // ======================================================
  // MAP BACKEND ATTENDANCE RECORD
  // ======================================================

  const mapAttendanceRecord = useCallback(
    (
      item: any,
      fallbackEmail = "",
      fallbackName = ""
    ): AttendanceRecord => {
      const populatedStudent =
        item?.student &&
        typeof item.student === "object"
          ? item.student
          : null;

      const populatedCourse =
        item?.course &&
        typeof item.course === "object"
          ? item.course
          : null;

      return {
        id: String(
          item?._id ||
            item?.id ||
            ""
        ),

        studentEmail: String(
          item?.studentEmail ||
            populatedStudent?.email ||
            fallbackEmail ||
            ""
        ),

        studentName: String(
          item?.studentName ||
            populatedStudent?.name ||
            fallbackName ||
            ""
        ),

        courseId: String(
          populatedCourse?._id ||
            populatedCourse?.id ||
            item?.course ||
            item?.courseId ||
            ""
        ),

        date: String(
          item?.date || ""
        ).split("T")[0],

        status:
          item?.status === "present"
            ? "present"
            : "absent",
      };
    },
    []
  );

  // ======================================================
  // LOAD ADMIN CACHE
  // ======================================================

  const loadAdminCache = useCallback(
    async () => {
      try {
        const stored =
          await AsyncStorage.getItem(
            ADMIN_CACHE_KEY
          );

        if (!stored) {
          setAttendance([]);
          return;
        }

        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          setAttendance(parsed);
        } else {
          setAttendance([]);
        }
      } catch {
        setAttendance([]);
      }
    },
    []
  );

  // ======================================================
  // SAVE ADMIN CACHE
  // ======================================================

  const saveAdminCache = useCallback(
    async (
      records: AttendanceRecord[]
    ) => {
      await AsyncStorage.setItem(
        ADMIN_CACHE_KEY,
        JSON.stringify(records)
      );

      setAttendance(records);
    },
    []
  );

  // ======================================================
  // REFRESH ATTENDANCE
  // ======================================================

  const refreshAttendance = useCallback(
    async () => {
      try {
        const token = await getToken();

        if (!token) {
          setAttendance([]);
          return;
        }

        const meResponse = await fetch(
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

        const meData =
          await meResponse.json();

        if (
          !meResponse.ok ||
          !meData.success
        ) {
          return;
        }

        const currentUser =
          meData.user;

        // ==================================================
        // STUDENT
        // ==================================================

        if (
          currentUser?.role !== "admin"
        ) {
          const response =
            await fetch(
              `${API_BASE_URL}/attendance/my-attendance`,
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
            return;
          }

          const records =
            Array.isArray(
              data.attendance
            )
              ? data.attendance.map(
                  (item: any) =>
                    mapAttendanceRecord(
                      item,
                      currentUser?.email ||
                        "",
                      currentUser?.name ||
                        ""
                    )
                )
              : [];

          setAttendance(records);

          return;
        }

        // ==================================================
        // ADMIN
        // ==================================================

        // Admin cache is only used
        // for local display.
        //
        // Actual selected course/date
        // is fetched directly from backend.

        await loadAdminCache();
      } catch {
        // Keep existing state during
        // temporary network errors.
      }
    },
    [
      getToken,
      loadAdminCache,
      mapAttendanceRecord,
    ]
  );

  // ======================================================
  // INITIAL REFRESH
  // ======================================================

  useEffect(() => {
    refreshAttendance();
  }, [refreshAttendance]);

  // ======================================================
  // FIND STUDENT ID BY EMAIL
  // ======================================================

  const findStudentIdByEmail =
    useCallback(
      async (
        email: string,
        token: string
      ) => {
        const normalizedEmail =
          email
            .trim()
            .toLowerCase();

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
          throw new Error(
            data.message ||
              "Unable to load students"
          );
        }

        const students =
          Array.isArray(data.users)
            ? data.users
            : [];

        const student =
          students.find(
            (item: any) =>
              String(
                item?.email || ""
              )
                .trim()
                .toLowerCase() ===
                normalizedEmail &&
              item?.role !== "admin"
          );

        const studentId =
          student?._id ||
          student?.id;

        if (!studentId) {
          throw new Error(
            "Student not found"
          );
        }

        return String(studentId);
      },
      []
    );

  // ======================================================
  // SAVE / UPDATE LOCAL RECORD
  // ======================================================

  const upsertLocalRecord =
    useCallback(
      async (
        record: AttendanceRecord
      ) => {
        try {
          const stored =
            await AsyncStorage.getItem(
              ADMIN_CACHE_KEY
            );

          let currentRecords: AttendanceRecord[] =
            [];

          if (stored) {
            try {
              const parsed =
                JSON.parse(stored);

              if (
                Array.isArray(parsed)
              ) {
                currentRecords =
                  parsed;
              }
            } catch {
              currentRecords = [];
            }
          }

          const existingIndex =
            currentRecords.findIndex(
              (item) =>
                item.studentEmail
                  .trim()
                  .toLowerCase() ===
                  record.studentEmail
                    .trim()
                    .toLowerCase() &&
                item.courseId.toString() ===
                  record.courseId.toString() &&
                item.date ===
                  record.date
            );

          if (
            existingIndex >= 0
          ) {
            currentRecords[
              existingIndex
            ] = record;
          } else {
            currentRecords.push(
              record
            );
          }

          await AsyncStorage.setItem(
            ADMIN_CACHE_KEY,
            JSON.stringify(
              currentRecords
            )
          );

          setAttendance(
            currentRecords
          );
        } catch {
          setAttendance(
            (previous) => {
              const existingIndex =
                previous.findIndex(
                  (item) =>
                    item.studentEmail
                      .trim()
                      .toLowerCase() ===
                      record.studentEmail
                        .trim()
                        .toLowerCase() &&
                    item.courseId.toString() ===
                      record.courseId.toString() &&
                    item.date ===
                      record.date
                );

              if (
                existingIndex >= 0
              ) {
                const updated = [
                  ...previous,
                ];

                updated[
                  existingIndex
                ] = record;

                return updated;
              }

              return [
                ...previous,
                record,
              ];
            }
          );
        }
      },
      []
    );

  // ======================================================
  // SINGLE ATTENDANCE
  // ======================================================

  const markAttendance =
    useCallback(
      async (
        studentEmail: string,
        studentName: string,
        courseId: string,
        date: string,
        status: AttendanceStatus
      ) => {
        const token =
          await getToken();

        if (!token) {
          throw new Error(
            "Authentication token not found"
          );
        }

        const studentId =
          await findStudentIdByEmail(
            studentEmail,
            token
          );

        const response =
          await fetch(
            `${API_BASE_URL}/attendance`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                studentId,
                courseId:
                  courseId.toString(),
                date,
                status,
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
              "Attendance could not be saved"
          );
        }

        const backendRecord =
          mapAttendanceRecord(
            data.attendance,
            studentEmail,
            studentName
          );

        await upsertLocalRecord(
          backendRecord
        );
      },
      [
        findStudentIdByEmail,
        getToken,
        mapAttendanceRecord,
        upsertLocalRecord,
      ]
    );

  // ======================================================
  // BATCH ATTENDANCE
  // ======================================================

  const markAttendanceBatch =
    useCallback(
      async (
        records: {
          studentEmail: string;
          studentName: string;
          courseId: string;
          date: string;
          status: AttendanceStatus;
        }[]
      ) => {
        const token =
          await getToken();

        if (!token) {
          throw new Error(
            "Authentication token not found"
          );
        }

        if (
          records.length === 0
        ) {
          throw new Error(
            "Attendance list is empty"
          );
        }

        const firstRecord =
          records[0];

        const studentsResponse =
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

        const studentsData =
          await studentsResponse.json();

        if (
          !studentsResponse.ok ||
          !studentsData.success
        ) {
          throw new Error(
            studentsData.message ||
              "Unable to load students"
          );
        }

        const users =
          Array.isArray(
            studentsData.users
          )
            ? studentsData.users
            : [];

        const attendancePayload: {
          studentId: string;
          status: AttendanceStatus;
        }[] = [];

        for (
          const record of records
        ) {
          const student =
            users.find(
              (item: any) =>
                String(
                  item?.email || ""
                )
                  .trim()
                  .toLowerCase() ===
                  record.studentEmail
                    .trim()
                    .toLowerCase() &&
                item?.role !== "admin"
            );

          const studentId =
            student?._id ||
            student?.id;

          if (!studentId) {
            throw new Error(
              `Student not found: ${record.studentEmail}`
            );
          }

          attendancePayload.push({
            studentId:
              String(studentId),
            status:
              record.status,
          });
        }

        const response =
          await fetch(
            `${API_BASE_URL}/attendance/batch`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                courseId:
                  firstRecord.courseId.toString(),
                date:
                  firstRecord.date,
                attendance:
                  attendancePayload,
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
              "Attendance could not be saved"
          );
        }

        // Save local records only
        // after backend success.

        const localRecords =
          records.map(
            (record, index) => ({
              id: `local-${Date.now()}-${index}`,
              studentEmail:
                record.studentEmail,
              studentName:
                record.studentName,
              courseId:
                record.courseId.toString(),
              date:
                record.date,
              status:
                record.status,
            })
          );

        const stored =
          await AsyncStorage.getItem(
            ADMIN_CACHE_KEY
          );

        let currentRecords: AttendanceRecord[] =
          [];

        if (stored) {
          try {
            const parsed =
              JSON.parse(stored);

            if (
              Array.isArray(parsed)
            ) {
              currentRecords =
                parsed;
            }
          } catch {
            currentRecords = [];
          }
        }

        const filtered =
          currentRecords.filter(
            (item) =>
              !(
                item.courseId.toString() ===
                  firstRecord.courseId.toString() &&
                item.date ===
                  firstRecord.date
              )
          );

        const updated = [
          ...filtered,
          ...localRecords,
        ];

        await AsyncStorage.setItem(
          ADMIN_CACHE_KEY,
          JSON.stringify(updated)
        );

        setAttendance(updated);
      },
      [getToken]
    );

  // ======================================================
  // GET COURSE ATTENDANCE FROM SERVER
  // ======================================================

  const getCourseAttendanceFromServer =
    useCallback(
      async (
        courseId: string,
        date: string
      ) => {
        const token =
          await getToken();

        if (!token) {
          throw new Error(
            "Authentication token not found"
          );
        }

        const response =
          await fetch(
            `${API_BASE_URL}/attendance/course/${courseId}?date=${encodeURIComponent(
              date
            )}`,
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
          throw new Error(
            data.message ||
              "Unable to load attendance"
          );
        }

        const records =
          Array.isArray(
            data.attendance
          )
            ? data.attendance.map(
                (item: any) =>
                  mapAttendanceRecord(
                    item
                  )
              )
            : [];

        // Keep server records
        // in local state too.

        setAttendance(
          (previous) => {
            const filtered =
              previous.filter(
                (item) =>
                  !(
                    item.courseId.toString() ===
                      courseId.toString() &&
                    item.date === date
                  )
              );

            return [
              ...filtered,
              ...records,
            ];
          }
        );

        return {
          records,
          locked:
            data.locked === true,
        };
      },
      [
        getToken,
        mapAttendanceRecord,
      ]
    );

  // ======================================================
  // GET STUDENT ATTENDANCE
  // ======================================================

  const getStudentAttendance =
    useCallback(
      (
        studentEmail: string,
        courseId?: string
      ) => {
        const normalizedEmail =
          studentEmail
            .trim()
            .toLowerCase();

        return attendance.filter(
          (record) => {
            const sameStudent =
              record.studentEmail
                .trim()
                .toLowerCase() ===
              normalizedEmail;

            if (!sameStudent) {
              return false;
            }

            if (!courseId) {
              return true;
            }

            return (
              record.courseId.toString() ===
              courseId.toString()
            );
          }
        );
      },
      [attendance]
    );

  // ======================================================
  // GET COURSE ATTENDANCE FROM LOCAL STATE
  // ======================================================

  const getCourseAttendance =
    useCallback(
      (
        courseId: string,
        date?: string
      ) => {
        return attendance.filter(
          (record) => {
            const sameCourse =
              record.courseId.toString() ===
              courseId.toString();

            if (!sameCourse) {
              return false;
            }

            if (!date) {
              return true;
            }

            return (
              record.date === date
            );
          }
        );
      },
      [attendance]
    );

  // ======================================================
  // REMOVE DUPLICATE RECORDS
  // ======================================================

  const getUniqueAttendanceRecords =
    useCallback(
      (
        records: AttendanceRecord[]
      ) => {
        const uniqueMap =
          new Map<
            string,
            AttendanceRecord
          >();

        records.forEach(
          (record) => {
            /*
             * One student + one course +
             * one date = one attendance.
             */
            const key =
              `${record.courseId}-${record.date}`;

            uniqueMap.set(
              key,
              record
            );
          }
        );

        return Array.from(
          uniqueMap.values()
        );
      },
      []
    );

  // ======================================================
  // COURSE-WISE PERCENTAGE
  // ======================================================

  const getStudentCoursePercentage =
    useCallback(
      (
        studentEmail: string,
        courseId: string
      ) => {
        const records =
          getStudentAttendance(
            studentEmail,
            courseId
          );

        if (
          records.length === 0
        ) {
          return 0;
        }

        // Remove duplicate dates
        const uniqueRecords =
          getUniqueAttendanceRecords(
            records
          );

        if (
          uniqueRecords.length === 0
        ) {
          return 0;
        }

        const presentCount =
          uniqueRecords.filter(
            (record) =>
              record.status ===
              "present"
          ).length;

        const percentage =
          (presentCount /
            uniqueRecords.length) *
          100;

        return Math.round(
          percentage
        );
      },
      [
        getStudentAttendance,
        getUniqueAttendanceRecords,
      ]
    );

  // ======================================================
  // OVERALL ATTENDANCE PERCENTAGE
  // ======================================================
  //
  // IMPORTANT:
  //
  // Overall percentage is calculated as
  // the AVERAGE of each subject percentage.
  //
  // Example:
  //
  // Spider = 100%
  // Maths  = 0%
  //
  // Overall =
  // (100 + 0) / 2
  // = 50%
  //
  // ======================================================

  const getStudentOverallPercentage =
    useCallback(
      (studentEmail: string) => {
        const records =
          getStudentAttendance(
            studentEmail
          );

        if (
          records.length === 0
        ) {
          return 0;
        }

        // Remove duplicate attendance
        // for same course + same date.

        const uniqueRecords =
          getUniqueAttendanceRecords(
            records
          );

        if (
          uniqueRecords.length === 0
        ) {
          return 0;
        }

        // Get unique subjects/courses.

        const courseIds =
          Array.from(
            new Set(
              uniqueRecords.map(
                (record) =>
                  record.courseId.toString()
              )
            )
          );

        if (
          courseIds.length === 0
        ) {
          return 0;
        }

        // Calculate percentage
        // separately for every subject.

        const coursePercentages =
          courseIds.map(
            (courseId) => {
              const courseRecords =
                uniqueRecords.filter(
                  (record) =>
                    record.courseId.toString() ===
                    courseId
                );

              if (
                courseRecords.length === 0
              ) {
                return 0;
              }

              const presentCount =
                courseRecords.filter(
                  (record) =>
                    record.status ===
                    "present"
                ).length;

              return (
                (presentCount /
                  courseRecords.length) *
                100
              );
            }
          );

        // Overall attendance =
        // average of all subject percentages.

        const totalPercentage =
          coursePercentages.reduce(
            (
              sum,
              percentage
            ) =>
              sum + percentage,
            0
          ) /
          coursePercentages.length;

        return Math.round(
          totalPercentage
        );
      },
      [
        getStudentAttendance,
        getUniqueAttendanceRecords,
      ]
    );

  // ======================================================
  // DELETE ATTENDANCE
  // ======================================================

  const deleteAttendance =
    useCallback(
      async (id: string) => {
        const updatedRecords =
          attendance.filter(
            (record) =>
              record.id !== id
          );

        await saveAdminCache(
          updatedRecords
        );
      },
      [
        attendance,
        saveAdminCache,
      ]
    );

  // ======================================================
  // PROVIDER
  // ======================================================

  return (
    <AttendanceContext.Provider
      value={{
        attendance,

        markAttendance,

        markAttendanceBatch,

        getStudentAttendance,

        getCourseAttendance,

        getCourseAttendanceFromServer,

        getStudentCoursePercentage,

        getStudentOverallPercentage,

        deleteAttendance,

        refreshAttendance,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

// ======================================================
// USE ATTENDANCE HOOK
// ======================================================

export function useAttendance() {
  const context =
    useContext(
      AttendanceContext
    );

  if (!context) {
    throw new Error(
      "useAttendance must be used inside AttendanceProvider"
    );
  }

  return context;
}
