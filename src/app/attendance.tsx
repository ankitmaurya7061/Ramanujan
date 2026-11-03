import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { useAuth } from "../context/AuthContext";
import { useCourses } from "../context/CourseContext";
import { useAttendance } from "../context/AttendanceContext";

export default function AttendanceScreen() {
  const { user } = useAuth();
  const { courses } = useCourses();
  const { attendance, refreshAttendance } = useAttendance();

  const [loading, setLoading] = React.useState(true);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const load = async () => {
        setLoading(true);

        try {
          await refreshAttendance();
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      load();

      return () => {
        active = false;
      };
    }, [refreshAttendance])
  );

  // Students only see courses from their own class.
  // Admins can see courses from every class.
  const classCourses = useMemo(() => {
    if (!user) {
      return [];
    }

    if (user.role === "admin") {
      return courses || [];
    }

    const studentClassId = Number(user.classId);

    if (
      !Number.isInteger(studentClassId) ||
      studentClassId < 6 ||
      studentClassId > 12
    ) {
      return [];
    }

    return (courses || []).filter(
      (course) =>
        Number(course.classId) === studentClassId
    );
  }, [courses, user]);

  const courseAttendance = useMemo(() => {
    if (!user) {
      return [];
    }

    return classCourses
      .map((course) => {
        const courseId = String(
          course.id ?? course._id ?? ""
        );

        const records = (attendance || []).filter(
          (record) =>
            String(record.courseId) === courseId
        );

        if (records.length === 0) {
          return {
            course,
            percentage: 0,
            hasAttendance: false,
          };
        }

        // Count only one record per course and date.
        const uniqueRecords = Array.from(
          new Map(
            records.map((record) => [
              `${record.courseId}-${record.date}`,
              record,
            ])
          ).values()
        );

        const presentCount = uniqueRecords.filter(
          (record) => record.status === "present"
        ).length;

        const percentage = Math.round(
          (presentCount / uniqueRecords.length) * 100
        );

        return {
          course,
          percentage,
          hasAttendance: true,
        };
      })
      .filter((item) => item.hasAttendance);
  }, [classCourses, attendance, user]);

  const overallPercentage = useMemo(() => {
    if (!user || courseAttendance.length === 0) {
      return 0;
    }

    const totalPercentage = courseAttendance.reduce(
      (sum, item) => sum + item.percentage,
      0
    );

    return Math.round(
      totalPercentage / courseAttendance.length
    );
  }, [courseAttendance, user]);

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 60) {
      return "#004741";
    }

    return "#000000";
  };

  const getAttendanceMessage = (percentage: number) => {
    if (percentage >= 75) {
      return "Good attendance";
    }

    if (percentage >= 60) {
      return "Attendance needs improvement";
    }

    return "Low attendance";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#004741"
          />

          <Text style={styles.loadingText}>
            Attendance loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#000000"
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              Attendance
            </Text>

            <Text style={styles.subtitle}>
              Track your course-wise attendance
            </Text>
          </View>
        </View>

        <View style={styles.overallCard}>
          <View style={styles.overallLeft}>
            <Text style={styles.overallLabel}>
              Overall Attendance
            </Text>

            <Text
              style={[
                styles.overallPercentage,
                {
                  color:
                    getPercentageColor(
                      overallPercentage
                    ),
                },
              ]}
            >
              {overallPercentage}%
            </Text>

            <Text style={styles.overallMessage}>
              {getAttendanceMessage(
                overallPercentage
              )}
            </Text>
          </View>

          <View style={styles.circleContainer}>
            <View
              style={[
                styles.circle,
                {
                  borderColor:
                    getPercentageColor(
                      overallPercentage
                    ),
                },
              ]}
            >
              <Ionicons
                name="calendar"
                size={30}
                color={getPercentageColor(
                  overallPercentage
                )}
              />
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="information-circle-outline"
              size={23}
              color="#004741"
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Attendance Information
            </Text>

            <Text style={styles.infoText}>
              Your attendance is marked by the
              admin. You can only view your
              attendance percentage here.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Course-wise Attendance
          </Text>

          <Text style={styles.courseCount}>
            {courseAttendance.length} courses
          </Text>
        </View>

        {courseAttendance.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="calendar-outline"
              size={50}
              color="#000000"
            />

            <Text style={styles.emptyTitle}>
              No Attendance Data
            </Text>

            <Text style={styles.emptyText}>
              Your attendance will appear here
              once the admin marks it.
            </Text>
          </View>
        ) : (
          courseAttendance.map(
            ({ course, percentage }) => {
              const percentageColor =
                getPercentageColor(percentage);

              const courseId = String(
                course.id ?? course._id ?? ""
              );

              return (
                <View
                  key={courseId}
                  style={styles.courseCard}
                >
                  <View style={styles.courseTop}>
                    <View style={styles.courseIcon}>
                      <Ionicons
                        name="book-outline"
                        size={22}
                        color="#004741"
                      />
                    </View>

                    <View style={styles.courseInfo}>
                      <Text
                        style={styles.courseName}
                        numberOfLines={1}
                      >
                        {course.title}
                      </Text>

                      <Text style={styles.courseStatus}>
                        {getAttendanceMessage(
                          percentage
                        )}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.coursePercentage,
                        {
                          color: percentageColor,
                        },
                      ]}
                    >
                      {percentage}%
                    </Text>
                  </View>

                  <View
                    style={styles.progressBackground}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor:
                            percentageColor,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.courseBottom}>
                    <Text style={styles.courseBottomText}>
                      Attendance
                    </Text>

                    <Text
                      style={[
                        styles.courseBottomPercentage,
                        {
                          color: percentageColor,
                        },
                      ]}
                    >
                      {percentage}%
                    </Text>
                  </View>
                </View>
              );
            }
          )
        )}

        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>
            Attendance Status
          </Text>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  {
                    backgroundColor: "#004741",
                  },
                ]}
              />

              <Text style={styles.legendText}>
                75% or above
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  {
                    backgroundColor: "#004741",
                  },
                ]}
              />

              <Text style={styles.legendText}>
                60% - 74%
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  {
                    backgroundColor: "#000000",
                  },
                ]}
              />

              <Text style={styles.legendText}>
                Below 60%
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EDE4",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#000000",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  headerText: {
    marginLeft: 12,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#000000",
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#000000",
  },

  overallCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
    marginBottom: 14,
  },

  overallLeft: {
    flex: 1,
  },

  overallLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
  },

  overallPercentage: {
    marginTop: 5,
    fontSize: 42,
    fontWeight: "900",
  },

  overallMessage: {
    marginTop: 2,
    fontSize: 13,
    color: "#000000",
  },

  circleContainer: {
    marginLeft: 15,
  },

  circle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0EDE4",
  },

  infoCard: {
    backgroundColor: "#F0EDE4",
    borderRadius: 16,
    padding: 15,
    flexDirection: "row",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  infoContent: {
    flex: 1,
    marginLeft: 11,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#004741",
  },

  infoText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#000000",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#000000",
  },

  courseCount: {
    fontSize: 12,
    color: "#000000",
  },

  courseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  courseTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  courseIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  courseInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  courseName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },

  courseStatus: {
    marginTop: 4,
    fontSize: 12,
    color: "#000000",
  },

  coursePercentage: {
    fontSize: 20,
    fontWeight: "900",
  },

  progressBackground: {
    height: 8,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    overflow: "hidden",
    marginTop: 15,
  },

  progressFill: {
    height: "100%",
    borderRadius: 10,
  },

  courseBottom: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  courseBottomText: {
    fontSize: 11,
    color: "#000000",
  },

  courseBottomPercentage: {
    fontSize: 11,
    fontWeight: "800",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 45,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "800",
    color: "#000000",
  },

  emptyText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    color: "#000000",
  },

  legendCard: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  legendTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
    marginBottom: 14,
  },

  legendRow: {
    gap: 11,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 8,
  },

  legendText: {
    fontSize: 12,
    color: "#000000",
  },
});