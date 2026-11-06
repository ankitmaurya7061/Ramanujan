import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { useCourses } from "../../context/CourseContext";

const API_BASE_URL =
  "https://ramanujan-sybq.onrender.com/api";
const TOKEN_KEY = "studypoint_token";

type AttendanceRecord = {
  _id?: string;
  id?: string;
  student?: string;
  course?: {
    _id?: string;
    id?: string;
    title?: string;
  };
  date: string;
  status: "present" | "absent";
};

type AttendanceSummary = {
  total: number;
  present: number;
  absent: number;
  percentage: number;
};

type CourseAttendance = {
  courseId: string;
  courseTitle: string;
  total: number;
  present: number;
  absent: number;
  percentage: number;
};

type TestResult = {
  id?: string;
  _id?: string;
  testId?: string;
  testTitle?: string;
  title?: string;
  score?: number;
  totalMarks?: number;
  percentage?: number;
  date?: string;
  submittedAt?: string;
};

type ProgressItem = {
  courseId?: string;
  courseTitle?: string;
  progress?: number;
  completedLessons?: number;
  totalLessons?: number;
};

export default function UserDetailsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    email?: string;
    name?: string;
  }>();

  const { getAllUsers } = useAuth();
  const { courses } = useCourses();

  const email = params.email || "";
  const name = params.name || "Student";

  const [user, setUser] = useState<any>(null);

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [progressData, setProgressData] = useState<ProgressItem[]>([]);

  const [profilePhoto, setProfilePhoto] = useState<string>("");

  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>(
    {
      total: 0,
      present: 0,
      absent: 0,
      percentage: 0,
    },
  );

  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /*
   * ==========================================
   * COURSE-WISE ATTENDANCE
   * ==========================================
   */

  const courseWiseAttendance = useMemo<CourseAttendance[]>(() => {
    const courseMap: Record<
      string,
      {
        courseTitle: string;
        total: number;
        present: number;
        absent: number;
      }
    > = {};

    attendanceRecords.forEach((record) => {
      const courseId =
        record.course?._id || record.course?.id || "unknown-course";

      const courseTitle = record.course?.title || "Unknown Course";

      if (!courseMap[courseId]) {
        courseMap[courseId] = {
          courseTitle,
          total: 0,
          present: 0,
          absent: 0,
        };
      }

      courseMap[courseId].total += 1;

      if (record.status === "present") {
        courseMap[courseId].present += 1;
      } else {
        courseMap[courseId].absent += 1;
      }
    });

    return Object.entries(courseMap).map(([courseId, data]) => ({
      courseId,
      courseTitle: data.courseTitle,
      total: data.total,
      present: data.present,
      absent: data.absent,
      percentage:
        data.total > 0
          ? Number(((data.present / data.total) * 100).toFixed(2))
          : 0,
    }));
  }, [attendanceRecords]);

  /*
   * ==========================================
   * LOAD ATTENDANCE
   * ==========================================
   */

  const loadAttendance = useCallback(async () => {
    try {
      setAttendanceLoading(true);

      const token = await AsyncStorage.getItem(TOKEN_KEY);

      if (!token) {
        setAttendanceRecords([]);

        setAttendanceSummary({
          total: 0,
          present: 0,
          absent: 0,
          percentage: 0,
        });

        return;
      }

      const usersResponse = await fetch(`${API_BASE_URL}/users`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const usersData = await usersResponse.json();

      if (!usersResponse.ok || !usersData.success) {
        throw new Error(usersData.message || "Failed to fetch users");
      }

      const users = usersData.users || [];

      const selectedStudent = users.find(
        (item: any) =>
          String(item.email || "").toLowerCase() ===
          String(email || "").toLowerCase(),
      );

      if (!selectedStudent) {
        setAttendanceRecords([]);

        setAttendanceSummary({
          total: 0,
          present: 0,
          absent: 0,
          percentage: 0,
        });

        return;
      }

      const studentId = selectedStudent?.id;

      if (!studentId) {
        setAttendanceRecords([]);
        return;
      }

      const attendanceResponse = await fetch(
        `${API_BASE_URL}/attendance/student/${studentId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const attendanceData = await attendanceResponse.json();

      if (!attendanceResponse.ok || !attendanceData.success) {
        throw new Error(attendanceData.message || "Failed to fetch attendance");
      }

      setAttendanceRecords(attendanceData.attendance || []);

      setAttendanceSummary(
        attendanceData.summary || {
          total: 0,
          present: 0,
          absent: 0,
          percentage: 0,
        },
      );
    } catch (error) {
      setAttendanceRecords([]);

      setAttendanceSummary({
        total: 0,
        present: 0,
        absent: 0,
        percentage: 0,
      });
    } finally {
      setAttendanceLoading(false);
    }
  }, [email]);

  /*
   * ==========================================
   * LOAD USER DATA
   * ==========================================
   */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const users = await getAllUsers();

      const selectedUser = users.find(
        (item: any) =>
          String(item.email || "").toLowerCase() ===
          String(email || "").toLowerCase(),
      );

      if (selectedUser) {
        setUser(selectedUser);
      }

      /*
       * Profile Photo
       * Photo is now loaded from the backend user record.
       */

      setProfilePhoto(selectedUser?.profilePhoto || "");
      /*
       * Test Results
       */

      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);

        if (!token) {
          setTestResults([]);
        } else {
          const selectedStudent = users.find(
            (item: any) =>
              String(item.email || "").toLowerCase() ===
              String(email || "").toLowerCase(),
          );

const studentId = selectedStudent?.id;

          if (!studentId) {
            setTestResults([]);
          } else {
            const resultsResponse = await fetch(
              `${API_BASE_URL}/test-results/student/${studentId}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              },
            );

            const resultsData = await resultsResponse.json();

            if (resultsResponse.ok && resultsData.success) {
              const backendResults = Array.isArray(resultsData.results)
                ? resultsData.results
                : [];

              const mappedResults: TestResult[] = backendResults.map(
                (item: any) => {
                  const test =
                    item.test && typeof item.test === "object"
                      ? item.test
                      : null;

                  return {
                    id: item._id?.toString() || item.id,

                    testId:
                      test?._id?.toString() ||
                      item.test?.toString() ||
                      item.testId,

                    testTitle: test?.title || item.testTitle || "Test",

                    score: Number(item.score) || 0,

                    totalMarks: Number(item.totalMarks) || 0,

                    percentage: Number(item.percentage) || 0,

                    submittedAt: item.submittedAt || item.createdAt || "",
                  };
                },
              );

              setTestResults(mappedResults);
            } else {
              setTestResults([]);
            }
          }
        }
      } catch {
        setTestResults([]);
      }

      /*
       * ==========================================
       * LEARNING PROGRESS FROM BACKEND
       * ==========================================
       */
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);

        const studentId = selectedUser?.id;

        if (!token || !studentId) {
          setProgressData([]);
        } else {
          const progressResponse = await fetch(
            `${API_BASE_URL}/progress/student/${studentId}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );

          const progressResponseData = await progressResponse.json();

          if (!progressResponse.ok || !progressResponseData.success) {
            throw new Error(
              progressResponseData.message ||
                "Failed to fetch learning progress",
            );
          }

          const backendProgress = Array.isArray(progressResponseData.progress)
            ? progressResponseData.progress
            : [];

          const mappedProgress: ProgressItem[] = backendProgress.map(
            (item: any) => {
              const course =
                item.course && typeof item.course === "object"
                  ? item.course
                  : null;

              const totalLessons = Number(item.totalLessons) || 0;

              const completedLessons = Math.min(
                Number(item.completedCount) || 0,
                totalLessons,
              );

              const progress =
                typeof item.percentage === "number"
                  ? item.percentage
                  : totalLessons > 0
                    ? (completedLessons / totalLessons) * 100
                    : 0;

              return {
                courseId:
                  course?._id?.toString() ||
                  course?.id?.toString() ||
                  item.course?.toString(),
                courseTitle: course?.title || "Course",
                progress: Math.min(100, Math.max(0, progress)),
                completedLessons,
                totalLessons,
              };
            },
          );

          setProgressData(mappedProgress);
        }
      } catch {
        setProgressData([]);
      }

      await loadAttendance();
    } catch (error) {
      setUser(null);
      setTestResults([]);
      setProgressData([]);
    } finally {
      setLoading(false);
    }
  }, [email, getAllUsers, loadAttendance]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /*
   * ==========================================
   * REFRESH
   * ==========================================
   */

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  /*
   * ==========================================
   * HELPERS
   * ==========================================
   */

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "N/A";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getInitials = () => {
    const displayName = user?.name || name || "Student";

    const parts = displayName.trim().split(" ");

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  const getTestPercentage = (test: TestResult) => {
    if (typeof test.percentage === "number" && !Number.isNaN(test.percentage)) {
      return test.percentage;
    }

    if (
      typeof test.score === "number" &&
      typeof test.totalMarks === "number" &&
      test.totalMarks > 0
    ) {
      return (test.score / test.totalMarks) * 100;
    }

    return 0;
  };

  const getAverageTestPercentage = () => {
    if (testResults.length === 0) return 0;

    const total = testResults.reduce(
      (sum, test) => sum + getTestPercentage(test),
      0,
    );

    return Math.round(total / testResults.length);
  };

  const getBestTestPercentage = () => {
    if (testResults.length === 0) return 0;

    return Math.round(
      Math.max(...testResults.map((test) => getTestPercentage(test))),
    );
  };

  const getCourseTitle = (courseId?: string) => {
    if (!courseId) return "Unknown Course";

    const foundCourse = (courses || []).find(
      (course: any) => String(course.id || course._id) === String(courseId),
    );

    return foundCourse?.title || "Course";
  };

  const getProgressPercentage = (item: ProgressItem) => {
    if (typeof item.progress === "number") {
      return Math.min(100, Math.max(0, item.progress));
    }

    if (
      typeof item.completedLessons === "number" &&
      typeof item.totalLessons === "number" &&
      item.totalLessons > 0
    ) {
      return Math.min(
        100,
        Math.max(0, (item.completedLessons / item.totalLessons) * 100),
      );
    }

    return 0;
  };

  /*
   * ==========================================
   * DELETE STUDENT
   * ==========================================
   */

  const handleDeleteUser = () => {
    Alert.alert(
      "Delete Student",
      `Are you sure you want to delete ${user?.name || name}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (!user?.email) return;

              const token = await AsyncStorage.getItem(TOKEN_KEY);

              if (!token) {
                Alert.alert("Error", "Authentication token not found.");
                return;
              }

              const response = await fetch(
                `${API_BASE_URL}/users/${encodeURIComponent(user.email)}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                },
              );

              const data = await response.json();

              if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to delete student");
              }

              Alert.alert("Success", "Student deleted successfully.", [
                {
                  text: "OK",
                  onPress: () => router.back(),
                },
              ]);
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message || "Failed to delete student.",
              );
            }
          },
        },
      ],
    );
  };

  /*
   * ==========================================
   * LOADING
   * ==========================================
   */

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>Loading student details...</Text>
      </View>
    );
  }

  /*
   * ==========================================
   * UI
   * ==========================================
   */

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Student Details</Text>

          <View style={{ width: 42 }} />
        </View>

        {/* PROFILE */}

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profilePhoto ? (
              <Image
                source={{ uri: profilePhoto }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || name}</Text>

            <Text style={styles.profileEmail}>{user?.email || email}</Text>

            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role || "student"}</Text>
            </View>
          </View>
        </View>

        {/* QUICK STATS */}

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="book-outline" size={24} style={styles.statIcon} />

            <Text style={styles.statValue}>{courseWiseAttendance.length}</Text>

            <Text style={styles.statLabel}>Courses</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name="checkmark-circle-outline"
              size={24}
              style={styles.statIcon}
            />

            <Text style={styles.statValue}>
              {attendanceSummary.percentage}%
            </Text>

            <Text style={styles.statLabel}>Attendance</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name="document-text-outline"
              size={24}
              style={styles.statIcon}
            />

            <Text style={styles.statValue}>{testResults.length}</Text>

            <Text style={styles.statLabel}>Tests</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name="bar-chart-outline"
              size={24}
              style={styles.statIcon}
            />

            <Text style={styles.statValue}>{getAverageTestPercentage()}%</Text>

            <Text style={styles.statLabel}>Avg. Score</Text>
          </View>
        </View>

        {/* LEARNING PROGRESS */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Learning Progress</Text>

              <Text style={styles.sectionSubtitle}>
                Course-wise learning progress
              </Text>
            </View>

            <Ionicons
              name="trending-up-outline"
              size={24}
              style={styles.sectionIcon}
            />
          </View>

          {progressData.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="bar-chart-outline"
                size={32}
                style={styles.emptyIcon}
              />

              <Text style={styles.emptyTitle}>No Progress Data</Text>

              <Text style={styles.emptyText}>
                No learning progress has been recorded for this student yet.
              </Text>
            </View>
          ) : (
            progressData.map((item, index) => {
              const progress = getProgressPercentage(item);

              return (
                <View
                  key={item.courseId || `progress-${index}`}
                  style={styles.progressCard}
                >
                  <View style={styles.progressTopRow}>
                    <Text style={styles.progressCourse}>
                      {item.courseTitle || getCourseTitle(item.courseId)}
                    </Text>

                    <Text style={styles.progressPercentage}>
                      {Math.round(progress)}%
                    </Text>
                  </View>

                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.max(0, progress))}%`,
                        },
                      ]}
                    />
                  </View>

                  {typeof item.completedLessons === "number" &&
                    typeof item.totalLessons === "number" && (
                      <Text style={styles.progressLessons}>
                        {item.completedLessons} / {item.totalLessons} lessons
                        completed
                      </Text>
                    )}
                </View>
              );
            })
          )}
        </View>

        {/* ATTENDANCE */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Attendance</Text>

              <Text style={styles.sectionSubtitle}>
                Student attendance overview
              </Text>
            </View>

            <Ionicons
              name="calendar-outline"
              size={24}
              style={styles.sectionIcon}
            />
          </View>

          {attendanceLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" />

              <Text style={styles.loadingCardText}>Loading attendance...</Text>
            </View>
          ) : (
            <>
              {/* OVERALL ATTENDANCE */}

              <View style={styles.attendanceSummaryCard}>
                <View style={styles.attendancePercentageBox}>
                  <Text style={styles.attendancePercentage}>
                    {attendanceSummary.percentage}%
                  </Text>

                  <Text style={styles.attendancePercentageLabel}>
                    Attendance
                  </Text>
                </View>

                <View style={styles.attendanceSummaryGrid}>
                  <View style={styles.attendanceSummaryItem}>
                    <View style={[styles.summaryDot, styles.presentDot]} />

                    <View>
                      <Text style={styles.summaryValue}>
                        {attendanceSummary.present}
                      </Text>

                      <Text style={styles.summaryLabel}>Present</Text>
                    </View>
                  </View>

                  <View style={styles.attendanceSummaryItem}>
                    <View style={[styles.summaryDot, styles.absentDot]} />

                    <View>
                      <Text style={styles.summaryValue}>
                        {attendanceSummary.absent}
                      </Text>

                      <Text style={styles.summaryLabel}>Absent</Text>
                    </View>
                  </View>

                  <View style={styles.attendanceSummaryItem}>
                    <View style={[styles.summaryDot, styles.totalDot]} />

                    <View>
                      <Text style={styles.summaryValue}>
                        {attendanceSummary.total}
                      </Text>

                      <Text style={styles.summaryLabel}>Total Classes</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* COURSE-WISE ATTENDANCE */}

              <View style={styles.courseAttendanceCard}>
                <View style={styles.courseAttendanceHeader}>
                  <View>
                    <Text style={styles.historyTitle}>
                      Course-wise Attendance
                    </Text>

                    <Text style={styles.historySubtitle}>
                      Attendance for each course
                    </Text>
                  </View>

                  <View style={styles.recordCountBadge}>
                    <Text style={styles.recordCountText}>
                      {courseWiseAttendance.length}
                    </Text>
                  </View>
                </View>

                {courseWiseAttendance.length === 0 ? (
                  <View style={styles.emptyAttendance}>
                    <Ionicons
                      name="book-outline"
                      size={32}
                      style={styles.emptyIcon}
                    />

                    <Text style={styles.emptyTitle}>No Course Attendance</Text>

                    <Text style={styles.emptyText}>
                      No attendance records are available yet.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.courseAttendanceList}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    {courseWiseAttendance.map((course) => {
                      const percentage = course.percentage;

                      return (
                        <View
                          key={course.courseId}
                          style={styles.courseAttendanceItem}
                        >
                          <View style={styles.courseAttendanceTop}>
                            <View style={styles.courseIcon}>
                              <Ionicons name="book" size={18} />
                            </View>

                            <View style={styles.courseNameContainer}>
                              <Text
                                style={styles.courseAttendanceTitle}
                                numberOfLines={1}
                              >
                                {course.courseTitle}
                              </Text>

                              <Text style={styles.courseAttendanceClasses}>
                                {course.total} total classes
                              </Text>
                            </View>

                            <Text
                              style={[
                                styles.coursePercentage,
                                percentage >= 75
                                  ? styles.goodPercentage
                                  : percentage >= 50
                                    ? styles.mediumPercentage
                                    : styles.lowPercentage,
                              ]}
                            >
                              {percentage}%
                            </Text>
                          </View>

                          <View style={styles.courseProgressBackground}>
                            <View
                              style={[
                                styles.courseProgressFill,
                                percentage >= 75
                                  ? styles.goodProgress
                                  : percentage >= 50
                                    ? styles.mediumProgress
                                    : styles.lowProgress,
                                {
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, percentage),
                                  )}%`,
                                },
                              ]}
                            />
                          </View>

                          <View style={styles.courseAttendanceBottom}>
                            <View style={styles.courseStat}>
                              <View
                                style={[styles.smallDot, styles.presentDot]}
                              />

                              <Text style={styles.courseStatText}>
                                Present: {course.present}
                              </Text>
                            </View>

                            <View style={styles.courseStat}>
                              <View
                                style={[styles.smallDot, styles.absentDot]}
                              />

                              <Text style={styles.courseStatText}>
                                Absent: {course.absent}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* DATE-WISE ATTENDANCE */}

              <View style={styles.attendanceHistoryCard}>
                <View style={styles.historyHeader}>
                  <View>
                    <Text style={styles.historyTitle}>
                      Date-wise Attendance
                    </Text>

                    <Text style={styles.historySubtitle}>
                      Attendance records by date
                    </Text>
                  </View>

                  <View style={styles.recordCountBadge}>
                    <Text style={styles.recordCountText}>
                      {attendanceRecords.length}
                    </Text>
                  </View>
                </View>

                {attendanceRecords.length === 0 ? (
                  <View style={styles.emptyAttendance}>
                    <Ionicons
                      name="calendar-outline"
                      size={32}
                      style={styles.emptyIcon}
                    />

                    <Text style={styles.emptyTitle}>No Attendance Records</Text>

                    <Text style={styles.emptyText}>
                      No attendance has been recorded for this student yet.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.attendanceList}
                    contentContainerStyle={styles.attendanceListContent}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    {attendanceRecords.map((record, index) => (
                      <View
                        key={record._id || record.id || `attendance-${index}`}
                        style={styles.attendanceRow}
                      >
                        <View style={styles.dateCircle}>
                          <Ionicons
                            name="calendar"
                            size={18}
                            style={styles.dateIcon}
                          />
                        </View>

                        <View style={styles.attendanceMainInfo}>
                          <Text style={styles.attendanceDate}>
                            {formatDate(record.date)}
                          </Text>

                          <Text
                            style={styles.attendanceCourse}
                            numberOfLines={1}
                          >
                            {record.course?.title || "Unknown Course"}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            record.status === "present"
                              ? styles.presentBadge
                              : styles.absentBadge,
                          ]}
                        >
                          <Ionicons
                            name={
                              record.status === "present"
                                ? "checkmark-circle"
                                : "close-circle"
                            }
                            size={15}
                          />

                          <Text
                            style={[
                              styles.statusText,
                              record.status === "present"
                                ? styles.presentText
                                : styles.absentText,
                            ]}
                          >
                            {record.status === "present" ? "Present" : "Absent"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </>
          )}
        </View>

        {/* TEST PERFORMANCE */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Test Performance</Text>

              <Text style={styles.sectionSubtitle}>
                Overall test performance
              </Text>
            </View>

            <Ionicons
              name="stats-chart-outline"
              size={24}
              style={styles.sectionIcon}
            />
          </View>

          <View style={styles.performanceCard}>
            <View style={styles.performanceCircle}>
              <Text style={styles.performancePercentage}>
                {getBestTestPercentage()}%
              </Text>

              <Text style={styles.performanceLabel}>Best Score</Text>
            </View>

            <View style={styles.performanceInfo}>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>
                  {testResults.length}
                </Text>

                <Text style={styles.performanceItemLabel}>Tests Taken</Text>
              </View>

              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>
                  {getAverageTestPercentage()}%
                </Text>

                <Text style={styles.performanceItemLabel}>Average Score</Text>
              </View>

              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>
                  {
                    testResults.filter((test) => getTestPercentage(test) >= 50)
                      .length
                  }
                </Text>

                <Text style={styles.performanceItemLabel}>Passed</Text>
              </View>

              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>
                  {
                    testResults.filter((test) => getTestPercentage(test) < 50)
                      .length
                  }
                </Text>

                <Text style={styles.performanceItemLabel}>Below 50%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* RECENT TESTS */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Tests</Text>

              <Text style={styles.sectionSubtitle}>Latest test attempts</Text>
            </View>

            <Ionicons
              name="document-text-outline"
              size={24}
              style={styles.sectionIcon}
            />
          </View>

          {testResults.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="document-text-outline"
                size={32}
                style={styles.emptyIcon}
              />

              <Text style={styles.emptyTitle}>No Tests Taken</Text>

              <Text style={styles.emptyText}>
                This student has not attempted any tests yet.
              </Text>
            </View>
          ) : (
            testResults
              .slice()
              .sort((a, b) => {
                const dateA = new Date(a.submittedAt || a.date || 0).getTime();

                const dateB = new Date(b.submittedAt || b.date || 0).getTime();

                return dateB - dateA;
              })
              .slice(0, 10)
              .map((test, index) => {
                const percentage = getTestPercentage(test);

                return (
                  <View
                    key={test.id || test._id || `test-${index}`}
                    style={styles.testCard}
                  >
                    <View style={styles.testIcon}>
                      <Ionicons name="document-text" size={20} />
                    </View>

                    <View style={styles.testInfo}>
                      <Text style={styles.testTitle} numberOfLines={1}>
                        {test.testTitle || test.title || "Test"}
                      </Text>

                      <Text style={styles.testDate}>
                        {formatDate(test.submittedAt || test.date)}
                      </Text>
                    </View>

                    <View style={styles.testScoreBox}>
                      <Text style={styles.testScore}>
                        {Math.round(percentage)}%
                      </Text>

                      {typeof test.score === "number" &&
                        typeof test.totalMarks === "number" && (
                          <Text style={styles.testMarks}>
                            {test.score}/{test.totalMarks}
                          </Text>
                        )}
                    </View>
                  </View>
                );
              })
          )}
        </View>

        {/* STUDENT INFORMATION */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Student Information</Text>

              <Text style={styles.sectionSubtitle}>Account details</Text>
            </View>

            <Ionicons
              name="person-outline"
              size={24}
              style={styles.sectionIcon}
            />
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="person-outline" size={20} />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>

                <Text style={styles.infoValue}>{user?.name || name}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail-outline" size={20} />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email Address</Text>

                <Text style={styles.infoValue}>{user?.email || email}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Role</Text>

                <Text style={styles.infoValue}>{user?.role || "student"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* DELETE */}

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteUser}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={20} style={styles.deleteIcon} />

          <Text style={styles.deleteButtonText}>Delete Student</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

/*
 * ==========================================
 * STYLES
 * ==========================================
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EDE4",
  },

  scrollContent: {
    paddingBottom: 20,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0EDE4",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#000000",
  },

  loadingCard: {
    minHeight: 120,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  loadingCardText: {
    marginTop: 10,
    fontSize: 14,
    color: "#000000",
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },

  profileCard: {
    marginHorizontal: 18,
    marginBottom: 16,
    padding: 20,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  avatarContainer: {
    marginRight: 16,
  },

  avatarImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },

  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 25,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#000000",
  },

  profileEmail: {
    marginTop: 4,
    fontSize: 14,
    color: "#000000",
  },

  roleBadge: {
    alignSelf: "flex-start",
    marginTop: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F0EDE4",
  },

  roleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#004741",
    textTransform: "capitalize",
  },

  statsGrid: {
    marginHorizontal: 18,
    marginBottom: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  statCard: {
    width: "48.3%",
    minHeight: 112,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  statIcon: {
    marginBottom: 7,
  },

  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#000000",
  },

  statLabel: {
    marginTop: 3,
    fontSize: 13,
    color: "#000000",
  },

  section: {
    marginHorizontal: 18,
    marginTop: 18,
  },

  sectionHeader: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000000",
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#000000",
  },

  sectionIcon: {
    color: "#000000",
  },

  emptyCard: {
    minHeight: 170,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    color: "#000000",
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },

  emptyText: {
    marginTop: 5,
    maxWidth: 290,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    color: "#000000",
  },

  progressCard: {
    marginBottom: 10,
    padding: 16,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  progressTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressCourse: {
    flex: 1,
    marginRight: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
  },

  progressPercentage: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
  },

  progressBarBackground: {
    height: 8,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: "#F0EDE4",
    overflow: "hidden",
  },

  progressBarFill: {
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#000000",
  },

  progressLessons: {
    marginTop: 8,
    fontSize: 12,
    color: "#000000",
  },

  attendanceSummaryCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EDE4",
    flexDirection: "row",
    alignItems: "center",
  },

  attendancePercentageBox: {
    width: 105,
    height: 105,
    borderRadius: 53,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 18,
  },

  attendancePercentage: {
    fontSize: 23,
    fontWeight: "800",
    color: "#000000",
  },

  attendancePercentageLabel: {
    marginTop: 3,
    fontSize: 11,
    color: "#000000",
  },

  attendanceSummaryGrid: {
    flex: 1,
  },

  attendanceSummaryItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },

  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },

  presentDot: {
    backgroundColor: "#004741",
  },

  absentDot: {
    backgroundColor: "#000000",
  },

  totalDot: {
    backgroundColor: "#000000",
  },

  summaryValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },

  summaryLabel: {
    marginTop: 1,
    fontSize: 11,
    color: "#000000",
  },

  /*
   * COURSE-WISE ATTENDANCE
   */

  courseAttendanceCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  courseAttendanceHeader: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  courseAttendanceList: {
    maxHeight: 400,
  },

  courseAttendanceItem: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F0EDE4",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  courseAttendanceTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  courseIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  courseNameContainer: {
    flex: 1,
    minWidth: 0,
  },

  courseAttendanceTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },

  courseAttendanceClasses: {
    marginTop: 3,
    fontSize: 11,
    color: "#000000",
  },

  coursePercentage: {
    marginLeft: 8,
    fontSize: 17,
    fontWeight: "900",
  },

  goodPercentage: {
    color: "#004741",
  },

  mediumPercentage: {
    color: "#004741",
  },

  lowPercentage: {
    color: "#000000",
  },

  courseProgressBackground: {
    height: 7,
    marginTop: 12,
    borderRadius: 7,
    backgroundColor: "#F0EDE4",
    overflow: "hidden",
  },

  courseProgressFill: {
    height: "100%",
    borderRadius: 7,
  },

  goodProgress: {
    backgroundColor: "#004741",
  },

  mediumProgress: {
    backgroundColor: "#004741",
  },

  lowProgress: {
    backgroundColor: "#000000",
  },

  courseAttendanceBottom: {
    marginTop: 11,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  courseStat: {
    flexDirection: "row",
    alignItems: "center",
  },

  smallDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },

  courseStatText: {
    fontSize: 11,
    color: "#000000",
    fontWeight: "600",
  },

  /*
   * DATE-WISE ATTENDANCE
   */

  attendanceHistoryCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  historyHeader: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  historyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },

  historySubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#000000",
  },

  recordCountBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 17,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  recordCountText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#000000",
  },

  attendanceList: {
    maxHeight: 360,
  },

  attendanceListContent: {
    paddingBottom: 2,
  },

  emptyAttendance: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
  },

  attendanceRow: {
    minHeight: 72,
    marginBottom: 9,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: "#F0EDE4",
    flexDirection: "row",
    alignItems: "center",
  },

  dateCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  dateIcon: {
    color: "#000000",
  },

  attendanceMainInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },

  attendanceDate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },

  attendanceCourse: {
    marginTop: 4,
    fontSize: 12,
    color: "#000000",
  },

  statusBadge: {
    minWidth: 82,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  presentBadge: {
    backgroundColor: "#F0EDE4",
  },

  absentBadge: {
    backgroundColor: "#F0EDE4",
  },

  statusText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "800",
  },

  presentText: {
    color: "#004741",
  },

  absentText: {
    color: "#000000",
  },

  /*
   * TEST PERFORMANCE
   */

  performanceCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EDE4",
    flexDirection: "row",
    alignItems: "center",
  },

  performanceCircle: {
    width: 115,
    height: 115,
    borderRadius: 58,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20,
  },

  performancePercentage: {
    fontSize: 26,
    fontWeight: "800",
    color: "#000000",
  },

  performanceLabel: {
    marginTop: 4,
    fontSize: 10,
    color: "#000000",
    textAlign: "center",
  },

  performanceInfo: {
    flex: 1,
    minWidth: 0,
  },

  performanceItem: {
    marginBottom: 10,
  },

  performanceValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#000000",
  },

  performanceItemLabel: {
    marginTop: 2,
    fontSize: 12,
    color: "#000000",
  },

  /*
   * RECENT TESTS
   */

  testCard: {
    minHeight: 76,
    marginBottom: 10,
    padding: 13,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EDE4",
    flexDirection: "row",
    alignItems: "center",
  },

  testIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  testInfo: {
    flex: 1,
    minWidth: 0,
  },

  testTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },

  testDate: {
    marginTop: 4,
    fontSize: 11,
    color: "#000000",
  },

  testScoreBox: {
    minWidth: 55,
    marginLeft: 8,
    alignItems: "flex-end",
  },

  testScore: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },

  testMarks: {
    marginTop: 2,
    fontSize: 10,
    color: "#000000",
  },

  /*
   * STUDENT INFORMATION
   */

  infoCard: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  infoRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 11,
    color: "#000000",
  },

  infoValue: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },

  infoDivider: {
    height: 1,
    backgroundColor: "#F0EDE4",
  },

  /*
   * DELETE
   */

  deleteButton: {
    marginHorizontal: 18,
    marginTop: 24,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#F0EDE4",
    borderWidth: 1,
    borderColor: "#F0EDE4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteIcon: {
    color: "#000000",
    marginRight: 8,
  },

  deleteButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
  },
});

