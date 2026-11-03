import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { useCourses, Course } from "../../context/CourseContext";
import { useProgress } from "../../context/ProgressContext";
import { useProfilePhoto } from "../../context/ProfilePhotoContext";

const COLORS = {
  bg: "#F0EDE4",
  white: "#FFFFFF",

  navy: "#000000",
  text: "#000000",
  muted: "#004741",
  light: "#004741",
  border: "#004741",

  blue: "#004741",
  blueLight: "#F0EDE4",

  green: "#004741",
  greenLight: "#F0EDE4",

  orange: "#004741",
  orangeLight: "#F0EDE4",

  red: "#004741",
};

export default function HomeScreen() {
  const notificationScale = useRef(new Animated.Value(1)).current;
  const notificationRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.parallel([
          Animated.timing(notificationScale, {
            toValue: 1.12,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(notificationRotate, {
              toValue: -1,
              duration: 80,
              useNativeDriver: true,
            }),
            Animated.timing(notificationRotate, {
              toValue: 1,
              duration: 80,
              useNativeDriver: true,
            }),
            Animated.timing(notificationRotate, {
              toValue: -0.7,
              duration: 70,
              useNativeDriver: true,
            }),
            Animated.timing(notificationRotate, {
              toValue: 0,
              duration: 70,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(notificationScale, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [notificationScale, notificationRotate]);

  const notificationRotation = notificationRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-12deg", "0deg", "12deg"],
  });

  const streakScale = useRef(new Animated.Value(1)).current;
  const streakRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(streakScale, {
          toValue: 1.18,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(streakScale, {
            toValue: 0.95,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(streakRotate, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(streakScale, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(streakRotate, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(700),
      ])
    ).start();
  }, [streakScale, streakRotate]);

  const streakRotation = streakRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-6deg"],
  });

  const { user } = useAuth();
  const { courses } = useCourses();

  const {
    progress,
    getCompletedCount,
    getTotalLearningTime,
    getCurrentStreak,
  } = useProgress();

  const { photo } = useProfilePhoto();

  /* =====================================================
     USER
  ===================================================== */

  const firstName =
    user?.name?.split(" ")[0] || "Student";

  const avatarLetter =
    user?.name?.charAt(0)?.toUpperCase() || "S";

  const hour = new Date().getHours();

  const greeting =
    hour >= 5 && hour < 12
      ? "Good morning"
      : hour >= 12 && hour < 17
      ? "Good afternoon"
      : "Good evening";

  /* =====================================================
     COURSE PROGRESS
     
     IMPORTANT:
     Progress is now taken from backend ProgressContext.
     We do NOT depend on LessonContext anymore.
  ===================================================== */

  const getCourseProgress = (course: Course) => {
    const backendProgress =
      progress[course.id];

    /*
     * Backend totalLessons is the primary source.
     *
     * If backend progress is not available yet,
     * fall back to course.lessons.
     */

    const total =
      backendProgress?.totalLessons ??
      Number(course.lessons || 0);

    const completed =
      Math.min(
        backendProgress?.completedCount ??
          getCompletedCount(course.id),
        total
      );

    const percentage =
      total > 0
        ? Math.min(
            100,
            Math.round(
              (completed / total) * 100
            )
          )
        : 0;

    return {
      total,
      completed,
      progress: percentage,
    };
  };

  /* =====================================================
     OVERALL LEARNING PROGRESS
  ===================================================== */

  let overallTotalLessons = 0;
  let overallCompletedLessons = 0;

  courses.forEach((course) => {
    const backendProgress =
      progress[course.id];

    /*
     * Use backend totalLessons first.
     */

    const totalLessons =
      backendProgress?.totalLessons ??
      Number(course.lessons || 0);

    const completedLessons =
      Math.min(
        backendProgress?.completedCount ??
          getCompletedCount(course.id),
        totalLessons
      );

    overallTotalLessons += totalLessons;

    overallCompletedLessons +=
      completedLessons;
  });

  const overallPercentage =
    overallTotalLessons > 0
      ? Math.min(
          100,
          Math.round(
            (overallCompletedLessons /
              overallTotalLessons) *
              100
          )
        )
      : 0;

  /* =====================================================
     LEARNING TIME
  ===================================================== */

  const learningSeconds =
    getTotalLearningTime();

  const learningMinutes =
    Math.floor(
      learningSeconds / 60
    );

  const learningHours =
    Math.floor(
      learningMinutes / 60
    );

  const remainingMinutes =
    learningMinutes % 60;

  const learningTime =
    learningHours > 0
      ? `${learningHours}h ${remainingMinutes}m`
      : `${learningMinutes}m`;

  const streak =
    getCurrentStreak();

const filteredCourses = !user
  ? []
  : user.role === "admin"
  ? courses
  : courses.filter(
      (course) =>
        Number(course.classId) ===
        Number(user.classId)
    );
  /* =====================================================
     CONTINUE LEARNING
  ===================================================== */

const inProgressCourses =
  filteredCourses.filter((course) => {
    const courseProgress =
      getCourseProgress(course);

    return (
      courseProgress.completed > 0 &&
      courseProgress.completed <
        courseProgress.total
    );
  });

const notStartedCourses =
  filteredCourses.filter((course) => {
    const courseProgress =
      getCourseProgress(course);

    return (
      courseProgress.completed === 0
    );
  });

  const continueCourses = [
    ...inProgressCourses,
    ...notStartedCourses,
  ].slice(0, 8);

  /* =====================================================
     OPEN COURSE
  ===================================================== */

  const openCourse = (
    course: Course
  ) => {
    console.log("OPEN COURSE DATA:", course);
    console.log(
      "COURSE IMAGE BEFORE NAVIGATION:",
      course.image
    );

    router.push({
      pathname: "/course-details",
      params: {
        courseId: course.id,
        title: course.title,
        instructor:
          course.instructor,
        category: course.category,
        level: course.level,
        lessons:
          course.lessons.toString(),
        duration:
          course.duration,
        rating:
          course.rating,
        students:
          course.students,
        icon: course.icon,
        image: course.image || "",
      },
    });
  };

  /* =====================================================
     HEADER
  ===================================================== */

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          <View
            style={styles.userSection}
          >
            <View
              style={
                styles.avatarContainer
              }
            >
              {photo ? (
                <Image
                  source={{
                    uri: photo,
                  }}
                  style={
                    styles.avatarImage
                  }
                />
              ) : (
                <View
                  style={styles.avatar}
                >
                  <Text
                    style={
                      styles.avatarText
                    }
                  >
                    {avatarLetter}
                  </Text>
                </View>
              )}

              <View
                style={
                  styles.activeDot
                }
              />
            </View>

            <View
              style={styles.userText}
            >


<Text style={styles.userName}>
  {user?.name || "Student"}
</Text>

{user?.role !== "admin" && (
  <View style={styles.classBadge}>
    <Ionicons
      name="school-outline"
      size={12}
      color="#004741"
    />
    <Text style={styles.classText}>
      {user?.classId
        ? `Class ${user.classId}`
        : "Class not assigned"}
    </Text>
  </View>
)}
            </View>
          </View>

          <TouchableOpacity
            style={styles.notification}
            activeOpacity={0.8}
            onPress={() =>
              router.push(
                "/notifications"
              )
            }
          >
            <Animated.View
              style={{
                transform: [
                  { scale: notificationScale },
                  { rotate: notificationRotation },
                ],
              }}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={COLORS.navy}
              />
            </Animated.View>

            <View
              style={
                styles.notificationBadge
              }
            />
          </TouchableOpacity>
        </View>

        {/* =================================================
            HERO
        ================================================= */}

        <View style={styles.hero}>
          <View
            style={styles.heroContent}
          >
            <Text
              style={styles.heroSmall}
            >
              The Winner Ramanujan Classes
            </Text>

            <Text
              style={styles.heroTitle}
            >
              Learn today.{"\n"}
              Grow tomorrow.
            </Text>

            <Text
              style={styles.heroText}
            >
              Build your knowledge with
              structured lessons, tests
              and regular practice.
            </Text>

            <TouchableOpacity
              style={styles.heroButton}
              activeOpacity={0.85}
              onPress={() =>
                router.push(
                  "/courses"
                )
              }
            >
              <Text
                style={
                  styles.heroButtonText
                }
              >
                Explore Courses
              </Text>

              <Ionicons
                name="arrow-forward"
                size={15}
                color={COLORS.blue}
              />
            </TouchableOpacity>
          </View>

          <View
            style={styles.heroDecoration}
          >
            <View
              style={
                styles.heroCircleOne
              }
            />

            <View
              style={
                styles.heroCircleTwo
              }
            />

            <Ionicons
              name="school"
              size={48}
              color="rgba(255,255,255,0.9)"
              style={styles.heroSchool}
            />
          </View>
        </View>

        {/* =================================================
            QUICK STATS
        ================================================= */}

        <View
          style={styles.statsRow}
        >
          <View
            style={styles.statItem}
          >
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor:
                    COLORS.blueLight,
                },
              ]}
            >
              <Ionicons
                name="book-outline"
                size={18}
                color={COLORS.blue}
              />
            </View>

            <View>
              <Text
                style={styles.statValue}
              >
                {courses.length}
              </Text>

              <Text
                style={styles.statLabel}
              >
                Courses
              </Text>
            </View>
          </View>

          <View
            style={styles.statDivider}
          />

          <View
            style={styles.statItem}
          >
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor:
                    COLORS.greenLight,
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={COLORS.green}
              />
            </View>

            <View>
              <Text
                style={styles.statValue}
              >
                {
                  overallCompletedLessons
                }
              </Text>

              <Text
                style={styles.statLabel}
              >
                Lessons
              </Text>
            </View>
          </View>

          <View
            style={styles.statDivider}
          />

          <View
            style={styles.statItem}
          >
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor:
                    COLORS.orangeLight,
                },
              ]}
            >
              <Ionicons
                name="flame-outline"
                size={18}
                color={COLORS.orange}
              />
            </View>

            <View>
              <Text
                style={styles.statValue}
              >
                {streak}
              </Text>

              <Text
                style={styles.statLabel}
              >
                Day streak
              </Text>
            </View>
          </View>
        </View>

        {/* =================================================
            MY PROGRESS
        ================================================= */}

        <View
          style={styles.sectionHeader}
        >
          <View>
            <Text
              style={styles.sectionTitle}
            >
              My Progress
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Keep moving forward
            </Text>
          </View>

          <Text
            style={
              styles.progressPercent
            }
          >
            {overallPercentage}%
          </Text>
        </View>

        <View
          style={styles.progressCard}
        >
          <View
            style={styles.progressTop}
          >
            <View
              style={
                styles.progressIconBox
              }
            >
              <Ionicons
                name="trending-up-outline"
                size={23}
                color={COLORS.blue}
              />
            </View>

            <View
              style={styles.progressText}
            >
              <Text
                style={
                  styles.progressTitle
                }
              >
                Overall learning
                progress
              </Text>

              <Text
                style={
                  styles.progressDescription
                }
              >
                {
                  overallCompletedLessons
                }{" "}
                of{" "}
                {overallTotalLessons}{" "}
                lessons completed
              </Text>
            </View>
          </View>

          <View
            style={styles.progressTrack}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${overallPercentage}%`,
                },
              ]}
            />
          </View>

          <View
            style={styles.progressBottom}
          >
            <Text
              style={
                styles.progressBottomText
              }
            >
              Study time:{" "}
              {learningTime}
            </Text>

            <Text
              style={
                styles.progressBottomText
              }
            >
              {streak} day streak
            </Text>
          </View>
        </View>

        {/* =================================================
            CONTINUE LEARNING
        ================================================= */}

        {continueCourses.length >
          0 && (
          <>
            <View
              style={styles.sectionHeader}
            >
              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Continue Learning
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Pick up where you
                  left off
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  router.push(
                    "/courses"
                  )
                }
              >
                <Text
                  style={styles.seeAll}
                >
                  See all
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.continueScroll
              }
            >
              {continueCourses.map(
                (course) => {
                  const courseProgress =
                    getCourseProgress(
                      course
                    );

                  return (
                    <TouchableOpacity
                      key={course.id}
                      style={
                        styles.continueCard
                      }
                      activeOpacity={0.9}
                      onPress={() =>
                        openCourse(
                          course
                        )
                      }
                    >
                      <View
                        style={[
                          styles.continueImage,
                          {
                            backgroundColor:
                              course.color ||
                              COLORS.blueLight,
                          },
                        ]}
                      >
                        {course.image ? (
                          <Image
                            source={{ uri: course.image }}
                            style={styles.continueTeacherImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.continueFallback}>
                            <Ionicons
                              name="person"
                              size={30}
                              color={COLORS.blue}
                            />
                          </View>
                        )}
                      </View>

                      <View
                        style={
                          styles.continueInfo
                        }
                      >
                        <Text
                          style={
                            styles.continueCategory
                          }
                          numberOfLines={1}
                        >
                          {course.category ||
                            "COURSE"}
                        </Text>

                        <Text
                          style={
                            styles.continueTitle
                          }
                          numberOfLines={1}
                        >
                          {course.title}
                        </Text>

                        <Text
                          style={
                            styles.continueInstructor
                          }
                          numberOfLines={1}
                        >
                          {course.instructor}
                        </Text>

                        <View
                          style={
                            styles.continueProgressRow
                          }
                        >
                          <View
                            style={
                              styles.continueTrack
                            }
                          >
                            <View
                              style={[
                                styles.continueFill,
                                {
                                  width: `${courseProgress.progress}%`,
                                },
                              ]}
                            />
                          </View>

                          <Text
                            style={
                              styles.continuePercent
                            }
                          >
                            {
                              courseProgress.progress
                            }
                            %
                          </Text>
                        </View>
                      </View>

                      <View
                        style={
                          styles.playButton
                        }
                      >
                        <Ionicons
                          name="play"
                          size={14}
                          color={
                            COLORS.white
                          }
                        />
                      </View>
                    </TouchableOpacity>
                  );
                }
              )}
            </ScrollView>
          </>
        )}

        {/* =================================================
            POPULAR COURSES
        ================================================= */}

        <View
          style={styles.sectionHeader}
        >
          <View>
            <Text
              style={styles.sectionTitle}
            >
              Popular Courses
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Discover your next
              course
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              router.push("/courses")
            }
          >
            <Text
              style={styles.seeAll}
            >
              See all
            </Text>
          </TouchableOpacity>
        </View>

        {filteredCourses.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.courseScroll
            }
          >
            {filteredCourses
              .slice(0, 6)
              .map((course) => {
                const courseProgress =
                  getCourseProgress(
                    course
                  );

                return (
                  <TouchableOpacity
                    key={course.id}
                    style={
                      styles.courseCard
                    }
                    activeOpacity={0.9}
                    onPress={() =>
                      openCourse(
                        course
                      )
                    }
                  >
                    <View
                      style={[
                        styles.courseCover,
                        {
                          backgroundColor:
                            course.color ||
                            COLORS.blueLight,
                        },
                      ]}
                    >
                      {course.image ? (
                        <Image
                          source={{ uri: course.image }}
                          style={styles.courseTeacherImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.courseFallback}>
                          <Ionicons
                            name="person-outline"
                            size={42}
                            color={COLORS.blue}
                          />
                        </View>
                      )}

                      <View
                        style={
                          styles.levelBadge
                        }
                      >
                        <Text
                          style={
                            styles.levelText
                          }
                        >
                          {course.level ||
                            "COURSE"}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.courseContent
                      }
                    >
                      <Text
                        style={
                          styles.courseCategory
                        }
                        numberOfLines={1}
                      >
                        {course.category ||
                          "Learning"}
                      </Text>

                      <Text
                        style={
                          styles.courseTitle
                        }
                        numberOfLines={2}
                      >
                        {course.title}
                      </Text>

                      <View
                        style={
                          styles.courseInfo
                        }
                      >
                        <View
                          style={
                            styles.courseInfoItem
                          }
                        >
                          <Ionicons
                            name="star"
                            size={13}
                            color={
                              COLORS.orange
                            }
                          />

                          <Text
                            style={
                              styles.courseInfoText
                            }
                          >
                            {course.rating}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.courseInfoItem
                          }
                        >
                          <Ionicons
                            name="book-outline"
                            size={13}
                            color={
                              COLORS.muted
                            }
                          />

                          <Text
                            style={
                              styles.courseInfoText
                            }
                          >
                            {
                              courseProgress.total
                            }
                          </Text>
                        </View>

                        <View
                          style={
                            styles.courseInfoItem
                          }
                        >
                          <Ionicons
                            name="time-outline"
                            size={13}
                            color={
                              COLORS.muted
                            }
                          />

                          <Text
                            style={
                              styles.courseInfoText
                            }
                          >
                            {
                              course.duration
                            }
                          </Text>
                        </View>
                      </View>

                      <View
                        style={
                          styles.courseBottom
                        }
                      >
                        <Text
                          style={
                            styles.courseProgressText
                          }
                        >
                          {
                            courseProgress.progress
                          }
                          %
                        </Text>

                        <View
                          style={
                            styles.courseMiniTrack
                          }
                        >
                          <View
                            style={[
                              styles.courseMiniFill,
                              {
                                width: `${courseProgress.progress}%`,
                              },
                            ]}
                          />
                        </View>

                        <Ionicons
                          name="arrow-forward-circle"
                          size={21}
                          color={
                            COLORS.blue
                          }
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        )}

        {/* =================================================
            STUDY HABIT
        ================================================= */}

        <View
          style={styles.habitCard}
        >
          <View
            style={styles.habitIcon}
          >
            <Animated.View
              style={{
                transform: [
                  { scale: streakScale },
                  { rotate: streakRotation },
                ],
              }}
            >
              <Ionicons
                name="flame"
                size={25}
                color={COLORS.orange}
              />
            </Animated.View>
          </View>

          <View
            style={styles.habitContent}
          >
            <Text
              style={styles.habitTitle}
            >
              Keep your streak going
            </Text>

            <Text
              style={styles.habitText}
            >
              You have a {streak}-day
              learning streak. Complete
              a lesson today.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={COLORS.light}
          />
        </View>

        <View
          style={styles.bottomSpace}
        />
      </ScrollView>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 45,
    paddingBottom: 110,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  userSection: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarContainer: {
    width: 48,
    height: 48,
    position: "relative",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor:
      COLORS.blueLight,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 15,
  },

  avatarText: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.blue,
  },

  activeDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor:
      COLORS.green,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },

  userText: {
    marginLeft: 11,
  },

  greeting: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
  },

  userName: {
    fontSize: 19,
    color: COLORS.navy,
    fontWeight: "900",
    marginTop: 2,
  },

  classBadge: {
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "flex-start",
  marginTop: 4,
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 8,
  backgroundColor: "#FFFFFF",
  gap: 4,
},

classText: {
  fontSize: 10,
  fontWeight: "700",
  color: "#004741",
},

  notification: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor:
      COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  notificationBadge: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      COLORS.red,
    position: "absolute",
    right: 10,
    top: 9,
  },

  /* HERO */

  hero: {
    height: 190,
    borderRadius: 25,
    backgroundColor:
      COLORS.blue,
    marginTop: 22,
    overflow: "hidden",
    flexDirection: "row",
  },

  heroContent: {
    flex: 1,
    padding: 20,
    zIndex: 2,
  },

  heroSmall: {
    fontSize: 8,
    fontWeight: "900",
    color: "#BFDBFE",
    letterSpacing: 1.3,
  },

  heroTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "900",
    color: COLORS.white,
    marginTop: 7,
  },

  heroText: {
    fontSize: 10,
    lineHeight: 15,
    color: "#DBEAFE",
    marginTop: 7,
    maxWidth: 230,
  },

  heroButton: {
    alignSelf: "flex-start",
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor:
      COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
  },

  heroButtonText: {
    fontSize: 9,
    fontWeight: "900",
    color: COLORS.blue,
    marginRight: 6,
  },

  heroDecoration: {
    width: 115,
    height: "100%",
    position: "absolute",
    right: 0,
    top: 0,
  },

  heroCircleOne: {
    width: 155,
    height: 155,
    borderRadius: 80,
    backgroundColor:
      "rgba(255,255,255,0.08)",
    position: "absolute",
    right: -65,
    top: 8,
  },

  heroCircleTwo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor:
      "rgba(255,255,255,0.08)",
    position: "absolute",
    right: 10,
    bottom: -45,
  },

  heroSchool: {
    position: "absolute",
    right: 25,
    top: 67,
  },

  /* SEARCH */

  searchContainer: {
    height: 51,
    backgroundColor:
      COLORS.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    marginTop: 17,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    fontSize: 11,
    color: COLORS.text,
    marginHorizontal: 9,
    paddingVertical: 0,
  },

  /* STATS */

  statsRow: {
    height: 75,
    backgroundColor:
      COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
  },

  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },

  statValue: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.navy,
  },

  statLabel: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 1,
  },

  statDivider: {
    width: 1,
    height: 32,
    backgroundColor:
      COLORS.border,
  },

  /* SECTION */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent:
      "space-between",
    marginTop: 27,
    marginBottom: 11,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.navy,
  },

  sectionSubtitle: {
    fontSize: 9,
    color: COLORS.light,
    marginTop: 3,
  },

  seeAll: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.blue,
  },

  progressPercent: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.blue,
  },

  /* PROGRESS */

  progressCard: {
    backgroundColor:
      COLORS.white,
    borderRadius: 19,
    padding: 16,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  progressTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  progressIconBox: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor:
      COLORS.blueLight,
    alignItems: "center",
    justifyContent: "center",
  },

  progressText: {
    flex: 1,
    marginLeft: 11,
  },

  progressTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.navy,
  },

  progressDescription: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 3,
  },

  progressTrack: {
    height: 8,
    backgroundColor:
      "#E2E8F0",
    borderRadius: 10,
    marginTop: 14,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor:
      COLORS.blue,
    borderRadius: 10,
  },

  progressBottom: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    marginTop: 9,
  },

  progressBottomText: {
    fontSize: 8,
    color: COLORS.muted,
  },

  /* CONTINUE */

  continueScroll: {
    paddingRight: 10,
  },

  continueCard: {
    width: 300,
    backgroundColor:
      COLORS.white,
    borderRadius: 20,
    padding: 11,
    marginRight: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  continueImage: {
    width: 76,
    height: 76,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  continueEmoji: {
    fontSize: 32,
  },

  continueTeacherImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },

  continueFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.blueLight,
  },

  continueInfo: {
    flex: 1,
    marginLeft: 12,
  },

  continueCategory: {
    fontSize: 7,
    fontWeight: "900",
    color: COLORS.blue,
    letterSpacing: 0.7,
  },

  continueTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.navy,
    marginTop: 4,
  },

  continueInstructor: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },

  continueProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  continueTrack: {
    flex: 1,
    height: 5,
    borderRadius: 10,
    backgroundColor:
      "#E2E8F0",
    overflow: "hidden",
  },

  continueFill: {
    height: "100%",
    backgroundColor:
      COLORS.blue,
    borderRadius: 10,
  },

  continuePercent: {
    fontSize: 8,
    fontWeight: "900",
    color: COLORS.blue,
    marginLeft: 7,
  },

  playButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor:
      COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  /* COURSES */

  courseScroll: {
    paddingRight: 10,
  },

  courseCard: {
    width: 215,
    backgroundColor:
      COLORS.white,
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 12,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  courseCover: {
    height: 112,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  courseIcon: {
    fontSize: 39,
  },

  courseTeacherImage: {
    width: "100%",
    height: "100%",
  },

  courseFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.blueLight,
  },

  levelBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor:
      "rgba(255,255,255,0.9)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  levelText: {
    fontSize: 7,
    fontWeight: "900",
    color: COLORS.navy,
  },

  courseContent: {
    padding: 13,
  },

  courseCategory: {
    fontSize: 7,
    fontWeight: "900",
    color: COLORS.blue,
    textTransform:
      "uppercase",
    letterSpacing: 0.5,
  },

  courseTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
    color: COLORS.navy,
    marginTop: 4,
    minHeight: 38,
  },

  courseInfo: {
    flexDirection: "row",
    marginTop: 8,
  },

  courseInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 9,
  },

  courseInfoText: {
    fontSize: 8,
    color: COLORS.muted,
    marginLeft: 3,
  },

  courseBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor:
      COLORS.border,
  },

  courseProgressText: {
    fontSize: 8,
    fontWeight: "900",
    color: COLORS.blue,
    width: 30,
  },

  courseMiniTrack: {
    flex: 1,
    height: 5,
    borderRadius: 10,
    backgroundColor:
      "#E2E8F0",
    overflow: "hidden",
    marginRight: 8,
  },

  courseMiniFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor:
      COLORS.blue,
  },

  /* HABIT */

  habitCard: {
    backgroundColor:
      COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    padding: 15,
    marginTop: 27,
    flexDirection: "row",
    alignItems: "center",
  },

  habitIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor:
      COLORS.orangeLight,
    alignItems: "center",
    justifyContent: "center",
  },

  habitContent: {
    flex: 1,
    marginLeft: 11,
  },

  habitTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.navy,
  },

  habitText: {
    fontSize: 9,
    lineHeight: 14,
    color: COLORS.muted,
    marginTop: 3,
  },

  bottomSpace: {
    height: 20,
  },
});