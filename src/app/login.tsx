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
import { useAuth } from "../context/AuthContext";

const COLORS = {
  cyprus: "#004741",
  sand: "#F0EDE4",
  black: "#000000",
  white: "#FFFFFF",
  muted: "#6F7471",
  border: "#D9D6CD",
  input: "#F7F5EF",
};

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // =========================
  // LOGIN
  // =========================

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter your email and password."
      );
      return;
    }

    try {
      setLoading(true);

      const loggedInUser = await login(
        email.trim(),
        password
      );

      if (!loggedInUser) {
        Alert.alert(
          "Login Failed",
          "Invalid email or password."
        );
        return;
      }

      if (loggedInUser.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
    } catch (error) {
      console.log("Login error:", error);

      Alert.alert(
        "Login Error",
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // FORGOT PASSWORD
  // =========================

  const handleForgotPassword = () => {
    router.push("/forgot-password");
  };

  // =========================
  // SOCIAL LOGIN
  // =========================

  const handleGoogleLogin = () => {
    Alert.alert(
      "Google Login",
      "Google login will be available soon."
    );
  };

  const handleGithubLogin = () => {
    Alert.alert(
      "GitHub Login",
      "GitHub login will be available soon."
    );
  };

  // =========================
  // UI
  // =========================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios" ? "padding" : undefined
      }
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.cyprus}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* =================================
            TOP GREEN SECTION
        ================================= */}

        <View style={styles.hero}>

          {/* Decorative circles */}
          <View style={styles.circleOne} />
          <View style={styles.circleTwo} />

          {/* =================================
              BRAND
          ================================= */}

          <View style={styles.brandContainer}>
            <View style={styles.logoBox}>
              <Ionicons
                name="school-outline"
                size={40}
                color={COLORS.sand}
              />
            </View>

            <View style={styles.brandNameRow}>
              <Text style={styles.studyText}>
                Study
              </Text>

              <Text style={styles.pointText}>
                Point
              </Text>
            </View>

            <Text style={styles.tagline}>
              Learn • Practice • Grow
            </Text>
          </View>

          {/* =================================
              BOOK DECORATION
          ================================= */}

          <View style={styles.books}>
            <View
              style={[
                styles.book,
                styles.bookOne,
              ]}
            />

            <View
              style={[
                styles.book,
                styles.bookTwo,
              ]}
            />

            <View
              style={[
                styles.book,
                styles.bookThree,
              ]}
            />

            <Ionicons
              name="book-outline"
              size={65}
              color={COLORS.sand}
              style={styles.bookIcon}
            />
          </View>
        </View>

        {/* =================================
            LOGIN SECTION
        ================================= */}

        <View style={styles.loginSection}>
          {/* Rounded top */}
          <View style={styles.roundedTop} />

          <View style={styles.loginContent}>
            {/* =================================
                HEADING
            ================================= */}

            <View style={styles.heading}>
              <View style={styles.headingRow}>
                <Text style={styles.welcomeBlack}>
                  Welcome
                </Text>

                <Text style={styles.welcomeGreen}>
                  {" "}Back
                </Text>
              </View>

              <Text style={styles.subtitle}>
                Login to continue your learning journey
                {"\n"}
                with The Winner Ramanujan Classes
              </Text>
            </View>

            {/* =================================
                EMAIL LABEL
            ================================= */}

            <Text style={styles.label}>
              EMAIL
            </Text>

            {/* Email Input */}
            <View style={styles.inputBox}>
              <Ionicons
                name="mail-outline"
                size={21}
                color={COLORS.black}
              />

              <TextInput
                style={styles.input}
                placeholder="Email or Username"
                placeholderTextColor="#858883"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
              />
            </View>

            {/* =================================
                PASSWORD LABEL
            ================================= */}

            <Text style={styles.label}>
              PASSWORD
            </Text>

            {/* Password Input */}
            <View style={styles.inputBox}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.black}
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#858883"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() =>
                  setShowPassword(!showPassword)
                }
                disabled={loading}
                activeOpacity={0.7}
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

            {/* =================================
                FORGOT PASSWORD
            ================================= */}

            <TouchableOpacity
              style={styles.forgotButton}
              onPress={handleForgotPassword}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* =================================
                LOGIN BUTTON
            ================================= */}

            <TouchableOpacity
              style={[
                styles.loginButton,
                loading &&
                  styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator
                    size="small"
                    color={COLORS.white}
                  />

                  <Text style={styles.loginText}>
                    Logging in...
                  </Text>
                </View>
              ) : (
                <View
                  style={styles.loginButtonContent}
                >
                  <Text style={styles.loginText}>
                    Login
                  </Text>

                  <Text style={styles.arrow}>
                    →
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* =================================
                OR DIVIDER
            ================================= */}

            <View style={styles.orContainer}>
              <View style={styles.line} />

              <Text style={styles.orText}>
                OR
              </Text>

              <View style={styles.line} />
            </View>

            {/* =================================
                SOCIAL LOGIN
            ================================= */}

            <View style={styles.socialContainer}>
              {/* Google */}
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleLogin}
                activeOpacity={0.8}
              >
                <View style={styles.googleLogo}>
                  <Text style={styles.googleG}>
                    G
                  </Text>
                </View>

                <Text style={styles.socialText}>
                  Google
                </Text>
              </TouchableOpacity>

              {/* GitHub */}
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGithubLogin}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="logo-github"
                  size={21}
                  color={COLORS.black}
                />

                <Text style={styles.socialText}>
                  GitHub
                </Text>
              </TouchableOpacity>
            </View>

            {/* =================================
                SECURITY
            ================================= */}

            <View style={styles.securityRow}>
              <View style={styles.securityIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={COLORS.cyprus}
                />
              </View>

              <Text style={styles.securityText}>
                Secure & private learning experience
              </Text>
            </View>
          </View>
        </View>

        {/* =================================
            BOTTOM
        ================================= */}

        <View style={styles.bottomGreen}>
          <Text style={styles.bottomText}>
            The Winner Ramanujan Classes
          </Text>

          <Text style={styles.bottomSubtext}>
            Learn. Grow. Succeed.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ==========================================
   STYLES
========================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cyprus,
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: COLORS.sand,
  },

  /* ========================================
      HERO
  ======================================== */

  hero: {
    height: 385,
    backgroundColor: COLORS.cyprus,
    position: "relative",
    overflow: "hidden",
  },

  skipButton: {
    position: "absolute",
    right: 18,
    top: 18,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  skipText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },

  circleOne: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor:
      "rgba(240, 237, 228, 0.045)",
    top: -125,
    left: -95,
  },

  circleTwo: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor:
      "rgba(240, 237, 228, 0.035)",
    right: -90,
    bottom: 40,
  },

  /* ========================================
      BRAND
  ======================================== */

  brandContainer: {
    alignItems: "center",
    paddingTop: 55,
  },

  logoBox: {
    width: 74,
    height: 74,
    borderRadius: 23,
    backgroundColor:
      "rgba(240, 237, 228, 0.10)",
    borderWidth: 1,
    borderColor:
      "rgba(240, 237, 228, 0.30)",
    alignItems: "center",
    justifyContent: "center",
  },

  brandNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
  },

  studyText: {
    fontSize: 40,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: -1.8,
  },

  pointText: {
    fontSize: 40,
    fontWeight: "900",
    color: COLORS.sand,
    letterSpacing: -1.8,
  },

  tagline: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 1.3,
    marginTop: 5,
    opacity: 0.92,
  },

  /* ========================================
      BOOK DECORATION
  ======================================== */

  books: {
    position: "absolute",
    right: 18,
    bottom: 13,
    width: 130,
    height: 105,
    opacity: 0.30,
  },

  book: {
    position: "absolute",
    height: 17,
    borderWidth: 1,
    borderColor: COLORS.sand,
    borderRadius: 5,
  },

  bookOne: {
    width: 104,
    right: 0,
    bottom: 3,
    transform: [
      {
        rotate: "-5deg",
      },
    ],
  },

  bookTwo: {
    width: 118,
    right: 4,
    bottom: 25,
    transform: [
      {
        rotate: "-5deg",
      },
    ],
  },

  bookThree: {
    width: 90,
    right: 16,
    bottom: 47,
    transform: [
      {
        rotate: "-5deg",
      },
    ],
  },

  bookIcon: {
    position: "absolute",
    right: 30,
    bottom: 20,
  },

  /* ========================================
      LOGIN SECTION
  ======================================== */

  loginSection: {
    backgroundColor: COLORS.sand,
    position: "relative",
  },

  roundedTop: {
    position: "absolute",
    top: -32,
    left: -1,
    right: -1,
    height: 64,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    backgroundColor: COLORS.sand,
  },

  loginContent: {
    paddingHorizontal: 24,
    paddingTop: 29,
    paddingBottom: 32,
    zIndex: 2,
  },

  /* ========================================
      HEADING
  ======================================== */

  heading: {
    marginBottom: 23,
  },

  headingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  welcomeBlack: {
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.black,
    letterSpacing: -1,
  },

  welcomeGreen: {
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.cyprus,
    letterSpacing: -1,
  },

  subtitle: {
    marginTop: 7,
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.muted,
  },

  /* ========================================
      LABEL
  ======================================== */

  label: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.cyprus,
    letterSpacing: 1.2,
    marginBottom: 7,
  },

  /* ========================================
      INPUT
  ======================================== */

  inputBox: {
    height: 57,
    backgroundColor: COLORS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 15,
    marginBottom: 16,
  },

  input: {
    flex: 1,
    height: "100%",
    marginLeft: 11,
    color: COLORS.black,
    fontSize: 14,
  },

  eyeButton: {
    width: 38,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ========================================
      FORGOT
  ======================================== */

  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -5,
    marginBottom: 18,
    paddingVertical: 3,
  },

  forgotText: {
    color: COLORS.cyprus,
    fontSize: 12.5,
    fontWeight: "700",
  },

  /* ========================================
      LOGIN BUTTON
  ======================================== */

  loginButton: {
    height: 57,
    borderRadius: 30,
    backgroundColor: COLORS.cyprus,

    alignItems: "center",
    justifyContent: "center",

    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  loginButtonDisabled: {
    opacity: 0.65,
  },

  loginButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  loginText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
  },

  arrow: {
    color: COLORS.white,
    fontSize: 27,
    fontWeight: "300",
    marginTop: -2,
  },

  /* ========================================
      OR
  ======================================== */

  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#D0CDC4",
  },

  orText: {
    marginHorizontal: 13,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.muted,
  },

  /* ========================================
      SOCIAL
  ======================================== */

  socialContainer: {
    flexDirection: "row",
    gap: 10,
  },

  socialButton: {
    flex: 1,
    height: 51,

    backgroundColor: COLORS.white,

    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 8,
  },

  socialText: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "700",
  },

  googleLogo: {
    width: 23,
    height: 23,
    alignItems: "center",
    justifyContent: "center",
  },

  googleG: {
    fontSize: 20,
    fontWeight: "900",
    color: "#4285F4",
  },

  /* ========================================
      SECURITY
  ======================================== */

  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    marginTop: 19,
    gap: 6,
  },

  securityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,

    backgroundColor: "#E1ECE9",

    alignItems: "center",
    justifyContent: "center",
  },

  securityText: {
    fontSize: 10.5,
    color: COLORS.muted,
  },

  /* ========================================
      BOTTOM
  ======================================== */

  bottomGreen: {
    height: 82,
    backgroundColor: COLORS.cyprus,

    alignItems: "center",
    justifyContent: "center",
  },

  bottomText: {
    color: COLORS.sand,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },

  bottomSubtext: {
    color: COLORS.white,
    fontSize: 9.5,
    marginTop: 4,
    opacity: 0.65,
  },
});