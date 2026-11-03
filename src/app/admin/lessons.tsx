import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Lesson, useLessons } from "../../context/LessonContext";
import { useCourses } from "../../context/CourseContext";

const CLASSES = [6, 7, 8, 9, 10, 11, 12];

type LessonStatus = "draft" | "published";

export default function ManageLessons() {
  const { courses } = useCourses();

  const {
    getCourseLessons,
    loadCourseLessons,
    addLesson,
    updateLesson,
    deleteLesson,
  } = useLessons();

  /*
   * ------------------------------------------------------------
   * NAVIGATION STATE
   * ------------------------------------------------------------
   */

  const [selectedClass, setSelectedClass] =
    useState<number | null>(null);

  const [selectedCourseId, setSelectedCourseId] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  /*
   * ------------------------------------------------------------
   * FORM STATE
   * ------------------------------------------------------------
   */

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [duration, setDuration] =
    useState("");

  const [videoUrl, setVideoUrl] =
    useState("");

  const [notesUrl, setNotesUrl] =
    useState("");

  const [status, setStatus] =
    useState<LessonStatus>("draft");

  const [saving, setSaving] =
    useState(false);

  /*
   * ------------------------------------------------------------
   * COURSES FOR SELECTED CLASS
   * ------------------------------------------------------------
   */

  const classCourses = useMemo(() => {
    if (!selectedClass) {
      return [];
    }

    return courses.filter(
      (course) =>
        Number(course.classId) ===
        Number(selectedClass)
    );
  }, [courses, selectedClass]);

  /*
   * ------------------------------------------------------------
   * SELECTED COURSE
   * ------------------------------------------------------------
   */

  const selectedCourse = courses.find(
    (course) =>
      course.id === selectedCourseId
  );

  /*
   * ------------------------------------------------------------
   * LESSONS
   * ------------------------------------------------------------
   */

  const lessons = selectedCourseId
    ? getCourseLessons(selectedCourseId)
    : [];

  /*
   * ------------------------------------------------------------
   * LOAD LESSONS
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!selectedCourseId) {
      return;
    }

    loadCourseLessons(selectedCourseId);
  }, [selectedCourseId]);

  /*
   * ------------------------------------------------------------
   * RESET FORM
   * ------------------------------------------------------------
   */

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDuration("");
    setVideoUrl("");
    setNotesUrl("");
    setStatus("draft");
    setEditingId(null);
    setShowForm(false);
    setSaving(false);
  };

  /*
   * ------------------------------------------------------------
   * SELECT CLASS
   * ------------------------------------------------------------
   */

  const handleClassSelect = (
    classId: number
  ) => {
    resetForm();

    setSelectedClass(classId);
    setSelectedCourseId("");
  };

  /*
   * ------------------------------------------------------------
   * SELECT COURSE
   * ------------------------------------------------------------
   */

  const handleCourseSelect = (
    courseId: string
  ) => {
    resetForm();
    setSelectedCourseId(courseId);
  };

  /*
   * ------------------------------------------------------------
   * BACK BUTTON
   * ------------------------------------------------------------
   *
   * Form open:
   *   close form
   *
   * Course selected:
   *   go back to courses
   *
   * Class selected:
   *   go back to classes
   *
   * Nothing selected:
   *   leave admin lessons page
   */

  const handleBack = () => {
    if (showForm) {
      resetForm();
      return;
    }

    if (selectedCourseId) {
      setSelectedCourseId("");
      return;
    }

    if (selectedClass) {
      setSelectedClass(null);
      return;
    }

    router.back();
  };

  /*
   * ------------------------------------------------------------
   * ADD LESSON
   * ------------------------------------------------------------
   */

  const openAddForm = () => {
    if (!selectedCourseId) {
      Alert.alert(
        "Select Course",
        "Please select a course first."
      );
      return;
    }

    setEditingId(null);
    setTitle("");
    setDescription("");
    setDuration("");
    setVideoUrl("");
    setNotesUrl("");

    /*
     * New lessons are Draft by default.
     */
    setStatus("draft");

    setShowForm(true);
  };

  /*
   * ------------------------------------------------------------
   * EDIT LESSON
   * ------------------------------------------------------------
   */

  const openEditForm = (
    lesson: Lesson
  ) => {
    setEditingId(lesson.id);

    setTitle(
      lesson.title || ""
    );

    setDescription(
      lesson.description || ""
    );

    setDuration(
      lesson.duration || ""
    );

    setVideoUrl(
      lesson.videoUrl || ""
    );

    setNotesUrl(
      lesson.notesUrl || ""
    );

    setStatus(
      (lesson as Lesson & {
        status?: LessonStatus;
      }).status === "published"
        ? "published"
        : "draft"
    );

    setShowForm(true);
  };

  /*
   * ------------------------------------------------------------
   * SAVE LESSON
   * ------------------------------------------------------------
   */

  const handleSave = async () => {
    if (!selectedCourseId) {
      Alert.alert(
        "Select Course",
        "Please select a course first."
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert(
        "Missing Title",
        "Please enter lesson title."
      );
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        "Missing Description",
        "Please enter lesson description."
      );
      return;
    }

    if (!duration.trim()) {
      Alert.alert(
        "Missing Duration",
        "Please enter lesson duration."
      );
      return;
    }

    if (!videoUrl.trim()) {
      Alert.alert(
        "Missing Video",
        "Please enter video URL."
      );
      return;
    }

    try {
      setSaving(true);

      const existingLesson =
        lessons.find(
          (lesson) =>
            lesson.id === editingId
        );

      /*
       * Backend automatically manages
       * order for new lessons.
       *
       * Existing lesson keeps its
       * current order.
       */
      const lessonData = {
        courseId: selectedCourseId,

        title:
          title.trim(),

        description:
          description.trim(),

        duration:
          duration.trim(),

        videoUrl:
          videoUrl.trim(),

        notesUrl:
          notesUrl.trim(),

        order: existingLesson?.order,

        status,
      };

      let success = false;

      if (editingId) {
        success =
          await updateLesson(
            editingId,
            lessonData
          );
      } else {
success = await addLesson(lessonData);
      }

      if (!success) {
        Alert.alert(
          "Error",
          editingId
            ? "Could not update lesson."
            : "Could not create lesson."
        );

        return;
      }

      Alert.alert(
        "Success",
        editingId
          ? "Lesson updated successfully."
          : "Lesson created successfully."
      );

      resetForm();

      /*
       * Refresh from backend
       */
      await loadCourseLessons(
        selectedCourseId
      );
    } catch (error) {
      console.log(
        "Lesson save error:",
        error
      );

      Alert.alert(
        "Error",
        "Something went wrong while saving lesson."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * DELETE LESSON
   * ------------------------------------------------------------
   */

  const handleDelete = (
    lessonId: string
  ) => {
    Alert.alert(
      "Delete Lesson",
      "Are you sure you want to delete this lesson?",
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
              const success =
                await deleteLesson(
                  lessonId
                );

              if (!success) {
                Alert.alert(
                  "Error",
                  "Could not delete lesson."
                );

                return;
              }

              Alert.alert(
                "Deleted",
                "Lesson deleted successfully."
              );

              await loadCourseLessons(
                selectedCourseId
              );
            } catch (error) {
              console.log(
                "Delete lesson error:",
                error
              );

              Alert.alert(
                "Error",
                "Something went wrong while deleting lesson."
              );
            }
          },
        },
      ]
    );
  };

  /*
   * ------------------------------------------------------------
   * CLASS SCREEN
   * ------------------------------------------------------------
   */

  const renderClassSelection = () => {
    return (
      <View>
        <View style={styles.pageIntro}>
          <View>
            <Text style={styles.sectionTitle}>
              Select Class
            </Text>

            <Text style={styles.sectionSubtitle}>
              Choose a class to manage its courses and lessons
            </Text>
          </View>
        </View>

        <View style={styles.classGrid}>
          {CLASSES.map((classId) => {
            const count =
              courses.filter(
                (course) =>
                  Number(course.classId) ===
                  classId
              ).length;

            return (
              <TouchableOpacity
                key={classId}
                style={styles.classCard}
                onPress={() =>
                  handleClassSelect(
                    classId
                  )
                }
                activeOpacity={0.8}
              >
                <View style={styles.classIcon}>
                  <Text style={styles.classIconText}>
                    {classId}
                  </Text>
                </View>

                <View style={styles.classInfo}>
                  <Text style={styles.classTitle}>
                    Class {classId}
                  </Text>

                  <Text style={styles.classSubtitle}>
                    {count}{" "}
                    {count === 1
                      ? "Course"
                      : "Courses"}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#000000"
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  /*
   * ------------------------------------------------------------
   * COURSE SCREEN
   * ------------------------------------------------------------
   */

  const renderCourseSelection = () => {
    return (
      <View>
        <View style={styles.pageIntro}>
          <View>
            <Text style={styles.sectionTitle}>
              Class {selectedClass} Courses
            </Text>

            <Text style={styles.sectionSubtitle}>
              Select a course to manage its lessons
            </Text>
          </View>
        </View>

        {classCourses.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="book-outline"
                size={32}
                color="#004741"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No Courses Found
            </Text>

            <Text style={styles.emptyText}>
              Create a course for Class{" "}
              {selectedClass} first.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() =>
                router.push(
                  "/admin/courses"
                )
              }
            >
              <Ionicons
                name="add"
                size={19}
                color="#FFFFFF"
              />

              <Text style={styles.primaryButtonText}>
                Manage Courses
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          classCourses.map(
            (course) => {
              const courseLessonCount =
                getCourseLessons(
                  course.id
                ).length;

              return (
                <TouchableOpacity
                  key={course.id}
                  style={styles.courseCard}
                  onPress={() =>
                    handleCourseSelect(
                      course.id
                    )
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.courseIcon}>
                    <Ionicons
                      name="book"
                      size={23}
                      color="#004741"
                    />
                  </View>

                  <View style={styles.courseInfo}>
                    <Text
                      style={styles.courseTitle}
                      numberOfLines={1}
                    >
                      {course.title}
                    </Text>

                    <Text
                      style={styles.courseDescription}
                      numberOfLines={1}
                    >
                      {courseLessonCount}{" "}
                      {courseLessonCount === 1
                        ? "Lesson"
                        : "Lessons"}
                    </Text>

                    <View style={styles.classBadge}>
                      <Text style={styles.classBadgeText}>
                        Class {selectedClass}
                      </Text>
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={21}
                    color="#000000"
                  />
                </TouchableOpacity>
              );
            }
          )
        )}
      </View>
    );
  };

  /*
   * ------------------------------------------------------------
   * LESSON SCREEN
   * ------------------------------------------------------------
   */

  const renderLessonScreen = () => {
    return (
      <View>
        <View style={styles.lessonTop}>
          <View>
            <Text style={styles.sectionTitle}>
              Course Lessons
            </Text>

            <Text style={styles.sectionSubtitle}>
              {lessons.length}{" "}
              {lessons.length === 1
                ? "Registered Lesson"
                : "Registered Lessons"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddForm}
            activeOpacity={0.8}
          >
            <Ionicons
              name="add"
              size={20}
              color="#FFFFFF"
            />

            <Text style={styles.addButtonText}>
              Add Lesson
            </Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formTitle}>
                  {editingId
                    ? "Edit Lesson"
                    : "Add New Lesson"}
                </Text>

                <Text style={styles.formSubtitle}>
                  {selectedCourse?.title}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={resetForm}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color="#000000"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>
              Lesson Title
            </Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter lesson title"
              placeholderTextColor="#000000"
              style={styles.input}
            />

            <Text style={styles.label}>
              Description
            </Text>

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Enter lesson description"
              placeholderTextColor="#000000"
              style={[
                styles.input,
                styles.textArea,
              ]}
              multiline
            />

            <Text style={styles.label}>
              Duration
            </Text>

            <TextInput
              value={duration}
              onChangeText={setDuration}
              placeholder="Example: 25 min"
              placeholderTextColor="#000000"
              style={styles.input}
            />

            <Text style={styles.label}>
              Video URL
            </Text>

            <TextInput
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="https://example.com/video.mp4"
              placeholderTextColor="#000000"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.label}>
              Notes / PDF URL
            </Text>

            <TextInput
              value={notesUrl}
              onChangeText={setNotesUrl}
              placeholder="https://example.com/notes.pdf"
              placeholderTextColor="#000000"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.label}>
              Lesson Status
            </Text>

            <View style={styles.statusRow}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  status === "draft" &&
                    styles.statusButtonActive,
                ]}
                onPress={() =>
                  setStatus("draft")
                }
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={
                    status === "draft"
                      ? "#FFFFFF"
                      : "#004741"
                  }
                />

                <Text
                  style={[
                    styles.statusText,
                    status === "draft" &&
                      styles.statusTextActive,
                  ]}
                >
                  Draft
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusButton,
                  status === "published" &&
                    styles.statusButtonActive,
                ]}
                onPress={() =>
                  setStatus("published")
                }
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={
                    status === "published"
                      ? "#FFFFFF"
                      : "#004741"
                  }
                />

                <Text
                  style={[
                    styles.statusText,
                    status === "published" &&
                      styles.statusTextActive,
                  ]}
                >
                  Published
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.orderInfo}>
              <View style={styles.orderIcon}>
                <Ionicons
                  name="list-outline"
                  size={18}
                  color="#004741"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.orderTitle}>
                  Lesson Order
                </Text>

                <Text style={styles.orderText}>
                  {editingId
                    ? `Current order: ${
                        lessons.find(
                          (lesson) =>
                            lesson.id ===
                            editingId
                        )?.order || 1
                      }`
                    : `Automatic — Lesson ${
                        lessons.length + 1
                      }`}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                saving &&
                  styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              <Ionicons
                name={
                  editingId
                    ? "save-outline"
                    : "add-circle-outline"
                }
                size={20}
                color="#FFFFFF"
              />

              <Text style={styles.saveButtonText}>
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Lesson"
                  : "Create Lesson"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {lessons.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="videocam-outline"
                size={32}
                color="#004741"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No Lessons Yet
            </Text>

            <Text style={styles.emptyText}>
              This course does not have any lessons.
            </Text>

            {!showForm && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={openAddForm}
              >
                <Ionicons
                  name="add"
                  size={19}
                  color="#FFFFFF"
                />

                <Text style={styles.primaryButtonText}>
                  Add First Lesson
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View>
            {lessons.map(
              (lesson, index) => {
                const lessonStatus =
                  (
                    lesson as Lesson & {
                      status?: LessonStatus;
                    }
                  ).status ===
                  "published"
                    ? "published"
                    : "draft";

                return (
                  <View
                    key={lesson.id}
                    style={styles.lessonCard}
                  >
                    <View style={styles.numberBox}>
                      <Text
                        style={
                          styles.numberText
                        }
                      >
                        {lesson.order ||
                          index + 1}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.lessonInfo
                      }
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

                        <View
                          style={[
                            styles.statusBadge,
                            lessonStatus ===
                              "published"
                              ? styles.publishedBadge
                              : styles.draftBadge,
                          ]}
                        >
                          <Text
                            style={
                              styles.statusBadgeText
                            }
                          >
                            {lessonStatus ===
                            "published"
                              ? "Published"
                              : "Draft"}
                          </Text>
                        </View>
                      </View>

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

                      <View
                        style={
                          styles.lessonMeta
                        }
                      >
                        <View
                          style={
                            styles.metaItem
                          }
                        >
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color="#000000"
                          />

                          <Text
                            style={
                              styles.metaText
                            }
                          >
                            {lesson.duration ||
                              "0 min"}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.metaItem
                          }
                        >
                          <Ionicons
                            name="videocam-outline"
                            size={14}
                            color="#004741"
                          />

                          <Text
                            style={[
                              styles.metaText,
                              styles.videoText,
                            ]}
                          >
                            Video
                          </Text>
                        </View>

                        {lesson.notesUrl ? (
                          <View
                            style={
                              styles.metaItem
                            }
                          >
                            <Ionicons
                              name="document-text-outline"
                              size={14}
                              color="#000000"
                            />

                            <Text
                              style={
                                styles.metaText
                              }
                            >
                              Notes
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    <View
                      style={styles.actions}
                    >
                      <TouchableOpacity
                        style={
                          styles.editButton
                        }
                        onPress={() =>
                          openEditForm(
                            lesson
                          )
                        }
                      >
                        <Ionicons
                          name="create-outline"
                          size={19}
                          color="#004741"
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={
                          styles.deleteButton
                        }
                        onPress={() =>
                          handleDelete(
                            lesson.id
                          )
                        }
                      >
                        <Ionicons
                          name="trash-outline"
                          size={19}
                          color="#000000"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }
            )}
          </View>
        )}
      </View>
    );
  };

  /*
   * ------------------------------------------------------------
   * MAIN RENDER
   * ------------------------------------------------------------
   */

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#000000"
          />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            Manage Lessons
          </Text>

          <Text style={styles.headerSubtitle}>
            Class-wise course lessons
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.content
        }
      >
        {!selectedClass &&
          renderClassSelection()}

        {selectedClass &&
          !selectedCourseId &&
          renderCourseSelection()}

        {selectedClass &&
          selectedCourseId &&
          renderLessonScreen()}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EDE4",
  },

  header: {
    paddingTop: 45,
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE4",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  headerInfo: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000000",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#000000",
    marginTop: 3,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  pageIntro: {
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000000",
  },

  sectionSubtitle: {
    fontSize: 12,
    color: "#000000",
    marginTop: 4,
    lineHeight: 17,
  },

  classGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  classCard: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 14,
    marginBottom: 12,
    minHeight: 105,
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  classIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#004741",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  classIconText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  classInfo: {
    flex: 1,
  },

  classTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
  },

  classSubtitle: {
    fontSize: 11,
    color: "#000000",
    marginTop: 3,
  },

  courseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 14,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  courseIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  courseInfo: {
    flex: 1,
    marginLeft: 13,
    marginRight: 8,
  },

  courseTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
  },

  courseDescription: {
    fontSize: 11,
    color: "#000000",
    marginTop: 4,
  },

  classBadge: {
    alignSelf: "flex-start",
    marginTop: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "#F0EDE4",
  },

  classBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#004741",
  },

  lessonTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  addButton: {
    height: 42,
    paddingHorizontal: 13,
    borderRadius: 11,
    backgroundColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  formTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#000000",
  },

  formSubtitle: {
    fontSize: 11,
    color: "#000000",
    marginTop: 3,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000000",
    marginTop: 13,
    marginBottom: 7,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 14,
    color: "#000000",
    backgroundColor: "#FFFFFF",
  },

  textArea: {
    height: 85,
    paddingTop: 12,
    textAlignVertical: "top",
  },

  statusRow: {
    flexDirection: "row",
    gap: 10,
  },

  statusButton: {
    flex: 1,
    height: 46,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#004741",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  statusButtonActive: {
    backgroundColor: "#004741",
  },

  statusText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#004741",
  },

  statusTextActive: {
    color: "#FFFFFF",
  },

  orderInfo: {
    marginTop: 15,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    flexDirection: "row",
    alignItems: "center",
  },

  orderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  orderTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#000000",
  },

  orderText: {
    fontSize: 11,
    color: "#000000",
    marginTop: 2,
  },

  saveButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#004741",
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  saveButtonDisabled: {
    opacity: 0.55,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  lessonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 13,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  numberBox: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  numberText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#004741",
  },

  lessonInfo: {
    flex: 1,
    marginLeft: 11,
    marginRight: 7,
  },

  lessonTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  lessonTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    color: "#000000",
  },

  statusBadge: {
    marginLeft: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },

  publishedBadge: {
    backgroundColor: "#004741",
  },

  draftBadge: {
    backgroundColor: "#F0EDE4",
    borderWidth: 1,
    borderColor: "#004741",
  },

  statusBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  lessonDescription: {
    fontSize: 10,
    lineHeight: 15,
    color: "#000000",
    marginTop: 5,
  },

  lessonMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 7,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  metaText: {
    fontSize: 10,
    color: "#000000",
  },

  videoText: {
    color: "#004741",
    fontWeight: "700",
  },

  actions: {
    gap: 7,
  },

  editButton: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  deleteButton: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 28,
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
    fontSize: 17,
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

  primaryButton: {
    height: 45,
    paddingHorizontal: 17,
    borderRadius: 11,
    backgroundColor: "#004741",
    marginTop: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  bottomSpace: {
    height: 30,
  },
});