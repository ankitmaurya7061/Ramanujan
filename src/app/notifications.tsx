import React from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "../context/NotificationContext";

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const handleNotificationPress = async (id: string) => {
    await markAsRead(id);
  };


  const getIcon = (type: string) => {
    switch (type) {
      case "course":
        return "book-outline";
      case "test":
        return "document-text-outline";
      case "lesson":
        return "play-circle-outline";
      default:
        return "notifications-outline";
    }
  };

  const getTime = (date: string) => {
    const notificationDate = new Date(date);
    const now = new Date();

    const difference = Math.floor(
      (now.getTime() - notificationDate.getTime()) / 1000
    );

    if (difference < 60) {
      return "Just now";
    }

    if (difference < 3600) {
      return `${Math.floor(difference / 60)}m ago`;
    }

    if (difference < 86400) {
      return `${Math.floor(difference / 3600)}h ago`;
    }

    if (difference < 604800) {
      return `${Math.floor(difference / 86400)}d ago`;
    }

    return notificationDate.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#000000" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Notifications</Text>

          {unreadCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      {notifications.length > 0 && (
        <View style={styles.actionRow}>
          <Text style={styles.notificationCount}>
            {notifications.length}{" "}
            {notifications.length === 1 ? "notification" : "notifications"}
          </Text>

          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          notifications.length === 0
            ? styles.emptyContainer
            : styles.listContainer
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="notifications-off-outline"
                size={42}
                color="#000000"
              />
            </View>

            <Text style={styles.emptyTitle}>No notifications</Text>

            <Text style={styles.emptyText}>
              You're all caught up! New notifications will appear here.
            </Text>

            <TouchableOpacity
              style={styles.backHomeButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backHomeText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.read && styles.unreadCard,
              ]}
              onPress={() => handleNotificationPress(notification.id)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.notificationIcon,
                  !notification.read && styles.unreadIcon,
                ]}
              >
                <Ionicons
                  name={getIcon(notification.type) as any}
                  size={23}
                  color={notification.read ? "#004741" : "#FFFFFF"}
                />
              </View>

              <View style={styles.notificationContent}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      !notification.read && styles.unreadTitle,
                    ]}
                    numberOfLines={1}
                  >
                    {notification.title}
                  </Text>

                  {!notification.read && <View style={styles.unreadDot} />}
                </View>

                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>

                <Text style={styles.notificationTime}>
                  {getTime(notification.createdAt)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteNotification(notification.id)}
              >
                <Ionicons
                  name="close-outline"
                  size={20}
                  color="#000000"
                />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EDE4",
  },

  header: {
    minHeight: 78,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#004741",
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#004741",
  },

  clearButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  headerPlaceholder: {
    width: 42,
  },

  actionRow: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    minHeight: 48,
    paddingHorizontal: 15,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#004741",
  },

  notificationCount: {
    fontSize: 12,
    color: "#000000",
    fontWeight: "800",
  },

  markAllText: {
    fontSize: 12,
    color: "#004741",
    fontWeight: "900",
  },

  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 30,
  },

  notificationCard: {
    minHeight: 88,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#004741",
  },

  unreadCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#004741",
  },

  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#F0EDE4",
    borderWidth: 1,
    borderColor: "#004741",
    alignItems: "center",
    justifyContent: "center",
  },

  unreadIcon: {
    backgroundColor: "#004741",
    borderColor: "#004741",
  },

  notificationContent: {
    flex: 1,
    marginLeft: 13,
    marginRight: 7,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 20,
  },

  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },

  unreadTitle: {
    fontWeight: "900",
    color: "#004741",
  },

  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#004741",
    marginLeft: 7,
  },

  notificationMessage: {
    fontSize: 11,
    lineHeight: 16,
    color: "#000000",
    marginTop: 3,
  },

  notificationTime: {
    fontSize: 10,
    color: "#000000",
    marginTop: 5,
    fontWeight: "600",
  },

  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#F0EDE4",
    borderWidth: 1,
    borderColor: "#004741",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingTop: 45,
  },

  emptyState: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: "#004741",
  },

  emptyIcon: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#004741",
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000000",
  },

  emptyText: {
    fontSize: 13,
    color: "#000000",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },

  backHomeButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#004741",
    justifyContent: "center",
    alignItems: "center",
  },

  backHomeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
});

