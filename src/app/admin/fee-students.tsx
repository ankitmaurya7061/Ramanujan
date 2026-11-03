import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  "http://192.168.31.222:5000/api";

const COLORS = {
  primary: "#004741",
  sand: "#F0EDE4",
  black: "#000000",
  white: "#FFFFFF",
  gray: "#707572",
  lightGray: "#E5E2D9",
  green: "#16845F",
  red: "#C62828",
  orange: "#D97706",
};

type FilterType =
  | "all"
  | "paid"
  | "partial"
  | "due";

type StudentResponse = {
  student?: {
    _id?: string;
    name?: string;
    email?: string;
    classId?: number;
    profilePhoto?: string;
  };

  summary?: {
    billingMonth?: string;
    monthName?: string;
    total?: number;
    paid?: number;
    due?: number;
    status?:
      | "paid"
      | "partial"
      | "due";
  };
};

type Student = {
  id: string;
  name: string;
  email: string;
  classId: number;
  profilePhoto: string;
  totalFee: number;
  paidAmount: number;
  dueAmount: number;
  status:
    | "paid"
    | "partial"
    | "due";
};

type FeeResponse = {
  success?: boolean;

  billingMonth?: string;

  monthName?: string;

  fee?: {
    _id?: string;
    classId?: number;
    monthlyFee?: number;
    status?: string;
  };

  summary?: {
    totalStudents?: number;
    paid?: number;
    partial?: number;
    due?: number;
    totalCollected?: number;
    totalDue?: number;
  };

  students?: StudentResponse[];
};

const pad = (value: number) =>
  String(value).padStart(2, "0");

