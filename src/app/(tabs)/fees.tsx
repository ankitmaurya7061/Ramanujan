
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RazorpayCheckout from "react-native-razorpay";
import { getApiUrl } from "../../services/api";

const COLORS = {
  primary: "#004741",
  sand: "#F0EDE4",
  black: "#000000",
  white: "#FFFFFF",
};

type Payment = {
  _id?: string;
  amount: number;
  mode: string;
  paymentDate: string;
  billingMonth: string;
  reference?: string;
  status?: string;
};

type FeeSummary = {
  total: number;
  paid: number;
  due: number;
  status: string;
};

type FeeData = {
  summary: FeeSummary;
  payments?: Payment[];
  fee?: {
    monthlyFee?: number;
    classId?: number;
  };
  monthName?: string;
};

type RazorpayOrderResponse = {
  order: {
    id: string;
    amount: number;
    currency: string;
  };
  keyId: string;
  fee: {
    monthlyFee: number;
    paid: number;
    due: number;
    billingMonth: string;
  };
  student: {
    name: string;
    email: string;
  };
};

const getBillingMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const getMonthName = (billingMonth: string) => {
  const [year, month] = billingMonth.split("-");

  return new Date(
    Number(year),
    Number(month) - 1,
    1
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

const changeMonth = (
  billingMonth: string,
  direction: number
) => {
  const [year, month] = billingMonth.split("-");

  const date = new Date(
    Number(year),
    Number(month) - 1 + direction,
    1
  );

  return getBillingMonth(date);
};

export default function FeesScreen() {
  const [billingMonth, setBillingMonth] = useState(
    getBillingMonth(new Date())
  );

  const [feeData, setFeeData] = useState<FeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const loadFee = async (month: string) => {
    try {
      setLoading(true);
      setError("");

      const token = await AsyncStorage.getItem(
        "studypoint_token"
      );

      if (!token) {
        setFeeData(null);
        setError("Please login again.");
        return;
      }

      const apiUrl = getApiUrl();

      const response = await fetch(
        `${apiUrl}/fees/my?billingMonth=${month}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to load fee details"
        );
      }

      setFeeData(data);
    } catch (err: unknown) {
      console.error("Load Student Fee Error:", err);
      setFeeData(null);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load fee details"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFee(billingMonth);
  }, [billingMonth]);

  const goPreviousMonth = () => {
    setBillingMonth(changeMonth(billingMonth, -1));
  };

  // Allow selecting future months for advance payment.
  const goNextMonth = () => {
    setBillingMonth(changeMonth(billingMonth, 1));
  };

  const handlePayment = async () => {
    if (paying) return;

    if (!feeData?.summary) {
      Alert.alert(
        "Fee Error",
        "Fee details are not available."
      );
      return;
    }

    if (feeData.summary.due <= 0) {
      Alert.alert(
        "No Due",
        "This month's fee is already fully paid."
      );
      return;
    }

    try {
      setPaying(true);
      setError("");

      const apiUrl = getApiUrl();
      const token = await AsyncStorage.getItem(
        "studypoint_token"
      );

      if (!token) {
        Alert.alert(
          "Login Required",
          "Please login again."
        );
        return;
      }

      // STEP 1: Create Razorpay order on backend.
      console.log("PAYMENT: Creating order");
      console.log("PAYMENT: API URL", apiUrl);
      console.log("PAYMENT: Billing month", billingMonth);

      const orderResponse = await fetch(
        `${apiUrl}/payments/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            billingMonth,
          }),
        }
      );

      const orderText = await orderResponse.text();

      console.log(
        "PAYMENT: Create-order HTTP status",
        orderResponse.status
      );
      console.log(
        "PAYMENT: Create-order response",
        orderText
      );

      let orderData: any;

      try {
        orderData = JSON.parse(orderText);
      } catch {
        throw new Error(
          `Create-order API returned an invalid response (HTTP ${orderResponse.status}).`
        );
      }

      if (!orderResponse.ok) {
        throw new Error(
          orderData?.message ||
            `Unable to create payment order (HTTP ${orderResponse.status}).`
        );
      }

      const razorpayData =
        orderData as RazorpayOrderResponse;

      if (!razorpayData.order?.id) {
        throw new Error(
          "Invalid Razorpay order received. Check the backend response."
        );
      }

      if (!razorpayData.keyId) {
        throw new Error(
          "Razorpay Key ID is missing from the backend response."
        );
      }

      if (
        !Number.isFinite(Number(razorpayData.order.amount)) ||
        Number(razorpayData.order.amount) <= 0
      ) {
        throw new Error(
          "Razorpay order amount is invalid."
        );
      }

      // STEP 2: Open Razorpay Checkout.
      const options = {
        description: `${getMonthName(
          billingMonth
        )} Monthly Fee`,
        currency: razorpayData.order.currency || "INR",
        key: razorpayData.keyId,
        amount: String(razorpayData.order.amount),
        name: "The Winner Ramanujan Classes",
        order_id: razorpayData.order.id,
        prefill: {
          name: razorpayData.student?.name || "",
          email: razorpayData.student?.email || "",
        },
        theme: {
          color: COLORS.primary,
        },
      };

      console.log("PAYMENT: Opening Razorpay checkout");
      console.log("PAYMENT: Order ID", options.order_id);
      console.log("PAYMENT: Currency", options.currency);
      console.log("PAYMENT: Amount in smallest currency unit", options.amount);
      console.log(
        "PAYMENT: Key ID present",
        Boolean(options.key)
      );

      let paymentResult: any;

      try {
        paymentResult =
          await RazorpayCheckout.open(options);

        console.log(
          "PAYMENT: Razorpay checkout succeeded",
          paymentResult
        );
      } catch (checkoutError: unknown) {
        console.error(
          "RAZORPAY CHECKOUT ERROR:",
          checkoutError
        );

        let details: {
          code?: string | number;
          description?: string;
          message?: string;
        } = {};

        if (
          typeof checkoutError === "object" &&
          checkoutError !== null
        ) {
          details = checkoutError as {
            code?: string | number;
            description?: string;
            message?: string;
          };
        }

        let description =
          details.description ||
          details.message ||
          "";

        if (!description && typeof checkoutError === "string") {
          description = checkoutError;
        }

        const isCancelled =
          description.toLowerCase().includes("cancel") ||
          String(details.code) === "2";

        if (isCancelled) {
          Alert.alert(
            "Payment Cancelled",
            "Your payment was cancelled."
          );
        } else {
          Alert.alert(
            "Payment Failed",
            description ||
              `Razorpay checkout failed. Error code: ${
                details.code ?? "not provided"
              }. Check the terminal logs for details.`
          );
        }

        return;
      }

      // STEP 3: Verify payment on backend.
      if (
        !paymentResult?.razorpay_order_id ||
        !paymentResult?.razorpay_payment_id ||
        !paymentResult?.razorpay_signature
      ) {
        console.error(
          "PAYMENT: Incomplete Razorpay response",
          paymentResult
        );

        throw new Error(
          "Payment response is incomplete. Check the terminal logs."
        );
      }

      console.log("PAYMENT: Verifying payment on backend");

      const verifyResponse = await fetch(
        `${apiUrl}/payments/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            razorpay_order_id:
              paymentResult.razorpay_order_id,
            razorpay_payment_id:
              paymentResult.razorpay_payment_id,
            razorpay_signature:
              paymentResult.razorpay_signature,
            billingMonth,
          }),
        }
      );

      const verifyText = await verifyResponse.text();

      console.log(
        "PAYMENT: Verification HTTP status",
        verifyResponse.status
      );
      console.log(
        "PAYMENT: Verification response",
        verifyText
      );

      let verifyData: any;

      try {
        verifyData = JSON.parse(verifyText);
      } catch {
        throw new Error(
          `Payment verification API returned an invalid response (HTTP ${verifyResponse.status}).`
        );
      }

      if (!verifyResponse.ok) {
        throw new Error(
          verifyData?.message ||
            `Payment verification failed (HTTP ${verifyResponse.status}).`
        );
      }

      // STEP 4: Refresh selected month's fee.
      await loadFee(billingMonth);

      Alert.alert(
        "Payment Successful",
        `₹${
          verifyData?.payment?.amount ??
          feeData.summary.due
        } has been paid for ${getMonthName(
          billingMonth
        )}.`
      );
    } catch (err: unknown) {
      console.error("PAYMENT PROCESS ERROR:", err);

      Alert.alert(
        "Payment Error",
        err instanceof Error
          ? err.message
          : "Something went wrong while processing the payment."
      );
    } finally {
      setPaying(false);
    }
  };

  const isCurrentMonth =
    billingMonth === getBillingMonth(new Date());

  const summary = feeData?.summary;

  const getStatusText = () => {
    if (!summary) return "";
    if (summary.status === "paid") return "PAID";
    if (summary.status === "partial") {
      return "PARTIAL PAYMENT";
    }
    return "PAYMENT DUE";
  };

  const getStatusStyle = () => {
    if (!summary) return styles.statusDue;
    if (summary.status === "paid") {
      return styles.statusPaid;
    }
    if (summary.status === "partial") {
      return styles.statusPartial;
    }
    return styles.statusDue;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
        <Text style={styles.loadingText}>
          Loading fee details...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Fees</Text>

      <Text style={styles.subtitle}>
        Track your monthly fee and payments
      </Text>

      {/* MONTH SELECTOR */}
      <View style={styles.monthCard}>
        <Pressable
          style={styles.monthButton}
          onPress={goPreviousMonth}
        >
          <Text style={styles.arrow}>‹</Text>
          <Text style={styles.monthButtonText}>
            Previous
          </Text>
        </Pressable>

        <View style={styles.monthCenter}>
          <Text style={styles.monthLabel}>
            BILLING MONTH
          </Text>

          <Text style={styles.monthName}>
            {getMonthName(billingMonth)}
          </Text>

          {isCurrentMonth && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>
                CURRENT
              </Text>
            </View>
          )}
        </View>

        <Pressable
          style={styles.monthButton}
          onPress={goNextMonth}
        >
          <Text style={styles.monthButtonText}>
            Next
          </Text>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      {/* ERROR */}
      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            Unable to load fees
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => loadFee(billingMonth)}
          >
            <Text style={styles.retryText}>
              Try Again
            </Text>
          </Pressable>
        </View>
      ) : !feeData || !summary ? (
        /* EMPTY STATE */
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>₹</Text>
          </View>

          <Text style={styles.emptyTitle}>
            No Fee Record
          </Text>

          <Text style={styles.emptyText}>
            No fee information is available for{" "}
            {getMonthName(billingMonth)}.
          </Text>
        </View>
      ) : (
        <>
          {/* STATUS CARD */}
          <View style={styles.statusCard}>
            <View style={styles.statusTopRow}>
              <View>
                <Text style={styles.statusSmall}>
                  PAYMENT STATUS
                </Text>

                <Text
                  style={[
                    styles.statusText,
                    getStatusStyle(),
                  ]}
                >
                  {getStatusText()}
                </Text>
              </View>

              <View style={styles.statusIcon}>
                <Text style={styles.statusIconText}>
                  {summary.status === "paid" ? "✓" : "₹"}
                </Text>
              </View>
            </View>

            {summary.due > 0 && (
              <Text style={styles.dueMessage}>
                ₹{summary.due} is remaining for this month.
              </Text>
            )}
          </View>

          {/* FEE SUMMARY */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>
              {getMonthName(billingMonth)} Fee
            </Text>

            <View style={styles.mainAmountBox}>
              <Text style={styles.mainAmountLabel}>
                Monthly Fee
              </Text>

              <Text style={styles.mainAmount}>
                ₹{summary.total}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Total Fee</Text>
              <Text style={styles.value}>
                ₹{summary.total}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Paid</Text>
              <Text style={styles.paid}>
                ₹{summary.paid}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>
                Remaining Due
              </Text>
              <Text style={styles.due}>
                ₹{summary.due}
              </Text>
            </View>
          </View>

          {/* PAY NOW */}
          {summary.due > 0 && (
            <Pressable
              style={[
                styles.payButton,
                paying && styles.payButtonDisabled,
              ]}
              onPress={handlePayment}
              disabled={paying}
            >
              {paying ? (
                <>
                  <View style={styles.payLoadingContent}>
                    <ActivityIndicator
                      size="small"
                      color={COLORS.white}
                    />
                    <Text style={styles.payButtonText}>
                      Processing...
                    </Text>
                  </View>

                  <Text style={styles.payAmount}>
                    ₹{summary.due}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.payButtonText}>
                    Pay Now
                  </Text>

                  <Text style={styles.payAmount}>
                    ₹{summary.due}
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {/* PAYMENT HISTORY */}
          <View style={styles.historyCard}>
            <Text style={styles.cardTitle}>
              Payment History
            </Text>

            {!feeData.payments ||
            feeData.payments.length === 0 ? (
              <View style={styles.noPaymentBox}>
                <Text style={styles.noPaymentTitle}>
                  No payments yet
                </Text>

                <Text style={styles.noPaymentText}>
                  No payment has been recorded for this month.
                </Text>
              </View>
            ) : (
              feeData.payments.map((payment, index) => (
                <View
                  key={
                    payment._id ||
                    `${payment.paymentDate}-${index}`
                  }
                  style={styles.paymentItem}
                >
                  <View style={styles.paymentLeft}>
                    <View style={styles.paymentIcon}>
                      <Text style={styles.paymentIconText}>
                        ✓
                      </Text>
                    </View>

                    <View>
                      <Text style={styles.paymentMode}>
                        {payment.mode?.toUpperCase() ||
                          "PAYMENT"}
                      </Text>

                      <Text style={styles.paymentDate}>
                        {new Date(
                          payment.paymentDate
                        ).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </Text>

                      {payment.reference ? (
                        <Text style={styles.paymentReference}>
                          Ref: {payment.reference}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <Text style={styles.paymentAmount}>
                    ₹{payment.amount}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* MONTH INFO */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              Fee Information
            </Text>

            <Text style={styles.infoText}>
              This fee is applicable for{" "}
              {getMonthName(billingMonth)}.
            </Text>

            <Text style={styles.infoText}>
              Payments made for another month are shown separately.
            </Text>

            <Text style={styles.infoText}>
              Online payments are securely processed through Razorpay.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.sand,
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.sand,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: COLORS.primary,
  },
  heading: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.primary,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 20,
    fontSize: 14,
    color: COLORS.black,
  },
  monthCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  monthButton: {
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  disabledMonthButton: {
    opacity: 0.35,
  },
  arrow: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: "300",
    color: COLORS.primary,
  },
  monthButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  monthCenter: {
    flex: 1,
    alignItems: "center",
  },
  monthLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.black,
    opacity: 0.55,
  },
  monthName: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.primary,
    textAlign: "center",
  },
  currentBadge: {
    marginTop: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  currentBadgeText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  statusCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
  },
  statusTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusSmall: {
    color: COLORS.sand,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statusText: {
    marginTop: 6,
    fontSize: 23,
    fontWeight: "900",
  },
  statusPaid: {
    color: COLORS.white,
  },
  statusPartial: {
    color: COLORS.sand,
  },
  statusDue: {
    color: COLORS.sand,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  statusIconText: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.primary,
  },
  dueMessage: {
    marginTop: 16,
    color: COLORS.white,
    fontSize: 13,
    opacity: 0.9,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 16,
  },
  mainAmountBox: {
    backgroundColor: COLORS.sand,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  mainAmountLabel: {
    fontSize: 12,
    color: COLORS.black,
    opacity: 0.65,
  },
  mainAmount: {
    marginTop: 4,
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.primary,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    color: COLORS.black,
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  paid: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.primary,
  },
  due: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.black,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.sand,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 17,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  payButtonDisabled: {
    opacity: 0.75,
  },
  payLoadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  payButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "900",
  },
  payAmount: {
    color: COLORS.sand,
    fontSize: 17,
    fontWeight: "900",
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  noPaymentBox: {
    backgroundColor: COLORS.sand,
    borderRadius: 15,
    padding: 16,
    alignItems: "center",
  },
  noPaymentTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.primary,
  },
  noPaymentText: {
    marginTop: 5,
    textAlign: "center",
    fontSize: 12,
    color: COLORS.black,
    opacity: 0.7,
  },
  paymentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.sand,
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  paymentIconText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
  },
  paymentMode: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.primary,
  },
  paymentDate: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.black,
    opacity: 0.6,
  },
  paymentReference: {
    marginTop: 2,
    fontSize: 10,
    color: COLORS.black,
    opacity: 0.5,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.primary,
  },
  infoCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 18,
  },
  infoTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  infoText: {
    color: COLORS.sand,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 3,
  },
  errorCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
  },
  errorTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  errorText: {
    marginTop: 7,
    color: COLORS.black,
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 15,
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.sand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyIconText: {
    color: COLORS.primary,
    fontSize: 25,
    fontWeight: "900",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primary,
  },
  emptyText: {
    marginTop: 8,
    textAlign: "center",
    color: COLORS.black,
    fontSize: 13,
    lineHeight: 19,
  },
});
