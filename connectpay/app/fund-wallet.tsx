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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>Fund Wallet</Text>
        
        <View style={styles.headerRight} />
      </View>

      <FundWalletComponent
        token={token}
        currentBalance={currentBalance}
        onSuccess={handleSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerRight: {
    width: 40,
  },
});