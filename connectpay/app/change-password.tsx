import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from "react-native";
import { AuthContext } from "../contexts/AuthContext";

export default function ChangePassword() {
  const { token } = useContext(AuthContext);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(""); // will show error or success
  const [isError, setIsError] = useState(true); // tracks if message is error or success

  const handleChangePassword = async () => {
    setMessage("");

    if (newPassword !== confirmPassword) {
      setIsError(true);
      setMessage("Passwords do not match");
      return;
    }
    if (!token) {
      setIsError(true);
      setMessage("You must be logged in");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("https://vtu-application.onrender.com/api/user/change-password", {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsError(false);
        setMessage(data.message || "Password updated successfully");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setIsError(true);
        setMessage(data.message || "Failed to update password");
      }
    } catch (error: any) {
      setIsError(true);
      setMessage(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Removed header completely */}

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Old Password"
          secureTextEntry
          value={oldPassword}
          onChangeText={setOldPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="New Password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {message ? (
          <Text style={[styles.messageText, { color: isError ? "red" : "green" }]}>{message}</Text>
        ) : null}

        <TouchableOpacity style={styles.saveButton} onPress={handleChangePassword} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  form: { padding: 20 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 15 },
  saveButton: { backgroundColor: "#ff2b2b", padding: 15, borderRadius: 8, alignItems: "center" },
  saveButtonText: { color: "#fff", fontWeight: "600" },
  messageText: { marginBottom: 10, fontWeight: "500" },
});
