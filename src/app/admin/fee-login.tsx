import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "http://192.168.31.222:5000/api";

export default function FeeLoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      Alert.alert(
        "Required",
        "Please enter username and password."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/fee-auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: cleanUsername,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        Alert.alert(
          "Login Failed",
          data.message || "Invalid username or password."
        );
        return;
      }

      await AsyncStorage.setItem(
        "fee_admin_token",
        data.token
      );

      router.replace("/admin/fees");
    } catch (error) {
      console.error("Fee Admin Login Error:", error);

      Alert.alert(
        "Connection Error",
        "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>â‚¹</Text>
        </View>

        <Text style={styles.title}>
          Fee Management
        </Text>

        <Text style={styles.subtitle}>
          Authorized access only
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>
            Username
          </Text>

          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor="#000000"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={styles.label}>
            Password
          </Text>

          <View style={styles.passwordContainer}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor="#000000"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={styles.passwordInput}
            />

            <TouchableOpacity
              onPress={() =>
                setShowPassword((value) => !value)
              }
              style={styles.showButton}
            >
              <Text style={styles.showText}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.loginButton,
              loading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Text style={styles.loginButtonText}>
                Login to Fee Management
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.securityText}>
          This section is protected and intended for
          authorized fee management only.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EDE4",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  logoContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#004741",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
  },

  logoText: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
  },

  title: {
    color: "#004741",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },

  subtitle: {
    color: "#000000",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 28,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
  },

  label: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#004741",
    borderRadius: 12,
    paddingHorizontal: 15,
    color: "#000000",
    backgroundColor: "#FFFFFF",
    marginBottom: 18,
  },

  passwordContainer: {
    height: 52,
    borderWidth: 1,
    borderColor: "#004741",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 15,
    color: "#000000",
  },

  showButton: {
    paddingHorizontal: 14,
  },

  showText: {
    color: "#004741",
    fontWeight: "700",
  },

  loginButton: {
    height: 54,
    borderRadius: 12,
    backgroundColor: "#004741",
    alignItems: "center",
    justifyContent: "center",
  },

  loginButtonDisabled: {
    opacity: 0.7,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  securityText: {
    color: "#000000",
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 18,
  },
});
