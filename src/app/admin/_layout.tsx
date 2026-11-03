import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="user-details" />
      <Stack.Screen name="courses" />
      <Stack.Screen name="lessons" />
      <Stack.Screen name="tests" />
      <Stack.Screen name="test-questions" />
      <Stack.Screen name="test-results" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="attendance" />

      {/* Fees */}
      <Stack.Screen name="fee-login" />
      <Stack.Screen name="fees" />
      <Stack.Screen name="fee-students" />
      <Stack.Screen name="fee-details" />
    </Stack>
  );
}