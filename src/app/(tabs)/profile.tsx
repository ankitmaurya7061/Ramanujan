import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Image,
} from "react-native";
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { useTests } from "../../context/TestContext";
import { useCourses } from "../../context/CourseContext";
import { useProgress } from "../../context/ProgressContext";
import { useProfilePhoto } from "../../context/ProfilePhotoContext";
import { useAttendance } from "../../context/AttendanceContext";

export default function ProfileScreen() {
  const { user, logout, updateUser, changePassword } = useAuth();
  const { results } = useTests();
  const { courses } = useCourses();
  const { progress, getTotalLearningTime, getCompletedCount } = useProgress();

  const classCourses = courses.filter((course) => {
  if (user?.role === "admin") {
    return true;
  }

  const studentClass = Number(user?.classId);

  return (
    Number.isInteger(studentClass) &&
    studentClass >= 6 &&
    studentClass <= 12 &&
    Number(course.classId) === studentClass
  );
});

  const {
    getStudentCoursePercentage,
    refreshAttendance,
  } = useAttendance();

  useFocusEffect(
    useCallback(() => {
      refreshAttendance();
    }, [refreshAttendance]),
  );

  const { photo, pickPhoto, removePhoto } = useProfilePhoto();

  const [editModalVisible, setEditModalVisible] = useState(false);

  const [editName, setEditName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingPassword, setSavingPassword] = useState(false);

  const totalCourses = classCourses.length;

  let totalLessons = 0;
  let totalCompletedLessons = 0;

  classCourses.forEach((course) => {
    const backendProgress = progress[course.id];

    const courseTotal =
      backendProgress?.totalLessons ?? Number(course.lessons || 0);

    const courseCompleted = Math.min(
      backendProgress?.completedCount ?? getCompletedCount(course.id),
      courseTotal,
    );

    totalLessons += courseTotal;
    totalCompletedLessons += courseCompleted;
  });

  const totalLearningTimeSeconds = getTotalLearningTime();

  const learningHours = Math.floor(totalLearningTimeSeconds / 3600);

  const learningMinutes = Math.floor((totalLearningTimeSeconds % 3600) / 60);

  const learningTime =
    learningHours > 0
      ? `${learningHours}h ${learningMinutes}m`
      : `${learningMinutes}m`;

  const overallProgress =
    totalLessons > 0
      ? Math.min(100, Math.round((totalCompletedLessons / totalLessons) * 100))
      : 0;

  const courseAttendance = classCourses.map((course) => ({
    ...course,
    attendance: user?.email
      ? getStudentCoursePercentage(
          user.email,
          course.id.toString()
        )
      : 0,
  }));

  // Overall attendance is the average of the
  // course-wise attendance percentages.
  //
  // Example:
  // Spider = 100%
  // Maths  = 0%
  // Overall = (100 + 0) / 2 = 50%
  const overallAttendance =
    courseAttendance.length > 0
      ? Math.round(
          courseAttendance.reduce(
            (sum, course) =>
              sum + course.attendance,
            0
          ) / courseAttendance.length
        )
      : 0;

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 75) return "#004741";
    if (percentage >= 60) return "#004741";
    return "#004741";
  };

  const getAttendanceStatus = (percentage: number) => {
    if (percentage >= 75) return "Good attendance";
    if (percentage >= 60) return "Attendance needs attention";
    return "Low attendance";
  };

  const openEditProfile = () => {
    setEditName(user?.name || "");
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    const name = editName.trim();

    if (!name) {
      Alert.alert("Invalid Name", "Please enter your name.");
      return;
    }

    setSavingProfile(true);

    const success = await updateUser(name, user?.email || "");

    setSavingProfile(false);

    if (!success) {
      Alert.alert(
        "Update Failed",
        "This email may already be in use. Please try another email.",
      );
      return;
    }

    setEditModalVisible(false);

    Alert.alert(
      "Profile Updated",
      "Your profile has been updated successfully.",
    );
  };

  const openChangePassword = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordModalVisible(true);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing Details", "Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        "Weak Password",
        "New password must be at least 6 characters.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        "Password Mismatch",
        "New password and confirm password do not match.",
      );
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert(
        "Invalid Password",
        "New password must be different from your current password.",
      );
      return;
    }

    setSavingPassword(true);

    const success = await changePassword(currentPassword, newPassword);

    setSavingPassword(false);

    if (!success) {
      Alert.alert(
        "Update Failed",
        "Current password is incorrect or password could not be updated.",
      );
      return;
    }

    setPasswordModalVisible(false);

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    Alert.alert(
      "Password Updated",
      "Your password has been changed successfully.",
    );
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
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
    ]);
  };

  const handlePhotoPress = () => {
    Alert.alert("Profile Photo", "What would you like to do?", [
      {
        text: "Change Photo",
        onPress: pickPhoto,
      },
      ...(photo
        ? [
            {
              text: "Remove Photo",
              style: "destructive" as const,
              onPress: removePhoto,
            },
          ]
        : []),
      {
        text: "Cancel",
        style: "cancel" as const,
      },
    ]);
  };

  const userName = user?.name || "User";
  const userEmail = user?.email || "user@example.com";

  const avatarLetter = userName.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>My Profile</Text>

            <Text style={styles.subHeading}>
              Manage your account and learning activity
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="person-outline" size={22} color="#004741" />
          </View>
        </View>

        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatar}
            onPress={handlePhotoPress}
            activeOpacity={0.8}
          >
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{avatarLetter}</Text>
            )}

            <View style={styles.cameraButton}>
              <Ionicons name="camera" size={13} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {userName}
            </Text>

