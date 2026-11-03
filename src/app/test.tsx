import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTests } from "../context/TestContext";
import { useNotifications } from "../context/NotificationContext";

export default function TestScreen() {
  const router = useRouter();

  const { addNotification } = useNotifications();

  const { testId } = useLocalSearchParams<{
    testId?: string;
  }>();

  const {
    tests,
    getTestQuestions,
    saveTestResult,
  } = useTests();

  const test = tests.find((item) => item.id === testId);

  const questions = testId
    ? getTestQuestions(testId)
    : [];

  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [selectedAnswers, setSelectedAnswers] =
    useState<Record<string, number>>({});

  const [timeLeft, setTimeLeft] = useState(
    (test?.duration || 10) * 60
  );

  const [submitted, setSubmitted] = useState(false);

  const [score, setScore] = useState(0);

  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    if (!test) {
      return;
    }

    setTimeLeft(test.duration * 60);
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setSubmitted(false);
    setScore(0);
    autoSubmittedRef.current = false;
  }, [test?.id]);

  useEffect(() => {
    if (submitted || timeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [submitted, timeLeft]);

  useEffect(() => {
    if (
      timeLeft === 0 &&
      !submitted &&
      questions.length > 0 &&
      !autoSubmittedRef.current
    ) {
      autoSubmittedRef.current = true;

      submitTest(true);
    }
  }, [timeLeft, submitted, questions.length]);

  if (!test) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={55}
              color="#004741"
            />
          </View>

          <Text style={styles.errorTitle}>
            Test Not Found
          </Text>

          <Text style={styles.errorText}>
            The test you are looking for does not exist.
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="document-text-outline"
              size={50}
              color="#000000"
            />
          </View>

          <Text style={styles.errorTitle}>
            No Questions Available
          </Text>

          <Text style={styles.errorText}>
            This test does not have any questions yet.
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const question = questions[currentQuestion];

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const selectAnswer = (answerIndex: number) => {
    if (submitted) {
      return;
    }

    setSelectedAnswers((prev) => ({
      ...prev,
      [question.id]: answerIndex,
    }));
  };

  const submitTest = async (autoSubmit = false) => {
    if (submitted) {
      return;
    }

    let calculatedScore = 0;

    questions.forEach((item) => {
      const selected = selectedAnswers[item.id];

      if (selected === item.correctAnswer) {
        calculatedScore += item.marks;
      }
    });

    const calculatedTotalMarks = questions.reduce(
      (total, item) => total + item.marks,
      0
    );

    const calculatedCorrectAnswers =
      questions.filter(
        (item) =>
          selectedAnswers[item.id] ===
          item.correctAnswer
      ).length;

    const calculatedPercentage =
      calculatedTotalMarks > 0
        ? Math.round(
            (calculatedScore /
              calculatedTotalMarks) *
              100
          )
        : 0;

    setScore(calculatedScore);

    const answerDetails = questions.map((item) => {
      const selectedAnswer =
        selectedAnswers[item.id] ?? -1;

      return {
        questionId: item.id,
        question: item.question,
        options: item.options,
        selectedAnswer,
        correctAnswer: item.correctAnswer,
        isCorrect:
          selectedAnswer !== -1 &&
          selectedAnswer === item.correctAnswer,
        marks: item.marks,
      };
    });

    await saveTestResult({
      testId: test.id,
      testTitle: test.title,
      score: calculatedScore,
      totalMarks: calculatedTotalMarks,
      percentage: calculatedPercentage,
      correctAnswers: calculatedCorrectAnswers,
      totalQuestions: questions.length,
      answers: answerDetails,
    });

    await addNotification(
      "Test Completed 🎉",
      `You scored ${calculatedPercentage}% in ${test.title}.`,
      "test"
    );

    setSubmitted(true);

    if (autoSubmit) {
      Alert.alert(
        "Time's Up!",
        `Your test has been submitted automatically.\n\nScore: ${calculatedScore}/${calculatedTotalMarks}`,
        [
          {
            text: "OK",
            onPress: () => {
              router.replace("/(tabs)/tests");
            },
          },
        ]
      );
    }
  };

  const handleSubmit = () => {
    const answeredCount =
      Object.keys(selectedAnswers).length;

    Alert.alert(
      "Submit Test",
      `You have answered ${answeredCount} out of ${questions.length} questions.\n\nDo you want to submit the test?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Submit",
          onPress: () => {
            submitTest(false);
          },
        },
      ]
    );
  };

  const nextQuestion = () => {
    if (
      currentQuestion <
      questions.length - 1
    ) {
      setCurrentQuestion(
        (prev) => prev + 1
      );
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(
        (prev) => prev - 1
      );
    }
  };



  const totalMarks = questions.reduce(
    (total, item) => total + item.marks,
    0
  );

  const percentage =
    totalMarks > 0
      ? Math.round(
          (score / totalMarks) * 100
        )
      : 0;

  if (submitted) {
    const answeredCount =
      Object.keys(selectedAnswers).length;

    const correctCount =
      questions.filter(
        (item) =>
          selectedAnswers[item.id] ===
          item.correctAnswer
      ).length;

    const wrongCount =
      answeredCount - correctCount;

    const unansweredCount =
      questions.length - answeredCount;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.resultContainer
          }
        >
          <View style={styles.resultIcon}>
            <Ionicons
              name={
                percentage >= 50
                  ? "trophy"
                  : "sad-outline"
              }
              size={52}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.resultTitle}>
            Test Completed!
          </Text>

          <Text style={styles.resultSubtitle}>
            {test.title}
          </Text>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>
              Your Score
            </Text>

            <Text style={styles.score}>
              {score}/{totalMarks}
            </Text>

            <View style={styles.percentageBadge}>
              <Text style={styles.percentage}>
                {percentage}%
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.statIcon}>
                <Ionicons
                  name="help-circle-outline"
                  size={20}
                  color="#004741"
                />
              </View>

              <Text style={styles.statNumber}>
                {questions.length}
              </Text>

              <Text style={styles.statLabel}>
                Questions
              </Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.statIcon}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#004741"
                />
              </View>

              <Text style={styles.statNumber}>
                {correctCount}
              </Text>

              <Text style={styles.statLabel}>
                Correct
              </Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.statIcon}>
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color="#004741"
                />
              </View>

              <Text style={styles.statNumber}>
                {wrongCount}
              </Text>

              <Text style={styles.statLabel}>
                Wrong
              </Text>
            </View>
          </View>

          <View style={styles.answerSummary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                Answered
              </Text>

              <Text style={styles.summaryValue}>
                {answeredCount}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                Unanswered
              </Text>

              <Text style={styles.summaryValue}>
                {unansweredCount}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                Total Marks
              </Text>

              <Text style={styles.summaryValue}>
                {totalMarks}
              </Text>
            </View>
          </View>

          <View style={styles.resultMessage}>
            <View style={styles.messageIcon}>
              <Ionicons
                name="bulb-outline"
                size={21}
                color="#004741"
              />
            </View>

            <View style={styles.messageContent}>
              <Text style={styles.resultMessageTitle}>
                {percentage >= 80
                  ? "Excellent! 🎉"
                  : percentage >= 50
                  ? "Good Job! 👍"
                  : "Keep Practicing! 💪"}
              </Text>

              <Text
                style={styles.resultMessageText}
              >
                {percentage >= 80
                  ? "You have a strong understanding of this topic."
                  : percentage >= 50
                  ? "You have a good foundation. Keep learning."
                  : "Review the lessons and try the test again."}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              router.replace("/(tabs)/tests")
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="#000000"
            />

            <Text
              style={styles.secondaryButtonText}
            >
              Back to Tests
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const selectedAnswer =
    selectedAnswers[question.id];

  const answeredCount =
    Object.keys(selectedAnswers).length;

  const progress =
    ((currentQuestion + 1) /
      questions.length) *
    100;

  const isTimeWarning = timeLeft <= 60;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            Alert.alert(
              "Exit Test",
              "Are you sure you want to exit? Your progress will be lost.",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Exit",
                  style: "destructive",
                  onPress: () =>
                    router.back(),
                },
              ]
            );
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="close"
            size={25}
            color="#000000"
          />
        </TouchableOpacity>

        <View style={styles.testHeaderInfo}>
          <Text
            style={styles.testHeaderLabel}
          >
            TEST
          </Text>

          <Text
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {test.title}
          </Text>
        </View>

        <View
          style={[
            styles.timer,
            isTimeWarning &&
              styles.timerDangerBox,
          ]}
        >
          <Ionicons
            name="time-outline"
            size={18}
            color={
              isTimeWarning
                ? "#004741"
                : "#004741"
            }
          />

          <Text
            style={[
              styles.timerText,
              isTimeWarning &&
                styles.timerDanger,
            ]}
          >
            {formatTime(timeLeft)}
          </Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressTop}>
          <View>
            <Text
              style={styles.questionCounter}
            >
              Question {currentQuestion + 1} of{" "}
              {questions.length}
            </Text>

            <Text
              style={styles.progressSubtext}
            >
              {answeredCount} answered
            </Text>
          </View>

          <Text style={styles.progressPercent}>
            {Math.round(progress)}%
          </Text>
        </View>

        <View style={styles.progressBackground}>
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

      <ScrollView
        style={styles.content}
        contentContainerStyle={
          styles.contentContainer
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.questionCard}>
          <View style={styles.questionTop}>
            <View style={styles.questionBadge}>
              <Text
                style={styles.questionBadgeText}
              >
                Q{currentQuestion + 1}
              </Text>
            </View>

            <View style={styles.marksBadge}>
              <Ionicons
                name="star-outline"
                size={14}
                color="#004741"
              />

              <Text style={styles.marksText}>
                {question.marks}{" "}
                {question.marks === 1
                  ? "Mark"
                  : "Marks"}
              </Text>
            </View>
          </View>

          <Text style={styles.questionText}>
            {question.question}
          </Text>
        </View>

        <Text style={styles.chooseText}>
          Choose your answer
        </Text>

        {question.options.map(
          (option, index) => {
            const isSelected =
              selectedAnswer === index;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.option,
                  isSelected &&
                    styles.selectedOption,
                ]}
                onPress={() =>
                  selectAnswer(index)
                }
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.optionLetter,
                    isSelected &&
                      styles.selectedOptionLetter,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLetterText,
                      isSelected &&
                        styles.selectedOptionLetterText,
                    ]}
                  >
                    {String.fromCharCode(
                      65 + index
                    )}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.optionText,
                    isSelected &&
                      styles.selectedOptionText,
                  ]}
                >
                  {option}
                </Text>

                <View
                  style={[
                    styles.radioCircle,
                    isSelected &&
                      styles.selectedRadio,
                  ]}
                >
                  {isSelected && (
                    <View
                      style={styles.radioDot}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          }
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.navigationButton,
            currentQuestion === 0 &&
              styles.disabledButton,
          ]}
          disabled={currentQuestion === 0}
          onPress={previousQuestion}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back"
            size={19}
            color={
              currentQuestion === 0
                ? "#000000"
                : "#004741"
            }
          />

          <Text
            style={[
              styles.navigationText,
              currentQuestion === 0 &&
                styles.disabledText,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>

        {currentQuestion ===
        questions.length - 1 ? (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color="#FFFFFF"
            />

            <Text
              style={styles.submitButtonText}
            >
              Submit Test
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={nextQuestion}
            activeOpacity={0.85}
          >
            <Text
              style={styles.nextButtonText}
            >
              Next
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        )}
      </View>
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
    paddingHorizontal: 15,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#004741",
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  testHeaderInfo: {
    flex: 1,
  },

  testHeaderLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#000000",
  },

  headerTitle: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
  },

  timer: {
    minWidth: 82,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: "#F0EDE4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  timerDangerBox: {
    backgroundColor: "#F0EDE4",
  },

  timerText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#004741",
  },

  timerDanger: {
    color: "#004741",
  },

  progressSection: {
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
  },

  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },

  questionCounter: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },

  progressSubtext: {
    marginTop: 3,
    fontSize: 11,
    color: "#000000",
  },

  progressPercent: {
    fontSize: 15,
    fontWeight: "900",
    color: "#004741",
  },

  progressBackground: {
    height: 7,
    borderRadius: 10,
    backgroundColor: "#004741",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#004741",
  },

  content: {
    flex: 1,
  },

  contentContainer: {
    padding: 18,
    paddingBottom: 20,
  },

  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 19,
    borderWidth: 1,
    borderColor: "#004741",
    marginBottom: 22,
  },

  questionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  questionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F0EDE4",
  },

  questionBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#004741",
  },

  marksBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F0EDE4",
  },

  marksText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#000000",
  },

  questionText: {
    fontSize: 21,
    lineHeight: 30,
    fontWeight: "800",
    color: "#000000",
  },

  chooseText: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },

  option: {
    minHeight: 65,
    marginBottom: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
  },

  selectedOption: {
    backgroundColor: "#F0EDE4",
    borderColor: "#004741",
  },

  optionLetter: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  selectedOptionLetter: {
    backgroundColor: "#004741",
  },

  optionLetterText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000000",
  },

  selectedOptionLetterText: {
    color: "#FFFFFF",
  },

  optionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: "#000000",
  },

  selectedOptionText: {
    color: "#004741",
    fontWeight: "700",
  },

  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#004741",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  selectedRadio: {
    borderColor: "#004741",
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#004741",
  },

  bottomSpace: {
    height: 10,
  },

  bottomBar: {
    minHeight: 72,
    paddingHorizontal: 15,
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  navigationButton: {
    height: 48,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  navigationText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#004741",
  },

  disabledButton: {
    opacity: 0.55,
  },

  disabledText: {
    color: "#000000",
  },

  nextButton: {
    flex: 1,
    maxWidth: 150,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  nextButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  submitButton: {
    flex: 1,
    maxWidth: 170,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  submitButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  center: {
    flex: 1,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  errorIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  errorTitle: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: "800",
    color: "#000000",
  },

  errorText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#000000",
    textAlign: "center",
  },

  backButton: {
    marginTop: 22,
    paddingHorizontal: 28,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#004741",
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  resultContainer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: "center",
  },

  resultIcon: {
    width: 100,
    height: 100,
    marginTop: 20,
    borderRadius: 50,
    backgroundColor: "#004741",
    alignItems: "center",
    justifyContent: "center",
  },

  resultTitle: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: "900",
    color: "#000000",
  },

  resultSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#000000",
    textAlign: "center",
  },

  scoreCard: {
    width: "100%",
    marginTop: 22,
    padding: 24,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#004741",
    alignItems: "center",
  },

  scoreLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
  },

  score: {
    marginTop: 5,
    fontSize: 42,
    fontWeight: "900",
    color: "#004741",
  },

  percentageBadge: {
    marginTop: 5,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#F0EDE4",
  },

  percentage: {
    fontSize: 17,
    fontWeight: "900",
    color: "#004741",
  },

  statsRow: {
    width: "100%",
    marginTop: 12,
    flexDirection: "row",
    gap: 9,
  },

  statBox: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#004741",
    alignItems: "center",
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  statNumber: {
    marginTop: 7,
    fontSize: 19,
    fontWeight: "900",
    color: "#000000",
  },

  statLabel: {
    marginTop: 2,
    fontSize: 10,
    color: "#000000",
  },

  answerSummary: {
    width: "100%",
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryLabel: {
    fontSize: 10,
    color: "#000000",
  },

  summaryValue: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: "900",
    color: "#000000",
  },

  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#004741",
  },

  resultMessage: {
    width: "100%",
    marginTop: 15,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#F0EDE4",
    flexDirection: "row",
  },

  messageIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  messageContent: {
    flex: 1,
    marginLeft: 11,
  },

  resultMessageTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#004741",
  },

  resultMessageText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#000000",
  },




















  primaryButton: {
    width: "100%",
    height: 51,
    marginTop: 20,
    borderRadius: 13,
    backgroundColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  primaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  secondaryButton: {
    width: "100%",
    height: 51,
    marginTop: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#004741",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },
});