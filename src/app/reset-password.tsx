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

const API_BASE_URL =
  "https://ramanujan-sybq.onrender.com/api";

const COLORS = {
  cyprus: "#004741",
  sand: "#F0EDE4",
  black: "#000000",
  white: "#FFFFFF",
  muted: "#707572",
  border: "#D6D3CB",
};

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();

  const email =
    typeof params.email === "string" ? params.email : "";

  const otp =
    typeof params.otp === "string" ? params.otp : "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert(
        "Missing Information",
        "Please enter your new password and confirm it."
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 6 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords Don't Match",
        "Please make sure both passwords are the same."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp,
            newPassword: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Reset Failed",
          data.message || "Unable to reset your password."
        );
        return;
      }

      Alert.alert(
        "Password Updated",
        "Your password has been changed successfully. Please login with your new password.",
        [
          {
            text: "Go to Login",
            onPress: () => router.replace("/login"),
          },
        ]
      );
    } catch (error) {
      console.log("Reset password error:", error);

      Alert.alert(
        "Connection Error",
        "Unable to connect to the server. Please try again."
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
              name="key-outline"
              size={32}
              color={COLORS.cyprus}
            />
          </View>

          <Text style={styles.brand}>StudyPoint</Text>

          <Text style={styles.topSubtitle}>
            Create a new password
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.title}>Reset Password</Text>

          <Text style={styles.description}>
            Create a strong new password for your StudyPoint
            account.
          </Text>

          <Text style={styles.label}>New Password</Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={21}
              color={COLORS.cyprus}
            />

            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor={COLORS.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={() =>
                setShowPassword(!showPassword)
              }
            >
              <Ionicons
                name={
                  showPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                }
                size={21}
                color={COLORS.muted}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.passwordHint}>
            Minimum 6 characters
          </Text>

          <Text style={styles.label}>Confirm Password</Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={21}
              color={COLORS.cyprus}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.muted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={() =>
                setShowConfirmPassword(
                  !showConfirmPassword
                )
              }
            >
              <Ionicons
                name={
                  showConfirmPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                }
                size={21}
                color={COLORS.muted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleResetPassword}
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
                  Update Password
                </Text>

                <Ionicons
                  name="checkmark-circle-outline"
                  size={21}
                  color={COLORS.white}
                />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.securityBox}>
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color={COLORS.cyprus}
            />

            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>
                Keep your account secure
              </Text>

              <Text style={styles.securityText}>
                Use a password that is difficult to guess and
                avoid sharing it with anyone.
              </Text>
            </View>
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
    marginBottom: 28,
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
    paddingHorizontal: 16,
    marginBottom: 7,
  },

  input: {
    flex: 1,
    color: COLORS.black,
    fontSize: 16,
    marginLeft: 11,
  },

  passwordHint: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 22,
  },

  button: {
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.cyprus,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 12,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },

  securityBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 17,
    marginTop: 28,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 5,
  },

  securityText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
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