const formatMonth = (date: Date) => {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}`;
};

const getMonthLabel = (
  billingMonth: string
) => {
  if (!billingMonth) {
    return "Current Month";
  }

  const parts =
    billingMonth.split("-");

  if (parts.length !== 2) {
    return billingMonth;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);

  if (!year || !month) {
    return billingMonth;
  }

  return new Date(
    year,
    month - 1,
    1
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

const changeMonth = (
  billingMonth: string,
  amount: number
) => {
  const parts =
    billingMonth.split("-");

  const year = Number(parts[0]);
  const month = Number(parts[1]);

  if (!year || !month) {
    return formatMonth(
      new Date()
    );
  }

  const date = new Date(
    year,
    month - 1 + amount,
    1
  );

  return formatMonth(date);
};

export default function FeeStudentsScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      classId?: string;
    }>();

  const classId = Number(
    params.classId || 6
  );

  const [
    billingMonth,
    setBillingMonth,
  ] = useState(
    formatMonth(new Date())
  );

  const [filter, setFilter] =
    useState<FilterType>("all");

  const [data, setData] =
    useState<FeeResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const loadStudents = async () => {
    try {
      setLoading(true);

      const token =
        await AsyncStorage.getItem(
          "fee_admin_token"
        );

      if (!token) {
        Alert.alert(
          "Session Expired",
          "Please login to Fee Admin again.",
          [
            {
              text: "OK",
              onPress: () =>
                router.replace(
                  "/admin/fee-login"
                ),
            },
          ]
        );

        return;
      }

      const url =
        `${API_BASE_URL}/fees/class/` +
        `${classId}/students?billingMonth=` +
        encodeURIComponent(
          billingMonth
        );

      console.log(
        "Loading fee students:",
        url
      );

      const response =
        await fetch(url, {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${token}`,
            Accept:
              "application/json",
          },
        });

      const result =
        await response.json();

      console.log(
        "Fee students response:",
        result
      );

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Failed to load students"
        );
      }

      setData(result);
    } catch (error: any) {
      console.log(
        "Fee students error:",
        error
      );

      Alert.alert(
        "Error",
        error?.message ||
          "Unable to load fee students."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStudents();
    }, [
      classId,
      billingMonth,
    ])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStudents();
  };

  /*
   * BACKEND RESPONSE:
   *
   * students: [
   *   {
   *     student: {...},
   *     summary: {...}
   *   }
   * ]
   *
   * Convert it into a simple frontend structure.
   */

  const students =
    useMemo<Student[]>(() => {
      if (
        !data?.students ||
        !Array.isArray(
          data.students
        )
      ) {
        return [];
      }

      return data.students
        .filter(
          (item) =>
            item &&
            item.student
        )
        .map((item, index) => {
          const student =
            item.student!;

          const summary =
            item.summary || {};

          const id =
            String(
              student._id ||
                `student-${index}`
            );

          const status =
            summary.status ===
              "paid" ||
            summary.status ===
              "partial" ||
            summary.status ===
              "due"
              ? summary.status
              : "due";

          return {
            id,

            name:
              student.name ||
              "Unknown Student",

            email:
              student.email ||
              "No email",

            classId:
              Number(
                student.classId ||
                  classId
              ),

            profilePhoto:
              student.profilePhoto ||
              "",

            totalFee:
              Number(
                summary.total || 0
              ),

            paidAmount:
              Number(
                summary.paid || 0
              ),

            dueAmount:
              Number(
                summary.due || 0
              ),

            status,
          };
        });
    }, [data, classId]);

  const filteredStudents =
    useMemo(() => {
      if (filter === "all") {
        return students;
      }

      return students.filter(
        (student) =>
          student.status ===
          filter
      );
    }, [students, filter]);

  /*
   * BACKEND SUMMARY:
   *
   * totalStudents
   * paid
   * partial
   * due
   * totalCollected
   * totalDue
   */

  const totalStudents =
    Number(
      data?.summary
        ?.totalStudents ||
        students.length ||
        0
    );

  const paidStudents =
    Number(
      data?.summary?.paid || 0
    );

  const partialStudents =
    Number(
      data?.summary?.partial || 0
    );

  const dueStudents =
    Number(
      data?.summary?.due || 0
    );

  const totalCollected =
    Number(
      data?.summary
        ?.totalCollected || 0
    );

  const totalDue =
    Number(
      data?.summary?.totalDue ||
        0
    );

  const goPreviousMonth =
    () => {
      setBillingMonth(
        (current) =>
          changeMonth(
            current,
            -1
          )
      );

      setFilter("all");
    };

  const goNextMonth = () => {
    setBillingMonth(
      (current) =>
        changeMonth(
          current,
          1
        )
    );

    setFilter("all");
  };

  const goCurrentMonth =
    () => {
      setBillingMonth(
        formatMonth(
          new Date()
        )
      );

      setFilter("all");
    };

  const getStatusColor = (
    status:
      | "paid"
      | "partial"
      | "due"
  ) => {
    if (status === "paid") {
      return COLORS.green;
    }

    if (
      status === "partial"
    ) {
      return COLORS.orange;
    }

    return COLORS.red;
  };

  const getStatusBackground =
    (
      status:
        | "paid"
        | "partial"
        | "due"
    ) => {
      if (status === "paid") {
        return "#E8F5EF";
      }

      if (
        status === "partial"
      ) {
        return "#FFF4DF";
      }

      return "#FDECEC";
    };

  const getStatusLabel = (
    status:
      | "paid"
      | "partial"
      | "due"
  ) => {
    if (status === "paid") {
      return "Paid";
    }

    if (
      status === "partial"
    ) {
      return "Partial";
    }

    return "Due";
  };

  const renderFilter = (
    value: FilterType,
    label: string,
    count: number
  ) => {
    const active =
      filter === value;

    return (
      <Pressable
        onPress={() =>
          setFilter(value)
        }
        style={[
          styles.filterButton,
          active &&
            styles.filterButtonActive,
        ]}
      >
        <Text
          style={[
            styles.filterText,
            active &&
              styles.filterTextActive,
          ]}
        >
          {label}
        </Text>

        <View
          style={[
            styles.filterCount,
            active &&
              styles.filterCountActive,
          ]}
        >
          <Text
            style={[
              styles.filterCountText,
              active &&
                styles.filterCountTextActive,
            ]}
          >
            {count}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (
    loading &&
    !data
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={
            COLORS.primary
          }
        />

        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color={
              COLORS.primary
            }
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading fee students...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          COLORS.primary
        }
      />

      {/* HEADER */}

      <View
        style={styles.header}
      >
        <Pressable
          style={
            styles.backButton
          }
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={
              COLORS.white
            }
          />
        </Pressable>

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
            Class {classId} Fees
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Monthly student fee tracking
          </Text>
        </View>

        <Pressable
          style={
            styles.refreshButton
          }
          onPress={onRefresh}
        >
          <Ionicons
            name="refresh"
            size={21}
            color={
              COLORS.white
            }
          />
        </Pressable>
      </View>

      <ScrollView
        style={
          styles.container
        }
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              onRefresh
            }
            tintColor={
              COLORS.primary
            }
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* MONTH */}

        <View
          style={
            styles.monthCard
          }
        >
          <View
            style={
              styles.monthTopRow
            }
          >
            <View>
              <Text
                style={
                  styles.monthSmallText
                }
              >
                Billing Month
              </Text>

              <Text
                style={
                  styles.monthTitle
                }
              >
                {data?.monthName ||
                  getMonthLabel(
                    billingMonth
                  )}
              </Text>
            </View>

            <View
              style={
                styles.calendarIcon
              }
            >
              <Ionicons
                name="calendar-outline"
                size={25}
                color={
                  COLORS.primary
                }
              />
            </View>
          </View>

          <View
            style={
              styles.monthControls
            }
          >
            <Pressable
              style={
                styles.monthArrow
              }
              onPress={
                goPreviousMonth
              }
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={
                  COLORS.primary
                }
              />
            </Pressable>

            <Pressable
              style={
                styles.currentMonthButton
              }
              onPress={
                goCurrentMonth
              }
            >
              <Text
                style={
                  styles.currentMonthText
                }
              >
                Current Month
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.monthArrow
              }
              onPress={
                goNextMonth
              }
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={
                  COLORS.primary
                }
              />
            </Pressable>
          </View>
        </View>

        {/* MONTHLY FEE */}

        <View
          style={
            styles.feeCard
          }
        >
          <View
            style={
              styles.feeCardLeft
            }
          >
            <View
              style={
                styles.feeIcon
              }
            >
              <Ionicons
                name="cash-outline"
                size={22}
                color={
                  COLORS.white
                }
              />
            </View>

            <View>
              <Text
                style={
                  styles.feeCardLabel
                }
              >
                Monthly Fee
              </Text>

              <Text
                style={
                  styles.feeCardValue
                }
              >
                â‚¹
                {Number(
                  data?.fee
                    ?.monthlyFee ||
                    0
                )}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.activeBadge,
              data?.fee?.status !==
                "active" &&
                styles.inactiveBadge,
            ]}
          >
            <View
              style={[
                styles.activeDot,
                data?.fee?.status !==
                  "active" &&
                  styles.inactiveDot,
              ]}
            />

            <Text
              style={[
                styles.activeText,
                data?.fee?.status !==
                  "active" &&
                  styles.inactiveText,
              ]}
            >
              {data?.fee?.status ===
              "active"
                ? "Active"
                : "Inactive"}
            </Text>
          </View>
        </View>

        {/* SUMMARY */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Fee Summary
        </Text>

        <View
          style={
            styles.summaryGrid
          }
        >
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
                name="people-outline"
                size={20}
                color={
                  COLORS.primary
                }
              />
            </View>

            <Text
              style={
                styles.summaryValue
              }
            >
              {totalStudents}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Students
            </Text>
          </View>

          <View
            style={
              styles.summaryCard
            }
          >
            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor:
                    "#E8F5EF",
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={
                  COLORS.green
                }
              />
            </View>

            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    COLORS.green,
                },
              ]}
            >
              {paidStudents}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Paid
            </Text>
          </View>

          <View
            style={
              styles.summaryCard
            }
          >
            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor:
                    "#FFF4DF",
                },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={20}
                color={
                  COLORS.orange
                }
              />
            </View>

            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    COLORS.orange,
                },
              ]}
            >
              {partialStudents}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Partial
            </Text>
          </View>

          <View
            style={
              styles.summaryCard
            }
          >
            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor:
                    "#FDECEC",
                },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={
                  COLORS.red
                }
              />
            </View>

            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    COLORS.red,
                },
              ]}
            >
              {dueStudents}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Due
            </Text>
          </View>
        </View>

        {/* MONEY */}

        <View
          style={
            styles.moneyCard
          }
        >
          <View
            style={
              styles.moneyItem
            }
          >
            <Text
              style={
                styles.moneyLabel
              }
            >
              Total Collected
            </Text>

            <Text
              style={[
                styles.moneyValue,
                {
                  color:
                    COLORS.green,
                },
              ]}
            >
              â‚¹
              {totalCollected}
            </Text>
          </View>

          <View
            style={
              styles.moneyDivider
            }
          />

          <View
            style={
              styles.moneyItem
            }
          >
            <Text
              style={
                styles.moneyLabel
              }
            >
              Total Due
            </Text>

            <Text
              style={[
                styles.moneyValue,
                {
                  color:
                    COLORS.red,
                },
              ]}
            >
              â‚¹{totalDue}
            </Text>
          </View>
        </View>

        {/* STUDENTS HEADER */}

        <View
          style={
            styles.studentHeader
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Students
          </Text>

          <Text
            style={
              styles.studentCount
            }
          >
            {filteredStudents.length}{" "}
            students
          </Text>
        </View>

        {/* FILTER */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterContainer
          }
        >
          {renderFilter(
            "all",
            "All",
            totalStudents
          )}

          {renderFilter(
            "paid",
            "Paid",
            paidStudents
          )}

          {renderFilter(
            "partial",
            "Partial",
            partialStudents
          )}

          {renderFilter(
            "due",
            "Due",
            dueStudents
          )}
        </ScrollView>

        {/* STUDENT LIST */}

        <View
          style={
            styles.studentsContainer
          }
        >
          {filteredStudents.length ===
          0 ? (
            <View
              style={
                styles.emptyCard
              }
            >
              <View
                style={
                  styles.emptyIcon
                }
              >
                <Ionicons
                  name="people-outline"
                  size={34}
                  color={
                    COLORS.primary
                  }
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
                No students match the
                selected filter for this
                month.
              </Text>
            </View>
          ) : (
            filteredStudents.map(
              (
                student,
                index
              ) => {
                const statusColor =
                  getStatusColor(
                    student.status
                  );

                const statusBackground =
                  getStatusBackground(
                    student.status
                  );

                return (
                  <Pressable
                    key={`${student.id}-${index}`}
                    style={({
                      pressed,
                    }) => [
                      styles.studentCard,
                      pressed &&
                        styles.studentCardPressed,
                    ]}
                    onPress={() => {
                      router.push({
                        pathname:
                          "/admin/fee-details",
                        params: {
                          studentId:
                            student.id,
                          classId:
                            String(
                              classId
                            ),
                          billingMonth:
                            billingMonth,
                        },
                      });
                    }}
                  >
                    {/* SERIAL */}

                    <View
                      style={
                        styles.serialCircle
                      }
                    >
                      <Text
                        style={
                          styles.serialText
                        }
                      >
                        {index + 1}
                      </Text>
                    </View>

                    {/* STUDENT */}

                    <View
                      style={
                        styles.studentInfo
                      }
                    >
                      <Text
                        style={
                          styles.studentName
                        }
                        numberOfLines={
                          1
                        }
                      >
                        {student.name}
                      </Text>

                      <Text
                        style={
                          styles.studentEmail
                        }
                        numberOfLines={
                          1
                        }
                      >
                        {student.email}
                      </Text>

                      <View
                        style={
                          styles.amountRow
                        }
                      >
                        <Text
                          style={
                            styles.amountText
                          }
                        >
                          Paid: â‚¹
                          {
                            student.paidAmount
                          }
                        </Text>

                        <Text
                          style={[
                            styles.amountText,
                            {
                              color:
                                COLORS.red,
                            },
                          ]}
                        >
                          Due: â‚¹
                          {
                            student.dueAmount
                          }
                        </Text>
                      </View>
                    </View>

                    {/* STATUS */}

                    <View
                      style={
                        styles.studentRight
                      }
                    >
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              statusBackground,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor:
                                statusColor,
                            },
                          ]}
                        />

                        <Text
                          style={[
                            styles.statusText,
                            {
                              color:
                                statusColor,
                            },
                          ]}
                        >
                          {getStatusLabel(
                            student.status
                          )}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.totalFee
                        }
                      >
                        â‚¹
                        {
                          student.totalFee
                        }
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={
                          COLORS.gray
                        }
                      />
                    </View>
                  </Pressable>
                );
              }
            )
          )}
        </View>

        <View
          style={{
            height: 35,
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      COLORS.sand,
  },

  container: {
    flex: 1,
    backgroundColor:
      COLORS.sand,
  },

  content: {
    padding: 16,
    paddingBottom: 30,
  },

  header: {
    height: 72,
    backgroundColor:
      COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,0.12)",
  },

  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,0.12)",
  },

  headerTextContainer: {
    flex: 1,
    marginHorizontal: 12,
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#DCE9E7",
    fontSize: 12,
    marginTop: 2,
  },

  monthCard: {
    backgroundColor:
      COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor:
      COLORS.lightGray,
  },

  monthTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  monthSmallText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: "600",
  },

  monthTitle: {
    color: COLORS.black,
    fontSize: 21,
    fontWeight: "800",
    marginTop: 3,
  },

  calendarIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor:
      COLORS.sand,
    alignItems: "center",
    justifyContent: "center",
  },

  monthControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginTop: 16,
  },

  monthArrow: {
    width: 44,
    height: 42,
    borderRadius: 12,
    backgroundColor:
      COLORS.sand,
    alignItems: "center",
    justifyContent: "center",
  },

  currentMonthButton: {
    flex: 1,
    height: 42,
    marginHorizontal: 10,
    borderRadius: 12,
    backgroundColor:
      COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  currentMonthText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 13,
  },

  feeCard: {
    backgroundColor:
      COLORS.primary,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 20,
  },

  feeCardLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  feeIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor:
      "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  feeCardLabel: {
    color: "#DCE9E7",
    fontSize: 12,
    fontWeight: "600",
  },

  feeCardValue: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      "#E8F5EF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  inactiveBadge: {
    backgroundColor:
      "#FDECEC",
  },

  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      COLORS.green,
    marginRight: 6,
  },

  inactiveDot: {
    backgroundColor:
      COLORS.red,
  },

  activeText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: "800",
  },

  inactiveText: {
    color: COLORS.red,
  },

  sectionTitle: {
    color: COLORS.black,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent:
      "space-between",
    marginBottom: 14,
  },

  summaryCard: {
    width: "48.5%",
    backgroundColor:
      COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor:
      COLORS.lightGray,
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor:
      "#E8F0EF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  summaryValue: {
    color: COLORS.black,
    fontSize: 22,
    fontWeight: "800",
  },

  summaryLabel: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },

  moneyCard: {
    backgroundColor:
      COLORS.white,
    borderRadius: 17,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    borderWidth: 1,
    borderColor:
      COLORS.lightGray,
  },

  moneyItem: {
    flex: 1,
  },

  moneyLabel: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: "600",
  },

  moneyValue: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },

  moneyDivider: {
    width: 1,
    height: 42,
    backgroundColor:
      COLORS.lightGray,
    marginHorizontal: 14,
  },

  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  studentCount: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
  },

  filterContainer: {
    paddingBottom: 14,
  },

  filterButton: {
    height: 40,
    borderRadius: 20,
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.lightGray,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingLeft: 14,
    marginRight: 8,
  },

  filterButtonActive: {
    backgroundColor:
      COLORS.primary,
    borderColor:
      COLORS.primary,
  },

  filterText: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "700",
  },

  filterTextActive: {
    color: COLORS.white,
  },

  filterCount: {
    minWidth: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor:
      COLORS.sand,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },

  filterCountActive: {
    backgroundColor:
      "rgba(255,255,255,0.18)",
  },

  filterCountText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
  },

  filterCountTextActive: {
    color: COLORS.white,
  },

  studentsContainer: {
    gap: 10,
  },

  studentCard: {
    backgroundColor:
      COLORS.white,
    borderRadius: 17,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor:
      COLORS.lightGray,
  },

  studentCardPressed: {
    opacity: 0.75,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  serialCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor:
      COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  serialText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "800",
  },

  studentInfo: {
    flex: 1,
    minWidth: 0,
  },

  studentName: {
    color: COLORS.black,
    fontSize: 15,
    fontWeight: "800",
  },

  studentEmail: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 2,
  },

  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    gap: 9,
  },

  amountText: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: "700",
  },

  studentRight: {
    alignItems: "flex-end",
    marginLeft: 8,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  totalFee: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
    marginBottom: 3,
  },

  emptyCard: {
    backgroundColor:
      COLORS.white,
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor:
      COLORS.lightGray,
  },

  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor:
      COLORS.sand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    color: COLORS.black,
    fontSize: 17,
    fontWeight: "800",
  },

  emptyText: {
    color: COLORS.gray,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 6,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      COLORS.sand,
  },

  loadingText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
  },
});
