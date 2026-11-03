import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import YoutubePlayer from "react-native-youtube-iframe";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Lesson,
  useLessons,
} from "../context/LessonContext";
import { useNotifications } from "../context/NotificationContext";
import { useProgress } from "../context/ProgressContext";
import { useTests } from "../context/TestContext";

const getYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
};

export default function LessonScreen() {
  const params = useLocalSearchParams<{
    courseId?: string;
    lessonId?: string;
    title?: string;
    duration?: string;
    description?: string;
    videoUrl?: string;
    notesUrl?: string;
  }>();

  const courseId = params.courseId || "";
  const lessonId = params.lessonId || "";

  const { loadCourseLessons } = useLessons();

  const { markLessonComplete, isLessonCompleted, addLearningTime } =
    useProgress();

  const { addNotification } = useNotifications();
  const { tests } = useTests();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);

  /*
   * Load this course's lessons directly into local state.
   * Keep the effect dependent only on courseId so it cannot
   * repeatedly run when the context function is recreated.
   */
  useEffect(() => {
    let mounted = true;

    const fetchLessons = async () => {
      if (!courseId) {
        if (mounted) {
          setLessons([]);
          setLessonsLoading(false);
        }
        return;
      }

      if (mounted) {
        setLessonsLoading(true);
      }

      try {
        const result = await loadCourseLessons(courseId);

        if (mounted) {
          setLessons(result);
        }
      } catch {
        if (mounted) {
          setLessons([]);
        }
      } finally {
        if (mounted) {
          setLessonsLoading(false);
        }
      }
    };

    fetchLessons();

    return () => {
      mounted = false;
    };
  }, [courseId]);

  const currentIndex = lessons.findIndex(
    (lesson) => lesson.id === lessonId
  );

  const currentLesson =
    currentIndex >= 0 ? lessons[currentIndex] : undefined;

  const title =
    currentLesson?.title || params.title || "Lesson";

  const duration =
    currentLesson?.duration || params.duration || "";

  const description =
    currentLesson?.description ||
    params.description ||
    "";

  const finalVideoUrl =
    currentLesson?.videoUrl ||
    params.videoUrl ||
    "";

  const youtubeVideoId = getYouTubeVideoId(finalVideoUrl);
  const isYouTubeVideo = Boolean(youtubeVideoId);

  const notesUrl =
    currentLesson?.notesUrl ||
    params.notesUrl ||
    "";

  const completed = isLessonCompleted(
    courseId,
    lessonId
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [courseCompleted, setCourseCompleted] =
    useState(false);

  const [completionHandled, setCompletionHandled] =
    useState(false);

  const lastPositionRef = useRef(0);
  const unsavedSecondsRef = useRef(0);
  const youtubePlayerRef = useRef<any>(null);

  const addLearningTimeRef =
    useRef(addLearningTime);

  useEffect(() => {
    addLearningTimeRef.current =
      addLearningTime;
  }, [addLearningTime]);

  const saveWatchTime = async () => {
    const seconds = Math.floor(
      unsavedSecondsRef.current
    );

    if (seconds <= 0 || !courseId) {
      return;
    }

    unsavedSecondsRef.current = 0;

    await addLearningTimeRef.current(
      courseId,
      seconds
    );
  };

  const trackVideoTime = (
    currentTime: number
  ) => {
    const previousTime =
      lastPositionRef.current;

    if (
      currentTime > previousTime &&
      currentTime - previousTime <= 6
    ) {
      unsavedSecondsRef.current +=
        currentTime - previousTime;
    }

    lastPositionRef.current =
      currentTime;

    if (
      unsavedSecondsRef.current >= 10
    ) {
      saveWatchTime();
    }
  };

  /*
   * Start the player without a source.
   * The MongoDB video URL is loaded asynchronously below.
   */
  const player = useVideoPlayer(
    null,
    (player) => {
      player.loop = false;
      player.timeUpdateEventInterval = 5;
    }
  );

  /*
   * Load regular MP4/video URLs with expo-video.
   * YouTube URLs are handled by react-native-youtube-iframe below.
   */
  useEffect(() => {
    let cancelled = false;

    const loadVideo = async () => {
      if (!finalVideoUrl || isYouTubeVideo) {
        return;
      }

      try {
        await player.replaceAsync(finalVideoUrl);

        if (!cancelled) {
          setIsPlaying(false);
          lastPositionRef.current = 0;
          unsavedSecondsRef.current = 0;
        }
      } catch (error) {
        console.log("Video loading error:", error);

        if (!cancelled) {
          setIsPlaying(false);
        }
      }
    };

    loadVideo();

    return () => {
      cancelled = true;
    };
  }, [finalVideoUrl, isYouTubeVideo, player]);

  useEffect(() => {
    const timeUpdateSubscription =
      player.addListener(
        "timeUpdate",
        (event) => {
          trackVideoTime(
            event.currentTime
          );
        }
      );

    const playingSubscription =
      player.addListener(
        "playingChange",
        (event) => {
          setIsPlaying(
            event.isPlaying
          );

          if (!event.isPlaying) {
            saveWatchTime();
          }
        }
      );

    const endSubscription =
      player.addListener(
        "playToEnd",
        () => {
          saveWatchTime();
        }
      );

    return () => {
      timeUpdateSubscription.remove();
      playingSubscription.remove();
      endSubscription.remove();

      saveWatchTime();
    };
  }, [player]);

  // YouTube iframe does not emit expo-video timeUpdate events.
  // Poll its current playback time while it is playing so learning time is tracked.
  useEffect(() => {
    if (!isYouTubeVideo || !isPlaying) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const currentTime = await youtubePlayerRef.current?.getCurrentTime();
        if (typeof currentTime === "number") {
          trackVideoTime(currentTime);
        }
      } catch (error) {
        console.log("YouTube time tracking error:", error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isYouTubeVideo, isPlaying]);

  const togglePlay = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const getRelatedTest = () => {
    return tests.find(
      (test) =>
        test.courseId === courseId
    );
  };

  const checkCourseCompletion = () => {
    if (lessons.length === 0) {
      return false;
    }

    return lessons.every((lesson) =>
      isLessonCompleted(
        courseId,
        lesson.id
      )
    );
  };

  const handleCourseCompleted =
    async () => {
      if (completionHandled) {
        return;
      }

      const allCompleted =
        checkCourseCompletion();

      if (!allCompleted) {
        return;
      }

      setCourseCompleted(true);
      setCompletionHandled(true);

      const relatedTest =
        getRelatedTest();

      await addNotification(
        "Course Completed 🎉",
        relatedTest
          ? "Congratulations! You completed the course. Your final test is now unlocked."
          : "Congratulations! You completed the course.",
        "course"
      );

      if (relatedTest) {
        Alert.alert(
          "Course Completed 🎉",
          "Congratulations! You completed all lessons. Your final test is now unlocked.",
          [
            {
              text: "Later",
              style: "cancel",
            },
            {
              text: "Take Test",
              onPress: () => {
                router.push({
                  pathname: "/test",
                  params: {
                    testId:
                      relatedTest.id,
                  },
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Course Completed 🎉",
          "Congratulations! You have completed all lessons of this course."
        );
      }
    };

  const handleMarkComplete =
    async () => {
      await saveWatchTime();

      if (!completed) {
        await markLessonComplete(
          courseId,
          lessonId
        );

        await addNotification(
          "Lesson Completed 🎉",
          `You completed "${title}". Keep learning!`,
          "lesson"
        );

        const isLastLesson =
          currentIndex ===
          lessons.length - 1;

        if (isLastLesson) {
          setTimeout(() => {
            handleCourseCompleted();
          }, 150);
        } else {
          Alert.alert(
            "Lesson Completed",
            "Great! Your progress has been updated."
          );
        }
      } else {
        const allCompleted =
          checkCourseCompletion();

        if (allCompleted) {
          setCourseCompleted(true);

          const relatedTest =
            getRelatedTest();

          if (relatedTest) {
            Alert.alert(
              "Course Completed 🎉",
              "You have completed all lessons. Your final test is ready.",
              [
                {
                  text: "Later",
                  style: "cancel",
                },
                {
                  text: "Take Test",
                  onPress: () => {
                    router.push({
                      pathname: "/test",
                      params: {
                        testId:
                          relatedTest.id,
                      },
                    });
                  },
                },
              ]
            );
          }
        }
      }
    };

  const openTest = () => {
    const relatedTest =
      getRelatedTest();

    if (!relatedTest) {
      Alert.alert(
        "Test Not Available",
        "There is no test available for this course yet."
      );

      return;
    }

    router.push({
      pathname: "/test",
      params: {
        testId: relatedTest.id,
      },
    });
  };

  const openLesson = (
    index: number
  ) => {
    const lesson = lessons[index];

    if (!lesson) {
      return;
    }

saveWatchTime();

if (isYouTubeVideo) {
  setIsPlaying(false);
} else {
  player.pause();
}

    router.replace({
      pathname: "/lesson",
      params: {
        courseId:
          lesson.courseId,
        lessonId: lesson.id,
        title: lesson.title,
        duration:
          lesson.duration,
        description:
          lesson.description,
        videoUrl:
          lesson.videoUrl,
      },
    });
  };

  const goPrevious = () => {
    if (currentIndex > 0) {
      openLesson(
        currentIndex - 1
      );
    }
  };

  const goNext = () => {
    if (
      currentIndex <
      lessons.length - 1
    ) {
      openLesson(
        currentIndex + 1
      );
    }
  };

  const hasPrevious =
    currentIndex > 0;

  const hasNext =
    currentIndex >= 0 &&
    currentIndex <
      lessons.length - 1;

  const completedLessons =
    lessons.filter((lesson) =>
      isLessonCompleted(
        courseId,
        lesson.id
      )
    ).length;

  const progress =
    lessons.length > 0
      ? Math.round(
          (completedLessons /
            lessons.length) *
            100
        )
      : 0;

  const allLessonsCompleted =
    lessons.length > 0 &&
    completedLessons ===
      lessons.length;

  const relatedTest =
    getRelatedTest();

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            saveWatchTime();
            if (isYouTubeVideo) {
              youtubePlayerRef.current?.pauseVideo();
            } else {
              player.pause();
            }
            router.back();
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#004741"
          />
        </TouchableOpacity>

        <View
          style={styles.headerCenter}
        >
          <Text
            style={styles.headerSmall}
          >
            NOW LEARNING
          </Text>

          <Text
            style={styles.headerTitle}
            numberOfLines={1}
          >
            Lesson
          </Text>
        </View>

        <View
          style={styles.headerButton}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={23}
            color="#000000"
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        <View style={styles.videoContainer}>
          {isYouTubeVideo && youtubeVideoId ? (
            <YoutubePlayer
              ref={youtubePlayerRef}
              height={240}
              videoId={youtubeVideoId}
              play={isPlaying}
              onChangeState={(state) => {
                if (state === "playing") {
                  setIsPlaying(true);
                } else if (
                  state === "paused" ||
                  state === "ended" ||
                  state === "unstarted"
                ) {
                  setIsPlaying(false);
                  saveWatchTime();
                }
              }}
              onReady={() => {
                setIsPlaying(false);
                lastPositionRef.current = 0;
                unsavedSecondsRef.current = 0;
              }}
              onError={(error) => {
                console.log("YouTube player error:", error);
                setIsPlaying(false);
                Alert.alert(
                  "Unable to play video",
                  "This YouTube video may be private, unavailable, or have embedding disabled."
                );
              }}
              webViewProps={{
                androidLayerType: "hardware",
              }}
            />
          ) : finalVideoUrl ? (
            <>
              <VideoView
                player={player}
                style={styles.video}
                nativeControls
                contentFit="contain"
              />

              <TouchableOpacity
                style={[
                  styles.playButton,
                  isPlaying && styles.playButtonPlaying,
                ]}
                onPress={togglePlay}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={28}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noVideo}>
              <View style={styles.noVideoIcon}>
                <Ionicons
                  name="videocam-off-outline"
                  size={38}
                  color="#000000"
                />
              </View>

              <Text style={styles.noVideoTitle}>
                Video not available
              </Text>

              <Text style={styles.noVideoText}>
                You can still read the lesson details below.
              </Text>
            </View>
          )}
        </View>

        <View
          style={styles.mainContent}
        >
          <View
            style={styles.lessonTopRow}
          >
            <View
              style={styles.lessonBadge}
            >
              <Ionicons
                name="book-outline"
                size={15}
                color="#004741"
              />

              <Text
                style={
                  styles.lessonBadgeText
                }
              >
                {currentIndex >= 0
                  ? `Lesson ${
                      currentIndex + 1
                    }`
                  : "Lesson"}
              </Text>
            </View>

            {duration ? (
              <View
                style={
                  styles.durationBadge
                }
              >
                <Ionicons
                  name="time-outline"
                  size={15}
                  color="#000000"
                />

                <Text
                  style={
                    styles.durationText
                  }
                >
                  {duration}
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={styles.title}
          >
            {title}
          </Text>

          {description ? (
            <Text
              style={
                styles.description
              }
            >
              {description}
            </Text>
          ) : null}

          {notesUrl ? (
            <TouchableOpacity
              style={styles.notesButton}
              onPress={async () => {
                try {
                  const supported = await Linking.canOpenURL(
                    notesUrl
                  );

                  if (!supported) {
                    Alert.alert(
                      "Unable to Open Notes",
                      "This notes link cannot be opened on your device."
                    );
                    return;
                  }

                  await Linking.openURL(notesUrl);
                } catch {
                  Alert.alert(
                    "Unable to Open Notes",
                    "Please check the notes URL and try again."
                  );
                }
              }}
              activeOpacity={0.85}
            >
              <View style={styles.notesIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={22}
                  color="#FFFFFF"
                />
              </View>

              <View style={styles.notesContent}>
                <Text style={styles.notesTitle}>
                  View Notes
                </Text>
                <Text style={styles.notesSubtitle}>
                  Open the lesson PDF notes
                </Text>
              </View>

              <Ionicons
                name="open-outline"
                size={21}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          ) : null}

          <View
            style={styles.progressCard}
          >
            <View
              style={
                styles.progressHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.progressTitle
                  }
                >
                  Course Progress
                </Text>

                <Text
                  style={
                    styles.progressSubtitle
                  }
                >
                  {completedLessons} of{" "}
                  {lessons.length}{" "}
                  lessons completed
                </Text>
              </View>

              <Text
                style={
                  styles.progressPercentage
                }
              >
                {progress}%
              </Text>
            </View>

            <View
              style={
                styles.progressTrack
              }
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                  },
                ]}
              />
            </View>
          </View>

          {allLessonsCompleted && (
            <View
              style={
                styles.courseCompletedCard
              }
            >
              <View
                style={
                  styles.courseCompletedIcon
                }
              >
                <Ionicons
                  name="trophy"
                  size={28}
                  color="#000000"
                />
              </View>

              <View
                style={
                  styles.courseCompletedContent
                }
              >
                <Text
                  style={
                    styles.courseCompletedTitle
                  }
                >
                  Course Completed 🎉
                </Text>

                <Text
                  style={
                    styles.courseCompletedText
                  }
                >
                  Congratulations! You
                  have completed all
                  lessons of this course.
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.completeButton,
              completed &&
                styles.completedButton,
            ]}
            onPress={
              handleMarkComplete
            }
            activeOpacity={0.85}
          >
            <View
              style={styles.completeIcon}
            >
              <Ionicons
                name={
                  completed
                    ? "checkmark"
                    : "checkmark-circle-outline"
                }
                size={22}
                color="#FFFFFF"
              />
            </View>

            <Text
              style={
                styles.completeButtonText
              }
            >
              {completed
                ? "Lesson Completed"
                : "Mark as Complete"}
            </Text>

            {!completed && (
              <Ionicons
                name="arrow-forward"
                size={19}
                color="#FFFFFF"
              />
            )}
          </TouchableOpacity>

          {allLessonsCompleted &&
            relatedTest && (
              <TouchableOpacity
                style={
                  styles.takeTestButton
                }
                onPress={openTest}
                activeOpacity={0.85}
              >
                <View
                  style={
                    styles.takeTestIcon
                  }
                >
                  <Ionicons
                    name="document-text"
                    size={23}
                    color="#FFFFFF"
                  />
                </View>

                <View
                  style={
                    styles.takeTestContent
                  }
                >
                  <Text
                    style={
                      styles.takeTestTitle
                    }
                  >
                    Take Final Test
                  </Text>

                  <Text
                    style={
                      styles.takeTestSubtitle
                    }
                  >
                    Test your knowledge
                    of this course
                  </Text>
                </View>

                <Ionicons
                  name="arrow-forward"
                  size={21}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            )}

          {allLessonsCompleted &&
            !relatedTest && (
              <View
                style={styles.noTestCard}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={23}
                  color="#004741"
                />

                <View
                  style={
                    styles.noTestContent
                  }
                >
                  <Text
                    style={
                      styles.noTestTitle
                    }
                  >
                    All lessons completed
                  </Text>

                  <Text
                    style={
                      styles.noTestText
                    }
                  >
                    No final test has been
                    added for this course
                    yet.
                  </Text>
                </View>
              </View>
            )}

          <View
            style={
              styles.navigationContainer
            }
          >
            <TouchableOpacity
              style={[
                styles.navigationButton,
                !hasPrevious &&
                  styles.disabledButton,
              ]}
              disabled={!hasPrevious}
              onPress={
                goPrevious
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="chevron-back"
                size={21}
                color={
                  hasPrevious
                    ? "#004741"
                    : "#F0EDE4"
                }
              />

              <View>
                <Text
                  style={[
                    styles.navigationLabel,
                    !hasPrevious &&
                      styles.disabledText,
                  ]}
                >
                  PREVIOUS
                </Text>

                <Text
                  style={[
                    styles.navigationText,
                    !hasPrevious &&
                      styles.disabledText,
                  ]}
                >
                  Lesson
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navigationButton,
                styles.nextButton,
                !hasNext &&
                  styles.disabledButton,
              ]}
              disabled={!hasNext}
              onPress={goNext}
              activeOpacity={0.8}
            >
              <View>
                <Text
                  style={[
                    styles.navigationLabel,
                    styles.nextLabel,
                    !hasNext &&
                      styles.disabledText,
                  ]}
                >
                  NEXT
                </Text>

                <Text
                  style={[
                    styles.navigationText,
                    styles.nextText,
                    !hasNext &&
                      styles.disabledText,
                  ]}
                >
                  Lesson
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={21}
                color={
                  hasNext
                    ? "#FFFFFF"
                    : "#F0EDE4"
                }
              />
            </TouchableOpacity>
          </View>

          <View
            style={styles.lessonsSection}
          >
            <View
              style={styles.sectionHeader}
            >
              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Course Content
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  {lessons.length} lessons
                </Text>
              </View>

              <View
                style={
                  styles.completedCount
                }
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color="#004741"
                />

                <Text
                  style={
                    styles.completedCountText
                  }
                >
                  {completedLessons} done
                </Text>
              </View>
            </View>

            {lessonsLoading ? (
              <View
                style={
                  styles.emptyContainer
                }
              >
                <View
                  style={
                    styles.emptyIcon
                  }
                >
                  <Ionicons
                    name="cloud-download-outline"
                    size={34}
                    color="#000000"
                  />
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  Loading lessons...
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  Fetching lessons from the server.
                </Text>
              </View>
            ) : lessons.length === 0 ? (
              <View
                style={
                  styles.emptyContainer
                }
              >
                <View
                  style={
                    styles.emptyIcon
                  }
                >
                  <Ionicons
                    name="book-outline"
                    size={34}
                    color="#000000"
                  />
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  No lessons available
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  This course doesn't have
                  any lessons yet.
                </Text>
              </View>
            ) : (
              lessons.map(
                (lesson, index) => {
                  const lessonCompleted =
                    isLessonCompleted(
                      courseId,
                      lesson.id
                    );

                  const isCurrent =
                    lesson.id ===
                    lessonId;

                  return (
                    <TouchableOpacity
                      key={lesson.id}
                      style={[
                        styles.lessonItem,
                        isCurrent &&
                          styles.currentLessonItem,
                      ]}
                      onPress={() =>
                        openLesson(index)
                      }
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.lessonIcon,
                          lessonCompleted &&
                            styles.lessonIconCompleted,
                          isCurrent &&
                            !lessonCompleted &&
                            styles.lessonIconCurrent,
                        ]}
                      >
                        {lessonCompleted ? (
                          <Ionicons
                            name="checkmark"
                            size={19}
                            color="#FFFFFF"
                          />
                        ) : (
                          <Text
                            style={[
                              styles.lessonIndex,
                              isCurrent &&
                                styles.lessonIndexCurrent,
                            ]}
                          >
                            {index + 1}
                          </Text>
                        )}
                      </View>

                      <View
                        style={
                          styles.lessonInfo
                        }
                      >
                        <Text
                          style={[
                            styles.lessonItemTitle,
                            isCurrent &&
                              styles.currentLessonTitle,
                          ]}
                          numberOfLines={2}
                        >
                          {lesson.title}
                        </Text>

                        <View
                          style={
                            styles.lessonMeta
                          }
                        >
                          <Ionicons
                            name="time-outline"
                            size={13}
                            color="#000000"
                          />

                          <Text
                            style={
                              styles.lessonDuration
                            }
                          >
                            {lesson.duration}
                          </Text>

                          {lessonCompleted && (
                            <>
                              <View
                                style={
                                  styles.metaDot
                                }
                              />

                              <Text
                                style={
                                  styles.completedText
                                }
                              >
                                Completed
                              </Text>
                            </>
                          )}
                        </View>
                      </View>

                      <Ionicons
                        name={
                          isCurrent
                            ? "play-circle"
                            : "chevron-forward"
                        }
                        size={24}
                        color={
                          isCurrent
                            ? "#004741"
                            : "#F0EDE4"
                        }
                      />
                    </TouchableOpacity>
                  );
                }
              )
            )}
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

  header: {
    height: 64,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE4",
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
  },

  headerSmall: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#000000",
  },

  headerTitle: {
    marginTop: 2,
    fontSize: 17,
    fontWeight: "800",
    color: "#004741",
  },

  content: {
    paddingBottom: 40,
  },

  videoContainer: {
    width: "100%",
    height: 240,
    backgroundColor: "#004741",
    position: "relative",
    overflow: "hidden",
  },

  video: {
    width: "100%",
    height: "100%",
  },

  playButton: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -31,
    marginTop: -31,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#004741",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 3,
  },

  playButtonPlaying: {
    opacity: 0.75,
  },

  noVideo: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  noVideoIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#004741",
    justifyContent: "center",
    alignItems: "center",
  },

  noVideoTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "700",
    color: "#F0EDE4",
  },

  noVideoText: {
    marginTop: 5,
    fontSize: 13,
    color: "#000000",
    textAlign: "center",
  },

  mainContent: {
    paddingHorizontal: 18,
    paddingTop: 22,
  },

  lessonTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  lessonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F0EDE4",
  },

  lessonBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#004741",
  },

  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  durationText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
  },

  title: {
    marginTop: 13,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: "800",
    color: "#004741",
  },

  description: {
    marginTop: 9,
    fontSize: 14,
    lineHeight: 22,
    color: "#000000",
  },

  notesButton: {
    minHeight: 68,
    marginTop: 16,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  notesIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  notesContent: {
    flex: 1,
  },

  notesTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  notesSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#F0EDE4",
  },

  progressCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#004741",
  },

  progressSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#000000",
  },

  progressPercentage: {
    fontSize: 19,
    fontWeight: "800",
    color: "#004741",
  },

  progressTrack: {
    height: 7,
    marginTop: 13,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#004741",
  },

  courseCompletedCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#F0EDE4",
    borderWidth: 1,
    borderColor: "#004741",
  },

  courseCompletedIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  courseCompletedContent: {
    flex: 1,
  },

  courseCompletedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#004741",
  },

  courseCompletedText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#000000",
  },

  completeButton: {
    height: 54,
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  completedButton: {
    backgroundColor: "#004741",
  },

  completeIcon: {
    justifyContent: "center",
    alignItems: "center",
  },

  completeButtonText: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  takeTestButton: {
    minHeight: 68,
    marginTop: 12,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  takeTestIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor:
      "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  takeTestContent: {
    flex: 1,
  },

  takeTestTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  takeTestSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#F0EDE4",
  },

  noTestCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 15,
    borderRadius: 15,
    backgroundColor: "#F0EDE4",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  noTestContent: {
    flex: 1,
    marginLeft: 10,
  },

  noTestTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#004741",
  },

  noTestText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 17,
    color: "#004741",
  },

  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },

  navigationButton: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EDE4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  nextButton: {
    backgroundColor: "#004741",
    borderColor: "#004741",
  },

  disabledButton: {
    backgroundColor: "#F0EDE4",
    borderColor: "#F0EDE4",
  },

  navigationLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#000000",
  },

  nextLabel: {
    color: "#F0EDE4",
  },

  navigationText: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: "#004741",
  },

  nextText: {
    color: "#FFFFFF",
  },

  disabledText: {
    color: "#F0EDE4",
  },

  lessonsSection: {
    marginTop: 28,
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
    marginTop: 3,
    fontSize: 12,
    color: "#000000",
  },

  completedCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F0EDE4",
  },

  completedCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#004741",
  },

  lessonItem: {
    minHeight: 76,
    marginBottom: 9,
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EDE4",
    flexDirection: "row",
    alignItems: "center",
  },

  currentLessonItem: {
    backgroundColor: "#F0EDE4",
    borderColor: "#004741",
  },

  lessonIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  lessonIconCompleted: {
    backgroundColor: "#004741",
  },

  lessonIconCurrent: {
    backgroundColor: "#004741",
  },

  lessonIndex: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },

  lessonIndexCurrent: {
    color: "#FFFFFF",
  },

  lessonInfo: {
    flex: 1,
    marginRight: 8,
  },

  lessonItemTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: "#000000",
  },

  currentLessonTitle: {
    color: "#004741",
  },

  lessonMeta: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  lessonDuration: {
    fontSize: 11,
    color: "#000000",
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#F0EDE4",
    marginHorizontal: 2,
  },

  completedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#004741",
  },

  emptyContainer: {
    padding: 30,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },

  emptyText: {
    marginTop: 5,
    fontSize: 13,
    color: "#000000",
    textAlign: "center",
  },
});