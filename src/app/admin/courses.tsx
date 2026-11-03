import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  useCourses,
  Course,
} from "../../context/CourseContext";

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const CLASSES = [
  6,
  7,
  8,
  9,
  10,
  11,
  12,
];

const LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

export default function ManageCourses() {
  const {
    courses,
    addCourse,
    updateCourse,
    deleteCourse,
    uploadCourseImage,
  } = useCourses();

  /*
  |--------------------------------------------------------------------------
  | SCREEN STATE
  |--------------------------------------------------------------------------
  */

  const [selectedClass, setSelectedClass] =
    useState<number | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | FORM STATE
  |--------------------------------------------------------------------------
  */

  const [title, setTitle] =
    useState("");

  const [instructor, setInstructor] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [level, setLevel] =
    useState("Beginner");
const [duration, setDuration] =
    useState("");

  const [selectedImage, setSelectedImage] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | CLASS COURSE FILTER
  |--------------------------------------------------------------------------
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
  |--------------------------------------------------------------------------
  | SEARCH FILTER
  |--------------------------------------------------------------------------
  */

  const filteredCourses = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return classCourses;
    }

    return classCourses.filter(
      (course) =>
        course.title
          .toLowerCase()
          .includes(query) ||
        course.instructor
          .toLowerCase()
          .includes(query) ||
        course.category
          .toLowerCase()
          .includes(query)
    );
  }, [classCourses, search]);

  /*
  |--------------------------------------------------------------------------
  | CLASS COURSE COUNT
  |--------------------------------------------------------------------------
  */

  const getClassCourseCount = (
    classId: number
  ) => {
    return courses.filter(
      (course) =>
        Number(course.classId) ===
        classId
    ).length;
  };

  /*
  |--------------------------------------------------------------------------
  | RESET FORM
  |--------------------------------------------------------------------------
  */

  const resetForm = () => {
    setTitle("");
    setInstructor("");
    setCategory("");
    setLevel("Beginner");
setDuration("");
    setSelectedImage("");
    setEditingId(null);
    setShowForm(false);
    setSaving(false);
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN CLASS
  |--------------------------------------------------------------------------
  */

  const openClass = (
    classId: number
  ) => {
    setSelectedClass(classId);
    setSearch("");
    resetForm();
  };

  /*
  |--------------------------------------------------------------------------
  | BACK TO CLASS GRID
  |--------------------------------------------------------------------------
  */

  const backToClasses = () => {
    resetForm();
    setSearch("");
    setSelectedClass(null);
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN ADD COURSE
  |--------------------------------------------------------------------------
  */

  const openAddForm = () => {
    if (!selectedClass) {
      return;
    }

    setEditingId(null);

    setTitle("");
    setInstructor("");
    setCategory("");
    setLevel("Beginner");
setDuration("");
    setSelectedImage("");

    setShowForm(true);
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN EDIT COURSE
  |--------------------------------------------------------------------------
  */

  const openEditForm = (
    course: Course
  ) => {
    setEditingId(course.id);

    setTitle(course.title);

    setInstructor(
      course.instructor
    );

    setCategory(
      course.category
    );

    setLevel(
      course.level
    );
setDuration(
      course.duration
    );

    setSelectedImage(
      course.image || ""
    );

    /*
     * Make sure the edit screen
     * belongs to its actual class.
     */
    setSelectedClass(
      Number(course.classId)
    );

    setShowForm(true);
  };

  /*
  |--------------------------------------------------------------------------
  | PICK TEACHER / COURSE PHOTO
  |--------------------------------------------------------------------------
  */

  const pickTeacherPhoto =
    async () => {
      try {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Permission Required",
            "Please allow photo library permission to select a teacher photo."
          );

          return;
        }

        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes: [
                "images",
              ],

              allowsEditing: true,

              aspect: [1, 1],

              quality: 0.8,
            }
          );

        if (
          result.canceled ||
          !result.assets?.length
        ) {
          return;
        }

        setSelectedImage(
          result.assets[0].uri
        );
      } catch (error) {
        console.log(
          "Image picker error:",
          error
        );

        Alert.alert(
          "Error",
          "Unable to select photo."
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | SAVE COURSE
  |--------------------------------------------------------------------------
  */

  const handleSave =
    async () => {
      if (!selectedClass) {
        Alert.alert(
          "Class Required",
          "Please select a class first."
        );

        return;
      }

      if (
        !title.trim() ||
        !instructor.trim() ||
        !category.trim() ||
        !duration.trim()
      ) {
        Alert.alert(
          "Missing Information",
          "Please fill all course fields."
        );

        return;
      }
setSaving(true);

      try {
        /*
         * IMPORTANT:
         * classId is automatically taken
         * from the currently opened class.
         */
        const courseData = {
          title:
            title.trim(),

          instructor:
            instructor.trim(),

          category:
            category.trim(),

          level,
duration:
            duration.trim(),

          rating: "0",

          students: "0",

          image:
            editingId &&
            selectedImage.startsWith(
              "http"
            )
              ? selectedImage
              : "",

          icon: "",

          color:
            "#F0EDE4",

          iconColor:
            "#004741",

          classId:
            selectedClass,
        };

        /*
        |--------------------------------------------------------------------------
        | UPDATE
        |--------------------------------------------------------------------------
        */

        if (editingId) {
          const updated =
            await updateCourse(
              editingId,
              courseData
            );

          if (!updated) {
            Alert.alert(
              "Error",
              "Could not update course."
            );

            return;
          }

          /*
           * New image selected
           */
          if (
            selectedImage &&
            !selectedImage.startsWith(
              "http"
            )
          ) {
            const uploaded =
              await uploadCourseImage(
                editingId,
                selectedImage
              );

            if (!uploaded) {
              Alert.alert(
                "Warning",
                "Course updated, but photo upload failed."
              );

              resetForm();

              return;
            }
          }

          Alert.alert(
            "Success",
            "Course updated successfully."
          );

          resetForm();

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | CREATE
        |--------------------------------------------------------------------------
        */

        const createdCourseId =
          await addCourse(
            courseData
          );

        if (!createdCourseId) {
          Alert.alert(
            "Error",
            "Could not create course."
          );

          return;
        }

        /*
         * Upload selected image
         */
        if (selectedImage) {
          const uploaded =
            await uploadCourseImage(
              createdCourseId,
              selectedImage
            );

          if (!uploaded) {
            Alert.alert(
              "Warning",
              "Course created, but photo upload failed."
            );

            resetForm();

            return;
          }
        }

        Alert.alert(
          "Success",
          `Course added to Class ${selectedClass}.`
        );

        resetForm();
      } catch (error) {
        console.log(
          "Course save error:",
          error
        );

        Alert.alert(
          "Error",
          "Could not save course."
        );
      } finally {
        setSaving(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | DELETE COURSE
  |--------------------------------------------------------------------------
  */

  const handleDelete = (
    course: Course
  ) => {
    Alert.alert(
      "Delete Course",
      `Are you sure you want to delete "${course.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Delete",
          style: "destructive",

          onPress:
            async () => {
              try {
                const deleted =
                  await deleteCourse(
                    course.id
                  );

                if (deleted) {
                  Alert.alert(
                    "Success",
                    "Course deleted successfully."
                  );
                } else {
                  Alert.alert(
                    "Error",
                    "Could not delete course."
                  );
                }
              } catch {
                Alert.alert(
                  "Error",
                  "Could not delete course."
                );
              }
            },
        },
      ]
    );
  };

  /*
  |--------------------------------------------------------------------------
  | CLASS GRID SCREEN
  |--------------------------------------------------------------------------
  */

  if (!selectedClass) {
    return (
      <View
        style={styles.container}
      >
        {/* HEADER */}

        <View
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() =>
              router.back()
            }
            style={
              styles.backButton
            }
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color="#000000"
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerTextContainer
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              Manage Courses
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Organize courses class-wise
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.classContent
          }
        >
          {/* SUMMARY */}

          <View
            style={
              styles.summaryCard
            }
          >
            <View
              style={
                styles.summaryIcon
              }
            >
              <Ionicons
                name="library-outline"
                size={25}
                color="#FFFFFF"
              />
            </View>

            <View
              style={
                styles.summaryInfo
              }
            >
              <Text
                style={
                  styles.summaryTitle
                }
              >
                Course Library
              </Text>

              <Text
                style={
                  styles.summarySubtitle
                }
              >
                {courses.length} total courses across Classes 6–12
              </Text>
            </View>
          </View>

          {/* SECTION */}

          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Select Class
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Manage courses for each class
              </Text>
            </View>
          </View>

          {/* CLASS CARDS */}

          <View
            style={
              styles.classGrid
            }
          >
            {CLASSES.map(
              (classId) => {
                const count =
                  getClassCourseCount(
                    classId
                  );

                return (
                  <TouchableOpacity
                    key={classId}
                    activeOpacity={0.88}
                    onPress={() =>
                      openClass(
                        classId
                      )
                    }
                    style={
                      styles.classCard
                    }
                  >
                    <View
                      style={
                        styles.classTop
                      }
                    >
                      <View
                        style={
                          styles.classNumber
                        }
                      >
                        <Text
                          style={
                            styles.classNumberText
                          }
                        >
                          {classId}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#004741"
                      />
                    </View>

                    <Text
                      style={
                        styles.className
                      }
                    >
                      Class {classId}
                    </Text>

                    <Text
                      style={
                        styles.classCourseCount
                      }
                    >
                      {count}{" "}
                      {count === 1
                        ? "Course"
                        : "Courses"}
                    </Text>

                    <View
                      style={
                        styles.viewClassRow
                      }
                    >
                      <Text
                        style={
                          styles.viewClassText
                        }
                      >
                        View Class
                      </Text>

                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color="#004741"
                      />
                    </View>
                  </TouchableOpacity>
                );
              }
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CLASS DETAIL SCREEN
  |--------------------------------------------------------------------------
  */

  return (
    <View
      style={styles.container}
    >
      {/* HEADER */}

      <View
        style={styles.header}
      >
        <TouchableOpacity
          onPress={
            backToClasses
          }
          style={
            styles.backButton
          }
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#000000"
          />
        </TouchableOpacity>

        <View
          style={
            styles.headerTextContainer
          }
        >
          <Text
            style={
              styles.headerTitle
            }
          >
            Class {selectedClass}
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            {classCourses.length}{" "}
            {classCourses.length ===
            1
              ? "registered course"
              : "registered courses"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={
            openAddForm
          }
          style={
            styles.addHeaderButton
          }
        >
          <Ionicons
            name="add"
            size={23}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.addHeaderText
            }
          >
            Add
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.detailContent
        }
      >
        {/* CLASS SUMMARY */}

        <View
          style={
            styles.classSummaryCard
          }
        >
          <View
            style={
              styles.classSummaryLeft
            }
          >
            <View
              style={
                styles.classSummaryNumber
              }
            >
              <Text
                style={
                  styles.classSummaryNumberText
                }
              >
                {selectedClass}
              </Text>
            </View>

            <View>
              <Text
                style={
                  styles.classSummaryTitle
                }
              >
                Class {selectedClass} Courses
              </Text>

              <Text
                style={
                  styles.classSummaryText
                }
              >
                {classCourses.length}{" "}
                courses available
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={
              openAddForm
            }
            style={
              styles.smallAddButton
            }
          >
            <Ionicons
              name="add"
              size={19}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.smallAddText
              }
            >
              Add Course
            </Text>
          </TouchableOpacity>
        </View>

        {/* FORM */}

        {showForm && (
          <View
            style={
              styles.formCard
            }
          >
            <View
              style={
                styles.formHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.formTitle
                  }
                >
                  {editingId
                    ? "Edit Course"
                    : "Add New Course"}
                </Text>

                <Text
                  style={
                    styles.formSubtitle
                  }
                >
                  Class {selectedClass}
                </Text>
              </View>

              <TouchableOpacity
                onPress={
                  resetForm
                }
                style={
                  styles.closeButton
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color="#000000"
                />
              </TouchableOpacity>
            </View>

            {/* TEACHER PHOTO */}

            <Text
              style={styles.label}
            >
              Teacher Photo
            </Text>

            <TouchableOpacity
              onPress={
                pickTeacherPhoto
              }
              activeOpacity={0.85}
              style={
                styles.photoPicker
              }
            >
              {selectedImage ? (
                <Image
                  source={{
                    uri: selectedImage,
                  }}
                  style={
                    styles.photoPreview
                  }
                />
              ) : (
                <View
                  style={
                    styles.photoPlaceholder
                  }
                >
                  <View
                    style={
                      styles.cameraCircle
                    }
                  >
                    <Ionicons
                      name="camera-outline"
                      size={25}
                      color="#004741"
                    />
                  </View>

                  <Text
                    style={
                      styles.photoText
                    }
                  >
                    Add Teacher Photo
                  </Text>

                  <Text
                    style={
                      styles.photoSubText
                    }
                  >
                    JPG, PNG or WEBP
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {selectedImage && (
              <TouchableOpacity
                onPress={
                  pickTeacherPhoto
                }
                style={
                  styles.changePhotoButton
                }
              >
                <Ionicons
                  name="camera-outline"
                  size={17}
                  color="#004741"
                />

                <Text
                  style={
                    styles.changePhotoText
                  }
                >
                  Change Photo
                </Text>
              </TouchableOpacity>
            )}

            {/* COURSE TITLE */}

            <Text
              style={styles.label}
            >
              Course Title
            </Text>

            <TextInput
              value={title}
              onChangeText={
                setTitle
              }
              placeholder="Enter course title"
              placeholderTextColor="#000000"
              style={styles.input}
            />

            {/* INSTRUCTOR */}

            <Text
              style={styles.label}
            >
              Teacher Name
            </Text>

            <TextInput
              value={instructor}
              onChangeText={
                setInstructor
              }
              placeholder="Enter teacher name"
              placeholderTextColor="#000000"
              style={styles.input}
            />

            {/* SUBJECT / CATEGORY */}

            <Text
              style={styles.label}
            >
              Subject / Category
            </Text>

            <TextInput
              value={category}
              onChangeText={
                setCategory
              }
              placeholder="Example: Mathematics"
              placeholderTextColor="#000000"
              style={styles.input}
            />

            {/* CLASS */}

            <Text
              style={styles.label}
            >
              Assigned Class
            </Text>

            <View
              style={
                styles.assignedClassBox
              }
            >
              <View
                style={
                  styles.assignedClassIcon
                }
              >
                <Ionicons
                  name="school-outline"
                  size={21}
                  color="#FFFFFF"
                />
              </View>

              <View
                style={
                  styles.assignedClassInfo
                }
              >
                <Text
                  style={
                    styles.assignedClassTitle
                  }
                >
                  Class {selectedClass}
                </Text>

                <Text
                  style={
                    styles.assignedClassText
                  }
                >
                  Course will be visible to Class {selectedClass} students
                </Text>
              </View>
            </View>

            {/* LEVEL */}

            <Text
              style={styles.label}
            >
              Course Level
            </Text>

            <View
              style={
                styles.levelContainer
              }
            >
              {LEVELS.map(
                (item) => {
                  const active =
                    level === item;

                  return (
                    <TouchableOpacity
                      key={item}
                      activeOpacity={
                        0.8
                      }
                      onPress={() =>
                        setLevel(
                          item
                        )
                      }
                      style={[
                        styles.levelButton,
                        active &&
                          styles.levelButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.levelText,
                          active &&
                            styles.levelTextActive,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>


            {/* DURATION */}

            <Text
              style={styles.label}
            >
              Course Duration
            </Text>

            <TextInput
              value={duration}
              onChangeText={
                setDuration
              }
              placeholder="Example: 10h 30m"
              placeholderTextColor="#000000"
              style={styles.input}
            />

            {/* SAVE */}

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={saving}
              onPress={
                handleSave
              }
              style={[
                styles.saveButton,
                saving &&
                  styles.saveButtonDisabled,
              ]}
            >
              <Ionicons
                name={
                  editingId
                    ? "checkmark-circle-outline"
                    : "add-circle-outline"
                }
                size={21}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.saveButtonText
                }
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Course"
                  : "Add Course"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SEARCH */}

        <View
          style={
            styles.searchContainer
          }
        >
          <Ionicons
            name="search-outline"
            size={20}
            color="#004741"
          />

          <TextInput
            value={search}
            onChangeText={
              setSearch
            }
            placeholder="Search courses..."
            placeholderTextColor="#000000"
            style={
              styles.searchInput
            }
          />

          {search.length > 0 && (
            <TouchableOpacity
              onPress={() =>
                setSearch("")
              }
            >
              <Ionicons
                name="close-circle"
                size={20}
                color="#000000"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* SECTION HEADER */}

        <View
          style={
            styles.listHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Registered Courses
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Courses available for Class {selectedClass}
            </Text>
          </View>

          <View
            style={
              styles.countBadge
            }
          >
            <Text
              style={
                styles.countBadgeText
              }
            >
              {filteredCourses.length}
            </Text>
          </View>
        </View>

        {/* COURSE CARDS */}

        {filteredCourses.map(
          (course) => (
            <View
              key={course.id}
              style={
                styles.courseCard
              }
            >
              {/* IMAGE */}

              <View
                style={
                  styles.courseImageContainer
                }
              >
                {course.image ? (
                  <Image
                    source={{
                      uri: course.image,
                    }}
                    style={
                      styles.courseImage
                    }
                  />
                ) : (
                  <View
                    style={
                      styles.courseImagePlaceholder
                    }
                  >
                    <Ionicons
                      name="book-outline"
                      size={29}
                      color="#004741"
                    />
                  </View>
                )}
              </View>

              {/* COURSE INFO */}

              <View
                style={
                  styles.courseInfo
                }
              >
                <View
                  style={
                    styles.courseTopRow
                  }
                >
                  <View
                    style={
                      styles.classBadge
                    }
                  >
                    <Text
                      style={
                        styles.classBadgeText
                      }
                    >
                      Class{" "}
                      {course.classId}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.levelBadge
                    }
                  >
                    {course.level}
                  </Text>
                </View>

                <Text
                  style={
                    styles.courseTitle
                  }
                  numberOfLines={2}
                >
                  {course.title}
                </Text>

                <Text
                  style={
                    styles.instructor
                  }
                  numberOfLines={1}
                >
                  Teacher: {course.instructor}
                </Text>

                <View
                  style={
                    styles.metaRow
                  }
                >
                  <View
                    style={
                      styles.metaItem
                    }
                  >
                    <Ionicons
                      name="book-outline"
                      size={14}
                      color="#004741"
                    />

                    <Text
                      style={
                        styles.metaText
                      }
                    >
                      {course.lessons} lessons
                    </Text>
                  </View>

                  <View
                    style={
                      styles.metaItem
                    }
                  >
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color="#004741"
                    />

                    <Text
                      style={
                        styles.metaText
                      }
                    >
                      {course.duration}
                    </Text>
                  </View>
                </View>

                <Text
                  style={
                    styles.categoryText
                  }
                  numberOfLines={1}
                >
                  {course.category}
                </Text>
              </View>

              {/* ACTIONS */}

              <View
                style={
                  styles.actions
                }
              >
                <TouchableOpacity
                  activeOpacity={
                    0.75
                  }
                  onPress={() =>
                    openEditForm(
                      course
                    )
                  }
                  style={
                    styles.editButton
                  }
                >
                  <Ionicons
                    name="create-outline"
                    size={19}
                    color="#004741"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={
                    0.75
                  }
                  onPress={() =>
                    handleDelete(
                      course
                    )
                  }
                  style={
                    styles.deleteButton
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
          )
        )}

        {/* EMPTY */}

        {filteredCourses.length ===
          0 && (
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
                color="#004741"
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              {search
                ? "No Courses Found"
                : `No Courses for Class ${selectedClass}`}
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              {search
                ? "Try searching with another course name or subject."
                : "Add the first course for this class using the Add Course button."}
            </Text>

            {!search && (
              <TouchableOpacity
                onPress={
                  openAddForm
                }
                style={
                  styles.emptyAddButton
                }
              >
                <Ionicons
                  name="add"
                  size={19}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.emptyAddText
                  }
                >
                  Add Course
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles =
  StyleSheet.create({
    /*
    |--------------------------------------------------------------------------
    | COMMON
    |--------------------------------------------------------------------------
    */

    container: {
      flex: 1,
      backgroundColor:
        "#F0EDE4",
    },

    /*
    |--------------------------------------------------------------------------
    | HEADER
    |--------------------------------------------------------------------------
    */

    header: {
      flexDirection:
        "row",

      alignItems:
        "center",

      paddingHorizontal: 18,

      paddingTop: 45,

      paddingBottom: 17,

      backgroundColor:
        "#FFFFFF",

      borderBottomWidth: 1,

      borderBottomColor:
        "#F0EDE4",
    },

    backButton: {
      width: 42,

      height: 42,

      borderRadius: 13,

      backgroundColor:
        "#F0EDE4",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 12,
    },

    headerTextContainer: {
      flex: 1,
    },

    headerTitle: {
      fontSize: 21,

      fontWeight:
        "800",

      color:
        "#000000",

      letterSpacing:
        -0.3,
    },

    headerSubtitle: {
      marginTop: 3,

      fontSize: 12.5,

      color:
        "#000000",

      opacity: 0.65,
    },

    addHeaderButton: {
      height: 42,

      paddingHorizontal: 13,

      borderRadius: 13,

      backgroundColor:
        "#004741",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 4,
    },

    addHeaderText: {
      color:
        "#FFFFFF",

      fontSize: 13,

      fontWeight:
        "800",
    },

    /*
    |--------------------------------------------------------------------------
    | CLASS GRID
    |--------------------------------------------------------------------------
    */

    classContent: {
      padding: 18,

      paddingBottom: 40,
    },

    summaryCard: {
      backgroundColor:
        "#004741",

      borderRadius: 20,

      padding: 18,

      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 25,
    },

    summaryIcon: {
      width: 50,

      height: 50,

      borderRadius: 15,

      backgroundColor:
        "rgba(255,255,255,0.14)",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 13,
    },

    summaryInfo: {
      flex: 1,
    },

    summaryTitle: {
      color:
        "#FFFFFF",

      fontSize: 17,

      fontWeight:
        "800",
    },

    summarySubtitle: {
      color:
        "#FFFFFF",

      opacity: 0.78,

      fontSize: 12.5,

      marginTop: 4,
    },

    sectionHeader: {
      marginBottom: 14,
    },

    sectionTitle: {
      fontSize: 18,

      fontWeight:
        "800",

      color:
        "#000000",
    },

    sectionSubtitle: {
      fontSize: 12,

      color:
        "#000000",

      opacity: 0.58,

      marginTop: 3,
    },

    classGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      justifyContent:
        "space-between",
    },

    classCard: {
      width: "48.2%",

      backgroundColor:
        "#FFFFFF",

      borderRadius: 19,

      padding: 15,

      marginBottom: 13,

      borderWidth: 1,

      borderColor:
        "#F0EDE4",

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,

        height: 2,
      },

      shadowOpacity:
        0.07,

      shadowRadius:
        5,

      elevation: 2,
    },

    classTop: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      marginBottom: 12,
    },

    classNumber: {
      width: 48,

      height: 48,

      borderRadius: 15,

      backgroundColor:
        "#004741",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    classNumberText: {
      color:
        "#FFFFFF",

      fontSize: 20,

      fontWeight:
        "900",
    },

    className: {
      fontSize: 16,

      fontWeight:
        "800",

      color:
        "#000000",
    },

    classCourseCount: {
      fontSize: 12,

      color:
        "#000000",

      opacity: 0.58,

      marginTop: 3,
    },

    viewClassRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 13,

      paddingTop: 11,

      borderTopWidth: 1,

      borderTopColor:
        "#F0EDE4",
    },

    viewClassText: {
      flex: 1,

      color:
        "#004741",

      fontSize: 12,

      fontWeight:
        "800",
    },

    /*
    |--------------------------------------------------------------------------
    | CLASS DETAIL
    |--------------------------------------------------------------------------
    */

    detailContent: {
      padding: 17,

      paddingBottom: 45,
    },

    classSummaryCard: {
      backgroundColor:
        "#FFFFFF",

      borderRadius: 19,

      padding: 15,

      marginBottom: 17,

      borderWidth: 1,

      borderColor:
        "#F0EDE4",
    },

    classSummaryLeft: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    classSummaryNumber: {
      width: 50,

      height: 50,

      borderRadius: 15,

      backgroundColor:
        "#004741",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 12,
    },

    classSummaryNumberText: {
      color:
        "#FFFFFF",

      fontSize: 20,

      fontWeight:
        "900",
    },

    classSummaryTitle: {
      fontSize: 16,

      fontWeight:
        "800",

      color:
        "#000000",
    },

    classSummaryText: {
      fontSize: 12,

      color:
        "#000000",

      opacity: 0.55,

      marginTop: 3,
    },

    smallAddButton: {
      marginTop: 14,

      height: 42,

      borderRadius: 12,

      backgroundColor:
        "#004741",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 5,
    },

    smallAddText: {
      color:
        "#FFFFFF",

      fontSize: 13,

      fontWeight:
        "800",
    },

    /*
    |--------------------------------------------------------------------------
    | FORM
    |--------------------------------------------------------------------------
    */

    formCard: {
      backgroundColor:
        "#FFFFFF",

      borderRadius: 20,

      padding: 17,

      marginBottom: 19,

      borderWidth: 1,

      borderColor:
        "#F0EDE4",
    },

    formHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom: 17,
    },

    formTitle: {
      fontSize: 19,

      fontWeight:
        "800",

      color:
        "#000000",
    },

    formSubtitle: {
      fontSize: 12,

      color:
        "#004741",

      fontWeight:
        "700",

      marginTop: 3,
    },

    closeButton: {
      width: 36,

      height: 36,

      borderRadius: 11,

      backgroundColor:
        "#F0EDE4",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    label: {
      fontSize: 13,

      fontWeight:
        "800",

      color:
        "#000000",

      marginBottom: 7,

      marginTop: 13,
    },

    input: {
      height: 48,

      borderWidth: 1,

      borderColor:
        "#D8D4CB",

      borderRadius: 12,

      paddingHorizontal: 13,

      fontSize: 14,

      color:
        "#000000",

      backgroundColor:
        "#FFFFFF",
    },

    /*
    |--------------------------------------------------------------------------
    | PHOTO
    |--------------------------------------------------------------------------
    */

    photoPicker: {
      width: "100%",

      height: 155,

      borderRadius: 16,

      overflow:
        "hidden",

      borderWidth: 1,

      borderColor:
        "#D8D4CB",

      borderStyle:
        "dashed",

      backgroundColor:
        "#F0EDE4",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    photoPreview: {
      width: "100%",

      height: "100%",

      resizeMode:
        "cover",
    },

    photoPlaceholder: {
      alignItems:
        "center",

      justifyContent:
        "center",
    },

    cameraCircle: {
      width: 48,

      height: 48,

      borderRadius: 16,

      backgroundColor:
        "#FFFFFF",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 8,
    },

    photoText: {
      fontSize: 14,

      fontWeight:
        "800",

      color:
        "#000000",
    },

    photoSubText: {
      fontSize: 11,

      color:
        "#000000",

      opacity: 0.55,

      marginTop: 3,
    },

    changePhotoButton: {
      alignSelf:
        "center",

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,

      marginTop: 8,
    },

    changePhotoText: {
      color:
        "#004741",

      fontSize: 12,

      fontWeight:
        "800",
    },

    /*
    |--------------------------------------------------------------------------
    | ASSIGNED CLASS
    |--------------------------------------------------------------------------
    */

    assignedClassBox: {
      flexDirection:
        "row",

      alignItems:
        "center",

      padding: 12,

      borderRadius: 14,

      backgroundColor:
        "#F0EDE4",

      borderWidth: 1,

      borderColor:
        "#D8D4CB",
    },

    assignedClassIcon: {
      width: 42,

      height: 42,

      borderRadius: 12,

      backgroundColor:
        "#004741",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 11,
    },

    assignedClassInfo: {
      flex: 1,
    },

    assignedClassTitle: {
      fontSize: 14,

      fontWeight:
        "800",

      color:
        "#000000",
    },

    assignedClassText: {
      fontSize: 11,

      color:
        "#000000",

      opacity: 0.58,

      marginTop: 2,

      lineHeight: 16,
    },

    /*
    |--------------------------------------------------------------------------
    | LEVEL
    |--------------------------------------------------------------------------
    */

    levelContainer: {
      flexDirection:
        "row",

      gap: 7,
    },

    levelButton: {
      flex: 1,

      minHeight: 42,

      borderRadius: 11,

      borderWidth: 1,

      borderColor:
        "#D8D4CB",

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal: 4,
    },

    levelButtonActive: {
      backgroundColor:
        "#004741",

      borderColor:
        "#004741",
    },

    levelText: {
      color:
        "#000000",

      fontSize: 11,

      fontWeight:
        "700",

      textAlign:
        "center",
    },

    levelTextActive: {
      color:
        "#FFFFFF",
    },

    /*
    |--------------------------------------------------------------------------
    | SAVE
    |--------------------------------------------------------------------------
    */

    saveButton: {
      height: 50,

      borderRadius: 13,

      backgroundColor:
        "#004741",

      marginTop: 20,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 7,
    },

    saveButtonDisabled: {
      opacity:
        0.55,
    },

    saveButtonText: {
      color:
        "#FFFFFF",

      fontSize: 14,

      fontWeight:
        "800",
    },

    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

    searchContainer: {
      height: 48,

      backgroundColor:
        "#FFFFFF",

      borderRadius: 13,

      borderWidth: 1,

      borderColor:
        "#D8D4CB",

      flexDirection:
        "row",

      alignItems:
        "center",

      paddingHorizontal: 13,

      marginBottom: 20,
    },

    searchInput: {
      flex: 1,

      height: 46,

      marginLeft: 8,

      fontSize: 13,

      color:
        "#000000",
    },

    /*
    |--------------------------------------------------------------------------
    | LIST HEADER
    |--------------------------------------------------------------------------
    */

    listHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom: 12,
    },

    countBadge: {
      minWidth: 32,

      height: 30,

      paddingHorizontal: 9,

      borderRadius: 10,

      backgroundColor:
        "#004741",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    countBadgeText: {
      color:
        "#FFFFFF",

      fontSize: 12,

      fontWeight:
        "900",
    },

    /*
    |--------------------------------------------------------------------------
    | COURSE CARD
    |--------------------------------------------------------------------------
    */

    courseCard: {
      backgroundColor:
        "#FFFFFF",

      borderRadius: 18,

      padding: 12,

      marginBottom: 12,

      flexDirection:
        "row",

      borderWidth: 1,

      borderColor:
        "#F0EDE4",

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,

        height: 2,
      },

      shadowOpacity:
        0.06,

      shadowRadius:
        4,

      elevation: 2,
    },

    courseImageContainer: {
      width: 78,

      height: 78,

      borderRadius: 14,

      overflow:
        "hidden",

      marginRight: 11,
    },

    courseImage: {
      width: "100%",

      height: "100%",

      resizeMode:
        "cover",
    },

    courseImagePlaceholder: {
      width: "100%",

      height: "100%",

      backgroundColor:
        "#F0EDE4",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    courseInfo: {
      flex: 1,

      minWidth: 0,
    },

    courseTopRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 5,
    },

    classBadge: {
      backgroundColor:
        "#004741",

      paddingHorizontal: 7,

      paddingVertical: 3,

      borderRadius: 6,

      marginRight: 6,
    },

    classBadgeText: {
      color:
        "#FFFFFF",

      fontSize: 9.5,

      fontWeight:
        "800",
    },

    levelBadge: {
      color:
        "#000000",

      opacity: 0.55,

      fontSize: 9.5,

      fontWeight:
        "700",

      flex: 1,
    },

    courseTitle: {
      fontSize: 14,

      fontWeight:
        "800",

      color:
        "#000000",

      lineHeight: 19,
    },

    instructor: {
      fontSize: 11.5,

      color:
        "#000000",

      opacity: 0.6,

      marginTop: 3,
    },

    metaRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 7,

      gap: 9,
    },

    metaItem: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 3,
    },

    metaText: {
      fontSize: 9.5,

      color:
        "#000000",

      opacity: 0.65,
    },

    categoryText: {
      fontSize: 10,

      color:
        "#004741",

      fontWeight:
        "700",

      marginTop: 5,
    },

    actions: {
      width: 38,

      marginLeft: 7,

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,
    },

    editButton: {
      width: 34,

      height: 34,

      borderRadius: 10,

      backgroundColor:
        "#F0EDE4",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    deleteButton: {
      width: 34,

      height: 34,

      borderRadius: 10,

      backgroundColor:
        "#F0EDE4",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    /*
    |--------------------------------------------------------------------------
    | EMPTY
    |--------------------------------------------------------------------------
    */

    emptyContainer: {
      backgroundColor:
        "#FFFFFF",

      borderRadius: 18,

      paddingHorizontal: 25,

      paddingVertical: 38,

      alignItems:
        "center",

      borderWidth: 1,

      borderColor:
        "#F0EDE4",
    },

    emptyIcon: {
      width: 66,

      height: 66,

      borderRadius: 20,

      backgroundColor:
        "#F0EDE4",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 13,
    },

    emptyTitle: {
      fontSize: 16,

      fontWeight:
        "800",

      color:
        "#000000",

      textAlign:
        "center",
    },

    emptyText: {
      fontSize: 12,

      color:
        "#000000",

      opacity: 0.58,

      textAlign:
        "center",

      lineHeight: 18,

      marginTop: 6,

      maxWidth: 280,
    },

    emptyAddButton: {
      marginTop: 17,

      height: 42,

      paddingHorizontal: 16,

      borderRadius: 12,

      backgroundColor:
        "#004741",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 5,
    },

    emptyAddText: {
      color:
        "#FFFFFF",

      fontSize: 12,

      fontWeight:
        "800",
    },
  });