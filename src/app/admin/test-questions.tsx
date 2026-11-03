import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTests } from "../../context/TestContext";

export default function TestQuestionsScreen() {
  const { testId } = useLocalSearchParams<{
    testId?: string;
  }>();

  const {
    tests,
    getTestQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
  } = useTests();

  const test = tests.find((item) => item.id === testId);

  const questions = testId ? getTestQuestions(testId) : [];

  const [modalVisible, setModalVisible] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [question, setQuestion] = useState("");

  const [options, setOptions] = useState(["", "", "", ""]);

  const [correctAnswer, setCorrectAnswer] = useState(0);

  const [marks, setMarks] = useState("1");

  const resetForm = () => {
    setQuestion("");
    setOptions(["", "", "", ""]);
    setCorrectAnswer(0);
    setMarks("1");
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setQuestion(item.question);
    setOptions([...item.options]);
    setCorrectAnswer(item.correctAnswer);
    setMarks(item.marks.toString());
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const updateOption = (index: number, value: string) => {
    const updatedOptions = [...options];
    updatedOptions[index] = value;
    setOptions(updatedOptions);
  };

  const handleSave = async () => {
    if (!testId) {
      Alert.alert("Error", "Test not found.");
      return;
    }

    if (!question.trim()) {
      Alert.alert("Error", "Please enter a question.");
      return;
    }

    const emptyOption = options.some((option) => !option.trim());

    if (emptyOption) {
      Alert.alert("Error", "Please fill all four options.");
      return;
    }

    const marksNumber = Number(marks);

    if (!marks.trim() || isNaN(marksNumber) || marksNumber <= 0) {
      Alert.alert("Error", "Please enter valid marks.");
      return;
    }

    const questionData = {
      testId,
      question: question.trim(),
      options: options.map((option) => option.trim()),
      correctAnswer,
      marks: marksNumber,
    };

    if (editingId) {
      await updateQuestion(editingId, questionData);

      Alert.alert("Success", "Question updated successfully.");
    } else {
      await addQuestion(questionData);

      Alert.alert("Success", "Question added successfully.");
    }

    closeModal();
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Question",
      "Are you sure you want to delete this question?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteQuestion(id);
          },
        },
      ],
    );
  };

  if (!test) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Questions</Text>

          <View style={styles.headerRight} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#000000" />

          <Text style={styles.errorTitle}>Test Not Found</Text>

          <Text style={styles.errorText}>
            The selected test could not be found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Questions
        </Text>

        <TouchableOpacity style={styles.addHeaderButton} onPress={openAddModal}>
          <Ionicons name="add" size={25} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.testHeader}>
          <View style={styles.testIcon}>
            <Ionicons name="document-text" size={28} color="#004741" />
          </View>

          <View style={styles.testHeaderInfo}>
            <Text style={styles.testTitle} numberOfLines={2}>
              {test.title}
            </Text>

            <Text style={styles.testMeta}>
              {questions.length} Questions • {test.duration} Minutes
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Questions</Text>

            <Text style={styles.sectionSubtitle}>
              Add and manage MCQ questions
            </Text>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={19} color="#FFFFFF" />

            <Text style={styles.addButtonText}>Add Question</Text>
          </TouchableOpacity>
        </View>

        {questions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="help-circle-outline" size={55} color="#000000" />

            <Text style={styles.emptyTitle}>No Questions Yet</Text>

            <Text style={styles.emptyText}>
              Add your first MCQ question to this test.
            </Text>

            <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
              <Ionicons name="add" size={18} color="#FFFFFF" />

              <Text style={styles.emptyButtonText}>Add Question</Text>
            </TouchableOpacity>
          </View>
        ) : (
          questions.map((item, index) => (
            <View key={item.id} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <View style={styles.questionNumber}>
                  <Text style={styles.questionNumberText}>{index + 1}</Text>
                </View>

                <View style={styles.questionHeaderInfo}>
                  <Text style={styles.questionText}>{item.question}</Text>

                  <Text style={styles.marksText}>
                    {item.marks} {item.marks === 1 ? "Mark" : "Marks"}
                  </Text>
                </View>
              </View>

              <View style={styles.optionsContainer}>
                {item.options.map((option, optionIndex) => {
                  const isCorrect = optionIndex === item.correctAnswer;

                  return (
                    <View
                      key={optionIndex}
                      style={[
                        styles.optionItem,
                        isCorrect && styles.correctOption,
                      ]}
                    >
                      <View
                        style={[
                          styles.optionLetter,
                          isCorrect && styles.correctOptionLetter,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionLetterText,
                            isCorrect && styles.correctOptionLetterText,
                          ]}
                        >
                          {String.fromCharCode(65 + optionIndex)}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.optionText,
                          isCorrect && styles.correctOptionText,
                        ]}
                      >
                        {option}
                      </Text>

                      {isCorrect && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#004741"
                        />
                      )}
                    </View>
                  );
                })}
              </View>

              <View style={styles.questionActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(item)}
                >
                  <Ionicons name="create-outline" size={18} color="#004741" />

                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#000000" />

                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? "Edit Question" : "Add Question"}
              </Text>

              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={25} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Question</Text>

              <TextInput
                style={[styles.input, styles.questionInput]}
                placeholder="Enter your question"
                placeholderTextColor="#000000"
                value={question}
                onChangeText={setQuestion}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.label}>Options</Text>

              {options.map((option, index) => (
                <View key={index} style={styles.optionInputRow}>
                  <View style={styles.inputLetter}>
                    <Text style={styles.inputLetterText}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>

                  <TextInput
                    style={styles.optionInput}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor="#000000"
                    value={option}
                    onChangeText={(value) => updateOption(index, value)}
                  />
                </View>
              ))}

              <Text style={styles.label}>Correct Answer</Text>

              <View style={styles.answerOptions}>
                {options.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.answerButton,
                      correctAnswer === index && styles.answerButtonSelected,
                    ]}
                    onPress={() => setCorrectAnswer(index)}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        correctAnswer === index && styles.radioOuterSelected,
                      ]}
                    >
                      {correctAnswer === index && (
                        <View style={styles.radioInner} />
                      )}
                    </View>

                    <Text
                      style={[
                        styles.answerButtonText,
                        correctAnswer === index &&
                          styles.answerButtonTextSelected,
                      ]}
                    >
                      Option {String.fromCharCode(65 + index)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Marks</Text>

              <TextInput
                style={styles.input}
                placeholder="Example: 1"
                placeholderTextColor="#000000"
                value={marks}
                onChangeText={setMarks}
                keyboardType="numeric"
              />

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {editingId ? "Update Question" : "Add Question"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EDE4",
    paddingTop: 45,
  },

  header: {
    height: 60,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE4",
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
  },

  headerRight: {
    width: 42,
  },

  addHeaderButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#004741",
    justifyContent: "center",
    alignItems: "center",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  testHeader: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  testIcon: {
    width: 56,
    height: 56,
    borderRadius: 15,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  testHeaderInfo: {
    flex: 1,
    marginLeft: 13,
  },

  testTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
  },

  testMeta: {
    marginTop: 5,
    fontSize: 12,
    color: "#000000",
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000000",
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#000000",
  },

  addButton: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  questionHeader: {
    flexDirection: "row",
  },

  questionNumber: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  questionNumberText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#004741",
  },

  questionHeaderInfo: {
    flex: 1,
    marginLeft: 11,
  },

  questionText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    color: "#000000",
  },

  marksText: {
    marginTop: 5,
    fontSize: 12,
    color: "#000000",
  },

  optionsContainer: {
    marginTop: 15,
    gap: 8,
  },

  optionItem: {
    minHeight: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#F0EDE4",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  correctOption: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0EDE4",
  },

  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  correctOptionLetter: {
    backgroundColor: "#004741",
  },

  optionLetterText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#000000",
  },

  correctOptionLetterText: {
    color: "#FFFFFF",
  },

  optionText: {
    flex: 1,
    fontSize: 13,
    color: "#000000",
  },

  correctOptionText: {
    color: "#004741",
    fontWeight: "700",
  },

  questionActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 15,
  },

  editButton: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    backgroundColor: "#F0EDE4",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },

  editButtonText: {
    color: "#004741",
    fontSize: 13,
    fontWeight: "700",
  },

  deleteButton: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    backgroundColor: "#F0EDE4",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },

  deleteButtonText: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "700",
  },

  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EDE4",
  },

  emptyTitle: {
    marginTop: 15,
    fontSize: 20,
    fontWeight: "800",
    color: "#000000",
  },

  emptyText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 14,
    color: "#000000",
  },

  emptyButton: {
    marginTop: 20,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 9,
    backgroundColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  errorTitle: {
    marginTop: 15,
    fontSize: 20,
    fontWeight: "800",
    color: "#000000",
  },

  errorText: {
    marginTop: 7,
    fontSize: 14,
    color: "#000000",
    textAlign: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,71,65,0.45)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    maxHeight: "92%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#000000",
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 7,
    marginTop: 13,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#F0EDE4",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#000000",
    backgroundColor: "#FFFFFF",
  },

  questionInput: {
    height: 85,
    paddingTop: 12,
  },

  optionInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  inputLetter: {
    width: 34,
    height: 46,
    borderRadius: 9,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  inputLetterText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#004741",
  },

  optionInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: "#F0EDE4",
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 14,
    color: "#000000",
  },

  answerOptions: {
    gap: 8,
  },

  answerButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#F0EDE4",
    borderRadius: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  answerButtonSelected: {
    borderColor: "#004741",
    backgroundColor: "#F0EDE4",
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  radioOuterSelected: {
    borderColor: "#004741",
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#004741",
  },

  answerButtonText: {
    fontSize: 13,
    color: "#000000",
    fontWeight: "600",
  },

  answerButtonTextSelected: {
    color: "#004741",
    fontWeight: "800",
  },

  saveButton: {
    height: 52,
    borderRadius: 11,
    backgroundColor: "#004741",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },

  saveButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
