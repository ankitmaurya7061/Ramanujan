import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type TestResult = {
  id: string;
  testId: string;
  testTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  attemptedAt: string;
  studentName?: string;
  studentEmail?: string;
  classId?: number;
};

const API_BASE_URL =
  "https://ramanujan-sybq.onrender.com/api";
const TOKEN_KEY = "studypoint_token";

export default function AdminTestResultsScreen() {
  const params = useLocalSearchParams();

  const selectedTestId = params.testId
    ? String(params.testId)
    : "";

  const [selectedClass, setSelectedClass] = useState<number | null>(null);

  const [results, setResults] = useState<TestResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);

  const loadResults = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);

      if (!token) {
        setResults([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/test-results`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setResults([]);
        return;
      }

      const backendResults = Array.isArray(data.results)
        ? data.results
        : [];

      const mappedResults: TestResult[] = backendResults.map((item: any) => {
        const test =
          item.test && typeof item.test === "object"
            ? item.test
            : null;

        return {
          id: item._id?.toString() || item.id || `result-${Date.now()}`,
          testId:
            test?._id?.toString() ||
            item.test?.toString() ||
            item.testId ||
            "",
          testTitle: test?.title || item.testTitle || "Untitled Test",
          score: Number(item.score) || 0,
          totalMarks: Number(item.totalMarks) || 0,
          percentage: Number(item.percentage) || 0,
          correctAnswers: Number(item.correctAnswers) || 0,
          totalQuestions: Number(
            item.totalQuestions || test?.questions?.length || 0
          ),
          attemptedAt:
            item.submittedAt ||
            item.createdAt ||
            item.attemptedAt ||
            new Date().toISOString(),
          studentName:
            item.student?.name || item.studentName || "Unknown Student",
          studentEmail:
            item.student?.email ||
            item.studentEmail ||
            "Email not available",
          classId:
            Number(
              item.student?.classId ??
                item.studentClassId ??
                item.classId
            ) || undefined,
        };
      });

      setResults(mappedResults);
    } catch {
      setResults([]);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadResults();
    setRefreshing(false);
  };

  useEffect(() => {
    setShowAllResults(false);
    setShowAllLeaderboard(false);
  }, [search, selectedTestId, selectedClass]);

  const filteredResults = useMemo(() => {
    let data = [...results];

    if (selectedClass !== null) {
      data = data.filter(
        (result) => Number(result.classId) === selectedClass
      );
    }

    if (selectedTestId) {
      data = data.filter(
        (result) => String(result.testId) === selectedTestId
      );
    }

    const query = search.trim().toLowerCase();

    if (query) {
      data = data.filter((result) => {
        const studentName = result.studentName || "";
        const studentEmail = result.studentEmail || "";
        const testTitle = result.testTitle || "";

        return (
          studentName.toLowerCase().includes(query) ||
          studentEmail.toLowerCase().includes(query) ||
          testTitle.toLowerCase().includes(query)
        );
      });
    }

    data.sort(
      (a, b) =>
        new Date(b.attemptedAt).getTime() -
        new Date(a.attemptedAt).getTime()
    );

    return data;
  }, [results, selectedClass, selectedTestId, search]);

  const totalAttempts = filteredResults.length;

  const averagePercentage =
    totalAttempts > 0
      ? Math.round(
          filteredResults.reduce(
            (sum, result) => sum + Number(result.percentage || 0),
            0
          ) / totalAttempts
        )
      : 0;

  const highestPercentage =
    totalAttempts > 0
      ? Math.max(
          ...filteredResults.map((result) =>
            Number(result.percentage || 0)
          )
        )
      : 0;

  const passedStudents = filteredResults.filter(
    (result) => Number(result.percentage || 0) >= 40
  ).length;

  const leaderboard = useMemo(() => {
    const leaderboardSource = results.filter((result) => {
      const matchesClass =
        selectedClass === null ||
        Number(result.classId) === selectedClass;

      const matchesTest =
        selectedTestId
          ? String(result.testId) === selectedTestId
          : true;

      return matchesClass && matchesTest;
    });

    const studentMap = new Map<
      string,
      {
        studentName: string;
        studentEmail: string;
        totalPercentage: number;
        attempts: number;
        bestScore: number;
      }
    >();

    leaderboardSource.forEach((result) => {
      const email = String(
        result.studentEmail || result.studentName || "unknown"
      ).toLowerCase();

      const existing = studentMap.get(email);

      if (existing) {
        existing.totalPercentage += Number(result.percentage || 0);
        existing.attempts += 1;
        existing.bestScore = Math.max(
          existing.bestScore,
          Number(result.percentage || 0)
        );
      } else {
        studentMap.set(email, {
          studentName: result.studentName || "Unknown Student",
          studentEmail: result.studentEmail || "Email not available",
          totalPercentage: Number(result.percentage || 0),
          attempts: 1,
          bestScore: Number(result.percentage || 0),
        });
      }
    });

    return Array.from(studentMap.values())
      .map((student) => ({
        ...student,
        averageScore: Math.round(
          student.totalPercentage / student.attempts
        ),
      }))
      .sort((a, b) => {
        if (b.averageScore !== a.averageScore) {
          return b.averageScore - a.averageScore;
        }

        if (b.attempts !== a.attempts) {
          return b.attempts - a.attempts;
        }

        return b.bestScore - a.bestScore;
      });
  }, [results, selectedClass, selectedTestId]);

  const visibleLeaderboard = showAllLeaderboard
    ? leaderboard
    : leaderboard.slice(0, 5);

  const visibleResults = showAllResults
    ? filteredResults
    : filteredResults.slice(0, 5);

  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown time";
    }

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 75) {
      return "#004741";
    }

    if (percentage >= 40) {
      return "#004741";
    }

    return "#000000";
  };

  const getPercentageBackground = (percentage: number) => {
    if (percentage >= 75) {
      return "#F0EDE4";
    }

    if (percentage >= 40) {
      return "#F0EDE4";
    }

    return "#F0EDE4";
  };

  const getStatus = (percentage: number) => {
    if (percentage >= 40) {
      return "Passed";
    }

    return "Failed";
  };

  const clearSearch = () => {
    setSearch("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (selectedClass !== null) {
              setSelectedClass(null);
              setSearch("");
            } else {
              router.back();
            }
          }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#000000"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {selectedClass !== null
            ? `Class ${selectedClass} Results`
            : "Test Results"}
        </Text>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons
            name="refresh-outline"
            size={22}
            color="#004741"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {selectedClass === null ? (
          <View style={styles.classSection}>
            <View style={styles.classHeading}>
              <View>
                <Text style={styles.classTitle}>Select Class</Text>
                <Text style={styles.classSubtitle}>
                  View submitted test results class-wise
                </Text>
              </View>
              <View style={styles.classCountBadge}>
                <Text style={styles.classCountText}>6â€“12</Text>
              </View>
            </View>

            <View style={styles.classGrid}>
              {[6, 7, 8, 9, 10, 11, 12].map((classNumber) => {
                const count = results.filter(
                  (result) => Number(result.classId) === classNumber
                ).length;

                return (
                  <TouchableOpacity
                    key={classNumber}
                    style={styles.classCard}
                    onPress={() => setSelectedClass(classNumber)}
                    activeOpacity={0.82}
                  >
                    <View style={styles.classIcon}>
                      <Text style={styles.classIconText}>
                        {classNumber}
                      </Text>
                    </View>

                    <View style={styles.classInfo}>
                      <Text style={styles.classCardTitle}>
                        Class {classNumber}
                      </Text>
                      <Text style={styles.classCardSubtitle}>
                        {count} {count === 1 ? "result" : "results"}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={19}
                      color="#004741"
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {results.some((result) => !result.classId) && (
              <View style={styles.unassignedBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#000000"
                />
                <Text style={styles.unassignedText}>
                  Some older results do not contain class information.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <View style={styles.selectedClassHeader}>
              <TouchableOpacity
                style={styles.classBackButton}
                onPress={() => {
                  setSelectedClass(null);
                  setSearch("");
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-back"
                  size={19}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <View style={styles.selectedClassInfo}>
                <Text style={styles.selectedClassEyebrow}>
                  TEST RESULTS
                </Text>
                <Text style={styles.selectedClassTitle}>
                  Class {selectedClass}
                </Text>
                <Text style={styles.selectedClassSubtitle}>
                  Student submissions and performance
                </Text>
              </View>

              <View style={styles.selectedClassBadge}>
                <Ionicons
                  name="school-outline"
                  size={18}
                  color="#004741"
                />
              </View>
            </View>

            <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons
                name="people-outline"
                size={21}
                color="#004741"
              />
            </View>

            <Text style={styles.statNumber}>
              {totalAttempts}
            </Text>

            <Text style={styles.statLabel}>
              Attempts
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons
                name="stats-chart-outline"
                size={21}
                color="#004741"
              />
            </View>

            <Text style={styles.statNumber}>
              {averagePercentage}%
            </Text>

            <Text style={styles.statLabel}>
              Average
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons
                name="trophy-outline"
                size={21}
                color="#004741"
              />
            </View>

            <Text style={styles.statNumber}>
              {highestPercentage}%
            </Text>

            <Text style={styles.statLabel}>
              Highest
            </Text>
          </View>
        </View>

        {leaderboard.length > 0 && (
          <View style={styles.leaderboardSection}>
            <View style={styles.leaderboardHeader}>
              <View>
                <Text style={styles.leaderboardTitle}>
                  Leaderboard
                </Text>
                <Text style={styles.leaderboardSubtitle}>
                  {selectedTestId
                    ? "Top performers in this test"
                    : "Top students by average score"}
                </Text>
              </View>

              <View style={styles.leaderboardIcon}>
                <Ionicons
                  name="trophy"
                  size={19}
                  color="#004741"
                />
              </View>
            </View>

            <View style={styles.leaderboardCard}>
              {visibleLeaderboard.map((student, index) => {
                const rank = index + 1;
                const rankColors = ["#004741", "#000000", "#004741"];
                const rankBackgrounds = [
                  "#F0EDE4",
                  "#F0EDE4",
                  "#F0EDE4",
                ];

                return (
                  <View
                    key={`${student.studentEmail}-${index}`}
                    style={[
                      styles.leaderboardRow,
                      index < visibleLeaderboard.length - 1 &&
                        styles.leaderboardRowBorder,
                    ]}
                  >
                    <View
                      style={[
                        styles.rankBadge,
                        {
                          backgroundColor:
                            rankBackgrounds[index] || "#F0EDE4",
                        },
                      ]}
                    >
                      {rank <= 3 ? (
                        <Ionicons
                          name="trophy"
                          size={15}
                          color={rankColors[index]}
                        />
                      ) : (
                        <Text style={styles.rankNumber}>
                          {rank}
                        </Text>
                      )}
                    </View>

                    <View style={styles.leaderboardAvatar}>
                      <Text style={styles.leaderboardAvatarText}>
                        {(student.studentName || "S")
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.leaderboardStudent}>
                      <Text
                        style={styles.leaderboardStudentName}
                        numberOfLines={1}
                      >
                        {student.studentName}
                      </Text>

                      <Text style={styles.leaderboardAttempts}>
                        {student.attempts}{" "}
                        {student.attempts === 1
                          ? "attempt"
                          : "attempts"}
                      </Text>
                    </View>

                    <View style={styles.leaderboardScoreBox}>
                      <Text style={styles.leaderboardScore}>
                        {student.averageScore}%
                      </Text>

                      <Text style={styles.leaderboardScoreLabel}>
                        Average
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {leaderboard.length > 5 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() =>
                  setShowAllLeaderboard((value) => !value)
                }
                activeOpacity={0.8}
              >
                <Text style={styles.viewAllButtonText}>
                  {showAllLeaderboard
                    ? "Show Top 5"
                    : `View All (${leaderboard.length})`}
                </Text>

                <Ionicons
                  name={
                    showAllLeaderboard
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={16}
                  color="#004741"
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#000000"
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search student or test..."
            placeholderTextColor="#000000"
            style={styles.searchInput}
          />

          {search.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons
                name="close-circle"
                size={20}
                color="#000000"
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Results
            </Text>

            <Text style={styles.sectionSubtitle}>
              {filteredResults.length} result
              {filteredResults.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        {filteredResults.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="document-text-outline"
                size={48}
                color="#000000"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No Results Found
            </Text>

            <Text style={styles.emptyText}>
              {search
                ? "Try searching with another student name, email or test name."
                : "Student test results will appear here after a test is submitted."}
            </Text>

            {search && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearSearch}
              >
                <Text style={styles.clearButtonText}>
                  Clear Search
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          visibleResults.map((result) => {
            const percentage = Number(
              result.percentage || 0
            );

            const percentageColor =
              getPercentageColor(percentage);

            const percentageBackground =
              getPercentageBackground(percentage);

            return (
              <View
                key={result.id}
                style={styles.resultCard}
              >
                <View style={styles.studentRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(result.studentName || "S")
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.studentInfo}>
                    <Text
                      style={styles.studentName}
                      numberOfLines={1}
                    >
                      {result.studentName ||
                        "Unknown Student"}
                    </Text>

                    <Text
                      style={styles.studentEmail}
                      numberOfLines={1}
                    >
                      {result.studentEmail ||
                        "Email not available"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.scoreBadge,
                      {
                        backgroundColor:
                          percentageBackground,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scoreBadgeText,
                        {
                          color: percentageColor,
                        },
                      ]}
                    >
                      {percentage}%
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.testHeader}>
                  <View style={styles.testIcon}>
                    <Ionicons
                      name="document-text-outline"
                      size={19}
                      color="#004741"
                    />
                  </View>

                  <Text
                    style={styles.testTitle}
                    numberOfLines={2}
                  >
                    {result.testTitle ||
                      "Untitled Test"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        percentageBackground,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          percentageColor,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: percentageColor,
                      },
                    ]}
                  >
                    {getStatus(percentage)}
                  </Text>
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Ionicons
                      name="trophy-outline"
                      size={17}
                      color="#004741"
                    />

                    <View style={styles.statItemInfo}>
                      <Text style={styles.statItemLabel}>
                        Score
                      </Text>

                      <Text style={styles.statItemValue}>
                        {result.score}/{result.totalMarks}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statItem}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={17}
                      color="#004741"
                    />

                    <View style={styles.statItemInfo}>
                      <Text style={styles.statItemLabel}>
                        Correct
                      </Text>

                      <Text style={styles.statItemValue}>
                        {result.correctAnswers}/
                        {result.totalQuestions}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={17}
                      color="#000000"
                    />

                    <View style={styles.statItemInfo}>
                      <Text style={styles.statItemLabel}>
                        Date
                      </Text>

                      <Text style={styles.statItemValue}>
                        {formatDate(result.attemptedAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statItem}>
                    <Ionicons
                      name="time-outline"
                      size={17}
                      color="#000000"
                    />

                    <View style={styles.statItemInfo}>
                      <Text style={styles.statItemLabel}>
                        Time
                      </Text>

                      <Text style={styles.statItemValue}>
                        {formatTime(result.attemptedAt)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {filteredResults.length > 5 && (
          <TouchableOpacity
            style={styles.viewAllResultsButton}
            onPress={() =>
              setShowAllResults((value) => !value)
            }
            activeOpacity={0.8}
          >
            <Text style={styles.viewAllResultsButtonText}>
              {showAllResults
                ? "Show Latest 5"
                : `View All Results (${filteredResults.length})`}
            </Text>

            <Ionicons
              name={
                showAllResults
                  ? "chevron-up"
                  : "chevron-down"
              }
              size={17}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        )}
          </>
        )}
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
    height: 60,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#D6D3CB",
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  refreshButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 19,
    fontWeight: "800",
    color: "#000000",
  },

content: {
  paddingHorizontal: 20,
  paddingTop: 45,
  paddingBottom: 40,
},

  classSection: {
    marginBottom: 22,
  },

  classHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  classTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#000000",
  },

  classSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#000000",
    opacity: 0.55,
  },

  classCountBadge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6D3CB",
  },

  classCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#004741",
  },

  classGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  classCard: {
    width: "48.3%",
    minHeight: 82,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D6D3CB",
  },

  classIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#004741",
    alignItems: "center",
    justifyContent: "center",
  },

  classIconText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },

  classInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 4,
  },

  classCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#000000",
  },

  classCardSubtitle: {
    marginTop: 4,
    fontSize: 10,
    color: "#000000",
    opacity: 0.52,
  },

  unassignedBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6D3CB",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  unassignedText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: "#000000",
    opacity: 0.65,
  },

  selectedClassHeader: {
    minHeight: 92,
    backgroundColor: "#004741",
    borderRadius: 19,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  classBackButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedClassInfo: {
    flex: 1,
    marginLeft: 12,
  },

  selectedClassEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: "#F0EDE4",
    letterSpacing: 1,
  },

  selectedClassTitle: {
    marginTop: 2,
    fontSize: 21,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  selectedClassSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: "#F0EDE4",
    opacity: 0.9,
  },

  selectedClassBadge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 13,
    borderWidth: 1,
    borderColor: "#D6D3CB",
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  statNumber: {
    fontSize: 19,
    fontWeight: "900",
    color: "#000000",
  },

  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#000000",
  },

  leaderboardSection: {
    marginBottom: 20,
  },

  leaderboardHeader: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  leaderboardTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000000",
  },

  leaderboardSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#000000",
  },

  leaderboardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  leaderboardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D6D3CB",
    overflow: "hidden",
  },

  leaderboardRow: {
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  leaderboardRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#D6D3CB",
  },

  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  rankNumber: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000000",
  },

  leaderboardAvatar: {
    width: 34,
    height: 34,
    borderRadius: 19,
    marginLeft: 10,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  leaderboardAvatarText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#004741",
  },

  leaderboardStudent: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },

  leaderboardStudentName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#000000",
  },

  leaderboardAttempts: {
    marginTop: 3,
    fontSize: 10,
    color: "#000000",
    fontWeight: "600",
  },

  leaderboardScoreBox: {
    minWidth: 58,
    alignItems: "flex-end",
  },

  leaderboardScore: {
    fontSize: 15,
    fontWeight: "900",
    color: "#004741",
  },

  leaderboardScoreLabel: {
    marginTop: 2,
    fontSize: 9,
    color: "#000000",
    fontWeight: "600",
  },

  searchBox: {
    height: 46,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D6D3CB",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    fontSize: 14,
    color: "#000000",
  },

  sectionHeader: {
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000000",
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#000000",
  },

  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#D6D3CB",
  },

  studentRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  avatarText: {
    fontSize: 19,
    fontWeight: "900",
    color: "#004741",
  },

  studentInfo: {
    flex: 1,
  },

  studentName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },

  studentEmail: {
    fontSize: 12,
    color: "#000000",
    marginTop: 3,
  },

  scoreBadge: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },

  scoreBadgeText: {
    fontSize: 14,
    fontWeight: "900",
  },

  divider: {
    height: 1,
    backgroundColor: "#D6D3CB",
    marginVertical: 10,
  },

  testHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  testIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  testTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },

  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 13,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  statItem: {
    width: "48%",
    minHeight: 42,
    backgroundColor: "#F0EDE4",
    borderRadius: 11,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  statItemInfo: {
    marginLeft: 7,
    flex: 1,
  },

  statItemLabel: {
    fontSize: 10,
    color: "#000000",
  },

  statItemValue: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: "#000000",
  },

  viewAllButton: {
    marginTop: 10,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6D3CB",
    backgroundColor: "#F0EDE4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  viewAllButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#004741",
  },

  viewAllResultsButton: {
    height: 46,
    borderRadius: 13,
    backgroundColor: "#004741",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 2,
    marginBottom: 10,
  },

  viewAllResultsButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  empty: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 38,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D6D3CB",
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: "800",
    color: "#000000",
  },

  emptyText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#000000",
  },

  clearButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#004741",
  },

  clearButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
