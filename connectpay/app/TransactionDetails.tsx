// TransactionDetailsComponent.tsx - The actual component (like FundWalletComponent)
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  date: string;
  createdAt: string;
  status: string;
  description?: string;
  reference: string;
  category: string;
  previousBalance?: number;
  newBalance?: number;
  gateway?: {
    provider?: string;
    gatewayReference?: string;
  };
  metadata?: {
    ip_address?: string;
    user_agent?: string;
    source?: string;
    notes?: string;
    betting?: {
      provider?: string;
      customerId?: string;
      customerName?: string;
    };
  };
}

interface User {
  name: string;
  email: string;
  phone?: string;
  username?: string;
}

interface TransactionDetailsComponentProps {
  transaction: Transaction;
  userInfo?: User | null;
}

export default function TransactionDetailsComponent({ transaction, userInfo }: TransactionDetailsComponentProps) {

  // ✅ Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      })
    };
  };

  // ✅ Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return '#28a745';
      case 'pending':
        return '#ffc107';
      case 'failed':
      case 'error':
        return '#dc3545';
      case 'cancelled':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  // ✅ Get transaction type color
  const getTransactionColor = () => {
    if (transaction.status === 'failed') return '#dc3545';
    if (transaction.status === 'pending') return '#ffc107';
    
    switch (transaction.type) {
      case 'credit':
      case 'transfer_in':
        return '#28a745';
      case 'debit':
      case 'transfer_out':
        return '#ff2b2b';
      default:
        return '#6c757d';
    }
  };

  // ✅ Get transaction icon
  const getTransactionIcon = () => {
    switch (transaction.category) {
      case 'funding':
        return 'wallet-outline';
      case 'betting':
        return 'football-outline';
      case 'transfer':
        return transaction.type === 'transfer_out' ? 'send-outline' : 'download-outline';
      case 'payment':
        return 'card-outline';
      case 'withdrawal':
        return 'cash-outline';
      default:
        return transaction.type === 'credit' ? 'add-circle-outline' : 'remove-circle-outline';
    }
  };

  const { date, time } = formatDateTime(transaction.createdAt);

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContent} 
        contentContainerStyle={{ paddingBottom: 40 }} 
        showsVerticalScrollIndicator={false}
      >
        {/* Transaction Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIcon, { backgroundColor: `${getTransactionColor()}15` }]}>
            <Ionicons 
              name={getTransactionIcon() as any} 
              size={32} 
              color={getTransactionColor()} 
            />
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) }]}>
            <Text style={styles.statusText}>{transaction.status.toUpperCase()}</Text>
          </View>

          <Text style={styles.transactionType}>
            {transaction.type.toUpperCase().replace('_', ' ')} TRANSACTION
          </Text>
          
          <Text style={[styles.amount, { color: getTransactionColor() }]}>
            {transaction.type === 'credit' || transaction.type === 'transfer_in' ? '+' : '-'}₦{transaction.amount.toLocaleString()}
          </Text>
          
          {transaction.description && (
            <Text style={styles.description}>{transaction.description}</Text>
          )}
        </View>

        {/* Transaction Information */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Transaction Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Reference Number</Text>
            <Text style={styles.infoValue}>{transaction.reference}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Transaction ID</Text>
            <Text style={styles.infoValueMono}>#{transaction._id.slice(-8).toUpperCase()}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category</Text>
            <Text style={styles.infoValue}>{transaction.category.toUpperCase()}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{date}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>{time}</Text>
          </View>
        </View>

        {/* Payment Gateway Information */}
        {transaction.gateway && (transaction.gateway.provider || transaction.gateway.gatewayReference) && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Payment Information</Text>
            
            {transaction.gateway.provider && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payment Gateway</Text>
                <Text style={styles.infoValue}>{transaction.gateway.provider.toUpperCase()}</Text>
              </View>
            )}
            
            {transaction.gateway.gatewayReference && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Gateway Reference</Text>
                <Text style={styles.infoValueMono}>{transaction.gateway.gatewayReference}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flex: 1,
  },
  
  // Status Card
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  transactionType: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Info Cards
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  infoValueMono: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
});