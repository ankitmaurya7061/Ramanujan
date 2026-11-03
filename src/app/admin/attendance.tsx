import React, { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { useAuth } from "../../context/AuthContext";
import { useCourses } from "../../context/CourseContext";

const API_BASE_URL = "http://192.168.31.222:5000/api";
const CLASSES = [6, 7, 8, 9, 10, 11, 12];

type AttendanceStatus = "present" | "absent";

type Student = {
  id: string;
  name: string;
  email: string;
  classId: number;
};

type Course = {
  id: string;
  title: string;
  classId: number;
};

type StatusMap = Record<string, AttendanceStatus | undefined>;

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminAttendanceScreen() {
  const { user, getAllUsers } = useAuth();

  const getToken = useCallback(async () => {
    return AsyncStorage.getItem("studypoint_token");
  }, []);
  const { courses } = useCourses();

  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<StatusMap>({});

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const today = getTodayString();
  const isToday = selectedDate === today;
  const isFuture = selectedDate > today;

  const classCourses = useMemo(() => {
    if (selectedClass === null) return [];

    return ((courses || []) as Course[]).filter(
      (course) => Number(course.classId) === selectedClass
    );
  }, [courses, selectedClass]);

  const selectedCourse = useMemo(
    () =>
      classCourses.find(
        (course) => String(course.id) === String(selectedCourseId)
      ),
    [classCourses, selectedCourseId]
  );

  const loadStudents = useCallback(async () => {
    if (selectedClass === null) {
      setStudents([]);
      return;
    }

    try {
      setLoadingStudents(true);

      const allUsers = await getAllUsers();

      const classStudents = (allUsers || [])
        .filter(
          (item: any) =>
            item?.role === "user" &&
            Number(item?.classId) === selectedClass
        )
        .map((item: any) => ({
          id: String(item?._id || item?.id),
          name: item?.name || "Student",
          email: item?.email || "",
          classId: Number(item?.classId),
        }))
        .filter((item: Student) => item.id && item.email);

      setStudents(classStudents);
    } catch (error) {
      console.error("Attendance students error:", error);
      Alert.alert("Error", "Unable to load students.");
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [getAllUsers, selectedClass]);

  const loadAttendance = useCallback(async () => {
    if (!selectedCourseId) {
      setStatuses({});
      setIsLocked(false);
      return;
    }

    try {
      setLoadingAttendance(true);

      const token = await getToken();

      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(
        `${API_BASE_URL}/attendance/course/${selectedCourseId}?date=${encodeURIComponent(
          selectedDate
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Attendance load failed");
      }

      const nextStatuses: StatusMap = {};

      const records = Array.isArray(data.attendance)
        ? data.attendance
        : Array.isArray(data.records)
        ? data.records
        : [];

      records.forEach((record: any) => {
        const email =
          record?.student?.email ||
          record?.studentEmail ||
          "";

        if (email && (record.status === "present" || record.status === "absent")) {
          nextStatuses[email.toLowerCase()] = record.status;
        }
      });

      setStatuses(nextStatuses);

      // Backend lock is authoritative.
      // Previous dates are always view-only in this screen.
      setIsLocked(Boolean(data.locked) || !isToday);
    } catch (error: any) {
      console.error("Attendance load error:", error);
      setStatuses({});
      setIsLocked(!isToday);
    } finally {
      setLoadingAttendance(false);
    }
  }, [getToken, isToday, selectedCourseId, selectedDate]);

  useEffect(() => {
    if (selectedClass === null) {
      setSelectedCourseId(null);
      setStudents([]);
      setStatuses({});
      return;
    }

    const firstCourse = classCourses[0];

    setSelectedCourseId((current) => {
      if (
        current &&
        classCourses.some((course) => String(course.id) === String(current))
      ) {
        return current;
      }

      return firstCourse ? String(firstCourse.id) : null;
    });
  }, [selectedClass, classCourses]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  useFocusEffect(
    useCallback(() => {
      setSelectedDate((current) => {
        // On every screen focus, keep today's date if the screen was opened
        // fresh. Existing previous-date selection is still allowed for viewing.
        return current || today;
      });

      loadStudents();
      loadAttendance();
    }, [loadAttendance, loadStudents, today])
  );

  const presentCount = students.filter(
    (student) => statuses[student.email.toLowerCase()] === "present"
  ).length;

  const absentCount = students.filter(
    (student) => statuses[student.email.toLowerCase()] === "absent"
  ).length;

  const notMarkedCount = students.length - presentCount - absentCount;

  const setStudentStatus = (
    student: Student,
    status: AttendanceStatus
  ) => {
    // Only today's attendance can be changed.
    if (!isToday || isLocked || isFuture) return;

    setStatuses((previous) => ({
      ...previous,
      [student.email.toLowerCase()]: status,
    }));
  };

  const markAll = (status: AttendanceStatus) => {
    if (!isToday || isLocked || isFuture) return;

    const updated: StatusMap = {};

    students.forEach((student) => {
      updated[student.email.toLowerCase()] = status;
    });

    setStatuses(updated);
  };

  const changeDate = async (days: number) => {
    const nextDate = addDays(selectedDate, days);

    // Future dates are never allowed.
    if (nextDate > today) return;

    setSelectedDate(nextDate);
  };

  const saveAttendance = async () => {
    if (!selectedCourse) {
      Alert.alert("Course Required", "Select a course first.");
      return;
    }

    if (!isToday) {
      Alert.alert(
        "View Only",
        "Only today\'s attendance can be marked."
      );
      return;
    }

    if (isLocked) {
      Alert.alert(
        "Attendance Locked",
        "Today\'s attendance is already saved."
      );
      return;
    }

    if (students.length === 0) {
      Alert.alert("No Students", "No students in this class.");
      return;
    }

    if (notMarkedCount > 0) {
      Alert.alert(
        "Attendance Incomplete",
        `${notMarkedCount} students are not marked.`
      );
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${API_BASE_URL}/attendance/batch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: String(selectedCourse.id),
          date: today,
          attendance: students.map((student) => ({
            studentId: student.id,
            status: statuses[student.email.toLowerCase()],
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Attendance save failed");
      }

      setIsLocked(true);

      await loadAttendance();

      Alert.alert(
        "Attendance Saved",
        `${selectedCourse.title} attendance saved successfully.`
      );
    } catch (error: any) {
      console.error("Save attendance error:", error);
      Alert.alert(
        "Save Failed",
        error?.message || "Unable to save attendance."
      );
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== "admin") {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={42} color="#004741" />
        <Text style={styles.errorTitle}>Admin Access Required</Text>
      </View>
    );
  }

  // ============================================================
  // CLASS SELECTION
  // ============================================================
  if (selectedClass === null) {
    return (
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#004741" />
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.title}>Attendance</Text>
              <Text style={styles.subtitle}>
                Select class to manage attendance
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Classes</Text>
            <Text style={styles.sectionHint}>6th â€“ 12th</Text>
          </View>

          <View style={styles.classGrid}>
            {CLASSES.map((classNumber) => (
              <Pressable
                key={classNumber}
                style={styles.classCard}
                onPress={() => {
                  setSelectedClass(classNumber);
                  setSelectedDate(today);
                }}
              >
                <View style={styles.classIcon}>
                  <Ionicons name="school-outline" size={24} color="#004741" />
                </View>

                <Text style={styles.classNumber}>Class {classNumber}</Text>
                <Text style={styles.classAction}>View attendance</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ============================================================
  // CLASS ATTENDANCE
  // ============================================================
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              setSelectedClass(null);
              setSelectedCourseId(null);
              setStatuses({});
              setStudents([]);
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#004741" />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Class {selectedClass}</Text>
            <Text style={styles.subtitle}>
              Course-wise student attendance
            </Text>
          </View>
        </View>

        {/* COURSE SELECTOR */}
        <Text style={styles.sectionTitle}>Course</Text>

        {classCourses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="book-outline" size={28} color="#004741" />
            <Text style={styles.emptyTitle}>No courses</Text>
            <Text style={styles.emptyText}>
              No courses available for this class.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.courseRow}
          >
            {classCourses.map((course) => {
              const active =
                String(course.id) === String(selectedCourseId);

              return (
                <Pressable
                  key={String(course.id)}
                  onPress={() => {
                    setSelectedCourseId(String(course.id));
                    setSelectedDate(today);
                  }}
                  style={[
                    styles.courseChip,
                    active && styles.courseChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.courseChipText,
                      active && styles.courseChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {course.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {selectedCourse && (
          <>
            {/* DATE NAVIGATION */}
            <View style={styles.dateCard}>
              <Pressable
                style={[
                  styles.dateArrow,
                  selectedDate === "1900-01-01" && styles.disabledArrow,
                ]}
                onPress={() => changeDate(-1)}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color="#004741"
                />
              </Pressable>

              <View style={styles.dateCenter}>
                <View style={styles.dateTitleRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color="#004741"
                  />
                  <Text style={styles.dateTitle}>
                    {isToday ? "Today" : formatDate(selectedDate)}
                  </Text>
                </View>

                <Text style={styles.dateValue}>
                  {formatDate(selectedDate)}
                </Text>

                {!isToday && !isFuture && (
                  <View style={styles.viewOnlyBadge}>
                    <Ionicons
                      name="eye-outline"
                      size={13}
                      color="#004741"
                    />
                    <Text style={styles.viewOnlyText}>View Only</Text>
                  </View>
                )}
              </View>

              <Pressable
                style={[
                  styles.dateArrow,
                  selectedDate === today && styles.disabledArrow,
                ]}
                onPress={() => changeDate(1)}
                disabled={selectedDate === today}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={selectedDate === today ? "#B8C5C3" : "#004741"}
                />
              </Pressable>
            </View>

            {/* SUMMARY */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{students.length}</Text>
                <Text style={styles.summaryLabel}>Students</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, styles.presentText]}>
                  {presentCount}
                </Text>
                <Text style={styles.summaryLabel}>Present</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, styles.absentText]}>
                  {absentCount}
                </Text>
                <Text style={styles.summaryLabel}>Absent</Text>
              </View>
            </View>

            {/* TODAY CONTROLS */}
            {isToday && !isLocked && (
              <View style={styles.quickActions}>
                <Pressable
                  style={styles.quickPresent}
                  onPress={() => markAll("present")}
                >
                  <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                  <Text style={styles.quickActionText}>All Present</Text>
                </Pressable>

                <Pressable
                  style={styles.quickAbsent}
                  onPress={() => markAll("absent")}
                >
                  <Ionicons name="close" size={17} color="#FFFFFF" />
                  <Text style={styles.quickActionText}>All Absent</Text>
                </Pressable>
              </View>
            )}

            {loadingStudents || loadingAttendance ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#004741" />
                <Text style={styles.loadingText}>Loading attendance...</Text>
              </View>
            ) : students.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={30} color="#004741" />
                <Text style={styles.emptyTitle}>No students found</Text>
                <Text style={styles.emptyText}>
                  No students in Class {selectedClass}.
                </Text>
              </View>
            ) : (
              <View style={styles.studentsList}>
                {students.map((student, index) => {
                  const status = statuses[student.email.toLowerCase()];
                  const canEdit = isToday && !isLocked && !isFuture;

                  return (
                    <View
                      key={student.id}
                      style={[
                        styles.studentCard,
                        !canEdit && styles.studentCardViewOnly,
                      ]}
                    >
                      <View style={styles.serialBox}>
                        <Text style={styles.serialText}>
                          {String(index + 1).padStart(2, "0")}
                        </Text>
                      </View>

                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName} numberOfLines={1}>
                          {student.name}
                        </Text>
                        <Text style={styles.studentEmail} numberOfLines={1}>
                          {student.email}
                        </Text>
                      </View>

                      <View style={styles.statusActions}>
                        <Pressable
                          disabled={!canEdit}
                          onPress={() => setStudentStatus(student, "present")}
                          style={[
                            styles.statusCircle,
                            styles.presentCircle,
                            status === "present" && styles.presentSelected,
                            !canEdit && styles.statusDisabled,
                          ]}
                        >
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color="#FFFFFF"
                          />
                        </Pressable>

                        <Pressable
                          disabled={!canEdit}
                          onPress={() => setStudentStatus(student, "absent")}
                          style={[
                            styles.statusCircle,
                            styles.absentCircle,
                            status === "absent" && styles.absentSelected,
                            !canEdit && styles.statusDisabled,
                          ]}
                        >
                          <Ionicons name="close" size={20} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* SAVE ONLY FOR TODAY */}
            {isToday && !isLocked && students.length > 0 && (
              <Pressable
                style={[
                  styles.saveButton,
                  saving && styles.saveButtonDisabled,
                ]}
                onPress={saveAttendance}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={21}
                    color="#FFFFFF"
                  />
                )}

                <Text style={styles.saveButtonText}>
                  {saving ? "Saving..." : "Save Attendance"}
                </Text>
              </Pressable>
            )}

            {!isToday && (
              <View style={styles.viewOnlyFooter}>
                <Ionicons name="lock-closed-outline" size={17} color="#004741" />
                <Text style={styles.viewOnlyFooterText}>
                  Previous attendance is view-only. It cannot be changed.
                </Text>
              </View>
            )}

            {isToday && isLocked && (
              <View style={styles.lockedFooter}>
                <Ionicons name="lock-closed" size={17} color="#004741" />
                <Text style={styles.lockedFooterText}>
                  Today's attendance is saved and locked.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F0EDE4",
  },

  container: {
    paddingTop: 45,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0EDE4",
    padding: 24,
  },

  errorTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 25,
    fontWeight: "900",
    color: "#000000",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#004741",
    fontWeight: "600",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000000",
    marginBottom: 12,
  },

  sectionHint: {
    fontSize: 13,
    color: "#004741",
    fontWeight: "800",
  },

  classGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  classCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#004741",
  },

  classIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  classNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000000",
  },

  classAction: {
    marginTop: 4,
    fontSize: 12,
    color: "#004741",
    fontWeight: "600",
  },

  courseRow: {
    gap: 9,
    paddingBottom: 8,
  },

  courseChip: {
    maxWidth: 180,
    minWidth: 90,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#004741",
  },

  courseChipActive: {
    backgroundColor: "#004741",
  },

  courseChipText: {
    color: "#004741",
    fontWeight: "800",
    fontSize: 13,
    textAlign: "center",
  },

  courseChipTextActive: {
    color: "#FFFFFF",
  },

  dateCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#004741",
  },

  dateArrow: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  disabledArrow: {
    opacity: 0.35,
  },

  dateCenter: {
    flex: 1,
    alignItems: "center",
  },

  dateTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  dateTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000000",
  },

  dateValue: {
    marginTop: 3,
    fontSize: 12,
    color: "#004741",
    fontWeight: "600",
  },

  viewOnlyBadge: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0EDE4",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  viewOnlyText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#004741",
  },

  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    paddingVertical: 13,
    alignItems: "center",
  },

  summaryNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000000",
  },

  summaryLabel: {
    marginTop: 3,
    fontSize: 11,
    color: "#004741",
    fontWeight: "700",
  },

  presentText: {
    color: "#16823A",
  },

  absentText: {
    color: "#D72638",
  },

  quickActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 14,
  },

  quickPresent: {
    flex: 1,
    backgroundColor: "#16823A",
    borderRadius: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  quickAbsent: {
    flex: 1,
    backgroundColor: "#D72638",
    borderRadius: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  quickActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  loadingBox: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 9,
    color: "#004741",
    fontSize: 13,
    fontWeight: "700",
  },

  studentsList: {
    marginTop: 14,
    gap: 8,
  },

  studentCard: {
    minHeight: 68,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2DED3",
  },

  studentCardViewOnly: {
    opacity: 0.95,
  },

  serialBox: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  serialText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#004741",
  },

  studentInfo: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 5,
  },

  studentName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000000",
  },

  studentEmail: {
    marginTop: 3,
    fontSize: 10.5,
    color: "#004741",
    fontWeight: "600",
  },

  statusActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },

  statusCircle: {
    width: 39,
    height: 39,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
presentCircle: {
  backgroundColor: "#FFFFFF",
  borderWidth: 1.5,
  borderColor: "#16823A",
},

absentCircle: {
  backgroundColor: "#FFFFFF",
  borderWidth: 1.5,
  borderColor: "#D72638",
},

presentSelected: {
  backgroundColor: "#16823A",
  borderWidth: 2,
  borderColor: "#16823A",
},

absentSelected: {
  backgroundColor: "#D72638",
  borderWidth: 2,
  borderColor: "#D72638",
},

  statusDisabled: {
    opacity: 0.55,
  },

  saveButton: {
    marginTop: 18,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#004741",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  lockedFooter: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  lockedFooterText: {
    flex: 1,
    color: "#004741",
    fontSize: 12,
    fontWeight: "700",
  },

  viewOnlyFooter: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  viewOnlyFooterText: {
    flex: 1,
    color: "#004741",
    fontSize: 12,
    fontWeight: "700",
  },

  emptyCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: "900",
    color: "#000000",
  },

  emptyText: {
    marginTop: 5,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: "#004741",
    fontWeight: "600",
  },
});

