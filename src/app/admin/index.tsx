import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth, User } from "../../context/AuthContext";
import { useCourses } from "../../context/CourseContext";
import { useLessons } from "../../context/LessonContext";
import { useTests, TestResult } from "../../context/TestContext";

let savedDashboardScrollY = 0;

type StudentProgress = {
  user: User;
  completedLessons: number;
  totalLessons: number;
  progress: number;
  testAttempts: number;
  bestScore: number;
};

export default function AdminDashboard() {
  const { user, logout, getAllUsers } = useAuth();
  const { courses } = useCourses();
  const { lessons } = useLessons();
  const { tests } = useTests();

  const [studentCount, setStudentCount] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [studentProgress, setStudentProgress] = useState<
    StudentProgress[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dashboardScrollRef =
    useRef<ScrollView | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      const users = await getAllUsers();

      const students = Array.isArray(users)
        ? users.filter(
            (item) => item?.role === "user"
          )
        : [];

      setStudentCount(students.length);

      const token =
        await AsyncStorage.getItem(
          "studypoint_token"
        );

      let parsedResults: TestResult[] = [];

      if (token) {
        try {
          const response = await fetch(
            "https://ramanujan-sybq.onrender.com/api/test-results",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          const data = await response.json();

          if (
            response.ok &&
            Array.isArray(data?.results)
          ) {
            parsedResults = data.results.map(
              (item: any) => ({
                id:
                  item?._id?.toString() ||
                  item?.id ||
                  "",

                studentEmail:
                  item?.student?.email ||
                  item?.studentEmail ||
                  "",

                studentName:
                  item?.student?.name ||
                  item?.studentName ||
                  "Student",

                testTitle:
                  item?.test?.title ||
                  item?.testTitle ||
                  "Test Attempt",

                percentage: Number(
                  item?.percentage || 0
                ),

                score: Number(
                  item?.score || 0
                ),

                totalMarks: Number(
                  item?.totalMarks || 0
                ),

                attemptedAt:
                  item?.submittedAt ||
                  item?.attemptedAt ||
                  item?.createdAt ||
                  "",
              })
            ) as TestResult[];
          }
        } catch {
          parsedResults = [];
        }
      }

      setResults(parsedResults);

      const studentData: StudentProgress[] = [];

      for (const student of students) {
        const studentId =
          (student as any)?.id ||
          (student as any)?._id?.toString();

        let completedLessons = 0;
        let totalLessons =
          lessons?.length || 0;

        if (token && studentId) {
          try {
            const response = await fetch(
              `https://ramanujan-sybq.onrender.com/api/progress/student/${studentId}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            const data = await response.json();

            if (
              response.ok &&
              Array.isArray(data?.progress)
            ) {
              completedLessons =
                data.progress.reduce(
                  (
                    sum: number,
                    item: any
                  ) =>
                    sum +
                    Number(
                      item?.completedCount || 0
                    ),
                  0
                );

              totalLessons =
                data.progress.reduce(
                  (
                    sum: number,
                    item: any
                  ) =>
                    sum +
                    Number(
                      item?.totalLessons || 0
                    ),
                  0
                );
            }
          } catch {
            completedLessons = 0;
            totalLessons =
              lessons?.length || 0;
          }
        }

        const progress =
          totalLessons > 0
            ? Math.min(
                100,
                Math.round(
                  (completedLessons /
                    totalLessons) *
                    100
                )
              )
            : 0;

        const email = String(
          student?.email || ""
        ).toLowerCase();

        const userResults =
          parsedResults.filter(
            (result) =>
              String(
                result?.studentEmail || ""
              ).toLowerCase() === email
          );

        let bestScore = 0;

        userResults.forEach((result) => {
          const score = Number(
            result?.percentage || 0
          );

          if (
            Number.isFinite(score) &&
            score > bestScore
          ) {
            bestScore = score;
          }
        });

        studentData.push({
          user: student,
          completedLessons,
          totalLessons,
          progress,
          testAttempts:
            userResults.length,
          bestScore,
        });
      }

      studentData.sort(
        (a, b) =>
          b.progress - a.progress
      );

      setStudentProgress(studentData);
    } catch {
      setStudentCount(0);
      setResults([]);
      setStudentProgress([]);
    } finally {
      setLoading(false);
    }
  }, [getAllUsers, lessons?.length]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  useEffect(() => {
    if (
      loading ||
      savedDashboardScrollY <= 0
    ) {
      return;
    }

    const restoreY =
      savedDashboardScrollY;

    const timer = setTimeout(() => {
      dashboardScrollRef.current?.scrollTo({
        y: restoreY,
        animated: false,
      });
    }, 80);

    return () => clearTimeout(timer);
  }, [loading]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadDashboardData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login");
          },
        },
      ]
    );
  };

  const safeResults = Array.isArray(results)
    ? results
    : [];

  const totalAttempts =
    safeResults.length;

  const averageScore =
    totalAttempts > 0
      ? Math.round(
          safeResults.reduce(
            (sum, result) =>
              sum +
              Number(
                result?.percentage || 0
              ),
            0
          ) / totalAttempts
        )
      : 0;

  const highestScore =
    totalAttempts > 0
      ? Math.max(
          ...safeResults.map((result) =>
            Number(
              result?.percentage || 0
            )
          )
        )
      : 0;

  const passedAttempts =
    safeResults.filter(
      (result) =>
        Number(
          result?.percentage || 0
        ) >= 50
    ).length;

  const failedAttempts =
    totalAttempts - passedAttempts;

  const averageStudentProgress =
    studentProgress.length > 0
      ? Math.round(
          studentProgress.reduce(
            (sum, student) =>
              sum + student.progress,
            0
          ) / studentProgress.length
        )
      : 0;

  const recentResults = useMemo(() => {
    return [...safeResults]
      .sort(
        (a, b) =>
          new Date(
            b?.attemptedAt || 0
          ).getTime() -
          new Date(
            a?.attemptedAt || 0
          ).getTime()
      )
      .slice(0, 3);
  }, [results]);

  const formatDate = (
    dateValue: string
  ) => {
    if (!dateValue) {
      return "Unknown date";
    }

    const date =
      new Date(dateValue);

    if (
      Number.isNaN(date.getTime())
    ) {
      return "Unknown date";
    }

    return date.toLocaleDateString();
  };

  const formatTime = (
    dateValue: string
  ) => {
    if (!dateValue) {
      return "";
    }

    const date =
      new Date(dateValue);

    if (
      Number.isNaN(date.getTime())
    ) {
      return "";
    }

    return date.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  const managementItems = [
    {
      title: "Manage Courses",
      subtitle:
        "Add, edit and delete courses",
      icon: "book-outline" as const,
      color: "#004741",
      route: "/admin/courses",
    },

    {
      title: "Manage Lessons",
      subtitle:
        "Create and manage lessons",
      icon: "play-circle-outline" as const,
      color: "#004741",
      route: "/admin/lessons",
    },

    {
      title: "Manage Tests",
      subtitle:
        "Create tests and questions",
      icon: "document-text-outline" as const,
      color: "#004741",
      route: "/admin/tests",
    },

    {
      title: "Manage Students",
      subtitle:
        "View student accounts and progress",
      icon: "people-outline" as const,
      color: "#004741",
      route: "/admin/users",
    },

    {
      title: "Test Results",
      subtitle:
        "View student test performance",
      icon: "bar-chart-outline" as const,
      color: "#004741",
      route: "/admin/test-results",
    },

    {
      title: "Notifications",
      subtitle:
        "Send notifications to students",
      icon: "notifications-outline" as const,
      color: "#004741",
      route: "/admin/notifications",
    },

    {
      title: "Attendance",
      subtitle:
        "Manage student attendance course-wise",
      icon: "calendar-outline" as const,
      color: "#004741",
      route: "/admin/attendance",
    },

    {
      title: "Fees",
      subtitle:
        "Manage student fees and payments",
      icon: "cash-outline" as const,
      color: "#004741",
      route: "/admin/fee-login",
    },
  ];

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color="#004741"
        />

        <Text style={styles.loadingText}>
          Loading dashboard...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        ref={dashboardScrollRef}
        showsVerticalScrollIndicator={
          false
        }
        onScroll={(event) => {
          savedDashboardScrollY =
            event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSmall}>
              ADMIN PANEL
            </Text>

            <Text style={styles.headerTitle}>
              Dashboard
            </Text>

            <Text
              style={styles.headerSubtitle}
            >
              The Winner Ramanujan Classes
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons
              name="log-out-outline"
              size={22}
              color="#dc2626"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[
              styles.statCard,
              styles.studentCard,
            ]}
            onPress={() =>
              router.push(
                "/admin/users"
              )
            }
            activeOpacity={0.85}
          >
            <View
              style={styles.statHeader}
            >
              <View
                style={[
                  styles.statIcon,
                  {
                    backgroundColor:
                      "#F0EDE4",
                  },
                ]}
              >
                <Ionicons
                  name="people"
                  size={21}
                  color="#004741"
                />
              </View>

              <Text
                style={styles.statCategory}
              >
                STUDENTS
              </Text>
            </View>

            <Text
              style={styles.statValue}
            >
              {studentCount}
            </Text>

            <Text
              style={
                styles.statDescription
              }
            >
              Total registered
            </Text>

            <View
              style={styles.statFooter}
            >
              <View
                style={styles.statLine}
              >
                <View
                  style={[
                    styles.statLineFill,
                    {
                      backgroundColor:
                        "#004741",
                    },
                  ]}
                />
              </View>

              <Ionicons
                name="arrow-forward"
                size={15}
                color="#004741"
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statCard,
              styles.courseCard,
            ]}
            onPress={() =>
              router.push(
                "/admin/courses"
              )
            }
            activeOpacity={0.85}
          >
            <View
              style={styles.statHeader}
            >
              <View
                style={[
                  styles.statIcon,
                  {
                    backgroundColor:
                      "#F0EDE4",
                  },
                ]}
              >
                <Ionicons
                  name="book"
                  size={21}
                  color="#004741"
                />
              </View>

              <Text
                style={styles.statCategory}
              >
                COURSES
              </Text>
            </View>

            <Text
              style={styles.statValue}
            >
              {courses?.length || 0}
            </Text>

            <Text
              style={
                styles.statDescription
              }
            >
              Published courses
            </Text>

            <View
              style={styles.statFooter}
            >
              <View
                style={styles.statLine}
              >
                <View
                  style={[
                    styles.statLineFill,
                    {
                      backgroundColor:
                        "#004741",
                    },
                  ]}
                />
              </View>

              <Ionicons
                name="arrow-forward"
                size={15}
                color="#004741"
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statCard,
              styles.lessonCard,
            ]}
            onPress={() =>
              router.push(
                "/admin/lessons"
              )
            }
            activeOpacity={0.85}
          >
            <View
              style={styles.statHeader}
            >
              <View
                style={[
                  styles.statIcon,
                  {
                    backgroundColor:
                      "#F0EDE4",
                  },
                ]}
              >
                <Ionicons
                  name="play-circle"
                  size={21}
                  color="#004741"
                />
              </View>

              <Text
                style={styles.statCategory}
              >
                LESSONS
              </Text>
            </View>

            <Text
              style={styles.statValue}
            >
              {lessons?.length || 0}
            </Text>

            <Text
              style={
                styles.statDescription
              }
            >
              Learning content
            </Text>

            <View
              style={styles.statFooter}
            >
              <View
                style={styles.statLine}
              >
                <View
                  style={[
                    styles.statLineFill,
                    {
                      backgroundColor:
                        "#004741",
                    },
                  ]}
                />
              </View>

              <Ionicons
                name="arrow-forward"
                size={15}
                color="#004741"
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statCard,
              styles.testCard,
            ]}
            onPress={() =>
              router.push(
                "/admin/tests"
              )
            }
            activeOpacity={0.85}
          >
            <View
              style={styles.statHeader}
            >
              <View
                style={[
                  styles.statIcon,
                  {
                    backgroundColor:
                      "#F0EDE4",
                  },
                ]}
              >
                <Ionicons
                  name="document-text"
                  size={21}
                  color="#004741"
                />
              </View>

              <Text
                style={styles.statCategory}
              >
                TESTS
              </Text>
            </View>

            <Text
              style={styles.statValue}
            >
              {tests?.length || 0}
            </Text>

            <Text
              style={
                styles.statDescription
              }
            >
              Assessments
            </Text>

            <View
              style={styles.statFooter}
            >
              <View
                style={styles.statLine}
              >
                <View
                  style={[
                    styles.statLineFill,
                    {
                      backgroundColor:
                        "#004741",
                    },
                  ]}
                />
              </View>

              <Ionicons
                name="arrow-forward"
                size={15}
                color="#004741"
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View
            style={
              styles.sectionHeaderRow
            }
          >
            <View>
              <Text
                style={styles.sectionTitle}
              >
                Student Progress
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Learning completion across
                students
              </Text>
            </View>

            <View
              style={styles.progressBadge}
            >
              <Ionicons
                name="trending-up"
                size={14}
                color="#004741"
              />

              <Text
                style={
                  styles.progressBadgeText
                }
              >
                {averageStudentProgress}%
              </Text>
            </View>
          </View>

          <View
            style={
              styles.studentProgressCard
            }
          >
            <View
              style={styles.progressMainRow}
            >
              <View
                style={
                  styles.progressCircleBox
                }
              >
                <View
                  style={styles.progressCircle}
                >
                  <Text
                    style={
                      styles.progressCircleValue
                    }
                  >
                    {averageStudentProgress}%
                  </Text>

                  <Text
                    style={
                      styles.progressCircleLabel
                    }
                  >
                    Complete
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.progressOverviewContent
                }
              >
                <Text
                  style={
                    styles.progressOverviewTitle
                  }
                >
                  Course Completion
                </Text>

                <Text
                  style={
                    styles.progressOverviewText
                  }
                >
                  Average lesson completion
                  across all registered
                  students.
                </Text>

                <View
                  style={
                    styles.overviewProgressBackground
                  }
                >
                  <View
                    style={[
                      styles.overviewProgressFill,
                      {
                        width: `${averageStudentProgress}%`,
                      },
                    ]}
                  />
                </View>

                <View
                  style={styles.progressMetaRow}
                >
                  <Text
                    style={
                      styles.studentCountText
                    }
                  >
                    {studentCount} students
                  </Text>

                  <Text
                    style={
                      styles.progressMetaValue
                    }
                  >
                    {lessons?.length || 0}{" "}
                    lessons
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View
            style={
              styles.sectionHeaderRow
            }
          >
            <View>
              <Text
                style={styles.sectionTitle}
              >
                Performance Overview
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Test performance at a glance
              </Text>
            </View>

            <View
              style={styles.performanceIcon}
            >
              <Ionicons
                name="stats-chart"
                size={18}
                color="#004741"
              />
            </View>
          </View>

          <View
            style={styles.performanceCard}
          >
            <View
              style={styles.performanceHero}
            >
              <Text
                style={
                  styles.performanceHeroValue
                }
              >
                {averageScore}%
              </Text>

              <Text
                style={
                  styles.performanceHeroLabel
                }
              >
                Average Score
              </Text>

              <View
                style={
                  styles.performanceHeroLine
                }
              >
                <View
                  style={[
                    styles.performanceHeroFill,
                    {
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          averageScore
                        )
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View
              style={styles.performanceStats}
            >
              <View
                style={styles.performanceStat}
              >
                <View
                  style={[
                    styles.performanceStatIcon,
                    {
                      backgroundColor:
                        "#F0EDE4",
                    },
                  ]}
                >
                  <Ionicons
                    name="paper-plane-outline"
                    size={16}
                    color="#004741"
                  />
                </View>

                <View>
                  <Text
                    style={
                      styles.performanceStatValue
                    }
                  >
                    {totalAttempts}
                  </Text>

                  <Text
                    style={
                      styles.performanceStatLabel
                    }
                  >
                    Attempts
                  </Text>
                </View>
              </View>

              <View
                style={styles.performanceStat}
              >
                <View
                  style={[
                    styles.performanceStatIcon,
                    {
                      backgroundColor:
                        "#F0EDE4",
                    },
                  ]}
                >
                  <Ionicons
                    name="trophy-outline"
                    size={16}
                    color="#004741"
                  />
                </View>

                <View>
                  <Text
                    style={
                      styles.performanceStatValue
                    }
                  >
                    {highestScore}%
                  </Text>

                  <Text
                    style={
                      styles.performanceStatLabel
                    }
                  >
                    Best Score
                  </Text>
                </View>
              </View>

              <View
                style={styles.performanceStat}
              >
                <View
                  style={[
                    styles.performanceStatIcon,
                    {
                      backgroundColor:
                        "#F0EDE4",
                    },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color="#16A34A"
                  />
                </View>

                <View>
                  <Text
                    style={[
                      styles.performanceStatValue,
                      {
                        color: "#16A34A",
                      },
                    ]}
                  >
                    {passedAttempts}
                  </Text>

                  <Text
                    style={
                      styles.performanceStatLabel
                    }
                  >
                    Passed
                  </Text>
                </View>
              </View>

              <View
                style={styles.performanceStat}
              >
                <View
                  style={[
                    styles.performanceStatIcon,
                    {
                      backgroundColor:
                        "#F0EDE4",
                    },
                  ]}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={16}
                    color="#DC2626"
                  />
                </View>

                <View>
                  <Text
                    style={[
                      styles.performanceStatValue,
                      {
                        color: "#DC2626",
                      },
                    ]}
                  >
                    {failedAttempts}
                  </Text>

                  <Text
                    style={
                      styles.performanceStatLabel
                    }
                  >
                    Failed
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View
            style={
              styles.sectionHeaderRow
            }
          >
            <Text
              style={styles.sectionTitle}
            >
              Management
            </Text>
          </View>

          <View
            style={styles.managementGrid}
          >
            {managementItems.map(
              (item) => (
                <TouchableOpacity
                  key={item.title}
                  style={
                    styles.compactManagementCard
                  }
                  onPress={() =>
                    router.push(
                      item.route as any
                    )
                  }
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.managementIcon,
                      {
                        backgroundColor:
                          `${item.color}15`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={item.color}
                    />
                  </View>

                  <Text
                    style={
                      styles.compactManagementTitle
                    }
                    numberOfLines={1}
                  >
                    {item.title.replace(
                      "Manage ",
                      ""
                    )}
                  </Text>

                  <View
                    style={[
                      styles.compactManagementArrow,
                      {
                        backgroundColor:
                          `${item.color}12`,
                      },
                    ]}
                  >
                    <Ionicons
                      name="arrow-forward"
                      size={13}
                      color={item.color}
                    />
                  </View>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View
            style={
              styles.sectionHeaderRow
            }
          >
            <Text
              style={styles.sectionTitle}
            >
              Recent Activity
            </Text>

            <TouchableOpacity
              onPress={() =>
                router.push(
                  "/admin/test-results"
                )
              }
            >
              <Text style={styles.viewAll}>
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {recentResults.length === 0 ? (
            <View
              style={styles.emptyCard}
            >
              <Ionicons
                name="document-outline"
                size={42}
                color="#000000"
              />

              <Text
                style={styles.emptyTitle}
              >
                No test submissions yet
              </Text>

              <Text
                style={styles.emptyText}
              >
                Student test attempts will
                appear here.
              </Text>
            </View>
          ) : (
            recentResults.map(
              (result, index) => {
                const percentage =
                  Number(
                    result?.percentage ||
                      0
                  );

                const passed =
                  percentage >= 50;

                return (
                  <View
                    key={
                      result?.id ||
                      `${result?.studentEmail}-${index}`
                    }
                    style={
                      styles.activityCard
                    }
                  >
                    <View
                      style={
                        styles.activityIcon
                      }
                    >
                      <Ionicons
                        name="person-outline"
                        size={21}
                        color="#004741"
                      />
                    </View>

                    <View
                      style={
                        styles.activityContent
                      }
                    >
                      <Text
                        style={
                          styles.activityName
                        }
                        numberOfLines={1}
                      >
                        {result?.studentName ||
                          result?.studentEmail ||
                          "Student"}
                      </Text>

                      <Text
                        style={
                          styles.activityTest
                        }
                        numberOfLines={1}
                      >
                        {result?.testTitle ||
                          "Test Attempt"}
                      </Text>

                      <Text
                        style={
                          styles.activityDate
                        }
                      >
                        {formatDate(
                          result?.attemptedAt ||
                            ""
                        )}{" "}
                        {formatTime(
                          result?.attemptedAt ||
                            ""
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.activityScore
                      }
                    >
                      <Text
                        style={
                          styles.scoreText
                        }
                      >
                        {percentage}%
                      </Text>

                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: passed
                              ? "#004741"
                              : "#dc2626",
                          },
                        ]}
                      >
                        {passed
                          ? "Passed"
                          : "Failed"}
                      </Text>
                    </View>
                  </View>
                );
              }
            )
          )}
        </View>

        <View
          style={styles.bottomSpace}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EDE4",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0EDE4",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#000000",
  },

  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE4",
  },

  headerSmall: {
    fontSize: 12,
    fontWeight: "700",
    color: "#004741",
    letterSpacing: 1,
    marginBottom: 5,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#000000",
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#000000",
  },

  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  statsGrid: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },

  statCard: {
    width: "48.3%",
    minHeight: 158,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EDE4",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  studentCard: {
    borderTopWidth: 3,
    borderTopColor: "#004741",
  },

  courseCard: {
    borderTopWidth: 3,
    borderTopColor: "#004741",
  },

  lessonCard: {
    borderTopWidth: 3,
    borderTopColor: "#004741",
  },

  testCard: {
    borderTopWidth: 3,
    borderTopColor: "#004741",
  },

  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  statCategory: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#000000",
  },

  statValue: {
    marginTop: 17,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
    color: "#000000",
  },

  statDescription: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "500",
    color: "#000000",
  },

  statFooter: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  statLine: {
    flex: 1,
    height: 4,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    overflow: "hidden",
  },

  statLineFill: {
    width: "65%",
    height: "100%",
    borderRadius: 10,
  },

  section: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#000000",
    marginBottom: 12,
  },

  viewAll: {
    fontSize: 14,
    fontWeight: "700",
    color: "#004741",
  },

  sectionSubtitle: {
    marginTop: -7,
    marginBottom: 12,
    fontSize: 11,
    color: "#000000",
    fontWeight: "500",
  },

  progressBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    marginTop: -4,
  },

  progressBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#004741",
  },

  studentProgressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F0EDE4",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  progressMainRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  progressCircleBox: {
    width: 105,
    alignItems: "center",
    justifyContent: "center",
  },

  progressCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 7,
    borderColor: "#004741",
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  progressCircleValue: {
    fontSize: 19,
    fontWeight: "900",
    color: "#000000",
  },

  progressCircleLabel: {
    marginTop: 1,
    fontSize: 9,
    color: "#000000",
    fontWeight: "600",
  },

  progressOverviewContent: {
    flex: 1,
    marginLeft: 14,
  },

  progressOverviewTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
  },

  progressOverviewText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 16,
    color: "#000000",
  },

  overviewProgressBackground: {
    height: 7,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    overflow: "hidden",
    marginTop: 11,
  },

  overviewProgressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#004741",
  },

  progressMetaRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  studentCountText: {
    fontSize: 10,
    color: "#000000",
    fontWeight: "600",
  },

  progressMetaValue: {
    fontSize: 10,
    color: "#000000",
    fontWeight: "700",
  },

  performanceIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -4,
  },

  performanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  performanceHero: {
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE4",
  },

  performanceHeroValue: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
    color: "#000000",
  },

  performanceHeroLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#000000",
    fontWeight: "600",
  },

  performanceHeroLine: {
    marginTop: 10,
    height: 6,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    overflow: "hidden",
  },

  performanceHeroFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#004741",
  },

  performanceStats: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },

  performanceStat: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
  },

  performanceStatIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  performanceStatValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#000000",
  },

  performanceStatLabel: {
    marginTop: 1,
    fontSize: 9,
    color: "#000000",
    fontWeight: "600",
  },

  topStudentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0EDE4",
    flexDirection: "row",
    alignItems: "center",
  },

  rankCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  firstRank: {
    backgroundColor: "#F0EDE4",
  },

  rankText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },

  topStudentContent: {
    flex: 1,
    marginLeft: 11,
    marginRight: 10,
  },

  topStudentName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },

  topStudentEmail: {
    marginTop: 2,
    fontSize: 11,
    color: "#000000",
  },

  topProgressBackground: {
    height: 6,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    overflow: "hidden",
    marginTop: 8,
  },

  topProgressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#004741",
  },

  topStudentScore: {
    alignItems: "flex-end",
    minWidth: 52,
  },

  topStudentProgress: {
    fontSize: 16,
    fontWeight: "800",
    color: "#004741",
  },

  topStudentLessons: {
    marginTop: 2,
    fontSize: 10,
    color: "#000000",
  },

  totalAttemptsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  totalAttemptsIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  totalAttemptsContent: {
    marginLeft: 15,
  },

  totalAttemptsNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#000000",
  },

  totalAttemptsText: {
    marginTop: 2,
    fontSize: 13,
    color: "#000000",
  },

  managementCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  managementIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  managementContent: {
    flex: 1,
    marginLeft: 13,
    marginRight: 8,
  },

  managementTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
  },

  managementSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#000000",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 35,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },

  emptyText: {
    marginTop: 5,
    textAlign: "center",
    fontSize: 13,
    color: "#000000",
  },

  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  activityIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  activityContent: {
    flex: 1,
    marginLeft: 12,
  },

  activityName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },

  activityTest: {
    marginTop: 3,
    fontSize: 12,
    color: "#000000",
  },

  activityDate: {
    marginTop: 4,
    fontSize: 11,
    color: "#000000",
  },

  activityScore: {
    alignItems: "flex-end",
    marginLeft: 8,
  },

  scoreText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },

  statusText: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  summaryRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  summaryLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  summaryLabel: {
    fontSize: 14,
    color: "#000000",
  },

  summaryValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
  },

  separator: {
    height: 1,
    backgroundColor: "#F0EDE4",
  },

  bottomSpace: {
    height: 30,
  },

  managementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  compactManagementCard: {
    width: "48.5%",
    height: 104,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 13,
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  compactManagementTitle: {
    marginTop: 9,
    fontSize: 13,
    fontWeight: "800",
    color: "#000000",
  },

  compactManagementArrow: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
