import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useCourses } from "../context/CourseContext";
import { useLessons, Lesson } from "../context/LessonContext";
import { useProgress } from "../context/ProgressContext";

export default function CourseDetails() {
  const params = useLocalSearchParams();

  const courseId = String(params.courseId || "");

  // Get course from CourseContext
  const { courses } = useCourses();

  const currentCourse = courses.find(
    (course) => String(course.id) === courseId
  );

  // Course image
  // Navigation se image aaye to use karo,
  // otherwise CourseContext se image lo.
  const image = String(
    params.image || currentCourse?.image || ""
  );

  const title = String(
    params.title ||
      currentCourse?.title ||
      "Course"
  );

  const instructor = String(
    params.instructor ||
      currentCourse?.instructor ||
      "Instructor"
  );

  const category = String(
    params.category ||
      currentCourse?.category ||
      "Development"
  );

  const level = String(
    params.level ||
      currentCourse?.level ||
      "Beginner"
  );

  const duration = String(
    params.duration ||
      currentCourse?.duration ||
      "0h"
  );

  const rating = String(
    params.rating ??
      currentCourse?.rating ??
      "0"
  );

  const students = String(
    params.students ??
      currentCourse?.students ??
      "0"
  );

  const icon = String(
    params.icon ||
      currentCourse?.icon ||
      "CS"
  );

  // -----------------------------
  // Progress
  // -----------------------------

  const {
    isLessonCompleted,
    getCompletedCount,
    getProgressPercentage,
  } = useProgress();

  // -----------------------------
  // Lessons
  // -----------------------------

  const {
    getCourseLessons,
    loadCourseLessons,
  } = useLessons();

  useEffect(() => {
    if (courseId) {
      loadCourseLessons(courseId);
    }
  }, [courseId]);

  const lessons = getCourseLessons(courseId);

  const totalLessons = lessons.length;

  const completedCount = getCompletedCount(courseId);

  const progressPercentage =
    totalLessons > 0
      ? getProgressPercentage(
          courseId,
          totalLessons
        )
      : 0;

  // -----------------------------
  // Open lesson
  // -----------------------------

  const openLesson = (lesson: Lesson) => {
    router.push({
      pathname: "/lesson",
      params: {
        courseId,
        lessonId: lesson.id,
        title: lesson.title,
        duration: lesson.duration,
        videoUrl: lesson.videoUrl || "",
        description: lesson.description || "",
      },
    });
  };

  // -----------------------------
  // Continue learning
  // -----------------------------

  const continueLearning = () => {
    if (lessons.length === 0) {
      return;
    }

    const nextLesson =
      lessons.find(
        (lesson) =>
          !isLessonCompleted(
            courseId,
            lesson.id
          )
      ) || lessons[0];

    openLesson(nextLesson);
  };

  // -----------------------------
  // Level icon
  // -----------------------------

  const getLevelIcon = () => {
    if (
      level
        .toLowerCase()
        .includes("advanced")
    ) {
      return "rocket-outline" as const;
    }

    if (
      level
        .toLowerCase()
        .includes("intermediate")
    ) {
      return "trending-up-outline" as const;
    }

    return "sparkles-outline" as const;
  };



  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* ================================= */}
        {/* HEADER */}
        {/* ================================= */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#004741"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Course Details
          </Text>

          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.8}
          >
            <Ionicons
              name="bookmark-outline"
              size={21}
              color="#004741"
            />
          </TouchableOpacity>
        </View>

        {/* ================================= */}
        {/* COURSE HERO */}
        {/* ================================= */}

        <View style={styles.hero}>
          {/* Course Image */}

          {image.trim() !== "" ? (
            <Image
              source={{ uri: image }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={styles.heroImageFallback}
            >
              <Text style={styles.iconText}>
                {icon}
              </Text>
            </View>
          )}

          {/* Dark overlay */}

          <View
            pointerEvents="none"
            style={styles.heroOverlay}
          />

          {/* Hero content */}

          <View style={styles.heroContent}>
            {/* Level */}

            <View style={styles.heroTop}>
              <View style={styles.levelBadge}>
                <Ionicons
                  name={getLevelIcon()}
                  size={14}
                  color="#FFFFFF"
                />

                <Text style={styles.levelText}>
                  {level}
                </Text>
              </View>
            </View>

            {/* Bottom information */}

            <View style={styles.heroBottom}>
              <Text style={styles.categoryText}>
                {category}
              </Text>

              <Text
                style={styles.title}
                numberOfLines={3}
              >
                {title}
              </Text>

              <View
                style={styles.instructorRow}
              >
                <View
                  style={styles.instructorAvatar}
                >
                  <Ionicons
                    name="person"
                    size={15}
                    color="#FFFFFF"
                  />
                </View>

                <Text
                  style={styles.instructor}
                  numberOfLines={1}
                >
                  {instructor}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ================================= */}
        {/* COURSE INFO */}
        {/* ================================= */}

        <View style={styles.infoCard}>
          {/* Rating */}

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="star"
                size={18}
                color="#004741"
              />
            </View>

            <Text style={styles.infoValue}>
              {rating}
            </Text>

            <Text style={styles.infoLabel}>
              Rating
            </Text>
          </View>

          <View style={styles.infoDivider} />

          {/* Students */}

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="people-outline"
                size={18}
                color="#004741"
              />
            </View>

            <Text style={styles.infoValue}>
              {students}
            </Text>

            <Text style={styles.infoLabel}>
              Students
            </Text>
          </View>

          <View style={styles.infoDivider} />

          {/* Duration */}

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="time-outline"
                size={18}
                color="#004741"
              />
            </View>

            <Text style={styles.infoValue}>
              {duration}
            </Text>

            <Text style={styles.infoLabel}>
              Duration
            </Text>
          </View>
        </View>

        {/* ================================= */}
        {/* PROGRESS */}
        {/* ================================= */}

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View
              style={styles.progressHeadingRow}
            >
              <View style={styles.progressIcon}>
                <Ionicons
                  name="stats-chart-outline"
                  size={19}
                  color="#004741"
                />
              </View>

              <View>
                <Text
                  style={styles.progressTitle}
                >
                  Your Progress
                </Text>

                <Text
                  style={styles.progressSub}
                >
                  {completedCount} of{" "}
                  {totalLessons} lessons
                  completed
                </Text>
              </View>
            </View>

            <Text
              style={styles.progressPercent}
            >
              {progressPercentage}%
            </Text>
          </View>

          {/* Progress bar */}

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    Math.max(
                      progressPercentage,
                      0
                    ),
                    100
                  )}%`,
                },
              ]}
            />
          </View>

          <View style={styles.progressFooter}>
            <Text
              style={styles.progressFooterText}
            >
              {progressPercentage === 100
                ? "Course completed 🎉"
                : progressPercentage > 0
                ? "Keep going, you're doing great!"
                : "Start your learning journey"}
            </Text>

            <Text
              style={styles.progressFooterText}
            >
              {completedCount}/{totalLessons}
            </Text>
          </View>
        </View>

        {/* ================================= */}
        {/* COURSE CONTENT */}
        {/* ================================= */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text
                style={styles.sectionTitle}
              >
                Course Content
              </Text>

              <Text
                style={styles.sectionSubtitle}
              >
                Learn step by step
              </Text>
            </View>

            <View
              style={styles.lessonCountBadge}
            >
              <Text
                style={styles.lessonCount}
              >
                {totalLessons} Lessons
              </Text>
            </View>
          </View>

          {/* Empty lessons */}

          {lessons.length === 0 && (
            <View
              style={styles.emptyContainer}
            >
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="videocam-outline"
                  size={32}
                  color="#000000"
                />
              </View>

              <Text
                style={styles.emptyTitle}
              >
                No Lessons Available
              </Text>

              <Text
                style={styles.emptyText}
              >
                Lessons for this course
                haven't been added yet.
              </Text>
            </View>
          )}

          {/* Lessons */}

          {lessons.map(
            (lesson, index) => {
              const completed =
                isLessonCompleted(
                  courseId,
                  lesson.id
                );

              return (
                <TouchableOpacity
                  key={lesson.id}
                  style={[
                    styles.lessonCard,
                    completed &&
                      styles.completedLessonCard,
                  ]}
                  onPress={() =>
                    openLesson(lesson)
                  }
                  activeOpacity={0.75}
                >
                  {/* Number */}

                  <View
                    style={[
                      styles.lessonNumber,
                      completed &&
                        styles.completedNumber,
                    ]}
                  >
                    {completed ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color="#FFFFFF"
                      />
                    ) : (
                      <Text
                        style={
                          styles.lessonNumberText
                        }
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>

                  {/* Content */}

                  <View
                    style={styles.lessonContent}
                  >
                    <View
                      style={
                        styles.lessonTitleRow
                      }
                    >
                      <Text
                        style={
                          styles.lessonTitle
                        }
                        numberOfLines={2}
                      >
                        {lesson.title}
                      </Text>

                      {completed && (
                        <View
                          style={
                            styles.completedBadge
                          }
                        >
                          <Text
                            style={
                              styles.completedBadgeText
                            }
                          >
                            Done
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Meta */}

                    <View
                      style={styles.lessonMeta}
                    >
                      <View
                        style={styles.metaItem}
                      >
                        <Ionicons
                          name="play-circle-outline"
                          size={14}
                          color="#000000"
                        />

                        <Text
                          style={
                            styles.lessonDuration
                          }
                        >
                          {lesson.duration}
                        </Text>
                      </View>

                      <View
                        style={styles.metaDot}
                      />

                      <View
                        style={styles.metaItem}
                      >
                        <Ionicons
                          name="videocam-outline"
                          size={14}
                          color="#000000"
                        />

                        <Text
                          style={
                            styles.lessonDuration
                          }
                        >
                          Video Lesson
                        </Text>
                      </View>
                    </View>

                    {/* Description */}

                    {lesson.description ? (
                      <Text
                        style={
                          styles.lessonDescription
                        }
                        numberOfLines={2}
                      >
                        {lesson.description}
                      </Text>
                    ) : null}
                  </View>

                  {/* Arrow */}

                  <View
                    style={styles.lessonArrow}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#000000"
                    />
                  </View>
                </TouchableOpacity>
              );
            }
          )}
        </View>

        {/* ================================= */}
        {/* CONTINUE BUTTON */}
        {/* ================================= */}

        {lessons.length > 0 && (
          <View style={styles.bottomAction}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={continueLearning}
              activeOpacity={0.85}
            >
              <View
                style={styles.continueIcon}
              >
                <Ionicons
                  name={
                    progressPercentage ===
                    100
                      ? "refresh"
                      : "play"
                  }
                  size={17}
                  color="#004741"
                />
              </View>

              <Text
                style={styles.continueButtonText}
              >
                {completedCount === 0
                  ? "Start This Course"
                  : progressPercentage ===
                    100
                  ? "Review Course"
                  : "Continue Learning"}
              </Text>

              <Ionicons
                name="arrow-forward"
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EDE4",
  },

  scrollContent: {
    paddingTop: 28,
    paddingBottom: 24,
  },

  // -----------------------------
  // Header
  // -----------------------------

  header: {
    height: 68,
    paddingHorizontal: 18,
    backgroundColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE4",
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    borderColor: "#F0EDE4",
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // -----------------------------
  // Hero
  // -----------------------------

  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 245,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#004741",
    position: "relative",
  },

  heroImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    left: 0,
    top: 0,
  },

  heroImageFallback: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#004741",
  },

  heroOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor:
      "rgba(0, 0, 0, 0.42)",
  },

  heroContent: {
    position: "absolute",
    left: 22,
    right: 22,
    top: 22,
    bottom: 22,
    justifyContent: "space-between",
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },

  heroBottom: {
    width: "100%",
  },

  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor:
      "rgba(0, 71, 65, 0.78)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.18)",
  },

  levelText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  iconText: {
    fontSize: 42,
    fontWeight: "800",
    color: "#004741",
  },

  categoryText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#F0EDE4",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  title: {
    marginTop: 7,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  instructorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
  },

  instructorAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor:
      "rgba(0,71,65,0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.15)",
  },

  instructor: {
    marginLeft: 9,
    flex: 1,
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // -----------------------------
  // Info card
  // -----------------------------

  infoCard: {
    marginHorizontal: 18,
    marginTop: 14,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EDE4",
    flexDirection: "row",
    alignItems: "center",
  },

  infoItem: {
    flex: 1,
    alignItems: "center",
  },

  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },

  infoValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
  },

  infoLabel: {
    marginTop: 3,
    fontSize: 10,
    color: "#004741",
    fontWeight: "600",
  },

  infoDivider: {
    width: 1,
    height: 42,
    backgroundColor: "#F0EDE4",
  },

  // -----------------------------
  // Progress
  // -----------------------------

  progressCard: {
    marginHorizontal: 18,
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#004741",
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  progressHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  progressIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  progressTitle: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "800",
    color: "#004741",
  },

  progressSub: {
    marginLeft: 10,
    marginTop: 4,
    fontSize: 11,
    color: "#000000",
  },

  progressPercent: {
    fontSize: 20,
    fontWeight: "800",
    color: "#004741",
  },

  progressBar: {
    height: 9,
    marginTop: 17,
    backgroundColor: "#F0EDE4",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#004741",
    borderRadius: 10,
  },

  progressFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 9,
  },

  progressFooterText: {
    fontSize: 10,
    color: "#000000",
  },

  // -----------------------------
  // Course content
  // -----------------------------

  section: {
    paddingHorizontal: 18,
    marginTop: 25,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#004741",
  },

  sectionSubtitle: {
    fontSize: 11,
    color: "#000000",
    marginTop: 3,
  },

  lessonCountBadge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#004741",
    borderWidth: 0,
    borderColor: "#004741",
  },

  lessonCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // -----------------------------
  // Lesson
  // -----------------------------

  lessonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  completedLessonCard: {
    borderColor: "#004741",
    backgroundColor: "#F0EDE4",
  },

  lessonNumber: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  completedNumber: {
    backgroundColor: "#004741",
  },

  lessonNumberText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#004741",
  },

  lessonContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 7,
  },

  lessonTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  lessonTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    color: "#000000",
  },

  completedBadge: {
    marginLeft: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "#004741",
  },

  completedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  lessonMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  lessonDuration: {
    marginLeft: 4,
    fontSize: 10,
    color: "#000000",
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#000000",
    marginHorizontal: 7,
  },

  lessonDescription: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 15,
    color: "#000000",
  },

  lessonArrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  // -----------------------------
  // Empty state
  // -----------------------------

  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 13,
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: "#000000",
    textAlign: "center",
  },

  // -----------------------------
  // Bottom button
  // -----------------------------

  bottomAction: {
    paddingHorizontal: 18,
    marginTop: 8,
  },

  continueButton: {
    minHeight: 56,
    borderRadius: 17,
    backgroundColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    elevation: 3,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  continueIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  continueButtonText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  bottomSpace: {
    height: 20,
  },
});