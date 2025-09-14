import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;

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

interface TransactionDetailsProps {
  transaction: Transaction;
  onClose: () => void;
  userInfo?: User | null;
}

export default function TransactionDetails({ transaction, onClose, userInfo }: TransactionDetailsProps) {


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

  // ✅ Handle receipt sharing
  const handleShareReceipt = async () => {
    const receiptText = generateReceiptText();
    
    try {
      await Share.share({
        message: receiptText,
        title: 'Transaction Receipt',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share Error', 'Unable to share receipt. Please try again.');
    }
  };

  // ✅ Generate receipt text for sharing
  const generateReceiptText = () => {
    const { date, time } = formatDateTime(transaction.createdAt);
    const amount = transaction.type === 'credit' || transaction.type === 'transfer_in' 
      ? `+₦${transaction.amount.toLocaleString()}`
      : `-₦${transaction.amount.toLocaleString()}`;

    return `
🧾 TRANSACTION RECEIPT
━━━━━━━━━━━━━━━━━━━━━━━━━

💳 Transaction Details:
Reference: ${transaction.reference}
Type: ${transaction.type.toUpperCase().replace('_', ' ')}
Category: ${transaction.category.toUpperCase()}
Amount: ${amount}
Status: ${transaction.status.toUpperCase()}

📅 Date & Time:
${date} at ${time}

👤 Account Information:
Name: ${userInfo?.name || 'N/A'}
Email: ${userInfo?.email || 'N/A'}

${transaction.description ? `📝 Description: ${transaction.description}` : ''}

${transaction.previousBalance !== undefined ? `💰 Previous Balance: ₦${transaction.previousBalance.toLocaleString()}` : ''}
${transaction.newBalance !== undefined ? `💰 New Balance: ₦${transaction.newBalance.toLocaleString()}` : ''}

${transaction.gateway?.provider ? `🌐 Payment Gateway: ${transaction.gateway.provider.toUpperCase()}` : ''}
${transaction.gateway?.gatewayReference ? `🔗 Gateway Ref: ${transaction.gateway.gatewayReference}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━
Thank you for using our service!
    `.trim();
  };

  // ✅ Handle download receipt (simulate download)
  const handleDownloadReceipt = () => {
    Alert.alert(
      'Download Receipt',
      'Receipt download functionality would be implemented here. In a real app, this would generate a PDF or save to device storage.',
      [
        { text: 'Share Instead', onPress: handleShareReceipt },
        { text: 'OK', style: 'cancel' }
      ]
    );
  };

  const { date, time } = formatDateTime(transaction.createdAt);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close-outline" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <TouchableOpacity onPress={handleShareReceipt} style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="#ff2b2b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* Betting Information */}
        {transaction.metadata?.betting && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Betting Information</Text>
            
            {transaction.metadata.betting.provider && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Betting Provider</Text>
                <Text style={styles.infoValue}>{transaction.metadata.betting.provider}</Text>
              </View>
            )}
            
            {transaction.metadata.betting.customerId && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Customer ID</Text>
                <Text style={styles.infoValueMono}>{transaction.metadata.betting.customerId}</Text>
              </View>
            )}
            
            {transaction.metadata.betting.customerName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Customer Name</Text>
                <Text style={styles.infoValue}>{transaction.metadata.betting.customerName}</Text>
              </View>
            )}
          </View>
        )}

        {/* Additional Information */}
        {transaction.metadata && (transaction.metadata.notes || transaction.metadata.source) && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            
            {transaction.metadata.notes && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Notes</Text>
                <Text style={styles.infoValue}>{transaction.metadata.notes}</Text>
              </View>
            )}
            
            {transaction.metadata.source && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Source</Text>
                <Text style={styles.infoValue}>{transaction.metadata.source}</Text>
              </View>
            )}
          </View>
        )}

      
       {/* Empty space - Show Receipt section removed */}
        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  shareButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Status Card
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginVertical: 20,
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
  balanceHighlight: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  
 
  bottomPadding: {
    height: 40,
  },
});