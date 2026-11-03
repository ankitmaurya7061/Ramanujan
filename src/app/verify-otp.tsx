import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const API_BASE_URL = "http://192.168.31.222:5000/api";

const COLORS = {
  cyprus: "#004741",
  sand: "#F0EDE4",
  black: "#000000",
  white: "#FFFFFF",
  muted: "#707572",
  border: "#D6D3CB",
};

export default function VerifyOTPScreen() {
  const params = useLocalSearchParams();

  const email =
    typeof params.email === "string" ? params.email : "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyOTP = async () => {
    const cleanOTP = otp.trim();

    if (cleanOTP.length !== 6) {
      Alert.alert(
        "Invalid OTP",
        "Please enter the 6-digit verification code."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/verify-reset-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp: cleanOTP,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Verification Failed",
          data.message || "Invalid or expired OTP."
        );
        return;
      }

      router.replace({
        pathname: "/reset-password",
        params: {
          email,
          otp: cleanOTP,
        },
      });
    } catch (error) {
      console.log("Verify OTP error:", error);

      Alert.alert(
        "Connection Error",
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    router.replace("/forgot-password");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.cyprus}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={COLORS.white}
            />
          </TouchableOpacity>

          <View style={styles.logoCircle}>
            <Ionicons
              name="mail-open-outline"
              size={32}
              color={COLORS.cyprus}
            />
          </View>

          <Text style={styles.brand}>StudyPoint</Text>

          <Text style={styles.topSubtitle}>
            Verify your account
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.title}>Verify OTP</Text>

          <Text style={styles.description}>
            Enter the 6-digit verification code that was sent to:
          </Text>

          <View style={styles.emailBox}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={COLORS.cyprus}
            />

            <Text style={styles.emailText}>
              {email || "your email address"}
            </Text>
          </View>

          <Text style={styles.label}>Verification Code</Text>

          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={(value) =>
              setOtp(value.replace(/[^0-9]/g, "").slice(0, 6))
            }
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#A5A29B"
            textAlign="center"
            autoFocus
          />

          <Text style={styles.otpHint}>
            Enter all 6 digits
          </Text>

          <TouchableOpacity
            style={[
              styles.button,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleVerifyOTP}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <>
                <Text style={styles.buttonText}>
                  Verify Code
                </Text>

                <Ionicons
                  name="checkmark-circle-outline"
                  size={21}
                  color={COLORS.white}
                />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>
              Didn't receive the code?
            </Text>

            <TouchableOpacity onPress={handleResendOTP}>
              <Text style={styles.resendButton}>
                Resend OTP
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Ionicons
              name="time-outline"
              size={22}
              color={COLORS.cyprus}
            />

            <Text style={styles.infoText}>
              The verification code is valid only for a limited
              time. Please enter it before it expires.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => router.replace("/login")}
          >
            <Ionicons
              name="arrow-back-outline"
              size={18}
              color={COLORS.cyprus}
            />

            <Text style={styles.backToLoginText}>
              Back to Login
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Â© 2026 StudyPoint
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cyprus,
  },

  scrollContent: {
    flexGrow: 1,
  },

  topSection: {
    backgroundColor: COLORS.cyprus,
    alignItems: "center",
    paddingTop: 55,
    paddingBottom: 45,
    paddingHorizontal: 25,
  },

  backButton: {
    position: "absolute",
    left: 22,
    top: 50,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },

  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.sand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  brand: {
    color: COLORS.white,
    fontSize: 34,
    fontWeight: "800",
  },

  topSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    marginTop: 7,
  },

  formSection: {
    flex: 1,
    backgroundColor: COLORS.sand,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 24,
    paddingTop: 35,
    paddingBottom: 30,
  },

  title: {
    color: COLORS.black,
    fontSize: 29,
    fontWeight: "800",
    marginBottom: 12,
  },

  description: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 16,
  },

  emailBox: {
    minHeight: 52,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    gap: 10,
  },

  emailText: {
    flex: 1,
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "600",
  },

  label: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },

  otpInput: {
    height: 65,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    color: COLORS.black,
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: 10,
  },

  otpHint: {
    color: COLORS.muted,
    textAlign: "center",
    fontSize: 12,
    marginTop: 9,
  },

  button: {
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.cyprus,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 22,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },

  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    gap: 5,
  },

  resendText: {
    color: COLORS.muted,
    fontSize: 14,
  },

  resendButton: {
    color: COLORS.cyprus,
    fontSize: 14,
    fontWeight: "800",
  },

  infoBox: {
    marginTop: 28,
    padding: 17,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  infoText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
  },

  backToLogin: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
    gap: 7,
  },

  backToLoginText: {
    color: COLORS.cyprus,
    fontSize: 15,
    fontWeight: "700",
  },

  footer: {
    backgroundColor: COLORS.sand,
    textAlign: "center",
    color: COLORS.muted,
    fontSize: 12,
    paddingBottom: 20,
  },
});
