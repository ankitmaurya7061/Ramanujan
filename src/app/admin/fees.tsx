import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://ramanujan-sybq.onrender.com/api";

const CLASSES = [6, 7, 8, 9, 10, 11, 12];

export default function FeesScreen() {
  const [selectedClass, setSelectedClass] = useState<number | null>(null);

  const [monthlyFee, setMonthlyFee] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // false = saved card
  // true = input/edit form
  const [isEditing, setIsEditing] = useState(false);

  const getToken = async () => {
    return await AsyncStorage.getItem("fee_admin_token");
  };

  const selectClass = async (classId: number) => {
    try {
      setSelectedClass(classId);
      setLoading(true);
      setMonthlyFee("");
      setIsEditing(false);

      const token = await getToken();

      if (!token) {
        Alert.alert(
          "Session Expired",
          "Please login to Fee Admin again.",
          [
            {
              text: "OK",
              onPress: () =>
                router.replace("/admin/fee-login"),
            },
          ]
        );
        return;
      }

      const response = await fetch(
        `${API_URL}/fees/class/${classId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load fee"
        );
      }

      if (data.fee) {
        const amount = String(
          data.fee.monthlyFee ?? ""
        );

        setMonthlyFee(amount);

        // Fee already exists
        // Show saved card
        setIsEditing(false);
      } else {
        // No fee configured yet
        // Show input form
        setMonthlyFee("");
        setIsEditing(true);
      }
    } catch (error: any) {
      console.log("Load Fee Error:", error);

      Alert.alert(
        "Error",
        error?.message ||
          "Unable to load class fee"
      );

      setMonthlyFee("");
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  };

  const saveFee = async () => {
    if (!selectedClass) {
      Alert.alert(
        "Select Class",
        "Please select a class first."
      );
      return;
    }

    const amount = Number(monthlyFee);

    if (
      !monthlyFee ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      Alert.alert(
        "Invalid Fee",
        "Please enter a valid monthly fee."
      );
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      if (!token) {
        Alert.alert(
          "Session Expired",
          "Please login to Fee Admin again.",
          [
            {
              text: "OK",
              onPress: () =>
                router.replace("/admin/fee-login"),
            },
          ]
        );
        return;
      }

      const response = await fetch(
        `${API_URL}/fees`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            classId: selectedClass,

            // Monthly fee
            monthlyFee: amount,

            // Backend compatibility
            quarterlyFee: 0,
            yearlyFee: 0,
            installmentAmount: 0,
            defaultPlan: "monthly",
            dueDate: null,
            note: "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to save monthly fee"
        );
      }

      setMonthlyFee(
        String(
          data?.fee?.monthlyFee ?? amount
        )
      );

      // After saving show card
      setIsEditing(false);

      Alert.alert(
        "Fee Saved",
        `Class ${selectedClass} monthly fee is â‚¹${amount}.`
      );
    } catch (error: any) {
      console.log("Save Fee Error:", error);

      Alert.alert(
        "Error",
        error?.message ||
          "Unable to save monthly fee"
      );
    } finally {
      setSaving(false);
    }
  };

  const openStudents = () => {
    if (!selectedClass) {
      Alert.alert(
        "Select Class",
        "Please select a class first."
      );
      return;
    }

    router.push({
      pathname: "/admin/fee-students",
      params: {
        classId: String(selectedClass),
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* ================= HEADER ================= */}

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.replace("/admin")
          }
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#FFFFFF"
          />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            Fee Management
          </Text>

          <Text style={styles.headerSubtitle}>
            Manage monthly class fees
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="cash-outline"
            size={24}
            color="#FFFFFF"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ================= SELECT CLASS ================= */}

        <Text style={styles.sectionTitle}>
          Select Class
        </Text>

        <View style={styles.classGrid}>
          {CLASSES.map((classId) => {
            const selected =
              selectedClass === classId;

            return (
              <Pressable
                key={classId}
                style={[
                  styles.classCard,
                  selected &&
                    styles.classCardSelected,
                ]}
                onPress={() =>
                  selectClass(classId)
                }
              >
                <View
                  style={[
                    styles.classCircle,
                    selected &&
                      styles.classCircleSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.classNumber,
                      selected &&
                        styles.classNumberSelected,
                    ]}
                  >
                    {classId}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.className,
                    selected &&
                      styles.classNameSelected,
                  ]}
                >
                  Class {classId}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ================= NO CLASS SELECTED ================= */}

        {!selectedClass && (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="school-outline"
                size={38}
                color="#004741"
              />
            </View>

            <Text style={styles.emptyTitle}>
              Select a Class
            </Text>

            <Text style={styles.emptyText}>
              Select a class to set its
              monthly fee.
            </Text>
          </View>
        )}

        {/* ================= SELECTED CLASS ================= */}

        {selectedClass && (
          <View style={styles.settingsCard}>
            {/* CLASS HEADER */}

            <View style={styles.settingsHeader}>
              <View>
                <Text
                  style={styles.settingsTitle}
                >
                  Class {selectedClass}
                </Text>

                <Text
                  style={styles.settingsSubtitle}
                >
                  Monthly Fee
                </Text>
              </View>

              <View style={styles.monthIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color="#004741"
                />
              </View>
            </View>

            {/* ================= LOADING ================= */}

            {loading ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator
                  size="large"
                  color="#004741"
                />

                <Text
                  style={styles.loaderText}
                >
                  Loading fee...
                </Text>
              </View>
            ) : !isEditing &&
              monthlyFee ? (
              /* ================= SAVED FEE CARD ================= */
              <>
                <View
                  style={styles.savedFeeCard}
                >
                  <View
                    style={
                      styles.savedFeeTop
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.savedFeeLabel
                        }
                      >
                        Monthly Fee
                      </Text>

                      <Text
                        style={
                          styles.savedFeeAmount
                        }
                      >
                        â‚¹{monthlyFee}

                        <Text
                          style={
                            styles.perMonth
                          }
                        >
                          {" "}
                          / month
                        </Text>
                      </Text>
                    </View>

                    {/* ACTIVE BADGE */}

                    <View
                      style={
                        styles.savedBadge
                      }
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={17}
                        color="#004741"
                      />

                      <Text
                        style={
                          styles.savedBadgeText
                        }
                      >
                        Active
                      </Text>
                    </View>
                  </View>

                  <View
                    style={styles.divider}
                  />

                  {/* APPLIES TO */}

                  <View
                    style={styles.appliesRow}
                  >
                    <Ionicons
                      name="people-outline"
                      size={19}
                      color="#004741"
                    />

                    <Text
                      style={
                        styles.appliesText
                      }
                    >
                      Applies to all Class{" "}
                      {selectedClass}{" "}
                      students
                    </Text>
                  </View>

                  {/* EDIT BUTTON */}

                  <Pressable
                    style={
                      styles.editButton
                    }
                    onPress={() =>
                      setIsEditing(true)
                    }
                  >
                    <Ionicons
                      name="create-outline"
                      size={19}
                      color="#004741"
                    />

                    <Text
                      style={
                        styles.editButtonText
                      }
                    >
                      Edit Fee
                    </Text>
                  </Pressable>
                </View>

                {/* VIEW STUDENTS */}

                <Pressable
                  style={
                    styles.studentsButton
                  }
                  onPress={openStudents}
                >
                  <Ionicons
                    name="people-outline"
                    size={21}
                    color="#004741"
                  />

                  <Text
                    style={
                      styles.studentsText
                    }
                  >
                    View Class{" "}
                    {selectedClass}{" "}
                    Students
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#004741"
                  />
                </Pressable>
              </>
            ) : (
              /* ================= CREATE / EDIT FORM ================= */
              <>
                <View
                  style={styles.editModeHeader}
                >
                  <View
                    style={
                      styles.editModeIcon
                    }
                  >
                    <Ionicons
                      name={
                        monthlyFee
                          ? "create-outline"
                          : "add-circle-outline"
                      }
                      size={21}
                      color="#004741"
                    />
                  </View>

                  <View>
                    <Text
                      style={
                        styles.editModeTitle
                      }
                    >
                      {monthlyFee
                        ? "Edit Monthly Fee"
                        : "Set Monthly Fee"}
                    </Text>

                    <Text
                      style={
                        styles.editModeSubtitle
                      }
                    >
                      Class {selectedClass}
                    </Text>
                  </View>
                </View>

                {/* INPUT */}

                <Text style={styles.label}>
                  Monthly Fee
                </Text>

                <View
                  style={styles.inputBox}
                >
                  <Text
                    style={styles.rupee}
                  >
                    â‚¹
                  </Text>

                  <TextInput
                    value={monthlyFee}
                    onChangeText={
                      setMonthlyFee
                    }
                    placeholder="Enter monthly fee"
                    placeholderTextColor="#8A918E"
                    keyboardType="numeric"
                    style={styles.input}
                    autoFocus={false}
                  />
                </View>

                <Text
                  style={styles.helperText}
                >
                  This monthly fee will
                  automatically apply to
                  all students of Class{" "}
                  {selectedClass}.
                </Text>

                {/* SAVE */}

                <Pressable
                  style={[
                    styles.saveButton,
                    saving &&
                      styles.disabledButton,
                  ]}
                  onPress={saveFee}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="save-outline"
                        size={21}
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.saveText
                        }
                      >
                        {monthlyFee
                          ? "Save Changes"
                          : "Save Monthly Fee"}
                      </Text>
                    </>
                  )}
                </Pressable>

                {/* CANCEL */}

                {monthlyFee && (
                  <Pressable
                    style={
                      styles.cancelButton
                    }
                    onPress={() =>
                      setIsEditing(false)
                    }
                  >
                    <Text
                      style={
                        styles.cancelText
                      }
                    >
                      Cancel
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EDE4",
  },

  /* ================= HEADER ================= */

  header: {
    backgroundColor: "#004741",
    paddingTop:
      Platform.OS === "ios"
        ? 55
        : 42,
    paddingBottom: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor:
      "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerText: {
    flex: 1,
    marginLeft: 13,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#DCE8E5",
    fontSize: 12,
    marginTop: 3,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor:
      "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },

  /* ================= CONTENT ================= */

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  sectionTitle: {
    color: "#000000",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 13,
  },

  /* ================= CLASS GRID ================= */

  classGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  classCard: {
    width: "22%",
    minWidth: 76,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD9CF",
  },

  classCardSelected: {
    backgroundColor: "#004741",
    borderColor: "#004741",
  },

  classCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },

  classCircleSelected: {
    backgroundColor: "#FFFFFF",
  },

  classNumber: {
    color: "#004741",
    fontSize: 16,
    fontWeight: "900",
  },

  classNumberSelected: {
    color: "#004741",
  },

  className: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "700",
  },

  classNameSelected: {
    color: "#FFFFFF",
  },

  /* ================= EMPTY ================= */

  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#DDD9CF",
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },

  emptyTitle: {
    color: "#000000",
    fontSize: 19,
    fontWeight: "800",
  },

  emptyText: {
    color: "#606763",
    fontSize: 13,
    textAlign: "center",
    marginTop: 7,
  },

  /* ================= SETTINGS CARD ================= */

  settingsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#DDD9CF",
  },

  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  settingsTitle: {
    color: "#000000",
    fontSize: 21,
    fontWeight: "900",
  },

  settingsSubtitle: {
    color: "#6B726F",
    fontSize: 13,
    marginTop: 4,
  },

  monthIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
  },

  /* ================= LOADING ================= */

  loaderBox: {
    alignItems: "center",
    paddingVertical: 30,
  },

  loaderText: {
    color: "#606763",
    fontSize: 13,
    marginTop: 10,
  },

  /* ================= SAVED FEE CARD ================= */

  savedFeeCard: {
    backgroundColor: "#F8F7F3",
    borderRadius: 17,
    padding: 17,
    borderWidth: 1,
    borderColor: "#D8D4CA",
  },

  savedFeeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  savedFeeLabel: {
    color: "#606763",
    fontSize: 13,
    fontWeight: "700",
  },

  savedFeeAmount: {
    color: "#004741",
    fontSize: 29,
    fontWeight: "900",
    marginTop: 5,
  },

  perMonth: {
    fontSize: 13,
    fontWeight: "700",
    color: "#606763",
  },

  savedBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  savedBadgeText: {
    color: "#004741",
    fontSize: 11,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    backgroundColor: "#DDD9CF",
    marginVertical: 15,
  },

  appliesRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  appliesText: {
    flex: 1,
    color: "#555D59",
    fontSize: 13,
    marginLeft: 8,
  },

  editButton: {
    height: 48,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#004741",
    marginTop: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },

  editButtonText: {
    color: "#004741",
    fontSize: 14,
    fontWeight: "800",
  },

  /* ================= EDIT MODE ================= */

  editModeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  editModeIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#F0EDE4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  editModeTitle: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "800",
  },

  editModeSubtitle: {
    color: "#707572",
    fontSize: 12,
    marginTop: 2,
  },

  /* ================= INPUT ================= */

  label: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },

  inputBox: {
    height: 56,
    backgroundColor: "#F8F7F3",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8D4CA",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  rupee: {
    color: "#004741",
    fontSize: 19,
    fontWeight: "900",
  },

  input: {
    flex: 1,
    color: "#000000",
    fontSize: 17,
    fontWeight: "700",
    marginLeft: 10,
  },

  helperText: {
    color: "#666D69",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
    marginBottom: 20,
  },

  /* ================= SAVE ================= */

  saveButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: "#004741",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  /* ================= CANCEL ================= */

  cancelButton: {
    height: 48,
    borderRadius: 13,
    backgroundColor: "#F0EDE4",
    marginTop: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  cancelText: {
    color: "#004741",
    fontSize: 14,
    fontWeight: "800",
  },

  /* ================= STUDENTS ================= */

  studentsButton: {
    height: 52,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#004741",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 14,
    marginTop: 11,
  },

  studentsText: {
    flex: 1,
    color: "#004741",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 9,
  },
});
