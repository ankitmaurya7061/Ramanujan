import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useCourses } from "../../context/CourseContext";
import { Test, useTests } from "../../context/TestContext";

const CLASSES = [6, 7, 8, 9, 10, 11, 12];

export default function AdminTestsScreen() {
  const { tests, addTest, updateTest, deleteTest } = useTests();
  const { courses } = useCourses();
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [duration, setDuration] = useState("10");

  const classCourses = useMemo(() => {
    if (selectedClass === null) return [];
    return courses.filter((course: any) => Number(course.classId) === selectedClass);
  }, [courses, selectedClass]);

  const classCourseIds = useMemo(() => new Set(classCourses.map((course: any) => course.id)), [classCourses]);

  const classTests = useMemo(() => {
    if (selectedClass === null) return [];
    return tests.filter((test) => classCourseIds.has(test.courseId));
  }, [tests, classCourseIds, selectedClass]);

  const resetForm = () => {
    setEditingTest(null);
    setTitle("");
    setDescription("");
    setCourseId("");
    setDuration("10");
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const openCreateModal = () => {
    if (selectedClass === null) {
      Alert.alert("Select Class", "Please select a class first.");
      return;
    }
    if (classCourses.length === 0) {
      Alert.alert("No Course", `No course is available for Class ${selectedClass}. Create a course for this class first.`);
      return;
    }
    setEditingTest(null);
    setTitle("");
    setDescription("");
    setCourseId(classCourses[0].id);
    setDuration("10");
    setModalVisible(true);
  };

  const openEditModal = (test: Test) => {
    setEditingTest(test);
    setTitle(test.title);
    setDescription(test.description);
    setCourseId(test.courseId);
    setDuration(String(test.duration));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (selectedClass === null) return;
    if (!title.trim()) {
      Alert.alert("Error", "Please enter test title.");
      return;
    }
    const selectedCourse = classCourses.find((course: any) => course.id === courseId);
    if (!selectedCourse) {
      Alert.alert("Error", "Please select a course from this class.");
      return;
    }
    const durationNumber = Number(duration);
    if (!duration.trim() || !Number.isFinite(durationNumber) || durationNumber <= 0) {
      Alert.alert("Error", "Please enter a valid duration.");
      return;
    }

    const data = { title: title.trim(), description: description.trim(), courseId, duration: durationNumber };
    const success = editingTest
      ? await updateTest(editingTest.id, data)
      : await addTest(data);

    if (!success) {
      Alert.alert("Error", editingTest ? "Failed to update test." : "Failed to create test.");
      return;
    }
    Alert.alert("Success", editingTest ? "Test updated successfully." : `Test created for Class ${selectedClass}.`);
    closeModal();
  };

  const handleBack = () => {
    if (modalVisible) {
      closeModal();
      return;
    }
    if (selectedClass !== null) {
      setSelectedClass(null);
      resetForm();
      return;
    }
    router.back();
  };

  const getCourseName = (id: string) => courses.find((course) => course.id === id)?.title || "Unknown Course";

  const getClassCounts = (classId: number) => {
    const ids = new Set(courses.filter((course: any) => Number(course.classId) === classId).map((course: any) => course.id));
    return {
      courses: ids.size,
      tests: tests.filter((test) => ids.has(test.courseId)).length,
    };
  };

  if (selectedClass === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={handleBack}><Ionicons name="arrow-back" size={24} color="#000000" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Tests</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.pageTitle}>Tests</Text>
          <Text style={styles.pageSubtitle}>Select a class to manage its tests</Text>
          <View style={styles.grid}>
            {CLASSES.map((classId) => {
              const counts = getClassCounts(classId);
              return (
                <TouchableOpacity key={classId} style={styles.classCard} activeOpacity={0.85} onPress={() => setSelectedClass(classId)}>
                  <View style={styles.classIcon}><Ionicons name="school-outline" size={25} color="#004741" /></View>
                  <View style={styles.flex1}>
                    <Text style={styles.classTitle}>Class {classId}</Text>
                    <Text style={styles.classMeta}>{counts.courses} {counts.courses === 1 ? "Course" : "Courses"}</Text>
                    <Text style={styles.classTests}>{counts.tests} {counts.tests === 1 ? "Test" : "Tests"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#000000" />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={handleBack}><Ionicons name="arrow-back" size={24} color="#000000" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Class {selectedClass} Tests</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}><Ionicons name="add" size={25} color="#FFFFFF" /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View style={styles.flex1}>
            <View style={styles.badge}><Ionicons name="school-outline" size={16} color="#FFFFFF" /><Text style={styles.badgeText}>Class {selectedClass}</Text></View>
            <Text style={styles.pageTitle}>Tests</Text>
            <Text style={styles.pageSubtitle}>Create and manage tests for Class {selectedClass}</Text>
          </View>
          <TouchableOpacity style={styles.newButton} onPress={openCreateModal}><Ionicons name="add" size={19} color="#FFFFFF" /><Text style={styles.newButtonText}>New Test</Text></TouchableOpacity>
        </View>

        {classCourses.length === 0 ? (
          <Empty title={`No Course for Class ${selectedClass}`} text="Create a course for this class before creating a test." />
        ) : classTests.length === 0 ? (
          <Empty title="No Tests Yet" text={`Create the first test for Class ${selectedClass}.`} button onPress={openCreateModal} />
        ) : (
          classTests.map((test) => (
            <View key={test.id} style={styles.testCard}>
              <View style={styles.testTop}>
                <View style={styles.testIcon}><Ionicons name="document-text" size={25} color="#004741" /></View>
                <View style={styles.flex1}>
                  <Text style={styles.testTitle} numberOfLines={2}>{test.title}</Text>
                  <Text style={styles.courseName}>{getCourseName(test.courseId)}</Text>
                </View>
              </View>
              {!!test.description && <Text style={styles.description} numberOfLines={2}>{test.description}</Text>}
              <View style={styles.statsRow}>
                <View style={styles.statItem}><Ionicons name="help-circle-outline" size={17} color="#000000" /><Text style={styles.statText}>{test.questions} Questions</Text></View>
                <View style={styles.statItem}><Ionicons name="time-outline" size={17} color="#000000" /><Text style={styles.statText}>{test.duration} Minutes</Text></View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.questionButton} onPress={() => router.push({ pathname: "/admin/test-questions", params: { testId: test.id } })}><Ionicons name="list-outline" size={18} color="#004741" /><Text style={styles.actionText}>Questions</Text></TouchableOpacity>
                <TouchableOpacity style={styles.resultsButton} onPress={() => router.push({ pathname: "/admin/test-results", params: { testId: test.id } })}><Ionicons name="bar-chart-outline" size={18} color="#004741" /><Text style={styles.actionText}>Results</Text></TouchableOpacity>
                <TouchableOpacity style={styles.smallButton} onPress={() => openEditModal(test)}><Ionicons name="create-outline" size={18} color="#004741" /></TouchableOpacity>
                <TouchableOpacity style={styles.smallButton} onPress={() => Alert.alert("Delete Test", `Are you sure you want to delete "${test.title}"?`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { const ok = await deleteTest(test.id); if (!ok) Alert.alert("Error", "Failed to delete test."); } }])}><Ionicons name="trash-outline" size={18} color="#000000" /></TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.modalTitle}>{editingTest ? "Edit Test" : "Create Test"}</Text><Text style={styles.modalSubtitle}>Class {selectedClass}</Text></View>
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}><Ionicons name="close" size={24} color="#000000" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Test Title</Text>
              <TextInput style={styles.input} placeholder="Enter test title" placeholderTextColor="#777777" value={title} onChangeText={setTitle} />
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, styles.textArea]} placeholder="Enter test description" placeholderTextColor="#777777" value={description} onChangeText={setDescription} multiline textAlignVertical="top" />
              <Text style={styles.label}>Select Course</Text>
              <View style={styles.courseList}>
                {classCourses.map((course: any) => (
                  <TouchableOpacity key={course.id} style={[styles.courseOption, courseId === course.id && styles.courseSelected]} onPress={() => setCourseId(course.id)}>
                    <View style={styles.courseLeft}><View style={styles.courseIcon}><Ionicons name="book-outline" size={17} color="#004741" /></View><View><Text style={[styles.courseText, courseId === course.id && styles.courseTextSelected]}>{course.title}</Text><Text style={styles.courseClass}>Class {selectedClass}</Text></View></View>
                    {courseId === course.id && <Ionicons name="checkmark-circle" size={20} color="#004741" />}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Duration (Minutes)</Text>
              <TextInput style={styles.input} placeholder="Example: 10" placeholderTextColor="#777777" value={duration} onChangeText={setDuration} keyboardType="numeric" />
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}><Text style={styles.saveText}>{editingTest ? "Update Test" : "Create Test"}</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Empty({ title, text, button, onPress }: { title: string; text: string; button?: boolean; onPress?: () => void }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="document-text-outline" size={32} color="#004741" /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text>{button && <TouchableOpacity style={styles.emptyButton} onPress={onPress}><Ionicons name="add" size={18} color="#FFFFFF" /><Text style={styles.emptyButtonText}>Create Test</Text></TouchableOpacity>}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 25, backgroundColor: "#F0EDE4" },
  header: { height: 60, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F0EDE4" },
  iconButton: { width: 42, height: 42, justifyContent: "center", alignItems: "center" },
  headerSpacer: { width: 42, height: 42 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: "#000000" },
  addButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#004741", justifyContent: "center", alignItems: "center" },
  content: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 26, fontWeight: "900", color: "#000000" },
  pageSubtitle: { marginTop: 5, fontSize: 13, lineHeight: 19, color: "#000000", marginBottom: 20 },
  grid: { gap: 12 },
  classCard: { backgroundColor: "#FFFFFF", borderRadius: 16, minHeight: 82, padding: 15, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#F0EDE4" },
  classIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: "#F0EDE4", justifyContent: "center", alignItems: "center", marginRight: 13 },
  classTitle: { fontSize: 17, fontWeight: "800", color: "#000000" },
  classMeta: { marginTop: 3, fontSize: 12, color: "#000000" },
  classTests: { marginTop: 2, fontSize: 12, color: "#004741", fontWeight: "700" },
  flex1: { flex: 1 },
  topRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 },
  badge: { alignSelf: "flex-start", backgroundColor: "#004741", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 },
  badgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  newButton: { height: 42, paddingHorizontal: 13, borderRadius: 10, backgroundColor: "#004741", flexDirection: "row", alignItems: "center", gap: 5 },
  newButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  testCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#F0EDE4" },
  testTop: { flexDirection: "row", alignItems: "center" },
  testIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#F0EDE4", justifyContent: "center", alignItems: "center", marginRight: 12 },
  testTitle: { fontSize: 17, fontWeight: "800", color: "#000000" },
  courseName: { marginTop: 4, fontSize: 12, color: "#004741", fontWeight: "600" },
  description: { marginTop: 12, fontSize: 13, lineHeight: 19, color: "#000000" },
  statsRow: { flexDirection: "row", gap: 18, marginTop: 14 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { fontSize: 12, color: "#000000" },
  actions: { flexDirection: "row", alignItems: "center", marginTop: 15, gap: 8 },
  questionButton: { flex: 1, height: 42, borderRadius: 9, backgroundColor: "#F0EDE4", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  resultsButton: { height: 42, paddingHorizontal: 12, borderRadius: 9, backgroundColor: "#F0EDE4", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  actionText: { fontSize: 12, fontWeight: "700", color: "#004741" },
  smallButton: { width: 42, height: 42, borderRadius: 9, backgroundColor: "#F0EDE4", justifyContent: "center", alignItems: "center" },
  empty: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 35, alignItems: "center", borderWidth: 1, borderColor: "#F0EDE4" },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#F0EDE4", justifyContent: "center", alignItems: "center" },
  emptyTitle: { marginTop: 15, fontSize: 19, fontWeight: "800", color: "#000000", textAlign: "center" },
  emptyText: { marginTop: 7, textAlign: "center", fontSize: 13, lineHeight: 19, color: "#000000" },
  emptyButton: { marginTop: 20, backgroundColor: "#004741", paddingHorizontal: 20, paddingVertical: 11, borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 6 },
  emptyButtonText: { color: "#FFFFFF", fontWeight: "700" },
  overlay: { flex: 1, backgroundColor: "rgba(0,71,65,0.45)", justifyContent: "flex-end" },
  modal: { maxHeight: "90%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#000000" },
  modalSubtitle: { marginTop: 3, fontSize: 12, color: "#004741", fontWeight: "700" },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F0EDE4", justifyContent: "center", alignItems: "center" },
  label: { fontSize: 14, fontWeight: "700", color: "#000000", marginBottom: 7, marginTop: 12 },
  input: { height: 48, borderWidth: 1, borderColor: "#F0EDE4", borderRadius: 10, paddingHorizontal: 14, fontSize: 14, color: "#000000", backgroundColor: "#FFFFFF" },
  textArea: { height: 90, paddingTop: 12 },
  courseList: { gap: 8 },
  courseOption: { minHeight: 58, borderWidth: 1, borderColor: "#F0EDE4", borderRadius: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  courseSelected: { borderColor: "#004741", backgroundColor: "#F0EDE4" },
  courseLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  courseIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", marginRight: 10 },
  courseText: { fontSize: 13, color: "#000000", fontWeight: "600" },
  courseTextSelected: { color: "#004741", fontWeight: "800" },
  courseClass: { marginTop: 2, fontSize: 10, color: "#000000" },
  saveButton: { height: 52, borderRadius: 11, backgroundColor: "#004741", justifyContent: "center", alignItems: "center", marginTop: 24, marginBottom: 20 },
  saveText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
});
