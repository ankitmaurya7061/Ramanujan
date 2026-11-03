import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const API_BASE_URL = "http://192.168.31.222:5000/api";

type ReviewAnswer = {
  questionId: string;
  question: string;
  options: string[];
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  marks: number;
};

type TestResult = {
  id: string;
  testId: string;
  testTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  answers: ReviewAnswer[];
  submittedAt?: string;
};

export default function TestReviewScreen() {
  const router = useRouter();
  const { testId } = useLocalSearchParams<{ testId?: string }>();

  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResult();
  }, [testId]);

  const loadResult = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("studypoint_token");

      if (!token) {
        setResult(null);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/test-results/my-results`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setResult(null);
        return;
      }

      const results = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.data)
        ? data.data
        : [];

      const found = results.find((item: any) => {
        const id =
          item.test?._id?.toString() ||
          item.test?.toString() ||
          item.testId?.toString();

        return id === testId;
      });

      if (!found) {
        setResult(null);
        return;
      }

      const mapped: TestResult = {
        id: found._id?.toString() || found.id || "",
        testId:
          found.test?._id?.toString() ||
          found.test?.toString() ||
          found.testId ||
          "",
        testTitle:
          found.test?.title ||
          found.testTitle ||
          "Test Result",
        score: Number(found.score) || 0,
        totalMarks: Number(found.totalMarks) || 0,
        percentage: Number(found.percentage) || 0,
        answers: Array.isArray(found.answers)
          ? found.answers.map((answer: any) => ({
              questionId: answer.questionId?.toString() || "",
              question: answer.question || "",
              options: Array.isArray(answer.options)
                ? answer.options
                : [],
              selectedAnswer:
                Number.isInteger(Number(answer.selectedAnswer))
                  ? Number(answer.selectedAnswer)
                  : -1,
              correctAnswer:
                Number.isInteger(Number(answer.correctAnswer))
                  ? Number(answer.correctAnswer)
                  : 0,
              isCorrect: Boolean(answer.isCorrect),
              marks: Number(answer.marks) || 1,
            }))
          : [],
        submittedAt:
          found.submittedAt ||
          found.createdAt ||
          undefined,
      };

      setResult(mapped);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getAnswerText = (
    options: string[],
    index: number
  ) => {
    if (index < 0 || index >= options.length) {
      return "Not answered";
    }

    return options[index];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#004741"
          />

          <Text style={styles.loadingText}>
            Loading test result...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="document-text-outline"
              size={42}
              color="#000000"
            />
          </View>

          <Text style={styles.emptyTitle}>
            Result Not Found
          </Text>

          <Text style={styles.emptyText}>
            The submitted test result could not be loaded.
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.replace("/(tabs)/tests")
            }
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.backButtonText}>
              Back to Tests
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const correctCount = result.answers.filter(
    (answer) => answer.isCorrect
  ).length;

  const answeredCount = result.answers.filter(
    (answer) => answer.selectedAnswer >= 0
  ).length;

  const wrongCount = result.answers.filter(
    (answer) =>
      answer.selectedAnswer >= 0 &&
      !answer.isCorrect
  ).length;

  const unansweredCount =
    result.answers.length - answeredCount;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() =>
            router.replace("/(tabs)/tests")
          }
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#000000"
          />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
          >
            Test Result
          </Text>

          <Text
            style={styles.headerSubtitle}
            numberOfLines={1}
          >
            {result.testTitle}
          </Text>
        </View>

        <View style={styles.headerButton}>
          <Ionicons
            name="checkmark-circle-outline"
            size={23}
            color="#004741"
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>
            Your Score
          </Text>

          <Text style={styles.score}>
            {result.score}/{result.totalMarks}
          </Text>

          <Text style={styles.percentage}>
            {result.percentage}%
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {result.answers.length}
            </Text>

            <Text style={styles.summaryLabel}>
              Questions
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, styles.greenText]}>
              {correctCount}
            </Text>

            <Text style={styles.summaryLabel}>
              Correct
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, styles.redText]}>
              {wrongCount}
            </Text>

            <Text style={styles.summaryLabel}>
              Wrong
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {unansweredCount}
            </Text>

            <Text style={styles.summaryLabel}>
              Unanswered
            </Text>
          </View>
        </View>

        <View style={styles.reviewHeader}>
          <View>
            <Text style={styles.reviewTitle}>
              Question Review
            </Text>

            <Text style={styles.reviewSubtitle}>
              Check which answers were correct and wrong.
            </Text>
          </View>

          <View style={styles.reviewCount}>
            <Text style={styles.reviewCountText}>
              {correctCount}/{result.answers.length}
            </Text>
          </View>
        </View>

        {result.answers.length === 0 ? (
          <View style={styles.noAnswersCard}>
            <Ionicons
              name="information-circle-outline"
              size={28}
              color="#004741"
            />

            <Text style={styles.noAnswersTitle}>
              Question review unavailable
            </Text>

            <Text style={styles.noAnswersText}>
              This submission does not contain question-wise
              answer details.
            </Text>
          </View>
        ) : (
          result.answers.map((answer, index) => {
            const selectedText = getAnswerText(
              answer.options,
              answer.selectedAnswer
            );

            const correctText = getAnswerText(
              answer.options,
              answer.correctAnswer
            );

            const unanswered =
              answer.selectedAnswer < 0;

            return (
              <View
                key={`${answer.questionId}-${index}`}
                style={[
                  styles.questionCard,
                  answer.isCorrect
                    ? styles.correctCard
                    : styles.wrongCard,
                ]}
              >
                <View style={styles.questionTop}>
                  <View
                    style={[
                      styles.statusIcon,
                      answer.isCorrect
                        ? styles.correctIcon
                        : styles.wrongIcon,
                    ]}
                  >
                    <Ionicons
                      name={
                        answer.isCorrect
                          ? "checkmark"
                          : "close"
                      }
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>

                  <View style={styles.questionNumberBox}>
                    <Text style={styles.questionNumber}>
                      Q{index + 1}
                    </Text>
                  </View>

                  <View style={styles.statusTextBox}>
                    <Text
                      style={[
                        styles.statusText,
                        answer.isCorrect
                          ? styles.correctText
                          : styles.wrongText,
                      ]}
                    >
                      {answer.isCorrect
                        ? "Correct Answer"
                        : unanswered
                        ? "Not Answered"
                        : "Wrong Answer"}
                    </Text>

                    <Text style={styles.marksText}>
                      {answer.marks} mark
                      {answer.marks > 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>

                <Text style={styles.questionText}>
                  {answer.question}
                </Text>

                <View
                  style={[
                    styles.answerBox,
                    answer.isCorrect
                      ? styles.correctAnswerBox
                      : styles.wrongAnswerBox,
                  ]}
                >
                  <Text style={styles.answerLabel}>
                    Your Answer
                  </Text>

                  <Text
                    style={[
                      styles.answerText,
                      answer.isCorrect
                        ? styles.correctAnswerText
                        : styles.wrongAnswerText,
                    ]}
                  >
                    {selectedText}
                  </Text>
                </View>

                {!answer.isCorrect && (
                  <View style={styles.correctAnswerBox}>
                    <Text style={styles.answerLabel}>
                      Correct Answer
                    </Text>

                    <Text
                      style={[
                        styles.answerText,
                        styles.correctAnswerText,
                      ]}
                    >
                      {correctText}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        <TouchableOpacity
          style={styles.bottomButton}
          activeOpacity={0.85}
          onPress={() =>
            router.replace("/(tabs)/tests")
          }
        >
          <Ionicons
            name="arrow-back"
            size={19}
            color="#FFFFFF"
          />

          <Text style={styles.bottomButtonText}>
            Back to Tests
          </Text>
        </TouchableOpacity>
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
    height: 68,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  headerContent: {
    flex: 1,
    paddingHorizontal: 8,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000000",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#000000",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  scoreCard: {
    backgroundColor: "#004741",
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: "center",
    marginBottom: 14,
  },

  scoreLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F0EDE4",
  },

  score: {
    marginTop: 4,
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  percentage: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#004741",
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000000",
  },

  summaryLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "700",
    color: "#000000",
  },

  divider: {
    width: 1,
    height: 32,
    backgroundColor: "#004741",
  },

  greenText: {
    color: "#004741",
  },

  redText: {
    color: "#004741",
  },

  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  reviewTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000000",
  },

  reviewSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#000000",
  },

  reviewCount: {
    minWidth: 52,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 17,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  reviewCountText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#004741",
  },

  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },

  correctCard: {
    borderColor: "#004741",
  },

  wrongCard: {
    borderColor: "#004741",
  },

  questionTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  correctIcon: {
    backgroundColor: "#004741",
  },

  wrongIcon: {
    backgroundColor: "#004741",
  },

  questionNumberBox: {
    backgroundColor: "#F0EDE4",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  questionNumber: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000000",
  },

  statusTextBox: {
    flex: 1,
    marginLeft: 9,
  },

  statusText: {
    fontSize: 13,
    fontWeight: "900",
  },

  correctText: {
    color: "#004741",
  },

  wrongText: {
    color: "#004741",
  },

  marksText: {
    marginTop: 2,
    fontSize: 10,
    color: "#000000",
    fontWeight: "600",
  },

  questionText: {
    marginTop: 15,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "800",
    color: "#000000",
  },

  answerBox: {
    marginTop: 12,
    borderRadius: 11,
    padding: 12,
    borderWidth: 1,
  },

  correctAnswerBox: {
    backgroundColor: "#F0EDE4",
    borderColor: "#004741",
  },

  wrongAnswerBox: {
    backgroundColor: "#F0EDE4",
    borderColor: "#004741",
  },

  answerLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  answerText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },

  correctAnswerText: {
    color: "#004741",
  },

  wrongAnswerText: {
    color: "#004741",
  },

  noAnswersCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0EDE4",
    padding: 18,
    alignItems: "center",
  },

  noAnswersTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "900",
    color: "#000000",
  },

  noAnswersText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    color: "#000000",
  },

  bottomButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#004741",
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  bottomButtonText: {
    marginLeft: 8,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#000000",
    fontSize: 13,
    fontWeight: "600",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#004741",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyTitle: {
    marginTop: 16,
    fontSize: 21,
    fontWeight: "900",
    color: "#000000",
  },

  emptyText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: "#000000",
  },

  backButton: {
    marginTop: 22,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonText: {
    marginLeft: 8,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});

