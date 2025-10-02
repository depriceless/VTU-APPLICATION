import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
  TextInput,
  Alert,
  Image,
  Linking,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration - REPLACE THIS WITH YOUR ACTUAL IP ADDRESS
const API_BASE_URL = __DEV__ 
  ? 'https://vtu-application.onrender.com'  // ← REPLACE WITH YOUR COMPUTER'S IP
  : 'https://your-production-api.com';

export default function HelpCenter() {
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isRobotVerified, setIsRobotVerified] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [ticketData, setTicketData] = useState({
    email: '',
    subject: '',
    category: '',
    phoneNumber: '',
    transactionId: '',
    date: new Date(),
    comment: '',
    screenshot: null,
  });
  
  const [feedbackData, setFeedbackData] = useState({
    rating: 0,
    comment: '',
  });

  // FAQ Data
  const faqData = [
    {
      id: 1,
      question: 'How do I buy airtime?',
      answer: 'Navigate to the "Buy Airtime" section, select your network, enter phone number and amount, then confirm with your PIN.',
      expanded: false,
    },
    {
      id: 2,
      question: 'What networks are supported?',
      answer: 'We support MTN, Airtel, Glo, and 9Mobile networks for airtime purchases.',
      expanded: false,
    },
    {
      id: 3,
      question: 'How do I fund my wallet?',
      answer: 'You can fund your wallet through bank transfer, card payment, or USSD. Go to "Fund Wallet" for available options.',
      expanded: false,
    },
    {
      id: 4,
      question: 'Is my transaction secure?',
      answer: 'Yes, all transactions are encrypted and protected with your 4-digit PIN. We use industry-standard security measures.',
      expanded: false,
    },
    {
      id: 5,
      question: 'How long does airtime purchase take?',
      answer: 'Airtime purchases are usually instant. If there\'s a delay, it will be processed within 5 minutes.',
      expanded: false,
    },
  ];

  const [faqList, setFaqList] = useState(faqData);

  const ticketCategories = [
    'Airtime',
    'Data',
    'Electricity',
    'Cable',
    'Recharge Card',
    'WAEC PIN',
    'Wallet Funding',
    'Enquiries',
    'Suggestions',
    'Feedbacks',
    'Login Issues',
    'Website Issues',
  ];

  const handleSubmitTicket = async () => {
    // Validate required fields
    if (!ticketData.email.trim() || !ticketData.subject.trim() || !ticketData.comment.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (Email, Subject, Comment)');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ticketData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!isRobotVerified) {
      Alert.alert('Error', 'Please verify that you are not a robot');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get user token from AsyncStorage
      const token = await AsyncStorage.getItem('user_token');
      
      const ticketPayload = {
        email: ticketData.email,
        subject: ticketData.subject,
        category: ticketData.category,
        phoneNumber: ticketData.phoneNumber,
        transactionId: ticketData.transactionId,
        date: ticketData.date.toISOString(),
        comment: ticketData.comment,
        screenshot: ticketData.screenshot,
        status: 'open',
        createdAt: new Date().toISOString(),
      };

      console.log('Submitting ticket to:', `${API_BASE_URL}/api/support/tickets`);
      
      // Send to your backend API
      const response = await fetch(`${API_BASE_URL}/api/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(ticketPayload)
      });

      if (response.ok) {
        const result = await response.json();
        
        Alert.alert(
          '✅ Ticket Submitted Successfully',
          `Ticket ID: ${result.data?.ticketId || 'TKT-' + Date.now()}\n\nWe will contact you within 24 hours via email.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowTicketModal(false);
                resetTicketForm();
              }
            }
          ]
        );
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }

    } catch (error) {
      console.error('Error submitting ticket:', error);
      
      // Show appropriate error message
      if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
        Alert.alert(
          '🌐 Connection Error',
          'Cannot connect to server. Please:\n\n• Check your internet connection\n• Ensure the server is running\n• Verify the IP address is correct\n\nFor now, your ticket has been saved locally.',
          [
            { 
              text: 'Try Again', 
              onPress: () => handleSubmitTicket() 
            },
            { 
              text: 'OK', 
              style: 'cancel',
              onPress: () => {
                setShowTicketModal(false);
                resetTicketForm();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          '❌ Submission Error',
          'Failed to submit ticket. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetTicketForm = () => {
    setTicketData({
      email: '',
      subject: '',
      category: '',
      phoneNumber: '',
      transactionId: '',
      date: new Date(),
      comment: '',
      screenshot: null,
    });
    setIsRobotVerified(false);
  };

  const handleSubmitFeedback = () => {
    if (feedbackData.rating === 0) {
      Alert.alert('Error', 'Please provide a rating');
      return;
    }

    // Simulate API call
    setTimeout(() => {
      Alert.alert(
        '✅ Feedback Submitted',
        'Thank you for your feedback! We appreciate your input and will use it to improve our service.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowFeedbackModal(false);
              setFeedbackData({ rating: 0, comment: '' });
            }
          }
        ]
      );
    }, 500);
  };

  const toggleFAQ = (id) => {
    setFaqList(prevFaq => 
      prevFaq.map(item => 
        item.id === id ? { ...item, expanded: !item.expanded } : item
      )
    );
  };

  const handleCallSupport = async () => {
    const phoneNumber = '+2348141900468';
    const url = `tel:${phoneNumber}`;
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to make phone call');
    }
  };

  const handleEmailSupport = async () => {
    const email = 'Mutiuridwan0@gmail.com';
    const subject = 'Support Request';
    const body = 'Hello Support Team,\n\nI need assistance with:';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Email is not configured on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open email client');
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTicketData({...ticketData, date: selectedDate});
    }
  };

  const handleAttachScreenshot = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos to attach screenshots');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setTicketData({...ticketData, screenshot: result.assets[0].uri});
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const removeScreenshot = () => {
    setTicketData({...ticketData, screenshot: null});
  };

  const cancelTicket = () => {
    if (ticketData.email || ticketData.subject || ticketData.comment) {
      Alert.alert(
        'Cancel Ticket',
        'Are you sure you want to cancel? All entered data will be lost.',
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Yes', 
            onPress: () => {
              setShowTicketModal(false);
              resetTicketForm();
            }
          }
        ]
      );
    } else {
      setShowTicketModal(false);
      resetTicketForm();
    }
  };

  const selectCategory = (category) => {
    setTicketData({...ticketData, category});
    setShowCategoryModal(false);
  };

  const testBackendConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (response.ok) {
        Alert.alert('✅ Connection Successful', 'Backend server is reachable!');
      } else {
        throw new Error(`Status: ${response.status}`);
      }
    } catch (error) {
      Alert.alert(
        '❌ Connection Failed', 
        `Cannot reach backend server at:\n${API_BASE_URL}\n\nError: ${error.message}`
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        

    {/* Talk to Us Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 Talk to Us</Text>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => setShowTicketModal(true)}
          >
            <View style={styles.actionContent}>
              <Text style={styles.actionIcon}>🎫</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Submit a Ticket</Text>
                <Text style={styles.actionSubtitle}>Report issues or get help with your account</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => setShowFeedbackModal(true)}
          >
            <View style={styles.actionContent}>
              <Text style={styles.actionIcon}>⭐</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Feedback</Text>
                <Text style={styles.actionSubtitle}>Share your thoughts about our service</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❓ Frequently Asked Questions</Text>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => setShowFaqModal(true)}
          >
            <View style={styles.actionContent}>
              <Text style={styles.actionIcon}>📚</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Browse FAQs</Text>
                <Text style={styles.actionSubtitle}>Find answers to common questions</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Contact Us Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Contact Us</Text>
          
          <TouchableOpacity 
            style={styles.contactCard}
            onPress={handleCallSupport}
          >
            <View style={styles.contactContent}>
              <Text style={styles.contactIcon}>📞</Text>
              <View style={styles.contactText}>
                <Text style={styles.contactTitle}>Phone Support</Text>
                <Text style={styles.contactSubtitle}>+234 8141900468</Text>
                <Text style={styles.contactHours}>Mon - Fri: 8AM - 8PM</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactCard}
            onPress={handleEmailSupport}
          >
            <View style={styles.contactContent}>
              <Text style={styles.contactIcon}>📧</Text>
              <View style={styles.contactText}>
                <Text style={styles.contactTitle}>Email Support</Text>
                <Text style={styles.contactSubtitle}>Mutiuridwan0@gmail.com</Text>
                <Text style={styles.contactHours}>We reply within 24 hours</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.contactCard}>
            <View style={styles.contactContent}>
              <Text style={styles.contactIcon}>📍</Text>
              <View style={styles.contactText}>
                <Text style={styles.contactTitle}>Office Address</Text>
                <Text style={styles.contactSubtitle}>Akala estate akobo</Text>
                <Text style={styles.contactSubtitle}>oyo, Ibadan</Text>
                <Text style={styles.contactSubtitle}>Nigeria</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Submit Ticket Modal */}
      <Modal visible={showTicketModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.ticketModalHeader}>
            <Text style={styles.ticketModalTitle}>Submit Support Ticket</Text>
            <TouchableOpacity
              style={styles.ticketModalCloseBtn}
              onPress={cancelTicket}
            >
              <Text style={styles.ticketModalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Please provide detailed information about your issue. Our support team will respond within 24 hours.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email Address *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="your@email.com"
                value={ticketData.email}
                onChangeText={(text) => setTicketData({...ticketData, email: text})}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Subject *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Brief description of your issue"
                value={ticketData.subject}
                onChangeText={(text) => setTicketData({...ticketData, subject: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <TouchableOpacity
                style={styles.categoryInput}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text style={ticketData.category ? styles.categoryInputText : styles.categoryInputPlaceholder}>
                  {ticketData.category || 'Select a category'}
                </Text>
                <Text style={styles.categoryInputArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phone Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="+234 XXX XXX XXXX"
                value={ticketData.phoneNumber}
                onChangeText={(text) => setTicketData({...ticketData, phoneNumber: text})}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Transaction ID (if applicable)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter transaction ID"
                value={ticketData.transactionId}
                onChangeText={(text) => setTicketData({...ticketData, transactionId: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date of Issue</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateInputText}>{ticketData.date.toDateString()}</Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={ticketData.date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Detailed Description *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextAreaLarge]}
                placeholder="Please describe your issue in detail. Include steps to reproduce, error messages, and what you were trying to accomplish..."
                value={ticketData.comment}
                onChangeText={(text) => setTicketData({...ticketData, comment: text})}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Attach Screenshot (Optional)</Text>
              <TouchableOpacity
                style={[
                  styles.attachmentButton,
                  ticketData.screenshot && styles.attachmentButtonSelected
                ]}
                onPress={handleAttachScreenshot}
              >
                <Text style={styles.attachmentIcon}>📎</Text>
                <View style={styles.attachmentTextContainer}>
                  <Text style={styles.attachmentText}>
                    {ticketData.screenshot ? 'Screenshot attached' : 'Tap to attach screenshot'}
                  </Text>
                  {ticketData.screenshot && (
                    <Text style={styles.attachmentSubtext}>Tap to change</Text>
                  )}
                </View>
              </TouchableOpacity>
              
              {ticketData.screenshot && (
                <View style={styles.screenshotPreview}>
                  <Image 
                    source={{ uri: ticketData.screenshot }} 
                    style={styles.screenshotImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.removeAttachmentButton}
                    onPress={removeScreenshot}
                  >
                    <Text style={styles.removeAttachmentText}>Remove Screenshot</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.robotVerification}
                onPress={() => setIsRobotVerified(!isRobotVerified)}
              >
                <View style={[styles.checkbox, isRobotVerified && styles.checkboxChecked]}>
                  {isRobotVerified && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.robotText}>I confirm that I am not a robot</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelTicket}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!isRobotVerified || isSubmitting) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmitTicket}
                disabled={!isRobotVerified || isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Debug Info for Development */}
            {__DEV__ && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugText}>API Endpoint: {API_BASE_URL}/api/support/tickets</Text>
                <Text style={styles.debugText}>Make sure your backend is running!</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.categoryModalContainer}>
          <View style={styles.categoryModalContent}>
            <View style={styles.categoryModalHeader}>
              <Text style={styles.categoryModalTitle}>Select Category</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(false)}
                style={styles.categoryModalClose}
              >
                <Text style={styles.categoryModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.categoryList}>
              {ticketCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryOption,
                    ticketData.category === category && styles.categoryOptionSelected
                  ]}
                  onPress={() => selectCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      ticketData.category === category && styles.categoryOptionTextSelected
                    ]}
                  >
                    {category}
                  </Text>
                  {ticketData.category === category && (
                    <Text style={styles.categoryOptionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <Modal visible={showFeedbackModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Share Your Feedback</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowFeedbackModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Your feedback helps us improve our service. Please rate your experience and share any suggestions.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>How would you rate our service? *</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setFeedbackData({...feedbackData, rating: star})}
                    style={styles.starButton}
                  >
                    <Text style={[
                      styles.star,
                      feedbackData.rating >= star && styles.starSelected
                    ]}>
                      {star <= 2 ? '😞' : star <= 4 ? '😐' : '😊'}
                    </Text>
                    <Text style={styles.starNumber}>{star}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.ratingLabels}>
                <Text style={styles.ratingLabel}>Poor</Text>
                <Text style={styles.ratingLabel}>Excellent</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Additional Comments</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="What did you like? What can we improve? Your detailed feedback is valuable to us..."
                value={feedbackData.comment}
                onChangeText={(text) => setFeedbackData({...feedbackData, comment: text})}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                feedbackData.rating === 0 && styles.submitButtonDisabled
              ]}
              onPress={handleSubmitFeedback}
              disabled={feedbackData.rating === 0}
            >
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* FAQ Modal */}
      <Modal visible={showFaqModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Frequently Asked Questions</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowFaqModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Find quick answers to common questions about our services.
            </Text>

            {faqList.map((item) => (
              <View key={item.id} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqQuestionContainer}
                  onPress={() => toggleFAQ(item.id)}
                >
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Text style={[
                    styles.faqToggle,
                    item.expanded && styles.faqToggleExpanded
                  ]}>
                    {item.expanded ? '−' : '+'}
                  </Text>
                </TouchableOpacity>
                {item.expanded && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
  scrollContentContainer: {
    paddingBottom: 40,
  },
  connectionBanner: {
    backgroundColor: '#667eea',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectionText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    margin: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
  chevron: {
    fontSize: 20,
    color: '#a0aec0',
    fontWeight: 'bold',
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  contactIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  contactText: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 2,
  },
  contactHours: {
    fontSize: 12,
    color: '#718096',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  ticketModalHeader: {
    backgroundColor: '#ff3b30',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  ticketModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  ticketModalCloseBtn: {
    padding: 8,
  },
  ticketModalCloseBtnText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 20,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  formTextAreaLarge: {
    height: 120,
    textAlignVertical: 'top',
  },
  formTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  categoryInputText: {
    fontSize: 16,
    color: '#1a202c',
  },
  categoryInputPlaceholder: {
    fontSize: 16,
    color: '#a0aec0',
  },
  categoryInputArrow: {
    fontSize: 12,
    color: '#718096',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateInputText: {
    fontSize: 16,
    color: '#1a202c',
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f7fafc',
    borderStyle: 'dashed',
  },
  attachmentButtonSelected: {
    backgroundColor: '#f0fff4',
    borderColor: '#48bb78',
    borderStyle: 'solid',
  },
  attachmentIcon: {
    fontSize: 18,
    marginRight: 12,
    color: '#718096',
  },
  attachmentTextContainer: {
    flex: 1,
  },
  attachmentText: {
    fontSize: 16,
    color: '#4a5568',
  },
  attachmentSubtext: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  screenshotPreview: {
    marginTop: 12,
    alignItems: 'center',
  },
  screenshotImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  removeAttachmentButton: {
    padding: 8,
  },
  removeAttachmentText: {
    color: '#e53e3e',
    fontSize: 14,
    fontWeight: '600',
  },
  robotVerification: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#cbd5e0',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#48bb78',
    borderColor: '#48bb78',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  robotText: {
    fontSize: 16,
    color: '#4a5568',
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  starButton: {
    alignItems: 'center',
    padding: 8,
  },
  star: {
    fontSize: 32,
    opacity: 0.3,
  },
  starSelected: {
    opacity: 1,
  },
  starNumber: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingLabel: {
    fontSize: 12,
    color: '#718096',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    backgroundColor: '#f7fafc',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#4a5568',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e0',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  debugInfo: {
    backgroundColor: '#f7fafc',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  debugText: {
    fontSize: 12,
    color: '#4a5568',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  categoryModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  categoryModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  categoryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoryModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  categoryModalClose: {
    padding: 4,
  },
  categoryModalCloseText: {
    fontSize: 18,
    color: '#718096',
    fontWeight: 'bold',
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
  },
  categoryOptionSelected: {
    backgroundColor: '#f0f7ff',
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#4a5568',
  },
  categoryOptionTextSelected: {
    color: '#ff3b30',
    fontWeight: '600',
  },
  categoryOptionCheck: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  modalCloseBtn: {
    padding: 8,
  },
  modalCloseBtnText: {
    fontSize: 18,
    color: '#718096',
    fontWeight: 'bold',
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  faqQuestionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    flex: 1,
    marginRight: 12,
  },
  faqToggle: {
    fontSize: 18,
    color: '#718096',
    fontWeight: 'bold',
  },
  faqToggleExpanded: {
    color: '#ff3b30',
  },
  faqAnswer: {
    padding: 16,
    paddingTop: 0,
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
    backgroundColor: '#f7fafc',
  },
});