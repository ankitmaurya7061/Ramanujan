import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useProgress } from "../context/ProgressContext";
import { useAuth } from "../context/AuthContext";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { getCompletedCount } = useProgress();

  const [notifications, setNotifications] = useState(true);

  const notificationKey = user?.email
    ? `notificationPreference:${encodeURIComponent(
        user.email.toLowerCase()
      )}`
    : "";

  useEffect(() => {
    loadNotificationPreference();
  }, [notificationKey]);

  const loadNotificationPreference = async () => {
    if (!notificationKey) return;

    try {
      const value = await AsyncStorage.getItem(notificationKey);

      if (value !== null) {
        setNotifications(value === "true");
      } else {
        setNotifications(true);
      }
    } catch (error) {
      console.log("Notification preference error:", error);
    }
  };

  const handleNotificationChange = async (value: boolean) => {
    setNotifications(value);

    if (!notificationKey) return;

    try {
      await AsyncStorage.setItem(
        notificationKey,
        String(value)
      );
    } catch (error) {
      console.log(
        "Notification preference save error:",
        error
      );
    }
  };

  const clearProgress = () => {
    Alert.alert(
      "Clear Learning Progress",
      "Are you sure you want to clear your learning progress? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              if (!user?.email) {
                Alert.alert(
                  "Error",
                  "User information not found."
                );
                return;
              }

              const emailKey = encodeURIComponent(
                user.email.toLowerCase()
              );

              const progressKey =
                `learningProgress:${emailKey}`;

              const activityKey =
                `learningActivityDates:${emailKey}`;

              await AsyncStorage.multiRemove([
                progressKey,
                activityKey,
              ]);

              Alert.alert(
                "Progress Cleared",
                "Your learning progress has been cleared successfully."
              );
            } catch (error) {
              console.log(
                "Clear progress error:",
                error
              );

              Alert.alert(
                "Error",
                "Unable to clear learning progress."
              );
            }
          },
        },
      ]
    );
  };

  const showPrivacy = () => {
    Alert.alert(
      "Privacy",
      "Your account and learning data are currently stored locally on this device. Your data is associated with your account on this device."
    );
  };

  const showSecurity = () => {
    Alert.alert(
      "Account Security",
      "You can manage your password from your Profile settings.",
      [
        {
          text: "OK",
          style: "default",
        },
      ]
    );
  };

  const showAbout = () => {
    Alert.alert(
      "E-Learning App",
      "Version 1.0.0\n\nA simple learning platform where students can learn courses, complete lessons and take tests."
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              router.replace("/login");
            } catch (error) {
              Alert.alert(
                "Error",
                "Unable to logout."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#000000"
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              Settings
            </Text>

            <Text style={styles.subtitle}>
              Manage your account and preferences
            </Text>
          </View>
        </View>

        {/* PROFILE CARD */}
        <View style={styles.profileCard}>
          <View style={styles.profileIcon}>
            {user?.profilePhoto ? (
              <Image
                source={{
                  uri: user.profilePhoto,
                }}
                style={styles.profileImage}
              />
            ) : (
              <Text style={styles.profileInitial}>
                {user?.name
                  ? user.name
                      .charAt(0)
                      .toUpperCase()
                  : "U"}
              </Text>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text
              style={styles.profileName}
              numberOfLines={1}
            >
              {user?.name || "User"}
            </Text>

            <Text
              style={styles.profileEmail}
              numberOfLines={1}
            >
              {user?.email || "No email"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.profileArrow}
            onPress={() =>
              router.push("/(tabs)/profile")
            }
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#000000"
            />
          </TouchableOpacity>
        </View>

        {/* PREFERENCES */}
        <Text style={styles.sectionTitle}>
          Preferences
        </Text>

        <View style={styles.card}>
          <View style={styles.settingItem}>
            <View style={styles.iconBox}>
              <Ionicons
                name="notifications-outline"
                size={21}
                color="#004741"
              />
            </View>

            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>
                Notifications
              </Text>

              <Text style={styles.settingSubtitle}>
                Receive course and test notifications
              </Text>
            </View>

            <Switch
              value={notifications}
              onValueChange={
                handleNotificationChange
              }
              trackColor={{
                false: "#000000",
                true: "#004741",
              }}
              thumbColor={
                notifications
                  ? "#004741"
                  : "#F0EDE4"
              }
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() =>
              router.push("/notifications")
            }
          >
            <View
              style={[
                styles.iconBox,
                styles.notificationIcon,
              ]}
            >
              <Ionicons
                name="mail-open-outline"
                size={21}
                color="#004741"
              />
            </View>

            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>
                Notifications Center
              </Text>

              <Text style={styles.settingSubtitle}>
                View your latest notifications
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#000000"
            />
          </TouchableOpacity>
        </View>

        {/* PRIVACY & SECURITY */}
        <Text style={styles.sectionTitle}>
          Privacy & Security
        </Text>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={showPrivacy}
          >
            <View
              style={[
                styles.iconBox,
                styles.privacyIcon,
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color="#004741"
              />
            </View>

            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>
                Privacy
              </Text>

              <Text style={styles.settingSubtitle}>
                Learn how your data is stored
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#000000"
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={showSecurity}
          >
            <View
              style={[
                styles.iconBox,
                styles.securityIcon,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={21}
                color="#004741"
              />
            </View>

            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>
                Account Security
              </Text>

              <Text style={styles.settingSubtitle}>
                Manage your password and account
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#000000"
            />
          </TouchableOpacity>
        </View>

        {/* ABOUT */}
        <Text style={styles.sectionTitle}>
          About
        </Text>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.aboutItem}
            onPress={showAbout}
          >
            <View style={styles.appIcon}>
              <Ionicons
                name="school"
                size={25}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.aboutContent}>
              <Text style={styles.appName}>
                E-Learning App
              </Text>

              <Text style={styles.version}>
                Version 1.0.0
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#000000"
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>
              Platform
            </Text>

            <Text style={styles.aboutValue}>
              React Native
            </Text>
          </View>

          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>
              App Version
            </Text>

            <Text style={styles.aboutValue}>
              1.0.0
            </Text>
          </View>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons
            name="log-out-outline"
            size={21}
            color="#004741"
          />

          <Text style={styles.logoutText}>
            Logout
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Learn. Grow. Succeed.
        </Text>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EDE4",
  },

content: {
  paddingHorizontal: 20,
  paddingTop: 45,
  paddingBottom: 40,
},

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#004741",
  },

  headerText: {
    flex: 1,
    marginLeft: 13,
  },

  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#000000",
  },

  subtitle: {
    fontSize: 12,
    color: "#000000",
    marginTop: 3,
  },

  /* PROFILE */

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#004741",
  },

  profileIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: "#004741",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 17,
  },

  profileInitial: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },

  profileInfo: {
    flex: 1,
    marginLeft: 13,
    marginRight: 8,
  },

  profileName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },

  profileEmail: {
    fontSize: 11,
    color: "#000000",
    marginTop: 4,
  },

  profileArrow: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  /* SECTION */

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#000000",
    marginTop: 20,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#004741",
    overflow: "hidden",
  },

  /* SETTINGS */

  settingItem: {
    minHeight: 76,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  notificationIcon: {
    backgroundColor: "#F0EDE4",
  },

  learningIcon: {
    backgroundColor: "#F0EDE4",
  },

  privacyIcon: {
    backgroundColor: "#F0EDE4",
  },

  securityIcon: {
    backgroundColor: "#F0EDE4",
  },

  dangerIconBox: {
    backgroundColor: "#F0EDE4",
  },

  settingContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  settingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },

  settingSubtitle: {
    fontSize: 11,
    color: "#000000",
    marginTop: 4,
    lineHeight: 16,
  },

  dangerText: {
    color: "#004741",
  },

  divider: {
    height: 1,
    backgroundColor: "#F0EDE4",
    marginLeft: 69,
  },

  /* ABOUT */

  aboutItem: {
    minHeight: 80,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  appIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#004741",
    alignItems: "center",
    justifyContent: "center",
  },

  aboutContent: {
    flex: 1,
    marginLeft: 13,
    marginRight: 8,
  },

  appName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },

  version: {
    fontSize: 11,
    color: "#000000",
    marginTop: 3,
  },

  aboutRow: {
    paddingHorizontal: 17,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  aboutLabel: {
    fontSize: 12,
    color: "#000000",
  },

  aboutValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000000",
  },

  /* LOGOUT */

  logoutButton: {
    height: 52,
    marginTop: 22,
    borderRadius: 13,
    backgroundColor: "#F0EDE4",
    borderWidth: 1,
    borderColor: "#004741",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  logoutText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#004741",
  },

  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "#000000",
    marginTop: 24,
  },

  bottomSpace: {
    height: 20,
  },
});