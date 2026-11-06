import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useFocusEffect,
} from "expo-router";

import {
  User,
  useAuth,
} from "../../context/AuthContext";

const API_BASE_URL =
  "https://ramanujan-sybq.onrender.com/api";

const TOKEN_KEY =
  "studypoint_token";

const CLASSES = [
  6,
  7,
  8,
  9,
  10,
  11,
  12,
];

type UserStats = {
  completedLessons: number;
  totalLessons: number;
  progress: number;
  testAttempts: number;
  bestScore: number;
};

export default function AdminUsers() {
  const {
    user,
    getAllUsers,
    deleteUser,
  } = useAuth();

  // =====================================================
  // STATE
  // =====================================================

  const [users, setUsers] =
    useState<User[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [selectedClass, setSelectedClass] =
    useState<number | null>(null);

  // =====================================================
  // HANDLE ANDROID BACK BUTTON
  // =====================================================

  useEffect(() => {
    const onBackPress = () => {
      if (selectedClass !== null) {
        setSelectedClass(null);
        setSearch("");
        setShowCreateForm(false);
        resetCreateForm();

        return true;
      }

      return false;
    };

    const subscription =
      BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

    return () => {
      subscription.remove();
    };
  }, [selectedClass]);

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [creatingStudent, setCreatingStudent] =
    useState(false);

  // CREATE STUDENT FORM
  const [studentName, setStudentName] =
    useState("");

  const [studentEmail, setStudentEmail] =
    useState("");

  const [studentPassword, setStudentPassword] =
    useState("");

  // PROFILE PHOTOS
  const [profilePhotos, setProfilePhotos] =
    useState<Record<string, string>>({});

  // PERFORMANCE
  const [userStats, setUserStats] =
    useState<Record<string, UserStats>>({});

  // =====================================================
  // LOAD PROFILE PHOTOS
  // =====================================================

  const loadProfilePhotos = async (
    userList: User[]
  ) => {
    const photoMap: Record<
      string,
      string
    > = {};

    userList.forEach((item) => {
      const email =
        item.email.toLowerCase();

      if (item.profilePhoto) {
        photoMap[email] =
          item.profilePhoto;
      }
    });

    setProfilePhotos(photoMap);
  };

  // =====================================================
  // LOAD USER PERFORMANCE
  // =====================================================

  const loadUserStats = async (
    userList: User[]
  ) => {
    try {
      const token =
        await AsyncStorage.getItem(
          TOKEN_KEY
        );

      if (!token) {
        setUserStats({});
        return;
      }

      const statsMap: Record<
        string,
        UserStats
      > = {};

      await Promise.all(
        userList.map(async (item) => {
          const email =
            item.email.toLowerCase();

          const studentId =
            item.id ||
            (item as any)._id?.toString();

          let completedLessons = 0;
          let totalLessons = 0;
          let testAttempts = 0;
          let bestScore = 0;

          if (studentId) {
            try {
              const [
                progressResponse,
                testResponse,
              ] = await Promise.all([
                fetch(
                  `${API_BASE_URL}/progress/student/${studentId}`,
                  {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type":
                        "application/json",
                    },
                  }
                ),

                fetch(
                  `${API_BASE_URL}/test-results/student/${studentId}`,
                  {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type":
                        "application/json",
                    },
                  }
                ),
              ]);

              // -----------------------------------------
              // PROGRESS
              // -----------------------------------------

              if (
                progressResponse.ok
              ) {
                try {
                  const progressData =
                    await progressResponse.json();

                  if (
                    progressData.success
                  ) {
                    const records =
                      Array.isArray(
                        progressData.progress
                      )
                        ? progressData.progress
                        : [];

                    records.forEach(
                      (record: any) => {
                        totalLessons +=
                          Number(
                            record.totalLessons
                          ) || 0;

                        completedLessons +=
                          Math.min(
                            Number(
                              record.completedCount
                            ) || 0,
                            Number(
                              record.totalLessons
                            ) || 0
                          );
                      }
                    );
                  }
                } catch {
                  // ignore
                }
              }

              // -----------------------------------------
              // TEST RESULTS
              // -----------------------------------------

              if (testResponse.ok) {
                try {
                  const testData =
                    await testResponse.json();

                  if (
                    testData.success
                  ) {
                    const results =
                      Array.isArray(
                        testData.results
                      )
                        ? testData.results
                        : [];

                    testAttempts =
                      results.length;

                    results.forEach(
                      (result: any) => {
                        let percentage =
                          Number(
                            result?.percentage
                          );

                        if (
                          !Number.isFinite(
                            percentage
                          )
                        ) {
                          const score =
                            Number(
                              result?.score
                            ) || 0;

                          const totalMarks =
                            Number(
                              result?.totalMarks
                            ) || 0;

                          percentage =
                            totalMarks > 0
                              ? (score /
                                  totalMarks) *
                                100
                              : 0;
                        }

                        if (
                          Number.isFinite(
                            percentage
                          ) &&
                          percentage >
                            bestScore
                        ) {
                          bestScore =
                            percentage;
                        }
                      }
                    );
                  }
                } catch {
                  // ignore
                }
              }
            } catch {
              // Keep default values.
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

          statsMap[email] = {
            completedLessons,
            totalLessons,
            progress,
            testAttempts,
            bestScore:
              Math.round(bestScore),
          };
        })
      );

      setUserStats(statsMap);
    } catch {
      setUserStats({});
    }
  };

  // =====================================================
  // LOAD USERS
  // =====================================================

  const loadUsers =
    useCallback(async () => {
      try {
        setLoading(true);

        const data =
          await getAllUsers();

        setUsers(
          Array.isArray(data)
            ? data
            : []
        );

        await Promise.all([
          loadProfilePhotos(data),
          loadUserStats(data),
        ]);
      } catch (error) {
        console.log(
          "Failed to load users:",
          error
        );
      } finally {
        setLoading(false);
      }
    }, [getAllUsers]);

  // =====================================================
  // RELOAD WHEN SCREEN OPENS
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  // =====================================================
  // ONLY STUDENTS
  // =====================================================

  const students = useMemo(() => {
    return users.filter(
      (item) =>
        item.role !== "admin" &&
        item.classId !== undefined &&
        item.classId !== null
    );
  }, [users]);

  // =====================================================
  // CLASS COUNT
  // =====================================================

  const getClassStudents = (
    classId: number
  ) => {
    return students.filter(
      (item) =>
        Number(item.classId) ===
        classId
    );
  };

  // =====================================================
  // SELECTED CLASS STUDENTS
  // =====================================================

  const filteredClassStudents =
    useMemo(() => {
      if (!selectedClass) {
        return [];
      }

      const classStudents =
        getClassStudents(
          selectedClass
        );

      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return classStudents;
      }

      return classStudents.filter(
        (item) =>
          item.name
            .toLowerCase()
            .includes(query) ||
          item.email
            .toLowerCase()
            .includes(query)
      );
    }, [
      students,
      selectedClass,
      search,
    ]);

  // =====================================================
  // RESET CREATE FORM
  // =====================================================

  const resetCreateForm = () => {
    setStudentName("");
    setStudentEmail("");
    setStudentPassword("");
  };

  // =====================================================
  // CREATE STUDENT
  // =====================================================

  const handleCreateStudent =
    async () => {
      if (!selectedClass) {
        Alert.alert(
          "Select Class",
          "Please select a class first."
        );
        return;
      }

      if (!studentName.trim()) {
        Alert.alert(
          "Missing Name",
          "Please enter student name."
        );
        return;
      }

      if (!studentEmail.trim()) {
        Alert.alert(
          "Missing Email",
          "Please enter student email."
        );
        return;
      }

      if (!studentPassword.trim()) {
        Alert.alert(
          "Missing Password",
          "Please enter student password."
        );
        return;
      }

      if (
        studentPassword.trim().length <
        6
      ) {
        Alert.alert(
          "Invalid Password",
          "Password must contain at least 6 characters."
        );
        return;
      }

      try {
        setCreatingStudent(true);

        const token =
          await AsyncStorage.getItem(
            TOKEN_KEY
          );

        if (!token) {
          Alert.alert(
            "Session Expired",
            "Please login again."
          );
          return;
        }

        const response =
          await fetch(
            `${API_BASE_URL}/admin/students`,
            {
              method: "POST",
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                name:
                  studentName.trim(),
                email:
                  studentEmail
                    .trim()
                    .toLowerCase(),
                password:
                  studentPassword.trim(),
                classId:
                  selectedClass,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to create student."
          );
        }

        Alert.alert(
          "Student Created",
          `${studentName.trim()} has been added to Class ${selectedClass}.`
        );

        resetCreateForm();
        setShowCreateForm(false);

        await loadUsers();
      } catch (error: any) {
        Alert.alert(
          "Error",
          error?.message ||
            "Unable to create student."
        );
      } finally {
        setCreatingStudent(false);
      }
    };

  // =====================================================
  // DELETE USER
  // =====================================================

  const handleDelete = (
    selectedUser: User
  ) => {
    Alert.alert(
      "Delete Student",
      `Are you sure you want to delete ${selectedUser.name}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",

          onPress: async () => {
            const success =
              await deleteUser(
                selectedUser.email
              );

            if (success) {
              setUsers(
                (current) =>
                  current.filter(
                    (item) =>
                      item.email
                        .toLowerCase() !==
                      selectedUser.email
                        .toLowerCase()
                  )
              );

              const email =
                selectedUser.email.toLowerCase();

              setProfilePhotos(
                (current) => {
                  const updated = {
                    ...current,
                  };

                  delete updated[email];

                  return updated;
                }
              );

              setUserStats(
                (current) => {
                  const updated = {
                    ...current,
                  };

                  delete updated[email];

                  return updated;
                }
              );

              Alert.alert(
                "Success",
                "Student deleted successfully."
              );
            } else {
              Alert.alert(
                "Error",
                "Student could not be deleted."
              );
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // OPEN USER DETAILS
  // =====================================================

  const openUserDetails = (
    selectedUser: User
  ) => {
    router.push({
      pathname:
        "/admin/user-details",

      params: {
        email:
          selectedUser.email,

        name:
          selectedUser.name,
      },
    });
  };

  // =====================================================
  // ACCESS DENIED
  // =====================================================

  if (user?.role !== "admin") {
    return (
      <SafeAreaView
        style={styles.center}
      >
        <Ionicons
          name="lock-closed-outline"
          size={48}
          color="#004741"
        />

        <Text
          style={styles.accessDenied}
        >
          Access Denied
        </Text>

        <Text
          style={styles.accessText}
        >
          Only admin can access this page.
        </Text>
      </SafeAreaView>
    );
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={styles.loading}
        >
          <ActivityIndicator
            size="large"
            color="#004741"
          />

          <Text
            style={styles.loadingText}
          >
            Loading students...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // CLASS DETAIL SCREEN
  // =====================================================

  if (selectedClass !== null) {
    const totalClassStudents =
      getClassStudents(
        selectedClass
      ).length;

    return (
      <SafeAreaView
        style={styles.container}
      >
        {/* HEADER */}

        <View style={styles.detailHeader}>
          <Pressable
            onPress={() => {
              setSelectedClass(null);
              setSearch("");
              setShowCreateForm(false);
              resetCreateForm();
            }}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color="#000000"
            />
          </Pressable>

          <View
            style={styles.headerContent}
          >
            <Text
              style={styles.title}
            >
              Class {selectedClass}
            </Text>

            <Text
              style={styles.subtitle}
            >
              {totalClassStudents} registered student
              {totalClassStudents !== 1
                ? "s"
                : ""}
            </Text>
          </View>

          <Pressable
            onPress={loadUsers}
            style={styles.refreshButton}
          >
            <Ionicons
              name="refresh"
              size={21}
              color="#004741"
            />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.detailContent
          }
        >
          {/* CLASS SUMMARY */}

          <View
            style={styles.classSummary}
          >
            <View
              style={styles.classNumberBox}
            >
              <Text
                style={styles.classNumber}
              >
                {selectedClass}
              </Text>
            </View>

            <View
              style={styles.summaryInfo}
            >
              <Text
                style={styles.summaryTitle}
              >
                Class {selectedClass} Students
              </Text>

              <Text
                style={styles.summaryText}
              >
                Manage students, profiles and
                learning performance.
              </Text>
            </View>
          </View>

          {/* CREATE BUTTON */}

          {!showCreateForm && (
            <Pressable
              style={styles.createButton}
              onPress={() =>
                setShowCreateForm(true)
              }
            >
              <Ionicons
                name="add"
                size={21}
                color="#FFFFFF"
              />

              <Text
                style={styles.createButtonText}
              >
                Create Student
              </Text>
            </Pressable>
          )}

          {/* CREATE FORM */}

          {showCreateForm && (
            <View
              style={styles.createCard}
            >
              <View
                style={
                  styles.createHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.createTitle
                    }
                  >
                    Create Student
                  </Text>

                  <Text
                    style={
                      styles.createSubtitle
                    }
                  >
                    Student will be added to
                    Class {selectedClass}
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    setShowCreateForm(
                      false
                    );
                    resetCreateForm();
                  }}
                  style={
                    styles.closeButton
                  }
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color="#000000"
                  />
                </Pressable>
              </View>

              {/* NAME */}

              <Text
                style={styles.label}
              >
                Student Name
              </Text>

              <TextInput
                value={studentName}
                onChangeText={
                  setStudentName
                }
                placeholder="Enter student name"
                placeholderTextColor="#000000"
                style={styles.input}
                autoCapitalize="words"
              />

              {/* EMAIL */}

              <Text
                style={styles.label}
              >
                Email
              </Text>

              <TextInput
                value={studentEmail}
                onChangeText={
                  setStudentEmail
                }
                placeholder="student@example.com"
                placeholderTextColor="#000000"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* PASSWORD */}

              <Text
                style={styles.label}
              >
                Password
              </Text>

              <TextInput
                value={studentPassword}
                onChangeText={
                  setStudentPassword
                }
                placeholder="Minimum 6 characters"
                placeholderTextColor="#000000"
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
              />

              {/* CLASS LOCK */}

              <View
                style={styles.lockedClass}
              >
                <Ionicons
                  name="school-outline"
                  size={19}
                  color="#004741"
                />

                <Text
                  style={
                    styles.lockedClassText
                  }
                >
                  Class {selectedClass}
                </Text>

                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color="#004741"
                />
              </View>

              {/* SAVE */}

              <Pressable
                onPress={
                  handleCreateStudent
                }
                disabled={
                  creatingStudent
                }
                style={[
                  styles.saveButton,
                  creatingStudent &&
                    styles.disabledButton,
                ]}
              >
                {creatingStudent ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Ionicons
                    name="person-add-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                )}

                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  {creatingStudent
                    ? "Creating..."
                    : "Create Student"}
                </Text>
              </Pressable>
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
              color="#000000"
            />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search student..."
              placeholderTextColor="#000000"
              style={styles.searchInput}
            />

            {search.length > 0 && (
              <Pressable
                onPress={() =>
                  setSearch("")
                }
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color="#004741"
                />
              </Pressable>
            )}
          </View>

          {/* REGISTERED USERS */}

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
                Registered Users
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                {filteredClassStudents.length} student
                {filteredClassStudents.length !==
                1
                  ? "s"
                  : ""}{" "}
                found
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
                {filteredClassStudents.length}
              </Text>
            </View>
          </View>

          {/* STUDENT CARDS */}

          {filteredClassStudents.length ===
          0 ? (
            <View
              style={styles.empty}
            >
              <View
                style={
                  styles.emptyIcon
                }
              >
                <Ionicons
                  name="people-outline"
                  size={34}
                  color="#004741"
                />
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No Students Found
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                {search
                  ? "Try another search."
                  : `No students have been added to Class ${selectedClass} yet.`}
              </Text>

              {!search && (
                <Pressable
                  style={
                    styles.emptyCreateButton
                  }
                  onPress={() =>
                    setShowCreateForm(
                      true
                    )
                  }
                >
                  <Ionicons
                    name="add"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.emptyCreateText
                    }
                  >
                    Create Student
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            filteredClassStudents.map(
              (item) => {
                const email =
                  item.email.toLowerCase();

                const photo =
                  profilePhotos[email];

                const stats =
                  userStats[email] || {
                    completedLessons: 0,
                    totalLessons: 0,
                    progress: 0,
                    testAttempts: 0,
                    bestScore: 0,
                  };

                return (
                  <View
                    key={
                      item.id ||
                      item.email
                    }
                    style={
                      styles.userCard
                    }
                  >
                    {/* USER TOP */}

                    <View
                      style={
                        styles.userTop
                      }
                    >
                      <View
                        style={
                          styles.avatar
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
                          <Text
                            style={
                              styles.avatarText
                            }
                          >
                            {item.name
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </Text>
                        )}
                      </View>

                      <View
                        style={
                          styles.userInfo
                        }
                      >
                        <Text
                          style={
                            styles.userName
                          }
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>

                        <Text
                          style={
                            styles.userEmail
                          }
                          numberOfLines={1}
                        >
                          {item.email}
                        </Text>

                        <View
                          style={
                            styles.userMetaRow
                          }
                        >
                          <View
                            style={
                              styles.roleBadge
                            }
                          >
                            <Text
                              style={
                                styles.roleText
                              }
                            >
                              STUDENT
                            </Text>
                          </View>

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
                              {
                                item.classId
                              }
                            </Text>
                          </View>
                        </View>
                      </View>

                      <Pressable
                        style={
                          styles.deleteButton
                        }
                        onPress={() =>
                          handleDelete(
                            item
                          )
                        }
                      >
                        <Ionicons
                          name="trash-outline"
                          size={19}
                          color="#000000"
                        />
                      </Pressable>
                    </View>

                    {/* PERFORMANCE */}

                    <View
                      style={
                        styles.divider
                      }
                    />

                    <View
                      style={
                        styles.performanceHeader
                      }
                    >
                      <Text
                        style={
                          styles.performanceTitle
                        }
                      >
                        Learning Performance
                      </Text>

                      <Text
                        style={
                          styles.progressPercent
                        }
                      >
                        {stats.progress}%
                      </Text>
                    </View>

                    <View
                      style={
                        styles.progressBarBackground
                      }
                    >
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${stats.progress}%`,
                          },
                        ]}
                      />
                    </View>

                    <View
                      style={
                        styles.statsRow
                      }
                    >
                      <View
                        style={
                          styles.statBox
                        }
                      >
                        <View
                          style={
                            styles.statIcon
                          }
                        >
                          <Ionicons
                            name="book-outline"
                            size={17}
                            color="#004741"
                          />
                        </View>

                        <View>
                          <Text
                            style={
                              styles.statValue
                            }
                          >
                            {
                              stats.completedLessons
                            }
                            <Text
                              style={
                                styles.statTotal
                              }
                            >
                              /
                              {
                                stats.totalLessons
                              }
                            </Text>
                          </Text>

                          <Text
                            style={
                              styles.statLabel
                            }
                          >
                            Lessons
                          </Text>
                        </View>
                      </View>

                      <View
                        style={
                          styles.statBox
                        }
                      >
                        <View
                          style={
                            styles.statIcon
                          }
                        >
                          <Ionicons
                            name="document-text-outline"
                            size={17}
                            color="#004741"
                          />
                        </View>

                        <View>
                          <Text
                            style={
                              styles.statValue
                            }
                          >
                            {
                              stats.testAttempts
                            }
                          </Text>

                          <Text
                            style={
                              styles.statLabel
                            }
                          >
                            Tests
                          </Text>
                        </View>
                      </View>

                      <View
                        style={
                          styles.statBox
                        }
                      >
                        <View
                          style={
                            styles.statIcon
                          }
                        >
                          <Ionicons
                            name="trophy-outline"
                            size={17}
                            color="#004741"
                          />
                        </View>

                        <View>
                          <Text
                            style={
                              styles.statValue
                            }
                          >
                            {
                              stats.bestScore
                            }
                            %
                          </Text>

                          <Text
                            style={
                              styles.statLabel
                            }
                          >
                            Best
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* DETAILS */}

                    <Pressable
                      style={
                        styles.detailsButton
                      }
                      onPress={() =>
                        openUserDetails(
                          item
                        )
                      }
                    >
                      <Ionicons
                        name="eye-outline"
                        size={18}
                        color="#004741"
                      />

                      <Text
                        style={
                          styles.detailsButtonText
                        }
                      >
                        View Full Details
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={17}
                        color="#004741"
                      />
                    </Pressable>
                  </View>
                );
              }
            )
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =====================================================
  // MAIN CLASS SCREEN
  // =====================================================

  return (
    <SafeAreaView
      style={styles.container}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.back()
          }
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#000000"
          />
        </Pressable>

        <View
          style={styles.headerContent}
        >
          <Text
            style={styles.title}
          >
            Manage Users
          </Text>

          <Text
            style={styles.subtitle}
          >
            {students.length} registered students
          </Text>
        </View>

        <Pressable
          onPress={loadUsers}
          style={styles.refreshButton}
        >
          <Ionicons
            name="refresh"
            size={21}
            color="#004741"
          />
        </Pressable>
      </View>

      {/* SEARCH */}

      <View
        style={styles.searchContainer}
      >
        <Ionicons
          name="search-outline"
          size={20}
          color="#000000"
        />

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search students..."
          placeholderTextColor="#000000"
          style={styles.searchInput}
        />

        {search.length > 0 && (
          <Pressable
            onPress={() =>
              setSearch("")
            }
          >
            <Ionicons
              name="close-circle"
              size={20}
              color="#004741"
            />
          </Pressable>
        )}
      </View>

      {/* CLASS LIST */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.classContent
        }
      >
        <View
          style={styles.pageIntro}
        >
          <Text
            style={styles.pageTitle}
          >
            Students by Class
          </Text>

          <Text
            style={styles.pageSubtitle}
          >
            Select a class to manage its
            registered students.
          </Text>
        </View>

        <View
          style={styles.classGrid}
        >
          {CLASSES.map((classId) => {
            const count =
              getClassStudents(
                classId
              ).length;

            return (
              <Pressable
                key={classId}
                style={
                  styles.classCard
                }
                onPress={() => {
                  setSelectedClass(
                    classId
                  );
                  setSearch("");
                  setShowCreateForm(
                    false
                  );
                  resetCreateForm();
                }}
              >
                {/* CLASS NUMBER */}

                <View
                  style={
                    styles.classNumberCircle
                  }
                >
                  <Text
                    style={
                      styles.classNumberCircleText
                    }
                  >
                    {classId}
                  </Text>
                </View>

                {/* INFO */}

                <View
                  style={
                    styles.classCardInfo
                  }
                >
                  <Text
                    style={
                      styles.classCardTitle
                    }
                  >
                    Class {classId}
                  </Text>

                  <Text
                    style={
                      styles.classCardSubtitle
                    }
                  >
                    {count} registered
                    student
                    {count !== 1
                      ? "s"
                      : ""}
                  </Text>
                </View>

                {/* ARROW */}

                <View
                  style={
                    styles.classArrow
                  }
                >
                  <Ionicons
                    name="chevron-forward"
                    size={19}
                    color="#004741"
                  />
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* UNASSIGNED NOTICE */}

        {users.filter(
          (item) =>
            item.role !==
              "admin" &&
            (item.classId ===
              undefined ||
              item.classId === null)
        ).length > 0 && (
          <View
            style={
              styles.unassignedCard
            }
          >
            <Ionicons
              name="warning-outline"
              size={21}
              color="#004741"
            />

            <View
              style={
                styles.unassignedInfo
              }
            >
              <Text
                style={
                  styles.unassignedTitle
                }
              >
                Students without a class
              </Text>

              <Text
                style={
                  styles.unassignedText
                }
              >
                Some existing student accounts
                do not have a class assigned yet.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#F0EDE4",
    },

    center: {
      flex: 1,
      backgroundColor:
        "#F0EDE4",
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 30,
    },

    // -----------------------------------------------
    // HEADER
    // -----------------------------------------------

    header: {
      flexDirection:
        "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 35,
      paddingBottom: 16,
      gap: 14,
    },

    detailHeader: {
      flexDirection:
        "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      gap: 14,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        "#FFFFFF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    headerContent: {
      flex: 1,
    },

    title: {
      fontSize: 24,
      fontWeight: "800",
      color: "#000000",
    },

    subtitle: {
      marginTop: 3,
      fontSize: 13,
      color: "#000000",
    },

    refreshButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        "#FFFFFF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    // -----------------------------------------------
    // SEARCH
    // -----------------------------------------------

    searchContainer: {
      flexDirection:
        "row",
      alignItems: "center",
      backgroundColor:
        "#FFFFFF",
      marginHorizontal: 20,
      marginBottom: 14,
      paddingHorizontal: 14,
      height: 50,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        "#F0EDE4",
    },

    searchInput: {
      flex: 1,
      marginLeft: 10,
      fontSize: 15,
      color: "#000000",
    },

    // -----------------------------------------------
    // MAIN CLASS PAGE
    // -----------------------------------------------

    classContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },

    pageIntro: {
      marginTop: 5,
      marginBottom: 18,
    },

    pageTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: "#000000",
    },

    pageSubtitle: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 19,
      color: "#000000",
    },

    classGrid: {
      flexDirection:
        "row",
      flexWrap: "wrap",
      justifyContent:
        "space-between",
    },

    classCard: {
      width: "48.2%",
      minHeight: 150,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor:
        "#F0EDE4",
      justifyContent:
        "space-between",
    },

    classNumberCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor:
        "#F0EDE4",
      alignItems: "center",
      justifyContent:
        "center",
    },

    classNumberCircleText: {
      fontSize: 22,
      fontWeight: "900",
      color: "#004741",
    },

    classCardInfo: {
      marginTop: 14,
    },

    classCardTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#000000",
    },

    classCardSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color: "#000000",
    },

    classArrow: {
      position: "absolute",
      right: 14,
      top: 14,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor:
        "#F0EDE4",
      alignItems: "center",
      justifyContent:
        "center",
    },

    // -----------------------------------------------
    // UNASSIGNED
    // -----------------------------------------------

    unassignedCard: {
      marginTop: 4,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 15,
      padding: 15,
      flexDirection:
        "row",
      alignItems: "flex-start",
      borderWidth: 1,
      borderColor:
        "#F0EDE4",
    },

    unassignedInfo: {
      flex: 1,
      marginLeft: 11,
    },

    unassignedTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: "#000000",
    },

    unassignedText: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
      color: "#000000",
    },

    // -----------------------------------------------
    // DETAIL PAGE
    // -----------------------------------------------

    detailContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },

    classSummary: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 17,
      flexDirection:
        "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor:
        "#F0EDE4",
      marginBottom: 14,
    },

    classNumberBox: {
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundColor:
        "#F0EDE4",
      alignItems: "center",
      justifyContent:
        "center",
    },

    classNumber: {
      fontSize: 28,
      fontWeight: "900",
      color: "#004741",
    },

    summaryInfo: {
      flex: 1,
      marginLeft: 14,
    },

    summaryTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#000000",
    },

    summaryText: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
      color: "#000000",
    },

    // -----------------------------------------------
    // CREATE BUTTON
    // -----------------------------------------------

    createButton: {
      height: 52,
      borderRadius: 14,
      backgroundColor:
        "#004741",
      flexDirection:
        "row",
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 15,
      gap: 8,
    },

    createButtonText: {
      fontSize: 15,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    // -----------------------------------------------
    // CREATE CARD
    // -----------------------------------------------

    createCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 17,
      marginBottom: 15,
      borderWidth: 1,
      borderColor:
        "#F0EDE4",
    },

    createHeader: {
      flexDirection:
        "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 15,
    },

    createTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: "#000000",
    },

    createSubtitle: {
      marginTop: 3,
      fontSize: 12,
      color: "#000000",
    },

    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor:
        "#F0EDE4",
      alignItems: "center",
      justifyContent:
        "center",
    },

    label: {
      fontSize: 13,
      fontWeight: "800",
      color: "#000000",
      marginBottom: 7,
      marginTop: 5,
    },

    input: {
      height: 50,
      backgroundColor:
        "#F0EDE4",
      borderRadius: 11,
      paddingHorizontal: 14,
      fontSize: 14,
      color: "#000000",
      borderWidth: 1,
      borderColor:
        "#F0EDE4",
      marginBottom: 11,
    },

    lockedClass: {
      height: 48,
      borderRadius: 11,
      backgroundColor:
        "#F0EDE4",
      flexDirection:
        "row",
      alignItems: "center",
      paddingHorizontal: 14,
      marginTop: 3,
      marginBottom: 13,
      gap: 9,
    },

    lockedClassText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "800",
      color: "#004741",
    },

    saveButton: {
      height: 51,
      borderRadius: 13,
      backgroundColor:
        "#004741",
      flexDirection:
        "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 8,
    },

    disabledButton: {
      opacity: 0.6,
    },

    saveButtonText: {
      fontSize: 15,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    // -----------------------------------------------
    // SECTION
    // -----------------------------------------------

    sectionHeader: {
      flexDirection:
        "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 12,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: "#000000",
    },

    sectionSubtitle: {
      marginTop: 3,
      fontSize: 12,
      color: "#000000",
    },

    countBadge: {
      minWidth: 38,
      height: 34,
      paddingHorizontal: 10,
      borderRadius: 17,
      backgroundColor:
        "#FFFFFF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    countBadgeText: {
      fontSize: 14,
      fontWeight: "900",
      color: "#004741",
    },

    // -----------------------------------------------
    // USER CARD
    // -----------------------------------------------

    userCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 17,
      padding: 15,
      marginBottom: 13,
      borderWidth: 1,
      borderColor:
        "#F0EDE4",
    },

    userTop: {
      flexDirection:
        "row",
      alignItems: "center",
    },

    avatar: {
      width: 55,
      height: 55,
      borderRadius: 27.5,
      backgroundColor:
        "#F0EDE4",
      alignItems: "center",
      justifyContent:
        "center",
      overflow: "hidden",
    },

    avatarImage: {
      width: "100%",
      height: "100%",
    },

    avatarText: {
      fontSize: 20,
      fontWeight: "900",
      color: "#004741",
    },

    userInfo: {
      flex: 1,
      marginLeft: 13,
    },

    userName: {
      fontSize: 16,
      fontWeight: "800",
      color: "#000000",
    },

    userEmail: {
      fontSize: 12,
      color: "#000000",
      marginTop: 3,
    },

    userMetaRow: {
      flexDirection:
        "row",
      alignItems: "center",
      marginTop: 7,
      gap: 6,
    },

    roleBadge: {
      backgroundColor:
        "#F0EDE4",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
    },

    roleText: {
      fontSize: 9,
      fontWeight: "900",
      color: "#004741",
    },

    classBadge: {
      backgroundColor:
        "#F0EDE4",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
    },

    classBadgeText: {
      fontSize: 9,
      fontWeight: "900",
      color: "#004741",
    },

    deleteButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        "#F0EDE4",
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 7,
    },

    divider: {
      height: 1,
      backgroundColor:
        "#F0EDE4",
      marginVertical: 14,
    },

    // -----------------------------------------------
    // PERFORMANCE
    // -----------------------------------------------

    performanceHeader: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginBottom: 8,
    },

    performanceTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: "#000000",
    },

    progressPercent: {
      fontSize: 14,
      fontWeight: "900",
      color: "#004741",
    },

    progressBarBackground: {
      height: 8,
      borderRadius: 10,
      backgroundColor:
        "#F0EDE4",
      overflow: "hidden",
    },

    progressBarFill: {
      height: "100%",
      borderRadius: 10,
      backgroundColor:
        "#004741",
    },

    statsRow: {
      flexDirection:
        "row",
      gap: 7,
      marginTop: 14,
    },

    statBox: {
      flex: 1,
      minHeight: 52,
      backgroundColor:
        "#F0EDE4",
      borderRadius: 10,
      paddingHorizontal: 8,
      flexDirection:
        "row",
      alignItems: "center",
    },

    statIcon: {
      width: 29,
      height: 29,
      borderRadius: 15,
      backgroundColor:
        "#FFFFFF",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 6,
    },

    statValue: {
      fontSize: 13,
      fontWeight: "900",
      color: "#000000",
    },

    statTotal: {
      fontSize: 10,
      fontWeight: "700",
      color: "#000000",
    },

    statLabel: {
      fontSize: 8,
      marginTop: 1,
      color: "#000000",
    },

    // -----------------------------------------------
    // DETAILS BUTTON
    // -----------------------------------------------

    detailsButton: {
      height: 45,
      borderRadius: 11,
      backgroundColor:
        "#F0EDE4",
      marginTop: 13,
      flexDirection:
        "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 7,
    },

    detailsButtonText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "800",
      color: "#004741",
    },

    // -----------------------------------------------
    // EMPTY
    // -----------------------------------------------

    empty: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 17,
      padding: 30,
      alignItems: "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        "#F0EDE4",
    },

    emptyIcon: {
      width: 65,
      height: 65,
      borderRadius: 33,
      backgroundColor:
        "#F0EDE4",
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 12,
    },

    emptyTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#000000",
    },

    emptyText: {
      marginTop: 5,
      textAlign: "center",
      fontSize: 12,
      lineHeight: 18,
      color: "#000000",
    },

    emptyCreateButton: {
      marginTop: 15,
      height: 44,
      paddingHorizontal: 18,
      borderRadius: 11,
      backgroundColor:
        "#004741",
      flexDirection:
        "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 7,
    },

    emptyCreateText: {
      fontSize: 13,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    // -----------------------------------------------
    // LOADING
    // -----------------------------------------------

    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      padding: 30,
    },

    loadingText: {
      marginTop: 12,
      fontSize: 14,
      fontWeight: "700",
      color: "#000000",
    },

    // -----------------------------------------------
    // ACCESS
    // -----------------------------------------------

    accessDenied: {
      marginTop: 15,
      fontSize: 22,
      fontWeight: "900",
      color: "#000000",
    },

    accessText: {
      marginTop: 7,
      textAlign: "center",
      fontSize: 13,
      color: "#000000",
    },
  });
