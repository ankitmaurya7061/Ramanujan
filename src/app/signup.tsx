import { useState } from "react";
import {
  Alert,
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
  muted: "#707572",
  border: "#D6D3CB",
};

export default function Signup() {
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      Alert.alert(
        "Missing Information",
        "Please fill all fields."
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Password Mismatch",
        "Passwords do not match."
      );
      return;
    }

    setLoading(true);

    const success = await signup(
      name.trim(),
      email.trim(),
      password
    );

    setLoading(false);

    if (!success) {
      Alert.alert(
        "Account Exists",
        "An account with this email already exists."
      );
      return;
    }

    router.replace("/");
  };

  return (
    <View style={styles.container}>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons
          name="arrow-back"
          size={23}
          color={COLORS.black}
        />
      </TouchableOpacity>

      {/* Logo */}
      <View style={styles.logo}>
        <Ionicons
          name="person-add"
          size={30}
          color={COLORS.sand}
        />
      </View>

      <Text style={styles.title}>
        Create Account
      </Text>

      <Text style={styles.subtitle}>
        Start your learning journey
      </Text>

      <View style={styles.form}>

        {/* Full Name */}
        <Text style={styles.label}>
          Full Name
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="person-outline"
            size={20}
            color={COLORS.cyprus}
          />

          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor={COLORS.muted}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email */}
        <Text style={styles.label}>
          Email
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="mail-outline"
            size={20}
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
          />
        </View>

        {/* Password */}
        <Text style={styles.label}>
          Password
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={COLORS.cyprus}
          />

          <TextInput
            style={styles.input}
            placeholder="Create password"
            placeholderTextColor={COLORS.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
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
              size={20}
              color={COLORS.muted}
            />
          </TouchableOpacity>
        </View>

        {/* Confirm Password */}
        <Text style={styles.label}>
          Confirm Password
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={COLORS.cyprus}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor={COLORS.muted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
          />
        </View>

        {/* Signup Button */}
        <TouchableOpacity
          style={[
            styles.signupButton,
            loading && styles.signupButtonDisabled,
          ]}
          onPress={handleSignup}
          disabled={loading}
        >
          <Text style={styles.signupButtonText}>
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </Text>
        </TouchableOpacity>

        {/* Login */}
        <View style={styles.loginRow}>
          <Text style={styles.loginLabel}>
            Already have an account?
          </Text>

          <TouchableOpacity
            onPress={() =>
              router.replace("/login")
            }
          >
            <Text style={styles.loginLink}>
              Login
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.sand,
    padding: 24,
    justifyContent: "center",
  },

  backButton: {
    position: "absolute",
    top: 55,
    left: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  logo: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: COLORS.cyprus,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.black,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 7,
  },

  form: {
    marginTop: 22,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 8,
    marginTop: 12,
  },

  inputContainer: {
    height: 54,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.black,
  },

  signupButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.cyprus,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },

  signupButtonDisabled: {
    opacity: 0.7,
  },

  signupButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },

  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginTop: 22,
  },

  loginLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },

  loginLink: {
    color: COLORS.cyprus,
    fontSize: 13,
    fontWeight: "800",
  },
});