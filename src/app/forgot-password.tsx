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
import { router } from "expo-router";
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

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert("Email Required", "Please enter your email address.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: cleanEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Unable to Continue",
          data.message || "Something went wrong."
        );
        return;
      }

      Alert.alert(
        "OTP Sent",
        "A verification code has been sent to your email.",
        [
          {
            text: "Continue",
            onPress: () =>
              router.push({
                pathname: "/verify-otp",
                params: {
                  email: cleanEmail,
                },
              }),
          },
        ]
      );
    } catch (error) {
      console.log("Forgot password error:", error);

      Alert.alert(
        "Connection Error",
        "Unable to connect to the server. Please check your internet connection and try again."
      );
    } finally {
      setLoading(false);
    }
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
        {/* Top Section */}
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
              name="lock-closed-outline"
              size={32}
              color={COLORS.cyprus}
            />
          </View>

          <Text style={styles.brand}>StudyPoint</Text>

          <Text style={styles.topSubtitle}>
            Learn. Grow. Succeed.
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.title}>Forgot Password?</Text>

          <Text style={styles.description}>
            Don't worry. Enter your registered email address and
            we'll send you a verification code to reset your password.
          </Text>

          <Text style={styles.label}>Email Address</Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={21}
              color={COLORS.cyprus}
            />

            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSendOTP}
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
                  Send Verification Code
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={COLORS.white}
                />
              </>
            )}
          </TouchableOpacity>

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

          <View style={styles.infoBox}>
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color={COLORS.cyprus}
            />

            <Text style={styles.infoText}>
              Your account security is important to us. The
              verification code will expire after a limited time.
            </Text>
          </View>
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
    letterSpacing: -1,
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
    marginBottom: 30,
  },

  label: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 9,
  },

  inputContainer: {
    height: 58,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 17,
    marginBottom: 22,
  },

  input: {
    flex: 1,
    color: COLORS.black,
    fontSize: 16,
    marginLeft: 12,
  },

  button: {
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.cyprus,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 5,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },

  backToLogin: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    gap: 7,
  },

  backToLoginText: {
    color: COLORS.cyprus,
    fontSize: 15,
    fontWeight: "700",
  },

  infoBox: {
    marginTop: 30,
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

  footer: {
    backgroundColor: COLORS.sand,
    textAlign: "center",
    color: COLORS.muted,
    fontSize: 12,
    paddingBottom: 20,
  },
});
