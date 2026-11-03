import { Stack } from "expo-router";
import { ProgressProvider } from "../context/ProgressContext";
import { AuthProvider } from "../context/AuthContext";
import { CourseProvider } from "../context/CourseContext";
import { LessonProvider } from "../context/LessonContext";
import { TestProvider } from "../context/TestContext";
import { AttendanceProvider } from "../context/AttendanceContext";
import { NotificationProvider } from "../context/NotificationContext";
import { ProfilePhotoProvider } from "../context/ProfilePhotoContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <ProgressProvider>
        <CourseProvider>
          <LessonProvider>
            <TestProvider>
              <AttendanceProvider>
                <NotificationProvider>
                  <ProfilePhotoProvider>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                      }}
                    >
                      <Stack.Screen name="index" />
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="login" />
                      <Stack.Screen name="signup" />
                      <Stack.Screen name="course-details" />
                      <Stack.Screen name="lesson" />
                      <Stack.Screen name="test" />
                      <Stack.Screen name="notifications" />
                      <Stack.Screen name="admin" />
                      <Stack.Screen name="attendance" />
                    </Stack>
                  </ProfilePhotoProvider>
                </NotificationProvider>
              </AttendanceProvider>
            </TestProvider>
          </LessonProvider>
        </CourseProvider>
      </ProgressProvider>
    </AuthProvider>
  );
}