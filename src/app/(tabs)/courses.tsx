
import { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useCourses, Course } from "../../context/CourseContext";
import { useAuth } from "../../context/AuthContext";

const ALLOWED_CLASSES = [6, 7, 8, 9, 10, 11, 12];

const categories = [
  "All",
  "SCIENCE",
  "SOCIAL SCIENCE",
  "MATHEMATICS",
  "HINDI",
  "ENGLISH",
  "SANSKRIT",
];

export default function CoursesScreen() {
  const { courses } = useCourses();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [bookmarked, setBookmarked] = useState<string[]>([]);

  const filteredCourses = useMemo(() => {
    const classCourses = courses.filter((course) => {
      if (user?.role === "admin") {
        return true;
      }

      const studentClass = Number(user?.classId);

      return (
        ALLOWED_CLASSES.includes(studentClass) &&
        Number(course.classId) === studentClass
      );
    });

    return classCourses.filter((course) => {
      const matchesCategory =
        selectedCategory === "All" ||
        course.category === selectedCategory;

      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        course.title.toLowerCase().includes(searchText) ||
        course.instructor.toLowerCase().includes(searchText) ||
        course.category.toLowerCase().includes(searchText);

      return matchesCategory && matchesSearch;
    });
  }, [
    courses,
    search,
    selectedCategory,
    user?.role,
    user?.classId,
  ]);

  const toggleBookmark = (id: string) => {
    setBookmarked((prev) =>
      prev.includes(id)
        ? prev.filter((courseId) => courseId !== id)
        : [...prev, id]
    );
  };

  const openCourse = (course: Course) => {
    router.push({
      pathname: "/course-details",
      params: {
        courseId: course.id,
        title: course.title,
        instructor: course.instructor,
        category: course.category,
        level: course.level,
        lessons: course.lessons.toString(),
        duration: course.duration,
        rating: course.rating,
        students: course.students,
        icon: course.icon,
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>Explore Courses</Text>
            <Text style={styles.subHeading}>
              Learn something new today
            </Text>
          </View>

          <View style={styles.courseCount}>
            <Text style={styles.courseCountText}>
              {filteredCourses.length}
            </Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search courses..."
            placeholderTextColor="#000000"
            style={styles.searchInput}
          />

          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={styles.clearSearch}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map((category) => {
            const active = selectedCategory === category;

            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.category,
                  active && styles.activeCategory,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    active && styles.activeCategoryText,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>All Courses</Text>

            <Text style={styles.resultText}>
              {filteredCourses.length} courses available
            </Text>
          </View>
        </View>

        {filteredCourses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔍</Text>

            <Text style={styles.emptyTitle}>
              No courses found
            </Text>

            <Text style={styles.emptyText}>
              Try another search or choose a different category.
            </Text>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSearch("");
                setSelectedCategory("All");
              }}
            >
              <Text style={styles.resetText}>
                Reset Filters
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredCourses.map((course) => {
            const isBookmarked = bookmarked.includes(course.id);

            return (
              <TouchableOpacity
                key={course.id}
                style={styles.courseCard}
                activeOpacity={0.85}
                onPress={() => openCourse(course)}
              >
                <View
                  style={[
                    styles.courseIcon,
                    {
                      backgroundColor: course.color,
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
                    <Text
                      style={[
                        styles.courseIconText,
                        {
                          color: course.iconColor,
                        },
                      ]}
                    >
                      {course.icon || "CO"}
                    </Text>
                  )}
                </View>

                <View style={styles.cardMain}>
                  <View style={styles.titleRow}>
                    <Text style={styles.courseTitle}>
                      {course.title}
                    </Text>

                    <TouchableOpacity
                      style={styles.bookmarkButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        toggleBookmark(course.id);
                      }}
                    >
                      <Text
                        style={[
                          styles.bookmark,
                          isBookmarked && styles.bookmarkActive,
                        ]}
                      >
                        {isBookmarked ? "★" : "☆"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.instructor}>
                    By {course.instructor}
                  </Text>

                  <View style={styles.badges}>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelText}>
                        {course.level}
                      </Text>
                    </View>

                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {course.category}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>
                      ⭐ {course.rating}
                    </Text>

                    <Text style={styles.meta}>
                      👥 {course.students}
                    </Text>

                    <Text style={styles.meta}>
                      ⏱ {course.duration}
                    </Text>
                  </View>

                  <View style={styles.bottomRow}>
                    <Text style={styles.lessonText}>
                      📚 {course.lessons} lessons
                    </Text>

                    <Text style={styles.viewText}>
                      View Course →
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EDE4",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  heading: {
    fontSize: 29,
    fontWeight: "800",
    color: "#000000",
  },

  subHeading: {
    fontSize: 13,
    color: "#004741",
    marginTop: 4,
  },

  courseCount: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#004741",
    justifyContent: "center",
    alignItems: "center",
  },

  courseCountText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  searchBox: {
    height: 52,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  searchIcon: {
    fontSize: 25,
    color: "#004741",
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#000000",
  },

  clearSearch: {
    fontSize: 24,
    color: "#004741",
    paddingHorizontal: 5,
  },

  categoryContainer: {
    paddingVertical: 18,
    gap: 9,
  },

  category: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#004741",
  },

  activeCategory: {
    backgroundColor: "#004741",
    borderColor: "#004741",
  },

  categoryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000000",
  },

  activeCategoryText: {
    color: "#FFFFFF",
  },

  sectionHeader: {
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000000",
  },

  resultText: {
    fontSize: 11,
    color: "#004741",
    marginTop: 3,
  },

  courseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#004741",
  },

  courseIcon: {
    width: 62,
    height: 62,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },

  courseIconText: {
    fontSize: 17,
    fontWeight: "900",
  },

  courseTeacherImage: {
    width: "100%",
    height: "100%",
    borderRadius: 17,
  },

  cardMain: {
    flex: 1,
    marginLeft: 13,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  courseTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: "#000000",
  },

  bookmarkButton: {
    paddingLeft: 8,
    paddingBottom: 4,
  },

  bookmark: {
    fontSize: 23,
    color: "#004741",
  },

  bookmarkActive: {
    color: "#004741",
  },

  instructor: {
    fontSize: 11,
    color: "#004741",
    marginTop: 4,
  },

  badges: {
    flexDirection: "row",
    gap: 7,
    marginTop: 8,
  },

  levelBadge: {
    backgroundColor: "#F0EDE4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  levelText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#000000",
  },

  categoryBadge: {
    backgroundColor: "#004741",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  categoryBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  metaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    flexWrap: "wrap",
  },

  meta: {
    fontSize: 10,
    color: "#004741",
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 11,
  },

  lessonText: {
    fontSize: 10,
    color: "#004741",
  },

  viewText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#004741",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#004741",
    marginTop: 10,
  },

  emptyIcon: {
    fontSize: 38,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
    marginTop: 12,
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#004741",
    textAlign: "center",
    marginTop: 6,
  },

  resetButton: {
    backgroundColor: "#004741",
    borderRadius: 11,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 16,
  },

  resetText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  bottomSpace: {
    height: 20,
  },
});
