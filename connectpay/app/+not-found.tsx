import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../contexts/ThemeContext';

export default function NotFoundScreen() {
  const { colors } = useContext(ThemeContext);

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={100} color={colors.textSecondary} />
        <Text style={[styles.title, { color: colors.text }]}>Page Not Found</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          This screen doesn't exist.
        </Text>
        <Link href="/dashboard" style={[styles.link, { backgroundColor: '#ff2b2b' }]} asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.linkText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  link: {
    borderRadius: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 30,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});