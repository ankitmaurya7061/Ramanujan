import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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

type PaymentMode =
  | "cash"
  | "upi"
  | "bank"
  | "cheque";

type Payment = {
  _id?: string;
  amount?: number;
  mode?: string;
  paymentDate?: string;
  reference?: string;
  note?: string;
  status?: string;
  billingMonth?: string;
};

type FeeDetailsResponse = {
  success?: boolean;

  billingMonth?: string;

  monthName?: string;

  student?: {
    _id?: string;
    name?: string;
    email?: string;
    classId?: number;
    profilePhoto?: string;
  };

  fee?: {
    _id?: string;
    classId?: number;
    monthlyFee?: number;
    status?: string;
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

  payments?: Payment[];
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

const formatPaymentDate = (
  value?: string
) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const getModeLabel = (
  mode?: string
) => {
  if (!mode) {
    return "-";
  }

  switch (mode.toLowerCase()) {
    case "cash":
      return "Cash";

    case "upi":
      return "UPI";

    case "bank":
      return "Bank";

    case "cheque":
      return "Cheque";

    case "online":
      return "Online";

    default:
      return mode;
  }
};

export default function FeeDetailsScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      studentId?: string;
      classId?: string;
      billingMonth?: string;
    }>();

  const studentId =
    String(params.studentId || "");

  const classId = Number(
    params.classId || 6
  );

  const initialMonth =
    params.billingMonth ||
    formatMonth(new Date());

  const [
    billingMonth,
    setBillingMonth,
  ] = useState(initialMonth);

  const [data, setData] =
    useState<FeeDetailsResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    paymentModalVisible,
    setPaymentModalVisible,
  ] = useState(false);

  const [amount, setAmount] =
    useState("");

  const [mode, setMode] =
    useState<PaymentMode>("cash");

  const [
    paymentDate,
    setPaymentDate,
  ] = useState(() => {
    const now = new Date();

    return `${now.getFullYear()}-${pad(
      now.getMonth() + 1
    )}-${pad(now.getDate())}`;
  });

  const [reference, setReference] =
    useState("");

  const [note, setNote] =
    useState("");

  const [
    submittingPayment,
    setSubmittingPayment,
  ] = useState(false);

  const loadDetails = async () => {
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

      if (!studentId) {
        Alert.alert(
          "Error",
          "Student ID is missing."
        );

        return;
      }

      const url =
        `${API_BASE_URL}/fees/student/` +
        `${studentId}?billingMonth=` +
        encodeURIComponent(
          billingMonth
        );

      console.log(
        "Loading fee details:",
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
        "Fee details response:",
        result
      );

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Failed to load fee details"
        );
      }

      setData(result);
    } catch (error: any) {
      console.log(
        "Fee details error:",
        error
      );

      Alert.alert(
        "Error",
        error?.message ||
          "Unable to load fee details."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDetails();
    }, [
      studentId,
      billingMonth,
    ])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDetails();
  };

  const student = data?.student;

  const summary = data?.summary;

  const payments = useMemo(() => {
    if (
      !data?.payments ||
      !Array.isArray(
        data.payments
      )
    ) {
      return [];
    }

    return data.payments;
  }, [data]);

  const totalFee = Number(
    summary?.total ||
      data?.fee?.monthlyFee ||
      0
  );

  const paidAmount = Number(
    summary?.paid || 0
  );

  const dueAmount = Number(
    summary?.due || 0
  );

  const status =
    summary?.status === "paid" ||
    summary?.status ===
      "partial" ||
    summary?.status === "due"
      ? summary.status
      : "due";

  const statusColor =
    status === "paid"
      ? COLORS.green
      : status === "partial"
      ? COLORS.orange
      : COLORS.red;

  const statusBackground =
    status === "paid"
      ? "#E8F5EF"
      : status === "partial"
      ? "#FFF4DF"
      : "#FDECEC";

  const goPreviousMonth =
    () => {
      setBillingMonth(
        (current) =>
          changeMonth(
            current,
            -1
          )
      );
    };

  const goNextMonth = () => {
    setBillingMonth(
      (current) =>
        changeMonth(
          current,
          1
        )
    );
  };

  const goCurrentMonth =
    () => {
      setBillingMonth(
        formatMonth(
          new Date()
        )
      );
    };

  const openPaymentModal = () => {
    if (!data?.fee) {
      Alert.alert(
        "Fee Not Configured",
        `Monthly fee for Class ${classId} is not configured.`
      );

      return;
    }

    if (dueAmount <= 0) {
      Alert.alert(
        "Already Paid",
        "There is no pending fee for this month."
      );

      return;
    }

    setAmount(
      String(dueAmount)
    );

    setMode("cash");

    const now = new Date();

    setPaymentDate(
      `${now.getFullYear()}-${pad(
        now.getMonth() + 1
      )}-${pad(now.getDate())}`
    );

    setReference("");

    setNote("");

    setPaymentModalVisible(
      true
    );
  };

  const submitPayment = async () => {
    try {
      const numericAmount =
        Number(amount);

      if (
        !numericAmount ||
        numericAmount <= 0
      ) {
        Alert.alert(
          "Invalid Amount",
          "Please enter a valid payment amount."
        );

        return;
      }

      if (
        numericAmount >
        dueAmount
      ) {
        Alert.alert(
          "Invalid Amount",
          `Maximum payable amount is â‚¹${dueAmount}.`
        );

        return;
      }

      if (!paymentDate) {
        Alert.alert(
          "Payment Date",
          "Please enter payment date."
        );

        return;
      }

      setSubmittingPayment(true);

      const token =
        await AsyncStorage.getItem(
          "fee_admin_token"
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
          `${API_BASE_URL}/fees/payments/offline`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify({
              studentId:
                studentId,

              amount:
                numericAmount,

              billingMonth:
                billingMonth,

              mode: mode,

              paymentDate:
                paymentDate,

              reference:
                reference.trim(),

              note: note.trim(),
            }),
          }
        );

      const result =
        await response.json();

      console.log(
        "Offline payment response:",
        result
      );

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Payment could not be recorded."
        );
      }

      setPaymentModalVisible(
        false
      );

      Alert.alert(
        "Payment Recorded",
        `â‚¹${numericAmount} payment has been recorded successfully.`,
        [
          {
            text: "OK",
            onPress: () => {
              loadDetails();
            },
          },
        ]
      );
    } catch (error: any) {
      console.log(
        "Payment error:",
        error
      );

      Alert.alert(
        "Payment Failed",
        error?.message ||
          "Unable to record payment."
      );
    } finally {
      setSubmittingPayment(
        false
      );
    }
  };

  const renderModeButton = (
    value: PaymentMode,
    label: string,
    icon:
      | "cash-outline"
      | "phone-portrait-outline"
      | "business-outline"
      | "document-text-outline"
  ) => {
    const active =
      mode === value;

    return (
      <Pressable
        onPress={() =>
          setMode(value)
        }
        style={[
          styles.modeButton,
          active &&
            styles.modeButtonActive,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={
            active
              ? COLORS.white
              : COLORS.primary
          }
        />

        <Text
          style={[
            styles.modeText,
            active &&
              styles.modeTextActive,
          ]}
        >
          {label}
        </Text>
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
            Loading fee details...
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
            styles.headerInfo
          }
        >
          <Text
            style={
              styles.headerTitle
            }
          >
            Fee Details
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Class {classId}
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
        {/* STUDENT PROFILE */}

        <View
          style={
            styles.studentCard
          }
        >
          <View
            style={
              styles.avatar
            }
          >
            {student?.profilePhoto ? (
              <View
                style={
                  styles.photoPlaceholder
                }
              >
                <Ionicons
                  name="person"
                  size={30}
                  color={
                    COLORS.primary
                  }
                />
              </View>
            ) : (
              <Text
                style={
                  styles.avatarText
                }
              >
                {(
                  student?.name ||
                  "S"
                )
                  .charAt(0)
                  .toUpperCase()}
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
              {student?.name ||
                "Student"}
            </Text>

            <Text
              style={
                styles.studentEmail
              }
              numberOfLines={1}
            >
              {student?.email ||
                "No email"}
            </Text>

            <View
              style={
                styles.classBadge
              }
            >
              <Ionicons
                name="school-outline"
                size={13}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={
                  styles.classText
                }
              >
                Class {classId}
              </Text>
            </View>
          </View>
        </View>

        {/* MONTH */}

        <View
          style={
            styles.monthCard
          }
        >
          <View
            style={
              styles.monthHeader
            }
          >
            <View>
              <Text
                style={
                  styles.monthSmall
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
                size={24}
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
                size={21}
                color={
                  COLORS.primary
                }
              />
            </Pressable>

            <Pressable
              style={
                styles.currentButton
              }
              onPress={
                goCurrentMonth
              }
            >
              <Text
                style={
                  styles.currentButtonText
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
                size={21}
                color={
                  COLORS.primary
                }
              />
            </Pressable>
          </View>
        </View>

        {/* FEE SUMMARY */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Fee Summary
        </Text>

        <View
          style={
            styles.mainFeeCard
          }
        >
          <View
            style={
              styles.mainFeeTop
            }
          >
            <View>
              <Text
                style={
                  styles.feeLabel
                }
              >
                Monthly Fee
              </Text>

              <Text
                style={
                  styles.feeAmount
                }
              >
                â‚¹{totalFee}
              </Text>
            </View>

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
                {status === "paid"
                  ? "Paid"
                  : status ===
                    "partial"
                  ? "Partial"
                  : "Due"}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.amountSummary
            }
          >
            <View
              style={
                styles.amountBox
              }
            >
              <Text
                style={
                  styles.amountLabel
                }
              >
                Paid
              </Text>

              <Text
                style={[
                  styles.amountValue,
                  {
                    color:
                      COLORS.green,
                  },
                ]}
              >
                â‚¹{paidAmount}
              </Text>
            </View>

            <View
              style={
                styles.amountDivider
              }
            />

            <View
              style={
                styles.amountBox
              }
            >
              <Text
                style={
                  styles.amountLabel
                }
              >
                Due
              </Text>

              <Text
                style={[
                  styles.amountValue,
                  {
                    color:
                      COLORS.red,
                  },
                ]}
              >
                â‚¹{dueAmount}
              </Text>
            </View>
          </View>

          {dueAmount > 0 && (
            <Pressable
              style={
                styles.paymentButton
              }
              onPress={
                openPaymentModal
              }
            >
              <Ionicons
                name="add-circle-outline"
                size={21}
                color={
                  COLORS.white
                }
              />

              <Text
                style={
                  styles.paymentButtonText
                }
              >
                Record Payment
              </Text>
            </Pressable>
          )}
        </View>

        {/* PAYMENT HISTORY */}

        <View
          style={
            styles.historyHeader
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Payment History
          </Text>

          <View
            style={
              styles.paymentCountBadge
            }
          >
            <Text
              style={
                styles.paymentCountText
              }
            >
              {payments.length}
            </Text>
          </View>
        </View>

        {payments.length === 0 ? (
          <View
            style={
              styles.emptyHistory
            }
          >
            <View
              style={
                styles.emptyHistoryIcon
              }
            >
              <Ionicons
                name="receipt-outline"
                size={30}
                color={
                  COLORS.primary
                }
              />
            </View>

            <Text
              style={
                styles.emptyHistoryTitle
              }
            >
              No Payments
            </Text>

            <Text
              style={
                styles.emptyHistoryText
              }
            >
              No payment has been
              recorded for this month.
            </Text>
          </View>
        ) : (
          <View
            style={
              styles.historyContainer
            }
          >
            {payments.map(
              (
                payment,
                index
              ) => (
                <View
                  key={
                    payment._id ||
                    `${index}`
                  }
                  style={
                    styles.paymentCard
                  }
                >
                  <View
                    style={
                      styles.paymentIcon
                    }
                  >
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={
                        COLORS.green
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.paymentInfo
                    }
                  >
                    <View
                      style={
                        styles.paymentTopRow
                      }
                    >
                      <Text
                        style={
                          styles.paymentAmount
                        }
                      >
                        â‚¹
                        {Number(
                          payment.amount ||
                            0
                        )}
                      </Text>

                      <View
                        style={
                          styles.successBadge
                        }
                      >
                        <Text
                          style={
                            styles.successText
                          }
                        >
                          {payment.status ||
                            "success"}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={
                        styles.paymentMode
                      }
                    >
                      {getModeLabel(
                        payment.mode
                      )}
                    </Text>

                    <Text
                      style={
                        styles.paymentDate
                      }
                    >
                      {formatPaymentDate(
                        payment.paymentDate
                      )}
                    </Text>

                    {payment.reference ? (
                      <Text
                        style={
                          styles.referenceText
                        }
                      >
                        Ref:{" "}
                        {
                          payment.reference
                        }
                      </Text>
                    ) : null}

                    {payment.note ? (
                      <Text
                        style={
                          styles.noteText
                        }
                      >
                        {payment.note}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )
            )}
          </View>
        )}

        <View
          style={{
            height: 35,
          }}
        />
      </ScrollView>

      {/* PAYMENT MODAL */}

      <Modal
        visible={
          paymentModalVisible
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setPaymentModalVisible(
            false
          )
        }
      >
        <KeyboardAvoidingView
          style={
            styles.modalOverlay
          }
          behavior={
            Platform.OS ===
            "ios"
              ? "padding"
              : undefined
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Record Payment
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  {student?.name ||
                    "Student"}{" "}
                  â€¢{" "}
                  {data?.monthName ||
                    getMonthLabel(
                      billingMonth
                    )}
                </Text>
              </View>

              <Pressable
                style={
                  styles.modalClose
                }
                onPress={() =>
                  setPaymentModalVisible(
                    false
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={
                    COLORS.black
                  }
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
            >
              {/* AMOUNT */}

              <Text
                style={
                  styles.inputLabel
                }
              >
                Payment Amount
              </Text>

              <View
                style={
                  styles.amountInputWrapper
                }
              >
                <Text
                  style={
                    styles.rupeeSymbol
                  }
                >
                  â‚¹
                </Text>

                <TextInput
                  value={amount}
                  onChangeText={
                    setAmount
                  }
                  placeholder="Enter amount"
                  placeholderTextColor={
                    COLORS.gray
                  }
                  keyboardType="numeric"
                  style={
                    styles.amountInput
                  }
                />
              </View>

              <Text
                style={
                  styles.helperText
                }
              >
                Maximum due: â‚¹
                {dueAmount}
              </Text>

              {/* MODE */}

              <Text
                style={
                  styles.inputLabel
                }
              >
                Payment Mode
              </Text>

              <View
                style={
                  styles.modeGrid
                }
              >
                {renderModeButton(
                  "cash",
                  "Cash",
                  "cash-outline"
                )}

                {renderModeButton(
                  "upi",
                  "UPI",
                  "phone-portrait-outline"
                )}

                {renderModeButton(
                  "bank",
                  "Bank",
                  "business-outline"
                )}

                {renderModeButton(
                  "cheque",
                  "Cheque",
                  "document-text-outline"
                )}
              </View>

              {/* DATE */}

              <Text
                style={
                  styles.inputLabel
                }
              >
                Payment Date
              </Text>

              <TextInput
                value={paymentDate}
                onChangeText={
                  setPaymentDate
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor={
                  COLORS.gray
                }
                style={
                  styles.input
                }
              />

              <Text
                style={
                  styles.helperText
                }
              >
                Format: YYYY-MM-DD
              </Text>

              {/* REFERENCE */}

              <Text
                style={
                  styles.inputLabel
                }
              >
                Reference Number
                <Text
                  style={
                    styles.optionalText
                  }
                >
                  {" "}
                  (Optional)
                </Text>
              </Text>

              <TextInput
                value={reference}
                onChangeText={
                  setReference
                }
                placeholder="UPI ID / transaction / cheque number"
                placeholderTextColor={
                  COLORS.gray
                }
                style={
                  styles.input
                }
              />

              {/* NOTE */}

              <Text
                style={
                  styles.inputLabel
                }
              >
                Note
                <Text
                  style={
                    styles.optionalText
                  }
                >
                  {" "}
                  (Optional)
                </Text>
              </Text>

              <TextInput
                value={note}
                onChangeText={
                  setNote
                }
                placeholder="Add a note"
                placeholderTextColor={
                  COLORS.gray
                }
                style={[
                  styles.input,
                  styles.noteInput,
                ]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* ACTIONS */}

              <View
                style={
                  styles.modalActions
                }
              >
                <Pressable
                  style={
                    styles.cancelButton
                  }
                  onPress={() =>
                    setPaymentModalVisible(
                      false
                    )
                  }
                  disabled={
                    submittingPayment
                  }
                >
                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.savePaymentButton,
                    submittingPayment &&
                      styles.disabledButton,
                  ]}
                  onPress={
                    submitPayment
                  }
                  disabled={
                    submittingPayment
                  }
                >
                  {submittingPayment ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.white
                      }
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={19}
                        color={
                          COLORS.white
                        }
                      />

                      <Text
                        style={
                          styles.savePaymentText
                        }
                      >
                        Save Payment
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              <View
                style={{
                  height: 25,
                }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor:
      "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerInfo: {
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

  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  studentCard: {
    backgroundColor:
      COLORS.white,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor:
      COLORS.lightGray,
    marginBottom: 14,
  },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor:
      COLORS.sand,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  avatarText: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: "800",
  },

  photoPlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      COLORS.sand,
  },

  studentInfo: {
    flex: 1,
  },

  studentName: {
    color: COLORS.black,
    fontSize: 18,
    fontWeight: "800",
  },

  studentEmail: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 3,
  },

  classBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      COLORS.sand,
    borderRadius: 15,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 7,
  },

  classText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 5,
  },

  monthCard: {
    backgroundColor:
      COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor:
      COLORS.lightGray,
    marginBottom: 20,
  },

  monthHeader: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
  },

  monthSmall: {
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

  currentButton: {
    flex: 1,
    height: 42,
    marginHorizontal: 10,
    borderRadius: 12,
    backgroundColor:
      COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  currentButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },

  sectionTitle: {
    color: COLORS.black,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },

  mainFeeCard: {
    backgroundColor:
      COLORS.white,
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor:
      COLORS.lightGray,
    marginBottom: 22,
  },

  mainFeeTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  feeLabel: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: "600",
  },

  feeAmount: {
    color: COLORS.black,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 2,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
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

  amountSummary: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor:
      COLORS.lightGray,
  },

  amountBox: {
    flex: 1,
  },

  amountLabel: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: "600",
  },

  amountValue: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 3,
  },

  amountDivider: {
    width: 1,
    height: 40,
    backgroundColor:
      COLORS.lightGray,
    marginHorizontal: 15,
  },

  paymentButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor:
      COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 17,
  },

  paymentButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 7,
  },

  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  paymentCountBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor:
      COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginBottom: 12,
  },

  paymentCountText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "800",
  },

  emptyHistory: {
    backgroundColor:
      COLORS.white,
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor:
      COLORS.lightGray,
  },

  emptyHistoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor:
      COLORS.sand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyHistoryTitle: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "800",
  },

  emptyHistoryText: {
    color: COLORS.gray,
    fontSize: 12,
    textAlign: "center",
    marginTop: 5,
    lineHeight: 18,
  },

  historyContainer: {
    gap: 10,
  },

  paymentCard: {
    backgroundColor:
      COLORS.white,
    borderRadius: 17,
    padding: 14,
    flexDirection: "row",
    borderWidth: 1,
    borderColor:
      COLORS.lightGray,
  },

  paymentIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      "#E8F5EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  paymentInfo: {
    flex: 1,
  },

  paymentTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  paymentAmount: {
    color: COLORS.black,
    fontSize: 17,
    fontWeight: "800",
  },

  successBadge: {
    backgroundColor:
      "#E8F5EF",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  successText: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  paymentMode: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },

  paymentDate: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 2,
  },

  referenceText: {
    color: COLORS.gray,
    fontSize: 10,
    marginTop: 5,
  },

  noteText: {
    color: COLORS.black,
    fontSize: 11,
    marginTop: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.48)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor:
      COLORS.sand,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "92%",
    paddingTop: 18,
    paddingHorizontal: 18,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    paddingBottom: 16,
  },

  modalTitle: {
    color: COLORS.black,
    fontSize: 21,
    fontWeight: "900",
  },

  modalSubtitle: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 3,
  },

  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },

  inputLabel: {
    color: COLORS.black,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
    marginTop: 13,
  },

  optionalText: {
    color: COLORS.gray,
    fontWeight: "500",
  },

  amountInputWrapper: {
    height: 52,
    backgroundColor:
      COLORS.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor:
      COLORS.lightGray,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  rupeeSymbol: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: "800",
    marginRight: 7,
  },

  amountInput: {
    flex: 1,
    color: COLORS.black,
    fontSize: 17,
    fontWeight: "700",
  },

  input: {
    height: 50,
    backgroundColor:
      COLORS.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor:
      COLORS.lightGray,
    paddingHorizontal: 14,
    color: COLORS.black,
    fontSize: 13,
  },

  noteInput: {
    height: 82,
    paddingTop: 13,
  },

  helperText: {
    color: COLORS.gray,
    fontSize: 10,
    marginTop: 5,
  },

  modeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  modeButton: {
    width: "48%",
    height: 45,
    borderRadius: 12,
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.lightGray,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  modeButtonActive: {
    backgroundColor:
      COLORS.primary,
    borderColor:
      COLORS.primary,
  },

  modeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
  },

  modeTextActive: {
    color: COLORS.white,
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 13,
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.lightGray,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: COLORS.black,
    fontSize: 13,
    fontWeight: "800",
  },

  savePaymentButton: {
    flex: 1.4,
    height: 50,
    borderRadius: 13,
    backgroundColor:
      COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  savePaymentText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 6,
  },

  disabledButton: {
    opacity: 0.6,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor:
      COLORS.sand,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
  },
});