<Text style={styles.email} numberOfLines={1}>
  {userEmail}
</Text>

{user?.role !== "admin" && (
  <View style={styles.classBadge}>
    <Ionicons name="school-outline" size={13} color="#004741" />
    <Text style={styles.classText}>
      {user?.classId ? `Class ${user.classId}` : "Class not assigned"}
    </Text>
  </View>
)}
          </View>

          <TouchableOpacity style={styles.editButton} onPress={openEditProfile}>
            <Ionicons name="create-outline" size={15} color="#004741" />

            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.photoHint}>
          <Ionicons name="camera-outline" size={14} color="#004741" />

          <Text style={styles.photoHintText}>
            Tap your profile photo to change it
          </Text>
        </View>

        <View style={styles.attendanceSectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Attendance</Text>
            <Text style={styles.sectionSubtitle}>
              Course-wise attendance overview
            </Text>
          </View>
          <TouchableOpacity
            style={styles.attendanceViewButton}
            onPress={() => router.push("/attendance")}
          >
            <Text style={styles.attendanceViewButtonText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#004741" />
          </TouchableOpacity>
        </View>

        <View style={styles.attendanceCard}>
          <View style={styles.attendanceOverview}>
            <View style={styles.attendanceIcon}>
              <Ionicons name="calendar-outline" size={24} color="#004741" />
            </View>
            <View style={styles.attendanceOverviewInfo}>
              <Text style={styles.attendanceOverviewTitle}>
                Overall Attendance
              </Text>
              <Text style={styles.attendanceOverviewSubtitle}>
                Based on all marked attendance records
              </Text>
            </View>
            <Text
              style={[
                styles.attendanceOverallPercentage,
                { color: getAttendanceColor(overallAttendance) },
              ]}
            >
              {overallAttendance}%
            </Text>
          </View>
          <View style={styles.attendanceProgressBackground}>
            <View
              style={[
                styles.attendanceProgressFill,
                {
                  width: `${overallAttendance}%`,
                  backgroundColor: getAttendanceColor(overallAttendance),
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.attendanceStatus,
              { color: getAttendanceColor(overallAttendance) },
            ]}
          >
            {overallAttendance === 0
              ? "No attendance marked yet"
              : getAttendanceStatus(overallAttendance)}
          </Text>
          {courseAttendance.length > 0 ? (
            <View style={styles.courseAttendanceList}>
              {courseAttendance.map((course) => {
                const percentage = course.attendance;
                return (
                  <View
                    key={course.id.toString()}
                    style={styles.courseAttendanceItem}
                  >
                    <View style={styles.courseAttendanceHeader}>
                      <View style={styles.courseAttendanceNameRow}>
                        <View style={styles.courseAttendanceDot} />
                        <Text
                          style={styles.courseAttendanceName}
                          numberOfLines={1}
                        >
                          {course.title}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.courseAttendancePercentage,
                          { color: getAttendanceColor(percentage) },
                        ]}
                      >
                        {percentage}%
                      </Text>
                    </View>
                    <View style={styles.courseAttendanceBackground}>
                      <View
                        style={[
                          styles.courseAttendanceFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: getAttendanceColor(percentage),
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.noAttendanceCourses}>
              <Text style={styles.noAttendanceText}>No courses available.</Text>
            </View>
          )}
        </View>

        {/* LEARNING PROGRESS */}

        <View style={styles.compactSectionHeader}>
          <View>
            <Text style={styles.compactSectionTitle}>Learning Progress</Text>
            <Text style={styles.compactSectionSubtitle}>
              Your course progress
            </Text>
          </View>
          <Text style={styles.compactOverallPercentage}>
            {overallProgress}%
          </Text>
        </View>

        <View style={styles.smallProgressCard}>
          <View style={styles.smallOverallRow}>
            <View style={styles.smallProgressIcon}>
              <Ionicons name="stats-chart-outline" size={18} color="#004741" />
            </View>
            <View style={styles.smallOverallInfo}>
              <Text style={styles.smallOverallTitle}>Overall Progress</Text>
              <Text style={styles.smallOverallSubtitle}>
                {totalCompletedLessons}/{totalLessons} lessons completed
              </Text>
            </View>
            <Text style={styles.smallOverallPercentage}>
              {overallProgress}%
            </Text>
          </View>

          <View style={styles.smallProgressBackground}>
            <View
              style={[
                styles.smallProgressFill,
                { width: `${overallProgress}%` },
              ]}
            />
          </View>

          {classCourses.slice(0, 2).map((course) => {
            const backendProgress = progress[course.id];

            const total =
              backendProgress?.totalLessons ?? Number(course.lessons || 0);

            const completed = Math.min(
              backendProgress?.completedCount ?? getCompletedCount(course.id),
              total,
            );

            const percentage =
              total > 0
                ? Math.min(100, Math.round((completed / total) * 100))
                : 0;

            return (
              <View key={course.id} style={styles.smallCourseRow}>
                <View style={styles.smallCourseInfo}>
                  <Text style={styles.smallCourseTitle} numberOfLines={1}>
                    {course.title}
                  </Text>
                  <Text style={styles.smallCourseLessons}>
                    {completed}/{total} lessons
                  </Text>
                </View>
                <View style={styles.smallCourseProgressBackground}>
                  <View
                    style={[
                      styles.smallCourseProgressFill,
                      { width: `${percentage}%` },
                    ]}
                  />
                </View>
                <Text style={styles.smallCoursePercentage}>{percentage}%</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Test History</Text>

        <View style={styles.testHistoryCard}>
          {results.length === 0 ? (
            <View style={styles.emptyTestHistory}>
              <View style={styles.emptyTestIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={24}
                  color="#004741"
                />
              </View>
              <View style={styles.emptyTestContent}>
                <Text style={styles.emptyHistoryTitle}>
                  No tests attempted yet
                </Text>
                <Text style={styles.emptyHistoryText}>
                  Complete a test to see your results here.
                </Text>
              </View>
            </View>
          ) : (
            <>
              {results.slice(0, 3).map((result, index) => {
                const passed = result.percentage >= 50;

                return (
                  <View
                    key={result.id}
                    style={[
                      styles.compactTestItem,
                      index === Math.min(results.length, 3) - 1 &&
                        styles.lastTestItem,
                    ]}
                  >
                    <View
                      style={[
                        styles.testResultIcon,
                        { backgroundColor: passed ? "#F0EDE4" : "#F0EDE4" },
                      ]}
                    >
                      <Ionicons
                        name={passed ? "checkmark-circle" : "alert-circle"}
                        size={22}
                        color={passed ? "#004741" : "#004741"}
                      />
                    </View>

                    <View style={styles.compactTestInfo}>
                      <Text style={styles.compactTestTitle} numberOfLines={1}>
                        {result.testTitle}
                      </Text>

                      <Text style={styles.compactTestMeta}>
                        {result.correctAnswers}/{result.totalQuestions} correct
                        • {new Date(result.attemptedAt).toLocaleDateString()}
                      </Text>

                      <View style={styles.testStatusRow}>
                        <View
                          style={[
                            styles.testStatusBadge,
                            { backgroundColor: passed ? "#F0EDE4" : "#F0EDE4" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.testStatusText,
                              { color: passed ? "#004741" : "#004741" },
                            ]}
                          >
                            {passed ? "Passed" : "Needs Review"}
                          </Text>
                        </View>
                        <Text style={styles.testMarksText}>
                          {result.score}/{result.totalMarks}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.testResultRight}>
                      <Text
                        style={[
                          styles.compactTestPercentage,
                          { color: passed ? "#004741" : "#004741" },
                        ]}
                      >
                        {result.percentage}%
                      </Text>

                      <TouchableOpacity
                        style={styles.viewTestButton}
                        onPress={() =>
                          router.push({
                            pathname: "/test-review",
                            params: { testId: result.testId },
                          })
                        }
                      >
                        <Text style={styles.viewTestButtonText}>View</Text>
                        <Ionicons
                          name="chevron-forward"
                          size={13}
                          color="#004741"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {results.length > 3 && (
                <TouchableOpacity
                  style={styles.allTestsButton}
                  onPress={() => router.push("/(tabs)/tests")}
                >
                  <Text style={styles.allTestsButtonText}>View All Tests</Text>
                  <Ionicons name="arrow-forward" size={15} color="#004741" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/notifications")}
          >
            <View style={styles.menuIcon}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#004741"
              />
            </View>

            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Notifications</Text>

              <Text style={styles.menuSubtitle}>Manage your notifications</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#004741" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/settings")}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="settings-outline" size={20} color="#004741" />
            </View>

            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Settings</Text>

              <Text style={styles.menuSubtitle}>
                App preferences and settings
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#004741" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={openChangePassword}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="lock-closed-outline" size={20} color="#004741" />
            </View>

            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Privacy & Security</Text>

              <Text style={styles.menuSubtitle}>
                Manage your account security
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#004741" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Support</Text>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert(
                "Help Center",
                "Need help with The Winner Ramanujan Classes?\n\n" +
                  "You can contact us for assistance with account issues, course access, profile settings, tests, attendance, or any other app-related problem.\n\n" +
                  "We are happy to help you have a smooth and better learning experience.\n\n" +
                  "Support Email:\n" +
                  "ankitmaurya00654@gmail.com",
              )
            }
          >
            <View style={styles.menuIcon}>
              <Ionicons name="help-circle-outline" size={20} color="#004741" />
            </View>

            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Help Center</Text>

              <Text style={styles.menuSubtitle}>Get help with the app</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#004741" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert(
                "About The Winner Ramanujan Classes",
                "The Winner Ramanujan Classes is an educational learning platform designed to make learning simple, accessible, and engaging.\n\n" +
                  "Students can explore courses, learn through lessons, track their progress, check attendance, and review their test performance in one place.\n\n" +
                  "The Winner Ramanujan Classes is built with the goal of creating a focused and student-friendly digital learning experience.\n\n" +
                  "Created by: " +
                  "Ankitmaurya\n\n" +
                  "Version 1.0.0",
              )
            }
          >
            <View style={styles.menuIcon}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#004741"
              />
            </View>

            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>About</Text>

              <Text style={styles.menuSubtitle}>Version 1.0.0</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#004741" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#004741" />

          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Learn. Grow. Succeed.</Text>
      </ScrollView>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Profile</Text>

                <Text style={styles.modalSubtitle}>
                  Update your personal information
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#004741" />
              </TouchableOpacity>
            </View>

            <View style={styles.editPhotoSection}>
              <TouchableOpacity
                style={styles.editPhotoAvatar}
                onPress={pickPhoto}
                activeOpacity={0.8}
              >
                {photo ? (
                  <Image
                    source={{ uri: photo }}
                    style={styles.editPhotoImage}
                  />
                ) : (
                  <Text style={styles.editPhotoLetter}>{avatarLetter}</Text>
                )}

                <View style={styles.editPhotoCamera}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <View style={styles.editPhotoActions}>
                <TouchableOpacity
                  style={styles.changePhotoButton}
                  onPress={pickPhoto}
                >
                  <Ionicons name="image-outline" size={16} color="#004741" />
                  <Text style={styles.changePhotoText}>Change Photo</Text>
                </TouchableOpacity>

                {photo && (
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={removePhoto}
                  >
                    <Text style={styles.removePhotoText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>

            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your name"
              placeholderTextColor="#004741"
              autoCapitalize="words"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
                disabled={savingProfile}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                <Text style={styles.saveButtonText}>
                  {savingProfile ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Change Password</Text>

                <Text style={styles.modalSubtitle}>
                  Keep your account secure
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setPasswordModalVisible(false)}
                disabled={savingPassword}
              >
                <Ionicons name="close" size={22} color="#004741" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Current Password</Text>

            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor="#004741"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>New Password</Text>

            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor="#004741"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Confirm New Password</Text>

            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor="#004741"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.passwordHint}>
              Password must contain at least 6 characters.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setPasswordModalVisible(false)}
                disabled={savingPassword}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleChangePassword}
                disabled={savingPassword}
              >
                <Text style={styles.saveButtonText}>
                  {savingPassword ? "Updating..." : "Update Password"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  heading: {
    fontSize: 30,
    fontWeight: "800",
    color: "#000000",
  },

  subHeading: {
    fontSize: 14,
    color: "#004741",
    marginTop: 5,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#004741",
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },

  avatarText: {
    fontSize: 25,
    fontWeight: "800",
    color: "#004741",
  },

  cameraButton: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: "#004741",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  photoHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    gap: 5,
  },

  photoHintText: {
    fontSize: 11,
    color: "#004741",
  },

  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },

  name: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
  },

  email: {
    fontSize: 12,
    color: "#004741",
    marginTop: 3,
  },

  classBadge: {
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "flex-start",
  marginTop: 6,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 8,
  backgroundColor: "#F0EDE4",
  gap: 5,
},

classText: {
  fontSize: 12,
  fontWeight: "700",
  color: "#004741",
},

  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  member: {
    fontSize: 11,
    fontWeight: "700",
    color: "#004741",
    marginLeft: 4,
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "#F0EDE4",
    borderRadius: 9,
  },

  editText: {
    color: "#004741",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
  },

  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginTop: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#004741",
  },

  stat: {
    flex: 1,
    alignItems: "center",
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000000",
  },

  statLabel: {
    fontSize: 11,
    color: "#004741",
    marginTop: 3,
  },

  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: "#004741",
  },

  sectionHeader: {
    marginTop: 25,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#000000",
    marginTop: 25,
    marginBottom: 12,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: "#004741",
    marginTop: 2,
  },

  overallBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
  },

  overallBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#004741",
  },

  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#004741",
  },

  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  courseProgressInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  courseTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  progressTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
  },

  progressSubtitle: {
    fontSize: 11,
    color: "#004741",
    marginTop: 5,
  },

  progressPercentage: {
    fontSize: 18,
    fontWeight: "800",
    color: "#004741",
  },

  progressBackground: {
    height: 9,
    backgroundColor: "#004741",
    borderRadius: 9,
    marginTop: 18,
    overflow: "hidden",
  },

  progressFill: {
    height: 9,
    backgroundColor: "#004741",
    borderRadius: 9,
  },

  progressBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9,
  },

  progressBottomText: {
    fontSize: 11,
    color: "#004741",
  },

  overallProgressCard: {
    marginTop: 10,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
  },

  overallIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  overallInfo: {
    flex: 1,
    marginLeft: 11,
  },

  overallTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000000",
  },

  overallDescription: {
    fontSize: 11,
    color: "#004741",
    marginTop: 3,
  },

  overallPercentage: {
    fontSize: 17,
    fontWeight: "800",
    color: "#004741",
  },

  compactProgressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#004741",
  },

  compactProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  compactProgressIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  compactProgressInfo: {
    flex: 1,
  },

  compactProgressTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
  },

  compactProgressSubtitle: {
    fontSize: 12,
    color: "#004741",
    marginTop: 3,
  },

  compactProgressPercentage: {
    fontSize: 17,
    fontWeight: "800",
    color: "#004741",
  },

  compactCourseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#004741",
  },

  compactCourseTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  compactCourseIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  compactCourseInfo: {
    flex: 1,
  },

  compactCourseTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },

  compactCourseSubtitle: {
    fontSize: 12,
    color: "#004741",
    marginTop: 3,
  },

  compactCoursePercentage: {
    fontSize: 15,
    fontWeight: "800",
    color: "#004741",
  },

  compactCourseBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },

  compactCourseStatus: {
    fontSize: 12,
    color: "#004741",
    fontWeight: "600",
  },

  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#F0EDE4",
  },

  continueButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#004741",
    marginRight: 3,
  },

  viewAllProgressButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#004741",
    backgroundColor: "#F0EDE4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  viewAllProgressText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#004741",
    marginRight: 6,
  },

  compactSectionHeader: {
    marginTop: 20,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  compactSectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#000000",
  },

  compactSectionSubtitle: {
    fontSize: 10,
    color: "#004741",
    marginTop: 2,
  },

  compactOverallPercentage: {
    fontSize: 16,
    fontWeight: "800",
    color: "#004741",
  },

  smallProgressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#004741",
  },

  smallOverallRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  smallProgressIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  smallOverallInfo: {
    flex: 1,
    marginLeft: 9,
  },

  smallOverallTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000000",
  },

  smallOverallSubtitle: {
    fontSize: 10,
    color: "#004741",
    marginTop: 2,
  },

  smallOverallPercentage: {
    fontSize: 15,
    fontWeight: "800",
    color: "#004741",
  },

  smallProgressBackground: {
    height: 6,
    borderRadius: 6,
    backgroundColor: "#F0EDE4",
    overflow: "hidden",
    marginTop: 9,
  },

  smallProgressFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: "#004741",
  },

  smallCourseRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  smallCourseInfo: {
    width: 105,
  },

  smallCourseTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#000000",
  },

  smallCourseLessons: {
    fontSize: 9,
    color: "#004741",
    marginTop: 2,
  },

  smallCourseProgressBackground: {
    flex: 1,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#F0EDE4",
    overflow: "hidden",
    marginHorizontal: 8,
  },

  smallCourseProgressFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: "#004741",
  },

  smallCoursePercentage: {
    width: 34,
    textAlign: "right",
    fontSize: 10,
    fontWeight: "800",
    color: "#004741",
  },

  attendanceSectionHeader: {
    marginTop: 25,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  attendanceViewButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "#F0EDE4",
    marginBottom: 10,
  },
  attendanceViewButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#004741",
    marginRight: 3,
  },
  attendanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#004741",
  },
  attendanceOverview: { flexDirection: "row", alignItems: "center" },
  attendanceIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },
  attendanceOverviewInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  attendanceOverviewTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
  },
  attendanceOverviewSubtitle: { fontSize: 10, color: "#004741", marginTop: 4 },
  attendanceOverallPercentage: { fontSize: 22, fontWeight: "800" },
  attendanceProgressBackground: {
    height: 9,
    borderRadius: 9,
    backgroundColor: "#F0EDE4",
    overflow: "hidden",
    marginTop: 16,
  },
  attendanceProgressFill: { height: "100%", borderRadius: 9 },
  attendanceStatus: { fontSize: 11, fontWeight: "700", marginTop: 7 },
  courseAttendanceList: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F0EDE4",
    paddingTop: 14,
  },
  courseAttendanceItem: { marginBottom: 13 },
  courseAttendanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  courseAttendanceNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  courseAttendanceDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#004741",
    marginRight: 8,
  },
  courseAttendanceName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#000000",
  },
  courseAttendancePercentage: { fontSize: 13, fontWeight: "800" },
  courseAttendanceBackground: {
    height: 6,
    borderRadius: 6,
    backgroundColor: "#F0EDE4",
    overflow: "hidden",
    marginTop: 7,
  },
  courseAttendanceFill: { height: "100%", borderRadius: 6 },
  noAttendanceCourses: { paddingTop: 14 },
  noAttendanceText: { fontSize: 12, color: "#004741" },

  historyCardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#004741",
    overflow: "hidden",
  },

  emptyHistory: {
    padding: 28,
    alignItems: "center",
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyHistoryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
    marginTop: 10,
  },

  emptyHistoryText: {
    fontSize: 13,
    color: "#004741",
    textAlign: "center",
    marginTop: 5,
  },

  testHistoryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE4",
  },

  testHistoryIcon: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  testHistoryInfo: {
    flex: 1,
    marginLeft: 12,
  },

  testHistoryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
  },

  testHistoryDate: {
    fontSize: 11,
    color: "#004741",
    marginTop: 3,
  },

  testHistoryDetails: {
    fontSize: 12,
    color: "#004741",
    marginTop: 4,
  },

  testHistoryScore: {
    alignItems: "flex-end",
    marginLeft: 8,
  },

  testHistoryPercentage: {
    fontSize: 18,
    fontWeight: "800",
    color: "#004741",
  },

  testHistoryMarks: {
    fontSize: 11,
    color: "#004741",
    marginTop: 2,
  },

  testHistoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#004741",
    overflow: "hidden",
  },

  emptyTestHistory: {
    minHeight: 92,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  emptyTestIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTestContent: {
    flex: 1,
    marginLeft: 12,
  },

  compactTestItem: {
    minHeight: 108,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE4",
  },

  lastTestItem: {
    borderBottomWidth: 0,
  },

  testResultIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  compactTestInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },

  compactTestTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000000",
  },

  compactTestMeta: {
    fontSize: 10,
    color: "#004741",
    marginTop: 4,
  },

  testStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  testStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },

  testStatusText: {
    fontSize: 9,
    fontWeight: "800",
  },

  testMarksText: {
    fontSize: 10,
    color: "#004741",
    fontWeight: "600",
    marginLeft: 7,
  },

  testResultRight: {
    width: 54,
    alignItems: "flex-end",
  },

  compactTestPercentage: {
    fontSize: 17,
    fontWeight: "800",
  },

  viewTestButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  viewTestButtonText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#004741",
    marginRight: 2,
  },

  allTestsButton: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#F0EDE4",
  },

  allTestsButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#004741",
  },

  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#004741",
    overflow: "hidden",
  },

  menuItem: {
    minHeight: 70,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  menuContent: {
    flex: 1,
    marginLeft: 12,
  },

  menuTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },

  menuSubtitle: {
    fontSize: 11,
    color: "#004741",
    marginTop: 3,
  },

  menuDivider: {
    height: 1,
    backgroundColor: "#F0EDE4",
    marginLeft: 67,
  },

  logoutButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#F0EDE4",
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#004741",
  },

  logoutText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#004741",
    marginLeft: 8,
  },

  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "#004741",
    marginTop: 22,
  },

  editPhotoSection: {
    alignItems: "center",
    marginBottom: 18,
  },

  editPhotoAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 2,
    borderColor: "#F0EDE4",
  },

  editPhotoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 41,
  },

  editPhotoLetter: {
    fontSize: 30,
    fontWeight: "700",
    color: "#004741",
  },

  editPhotoCamera: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#004741",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  editPhotoActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },

  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: "#F0EDE4",
  },

  changePhotoText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#004741",
  },

  removePhotoButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: "#F0EDE4",
  },

  removePhotoText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#004741",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "#004741",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 30,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#000000",
  },

  modalSubtitle: {
    fontSize: 12,
    color: "#004741",
    marginTop: 4,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 7,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#004741",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#000000",
    marginBottom: 16,
    backgroundColor: "#F0EDE4",
  },

  passwordHint: {
    fontSize: 11,
    color: "#004741",
    marginTop: -8,
    marginBottom: 10,
  },

  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },

  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },

  saveButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#004741",
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
