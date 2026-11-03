import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "http://192.168.31.222:5000/api";
const TOKEN_KEY = "studypoint_token";

type Student = {
  _id: string;
  name: string;
  email: string;
  profilePhoto?: string;
  role?: string;
};

type NotificationType =
  | "general"
  | "course"
  | "test"
  | "attendance"
  | "announcement";

const notificationTypes: {
  value: NotificationType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: "general",
    label: "General",
    icon: "notifications-outline",
  },
  {
    value: "announcement",
    label: "Announcement",
    icon: "megaphone-outline",
  },
  {
    value: "course",
    label: "Course",
    icon: "book-outline",
  },
  {
    value: "test",
    label: "Test",
    icon: "document-text-outline",
  },
  {
    value: "attendance",
    label: "Attendance",
    icon: "calendar-outline",
  },
];

export default function AdminNotificationsScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [target, setTarget] = useState<"all" | "specific">("all");
  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null);
  const [type, setType] =
    useState<NotificationType>("general");
  const [studentSearch, setStudentSearch] = useState("");
  const [loadingStudents, setLoadingStudents] =
    useState(true);
  const [sending, setSending] = useState(false);

  const loadStudents = async () => {
    try {
      setLoadingStudents(true);

      const token =
        await AsyncStorage.getItem(TOKEN_KEY);

      if (!token) {
        setStudents([]);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load students"
        );
      }

      const users = Array.isArray(data.users)
        ? data.users
        : [];

      const studentUsers = users.filter(
        (user: Student) =>
          user.role === "student" ||
          user.role === "user"
      );

      setStudents(studentUsers);
    } catch (error) {
      setStudents([]);

      Alert.alert(
        "Error",
        "Unable to load students."
      );
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const filteredStudents = students.filter(
    (student) => {
      const query =
        studentSearch.trim().toLowerCase();

      if (!query) {
        return true;
      }

      return (
        student.name
          ?.toLowerCase()
          .includes(query) ||
        student.email
          ?.toLowerCase()
          .includes(query)
      );
    }
  );

  const handleSend = async () => {
    if (!title.trim()) {
      Alert.alert(
        "Missing Title",
        "Please enter notification title."
      );
      return;
    }

    if (!message.trim()) {
      Alert.alert(
        "Missing Message",
        "Please enter notification message."
      );
      return;
    }

    if (
      target === "specific" &&
      !selectedStudent
    ) {
      Alert.alert(
        "Select Student",
        "Please select a student first."
      );
      return;
    }

    if (
      target === "all" &&
      students.length === 0
    ) {
      Alert.alert(
        "No Students",
        "There are no students available."
      );
      return;
    }

    try {
      setSending(true);

      const token =
        await AsyncStorage.getItem(TOKEN_KEY);

      if (!token) {
        Alert.alert(
          "Session Expired",
          "Please login again."
        );
        return;
      }

      const body =
        target === "all"
          ? {
              sendTo: "all",
              title: title.trim(),
              message: message.trim(),
              type,
              relatedType: "none",
            }
          : {
              userId: selectedStudent!._id,
              title: title.trim(),
              message: message.trim(),
              type,
              relatedType: "none",
            };

      const response = await fetch(
        `${API_BASE_URL}/notifications`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to send notification"
        );
      }

      Alert.alert(
        "Success",
        target === "all"
          ? `Notification sent to ${students.length} students.`
          : `Notification sent to ${selectedStudent!.name}.`
      );

      setTitle("");
      setMessage("");
      setSelectedStudent(null);
      setTarget("all");
      setType("general");
      setStudentSearch("");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message ||
          "Unable to send notification."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#000000"
          />
        </Pressable>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            Notifications
          </Text>

          <Text style={styles.headerSubtitle}>
            Send updates to students
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="notifications-outline"
            size={22}
            color="#004741"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="create-outline"
                size={21}
                color="#004741"
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Create Notification
              </Text>

              <Text style={styles.sectionSubtitle}>
                Send an update directly to students
              </Text>
            </View>
          </View>

          <Text style={styles.label}>
            Notification Title
          </Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Enter notification title"
            placeholderTextColor="#000000"
            maxLength={150}
            style={styles.input}
          />

          <Text style={styles.characterCount}>
            {title.length}/150
          </Text>

          <Text style={styles.label}>
            Message
          </Text>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Enter notification message"
            placeholderTextColor="#000000"
            multiline
            maxLength={1000}
            textAlignVertical="top"
            style={[
              styles.input,
              styles.messageInput,
            ]}
          />

          <Text style={styles.characterCount}>
            {message.length}/1000
          </Text>

          <Text style={styles.label}>
            Notification Type
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.typeRow
            }
          >
            {notificationTypes.map(
              (item) => {
                const active =
                  type === item.value;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() =>
                      setType(item.value)
                    }
                    style={[
                      styles.typeButton,
                      active &&
                        styles.typeButtonActive,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={17}
                      color={
                        active
                          ? "#FFFFFF"
                          : "#004741"
                      }
                    />

                    <Text
                      style={[
                        styles.typeText,
                        active &&
                          styles.typeTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </ScrollView>

          <Text style={styles.label}>
            Send To
          </Text>

          <View style={styles.targetRow}>
            <Pressable
              onPress={() => {
                setTarget("all");
                setSelectedStudent(null);
              }}
              style={[
                styles.targetButton,
                target === "all" &&
                  styles.targetButtonActive,
              ]}
            >
              <Ionicons
                name="people"
                size={20}
                color={
                  target === "all"
                    ? "#FFFFFF"
                    : "#004741"
                }
              />

              <Text
                style={[
                  styles.targetText,
                  target === "all" &&
                    styles.targetTextActive,
                ]}
              >
                All Students
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                setTarget("specific")
              }
              style={[
                styles.targetButton,
                target === "specific" &&
                  styles.targetButtonActive,
              ]}
            >
              <Ionicons
                name="person"
                size={20}
                color={
                  target === "specific"
                    ? "#FFFFFF"
                    : "#004741"
                }
              />

              <Text
                style={[
                  styles.targetText,
                  target === "specific" &&
                    styles.targetTextActive,
                ]}
              >
                Specific Student
              </Text>
            </Pressable>
          </View>

          {target === "all" && (
            <View style={styles.infoBox}>
              <Ionicons
                name="information-circle"
                size={22}
                color="#004741"
              />

              <Text style={styles.infoText}>
                This notification will be sent to
                all {students.length} registered
                students.
              </Text>
            </View>
          )}

          {target === "specific" && (
            <View style={styles.studentSection}>
              <Text style={styles.label}>
                Select Student
              </Text>

              <View style={styles.searchBox}>
                <Ionicons
                  name="search-outline"
                  size={19}
                  color="#000000"
                />

                <TextInput
                  value={studentSearch}
                  onChangeText={setStudentSearch}
                  placeholder="Search student..."
                  placeholderTextColor="#000000"
                  style={styles.searchInput}
                />

                {studentSearch.length > 0 && (
                  <Pressable
                    onPress={() =>
                      setStudentSearch("")
                    }
                  >
                    <Ionicons
                      name="close-circle"
                      size={19}
                      color="#000000"
                    />
                  </Pressable>
                )}
              </View>

              {loadingStudents ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator
                    size="small"
                    color="#004741"
                  />

                  <Text style={styles.loadingText}>
                    Loading students...
                  </Text>
                </View>
              ) : filteredStudents.length ===
                0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons
                    name="people-outline"
                    size={30}
                    color="#000000"
                  />

                  <Text style={styles.emptyText}>
                    No students found.
                  </Text>
                </View>
              ) : (
                <View>
                  {filteredStudents.map(
                    (student) => {
                      const isSelected =
                        selectedStudent?._id ===
                        student._id;

                      return (
                        <Pressable
                          key={student._id}
                          onPress={() =>
                            setSelectedStudent(
                              student
                            )
                          }
                          style={[
                            styles.studentItem,
                            isSelected &&
                              styles.studentItemSelected,
                          ]}
                        >
                          <View style={styles.avatar}>
                            {student.profilePhoto ? (
                              <View
                                style={
                                  styles.photoPlaceholder
                                }
                              >
                                <Text
                                  style={
                                    styles.avatarText
                                  }
                                >
                                  {student.name
                                    ?.charAt(0)
                                    .toUpperCase() ||
                                    "S"}
                                </Text>
                              </View>
                            ) : (
                              <Text
                                style={
                                  styles.avatarText
                                }
                              >
                                {student.name
                                  ?.charAt(0)
                                  .toUpperCase() ||
                                  "S"}
                              </Text>
                            )}
                          </View>

                          <View
                            style={
                              styles.studentInfo
                            }
                          >
                            <Text
                              style={
                                styles.studentName
                              }
                              numberOfLines={1}
                            >
                              {student.name}
                            </Text>

                            <Text
                              style={
                                styles.studentEmail
                              }
                              numberOfLines={1}
                            >
                              {student.email}
                            </Text>
                          </View>

                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={24}
                              color="#004741"
                            />
                          )}
                        </Pressable>
                      );
                    }
                  )}
                </View>
              )}
            </View>
          )}

          <Pressable
            onPress={handleSend}
            disabled={sending}
            style={[
              styles.sendButton,
              sending &&
                styles.sendButtonDisabled,
            ]}
          >
            {sending ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color="#FFFFFF"
              />
            )}

            <Text style={styles.sendButtonText}>
              {sending
                ? "Sending..."
                : "Send Notification"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons
              name="bulb-outline"
              size={23}
              color="#004741"
            />
          </View>

          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>
              Notification System
            </Text>

            <Text style={styles.tipText}>
              Notifications are stored in MongoDB
              and will appear in the student's
              Notifications section as unread.
            </Text>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#D6D3CB",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  headerInfo: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#000000",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#000000",
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: "#D6D3CB",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#000000",
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 7,
    marginTop: 16,
  },

  input: {
    borderWidth: 1,
    borderColor: "#D6D3CB",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: "#000000",
    backgroundColor: "#FFFFFF",
  },

  messageInput: {
    minHeight: 105,
    paddingTop: 12,
  },

  characterCount: {
    textAlign: "right",
    marginTop: 4,
    fontSize: 10,
    color: "#000000",
  },

  typeRow: {
    gap: 8,
    paddingRight: 4,
  },

  typeButton: {
    height: 39,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#004741",
    backgroundColor: "#F0EDE4",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  typeButtonActive: {
    backgroundColor: "#004741",
    borderColor: "#004741",
  },

  typeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#004741",
  },

  typeTextActive: {
    color: "#FFFFFF",
  },

  targetRow: {
    flexDirection: "row",
    gap: 9,
  },

  targetButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#F0EDE4",
  },

  targetButtonActive: {
    backgroundColor: "#004741",
    borderColor: "#004741",
  },

  targetText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#004741",
  },

  targetTextActive: {
    color: "#FFFFFF",
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    padding: 12,
    borderRadius: 11,
    backgroundColor: "#F0EDE4",
    gap: 9,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#004741",
  },

  studentSection: {
    marginTop: 1,
  },

  searchBox: {
    height: 44,
    borderWidth: 1,
    borderColor: "#D6D3CB",
    borderRadius: 11,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: "#000000",
  },

  loadingBox: {
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  loadingText: {
    fontSize: 12,
    color: "#000000",
  },

  studentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#D6D3CB",
    marginBottom: 7,
    backgroundColor: "#FFFFFF",
  },

  studentItemSelected: {
    borderColor: "#004741",
    backgroundColor: "#F0EDE4",
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#004741",
  },

  studentInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },

  studentName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },

  studentEmail: {
    fontSize: 11,
    color: "#000000",
    marginTop: 2,
  },

  emptyBox: {
    padding: 22,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D6D3CB",
  },

  emptyText: {
    marginTop: 7,
    color: "#000000",
    fontSize: 13,
  },

  sendButton: {
    marginTop: 20,
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: "#004741",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  sendButtonDisabled: {
    opacity: 0.6,
  },

  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  tipCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 15,
    backgroundColor: "#F0EDE4",
    flexDirection: "row",
    gap: 11,
  },

  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  tipContent: {
    flex: 1,
  },

  tipTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#004741",
    marginBottom: 4,
  },

  tipText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#004741",
  },
});

