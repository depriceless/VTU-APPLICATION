import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import FundWalletComponent from './fund-wallet-component';

export default function FundWalletScreen() {
  const router = useRouter();
  const { token, balance } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);

  const handleSuccess = () => {
    router.back();
  };

  const extractBalance = (balanceData: any): number => {
    if (balanceData === null || balanceData === undefined) return 0;
    if (typeof balanceData === 'number') return balanceData;
    if (typeof balanceData === 'object') {
      const bal = balanceData.amount || balanceData.balance || balanceData.current || balanceData.value || 0;
      return parseFloat(bal) || 0;
    }
    return parseFloat(balanceData) || 0;
  };

  const currentBalance = extractBalance(balance);

  return (
    <>
      {/* Configure the red navigation header */}
      <Stack.Screen 
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#ff2b2b',
          },
          headerTintColor: '#fff',
          headerTitle: 'Fund Wallet',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          headerShadowVisible: false,
        }} 
      />
      
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FundWalletComponent
          token={token}
          currentBalance={currentBalance}
          onSuccess={handleSuccess}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});