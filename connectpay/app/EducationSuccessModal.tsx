import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';

interface EducationSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  onBuyMore: () => void;
  transaction: {
    id?: string;
    reference?: string;
    status?: string;
    date?: string;
  };
  examName: string;
  quantity: number;
  amount: number;
  newBalance?: {
    total?: number;
    currency?: string;
  };
  message?: string;
}

const EducationSuccessModal: React.FC<EducationSuccessModalProps> = ({
  visible,
  onClose,
  onBuyMore,
  transaction,
  examName,
  quantity,
  amount,
  newBalance,
  message = 'Exam card purchased successfully!',
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.successIcon}>✅</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Purchase Successful!</Text>
          <Text style={styles.subtitle}>{examName}</Text>

          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {/* Transaction Details */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Exam Card:</Text>
                <Text style={styles.detailValue}>{examName}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quantity:</Text>
                <Text style={styles.detailValue}>{quantity}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={[styles.detailValue, styles.amountText]}>
                  ₦{amount.toLocaleString()}
                </Text>
              </View>

              {transaction.reference && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reference:</Text>
                  <Text style={[styles.detailValue, styles.referenceText]}>
                    {transaction.reference}
                  </Text>
                </View>
              )}

              {transaction.id && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transaction ID:</Text>
                  <Text style={[styles.detailValue, styles.transactionIdText]}>
                    {transaction.id}
                  </Text>
                </View>
              )}

              {transaction.date && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date & Time:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(transaction.date).toLocaleString()}
                  </Text>
                </View>
              )}

              {transaction.status && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[styles.detailValue, styles.statusSuccess]}>
                    {transaction.status}
                  </Text>
                </View>
              )}

              {newBalance && (
                <View style={[styles.detailRow, styles.balanceRow]}>
                  <Text style={styles.detailLabel}>New Balance:</Text>
                  <Text style={[styles.detailValue, styles.balanceValue]}>
                    ₦{(newBalance.total || 0).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
  </ScrollView>
            
          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.buyMoreButton]} 
              onPress={onBuyMore}
            >
              <Text style={styles.buyMoreText}>Buy Another Card</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.doneButton]} 
              onPress={onClose}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  detailsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  balanceRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'right',
  },
  amountText: {
    color: '#ff3b30',
    fontWeight: '700',
  },
  referenceText: {
    color: '#ff3b30',
    fontWeight: '700',
  },
  transactionIdText: {
    color: '#6c757d',
    fontSize: 12,
  },
  statusSuccess: {
    color: '#28a745',
    fontWeight: '700',
  },
  balanceValue: {
    color: '#28a745',
    fontSize: 16,
  },
  instructionsContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0d47a1',
    marginBottom: 12,
    textAlign: 'center',
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNumber: {
    color: '#ff3b30',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 8,
    minWidth: 20,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#0d47a1',
    lineHeight: 20,
  },
  supportContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
    textAlign: 'center',
  },
  supportText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 12,
    lineHeight: 20,
    textAlign: 'center',
  },
  contactInfo: {
    alignItems: 'center',
  },
  supportContact: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyMoreButton: {
    backgroundColor: '#ff3b30',
  },
  doneButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  buyMoreText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  doneText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EducationSuccessModal;