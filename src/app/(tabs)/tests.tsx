import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  Animated,
  TouchableOpacity,
  View,
} from "react-native";

import { useCourses } from "../../context/CourseContext";
import { useLessons } from "../../context/LessonContext";
import { useProgress } from "../../context/ProgressContext";
import { useTests } from "../../context/TestContext";
import { useAuth } from "../../context/AuthContext";

const ALLOWED_CLASSES = [6, 7, 8, 9, 10, 11, 12];

export default function TestsScreen() {
  const trophyScale = useRef(new Animated.Value(1)).current;
  const trophyRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(trophyScale, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(trophyRotate, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(trophyScale, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(trophyRotate, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [trophyScale, trophyRotate]);

  const trophyRotation = trophyRotate.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["0deg", "-8deg", "8deg"],
  });

  const { courses } = useCourses();
  const { lessons } = useLessons();
  const { tests, results } = useTests();
  const { isLessonCompleted } = useProgress();
  const { user } = useAuth();

  // ADMIN: all courses are visible.
  // STUDENT: only courses belonging to their own class are visible.
  // Missing or invalid class information must never expose every class.
  const classCourses = useMemo(() => {
    if (user?.role === "admin") {
      return courses;
    }

    const studentClass = Number(user?.classId);

    if (!ALLOWED_CLASSES.includes(studentClass)) {
      return [];
    }

    return courses.filter(
      (course) => Number(course.classId) === studentClass
    );
  }, [courses, user?.role, user?.classId]);

  const getCourseName = (courseId: string) => {
    const course = classCourses.find(
      (item) => String(item.id) === String(courseId)
    );

    return course?.title || "Course";
  };

  const getCourseLessons = (courseId: string) => {
    return lessons.filter(
      (lesson) => String(lesson.courseId) === String(courseId)
    );
  };

  const getCourseProgress = (courseId: string) => {
    const courseLessons = getCourseLessons(courseId);

    if (courseLessons.length === 0) {
      return {
        completed: 0,
        total: 0,
        percentage: 0,
        completedAll: true,
      };
    }

    const completed = courseLessons.filter((lesson) =>
      isLessonCompleted(courseId, lesson.id)
    ).length;

    const percentage = Math.round(
      (completed / courseLessons.length) * 100
    );

    return {
      completed,
      total: courseLessons.length,
      percentage,
      completedAll: completed === courseLessons.length,
    };
  };

  const getTestResults = (testId: string) => {
    return results.filter(
      (result) => String(result.testId) === String(testId)
    );
  };

  const getBestScore = (testId: string) => {
    const testResults = getTestResults(testId);

    if (testResults.length === 0) {
      return null;
    }

    return Math.max(
      ...testResults.map((result) => Number(result.percentage) || 0)
    );
  };

  const getAttemptCount = (testId: string) => {
    return getTestResults(testId).length;
  };

  const isTestUnlocked = (courseId: string) => {
    const courseLessons = getCourseLessons(courseId);

    if (courseLessons.length === 0) {
      return true;
    }

    return courseLessons.every((lesson) =>
      isLessonCompleted(courseId, lesson.id)
    );
  };

  const startTest = (testId: string) => {
    router.push({
      pathname: "/test",
      params: {
        testId,
      },
    });
  };

  const viewTestResult = (testId: string) => {
    router.push({
      pathname: "/test-review",
      params: {
        testId,
      },
    });
  };

  // IMPORTANT:
  // A test must belong to a course visible to the current user.
  // Tests without a courseId are excluded because their class cannot
  // be verified safely.
  const availableTests = useMemo(() => {
    const visibleCourseIds = new Set(
      classCourses.map((course) => String(course.id))
    );

    return tests.filter((test) => {
      if (!test.courseId) {
        return false;
      }

      return visibleCourseIds.has(String(test.courseId));
    });
  }, [tests, classCourses]);

  const unlockedCount = availableTests.filter((test) =>
    isTestUnlocked(test.courseId)
  ).length;

  const completedTestCount = availableTests.filter(
    (test) => getAttemptCount(test.id) > 0
  ).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Tests</Text>
            <Text style={styles.subtitle}>
              Test your knowledge and track your performance
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="school-outline"
              size={24}
              color="#004741"
            />
          </View>
        </View>

        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Animated.View
              style={{
                transform: [
                  { scale: trophyScale },
                  { rotate: trophyRotation },
                ],
              }}
            >
              <Ionicons
                name="trophy-outline"
                size={30}
                color="#004741"
              />
            </Animated.View>
          </View>

          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>
              Ready to test yourself?
            </Text>
            <Text style={styles.bannerText}>
              Complete all lessons of a course to unlock its test.
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color="#004741"
              />
            </View>

            <Text style={styles.statNumber}>
              {availableTests.length}
            </Text>
            <Text style={styles.statLabel}>Total Tests</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons
                name="lock-open-outline"
                size={22}
                color="#004741"
              />
            </View>

            <Text style={styles.statNumber}>{unlockedCount}</Text>
            <Text style={styles.statLabel}>Unlocked</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons
                name="checkmark-circle-outline"
                size={22}
                color="#004741"
              />
            </View>

            <Text style={styles.statNumber}>
              {completedTestCount}
            </Text>
            <Text style={styles.statLabel}>Attempted</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Available Tests</Text>
            <Text style={styles.sectionSubtitle}>
              Complete your course lessons to unlock tests
            </Text>
          </View>
        </View>

        {availableTests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="document-text-outline"
              size={52}
              color="#004741"
            />

            <Text style={styles.emptyTitle}>No tests available</Text>

            <Text style={styles.emptyText}>
              Tests for your class will appear here when the admin
              creates them.
            </Text>
          </View>
        ) : (
          availableTests.map((test) => {
            const courseProgress = getCourseProgress(test.courseId);
            const unlocked = isTestUnlocked(test.courseId);
            const attempts = getAttemptCount(test.id);
            const bestScore = getBestScore(test.id);

            return (
              <View
                key={test.id}
                style={[
                  styles.testCard,
                  !unlocked && styles.lockedTestCard,
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.testIcon,
                      !unlocked && styles.lockedIcon,
                    ]}
                  >
                    <Ionicons
                      name={
                        unlocked
                          ? "document-text"
                          : "lock-closed"
                      }
                      size={25}
                      color="#004741"
                    />
                  </View>

                  <View style={styles.testInfo}>
                    <Text style={styles.testTitle}>
                      {test.title}
                    </Text>

                    <Text style={styles.courseName}>
                      {getCourseName(test.courseId)}
                    </Text>
                  </View>

                  {unlocked ? (
                    <View style={styles.unlockedBadge}>
                      <Ionicons
                        name="lock-open-outline"
                        size={14}
                        color="#004741"
                      />
                      <Text style={styles.unlockedText}>
                        Unlocked
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.lockedBadge}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={14}
                        color="#FFFFFF"
                      />
                      <Text style={styles.lockedText}>Locked</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.description} numberOfLines={2}>
                  {test.description}
                </Text>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Ionicons
                      name="help-circle-outline"
                      size={18}
                      color="#004741"
                    />
                    <Text style={styles.detailText}>
                      {test.questions} Questions
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color="#004741"
                    />
                    <Text style={styles.detailText}>
                      {test.duration} Minutes
                    </Text>
                  </View>

                  {attempts > 0 && (
                    <View style={styles.detailItem}>
                      <Ionicons
                        name="repeat-outline"
                        size={18}
                        color="#004741"
                      />
                      <Text style={styles.detailText}>
                        {attempts} Attempt
                        {attempts > 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                </View>

                {!unlocked && courseProgress.total > 0 && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressTitle}>
                        Course Progress
                      </Text>

                      <Text style={styles.progressPercentage}>
                        {courseProgress.percentage}%
                      </Text>
                    </View>

                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${courseProgress.percentage}%`,
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.progressText}>
                      {courseProgress.completed} of{" "}
                      {courseProgress.total} lessons completed
                    </Text>
                  </View>
                )}

                {bestScore !== null && (
                  <View style={styles.bestScoreBox}>
                    <View style={styles.scoreLeft}>
                      <Ionicons
                        name="trophy-outline"
                        size={20}
                        color="#004741"
                      />

                      <Text style={styles.bestScoreLabel}>
                        Best Score
                      </Text>
                    </View>

                    <Text style={styles.bestScore}>
                      {bestScore}%
                    </Text>
                  </View>
                )}

                {unlocked ? (
                  attempts > 0 ? (
                    <View style={styles.submittedActions}>
                      <View style={styles.submittedButton}>
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={19}
                          color="#004741"
                        />

                        <Text style={styles.submittedButtonText}>
                          Test Already Submitted
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.viewResultButton}
                        activeOpacity={0.8}
                        onPress={() => viewTestResult(test.id)}
                      >
                        <Ionicons
                          name="eye-outline"
                          size={19}
                          color="#FFFFFF"
                        />

                        <Text style={styles.viewResultButtonText}>
                          View Result
                        </Text>

                        <Ionicons
                          name="arrow-forward"
                          size={17}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.startButton}
                      activeOpacity={0.8}
                      onPress={() => startTest(test.id)}
                    >
                      <Ionicons
                        name="play"
                        size={20}
                        color="#FFFFFF"
                      />

                      <Text style={styles.startButtonText}>
                        Start Test
                      </Text>

                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  )
                ) : (
                  <View style={styles.lockedButton}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#FFFFFF"
                    />

                    <Text style={styles.lockedButtonText}>
                      Complete all lessons to unlock
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={styles.infoBox}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color="#004741"
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              How test unlocking works
            </Text>

            <Text style={styles.infoText}>
              1. Open a course and complete every lesson.
            </Text>

            <Text style={styles.infoText}>
              2. Once all lessons are completed, the test becomes unlocked.
            </Text>

            <Text style={styles.infoText}>
              3. Start the test and submit your answers to see your score.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F0EDE4",
  },

  container: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#000000",
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    color: "#004741",
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#004741",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },

  bannerIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  bannerContent: {
    flex: 1,
  },

  bannerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 5,
  },

  bannerText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#F0EDE4",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#004741",
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  statNumber: {
    fontSize: 21,
    fontWeight: "800",
    color: "#000000",
  },

  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#004741",
  },

  sectionHeader: {
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#000000",
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#004741",
  },

  testCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#004741",
  },

  lockedTestCard: {
    backgroundColor: "#F0EDE4",
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  testIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  lockedIcon: {
    backgroundColor: "#004741",
  },

  testInfo: {
    flex: 1,
    paddingRight: 8,
  },

  testTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#000000",
  },

  courseName: {
    marginTop: 4,
    fontSize: 12,
    color: "#004741",
    fontWeight: "600",
  },

  unlockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
  },

  unlockedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#004741",
  },

  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "#004741",
  },

  lockedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  description: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    color: "#004741",
  },

  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 16,
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  detailText: {
    fontSize: 12,
    color: "#004741",
  },

  progressSection: {
    marginTop: 18,
    padding: 14,
    backgroundColor: "#F0EDE4",
    borderRadius: 14,
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  progressTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000000",
  },

  progressPercentage: {
    fontSize: 13,
    fontWeight: "800",
    color: "#004741",
  },

  progressBarBackground: {
    height: 7,
    borderRadius: 10,
    backgroundColor: "#004741",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#004741",
  },

  progressText: {
    marginTop: 7,
    fontSize: 11,
    color: "#004741",
  },

  bestScoreBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    padding: 12,
    borderRadius: 13,
    backgroundColor: "#F0EDE4",
    borderWidth: 1,
    borderColor: "#004741",
  },

  scoreLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  bestScoreLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000000",
  },

  bestScore: {
    fontSize: 18,
    fontWeight: "800",
    color: "#004741",
  },

  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#004741",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
  },

  startButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  submittedActions: {
    gap: 10,
  },

  submittedButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    borderWidth: 1,
    borderColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  submittedButtonText: {
    marginLeft: 8,
    color: "#004741",
    fontSize: 13,
    fontWeight: "800",
  },

  viewResultButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  viewResultButtonText: {
    marginLeft: 8,
    marginRight: 8,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  lockedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#004741",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
  },

  lockedButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#004741",
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    color: "#004741",
  },

  infoBox: {
    flexDirection: "row",
    marginTop: 8,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F0EDE4",
    borderWidth: 1,
    borderColor: "#004741",
  },

  infoIcon: {
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#004741",
    marginBottom: 8,
  },

  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#004741",
    marginBottom: 4,
  },
});