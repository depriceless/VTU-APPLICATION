// app/TransactionDetailsScreen.tsx
import React, { useContext } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import TransactionDetails from './TransactionDetails'; // ← Import your other file

export default function TransactionDetailsScreen() {
  const params = useLocalSearchParams();
  const { user } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);

  // Parse transaction from params
  const transaction = params.transaction ? JSON.parse(params.transaction as string) : null;
  const userInfo = params.userInfo ? JSON.parse(params.userInfo as string) : user;

  if (!transaction) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No transaction data available</Text>
      </View>
    );
  }

  return (
    <>
      {/* Red header */}
      <Stack.Screen 
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#ff2b2b' },
          headerTintColor: '#fff',
          headerTitle: 'Transaction Details',
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          headerShadowVisible: false,
        }} 
      />
      
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TransactionDetails transaction={transaction} userInfo={userInfo} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
});