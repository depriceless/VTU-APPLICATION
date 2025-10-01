import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../contexts/ThemeContext';
import { AuthContext } from '../contexts/AuthContext';

export default function Settings() {
  const router = useRouter();
  const { isDark, toggleTheme, colors } = useContext(ThemeContext);
  const { token } = useContext(AuthContext);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const settingsSections = [
    {
      title: 'Account Settings',
      items: [
        {
          icon: 'person-outline',
          label: 'Edit Profile',
          subtitle: 'Update your personal information',
          onPress: () => router.push('/profile'),
          showChevron: true,
        },
        {
          icon: 'lock-closed-outline',
          label: 'Change Password',
          subtitle: 'Update your account password',
          onPress: () => setShowChangePasswordModal(true),
          showChevron: true,
        },
        {
          icon: 'key-outline',
          label: 'Change PIN',
          subtitle: 'Update your transaction PIN',
          onPress: () => setShowPinModal(true),
          showChevron: true,
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Two-Factor Authentication',
          subtitle: 'Add extra security to your account',
          isSwitch: true,
          value: twoFactorEnabled,
          onToggle: (val) => {
            setTwoFactorEnabled(val);
            Alert.alert(
              val ? 'Enable 2FA' : 'Disable 2FA',
              val ? 'Two-factor authentication will be enabled' : 'Two-factor authentication will be disabled'
            );
          },
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'moon-outline',
          label: 'Dark Mode',
          subtitle: 'Switch between light and dark theme',
          isSwitch: true,
          value: isDark,
          onToggle: toggleTheme,
        },
        {
          icon: 'notifications-outline',
          label: 'Push Notifications',
          subtitle: 'Receive updates and alerts',
          isSwitch: true,
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },
        {
          icon: 'mail-outline',
          label: 'Email Notifications',
          subtitle: 'Receive transaction updates via email',
          isSwitch: true,
          value: emailNotifications,
          onToggle: setEmailNotifications,
        },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        {
          icon: 'pause-circle-outline',
          label: 'Deactivate Account',
          subtitle: 'Temporarily disable your account',
          onPress: () => {
            Alert.alert(
              'Deactivate Account',
              'Your account will be temporarily disabled. You can reactivate it anytime by logging in.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Deactivate', style: 'destructive', onPress: () => {} },
              ]
            );
          },
          showChevron: true,
          isDanger: true,
        },
        {
          icon: 'trash-outline',
          label: 'Delete Account',
          subtitle: 'Permanently delete your account',
          onPress: () => {
            Alert.alert(
              'Delete Account',
              'This action cannot be undone. All your data will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Delete', 
                  style: 'destructive', 
                  onPress: () => {}
                },
              ]
            );
          },
          showChevron: true,
          isDanger: true,
        },
      ],
    },
  ];

  const handleChangePin = async () => {
    if (!oldPin || !pin || !confirmPin) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (oldPin.length !== 4 || pin.length !== 4 || confirmPin.length !== 4) {
      Alert.alert('Invalid PIN', 'PIN must be 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('Error', 'New PINs do not match');
      return;
    }
    if (oldPin === pin) {
      Alert.alert('Error', 'New PIN must be different from old PIN');
      return;
    }
    if (!token) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setLoading(true);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.157.13.7:5000';
      const url = `${baseUrl}/api/user/change-pin`;
      
      console.log('DEBUG: Base URL:', baseUrl);
      console.log('DEBUG: Full URL:', url);
      console.log('DEBUG: Request body:', JSON.stringify({ oldPin: '****', newPin: '****' }));
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          oldPin,
          newPin: pin,
        }),
      });

      console.log('DEBUG: Response status:', response.status);
      const data = await response.json();
      console.log('DEBUG: Response data:', data);

      if (response.ok && data.success) {
        Alert.alert('Success', data.message || 'PIN changed successfully');
        setShowPinModal(false);
        setOldPin('');
        setPin('');
        setConfirmPin('');
      } else {
        Alert.alert('Error', data.message || 'Failed to change PIN');
      }
    } catch (error) {
      console.error('Change PIN error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    if (!token) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setLoading(true);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.157.13.7:5000';
      const url = `${baseUrl}/api/user/change-password`;
      
      console.log('DEBUG: Base URL:', baseUrl);
      console.log('DEBUG: Full URL:', url);
      console.log('DEBUG: Request headers:', {
        Authorization: 'Bearer ****',
        'Content-Type': 'application/json'
      });
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          oldPassword: currentPassword,
          newPassword,
        }),
      });

      console.log('DEBUG: Response status:', response.status);
      const data = await response.json();
      console.log('DEBUG: Response data:', data);

      if (response.ok && data.success) {
        Alert.alert('Success', data.message || 'Password changed successfully');
        setShowChangePasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background} 
      />
      
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {section.title}
            </Text>
            
            <View style={[styles.sectionCard, { backgroundColor: colors.cardBg }]}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    itemIndex !== section.items.length - 1 && { 
                      borderBottomWidth: 1, 
                      borderBottomColor: colors.border 
                    }
                  ]}
                  onPress={item.onPress}
                  disabled={item.isSwitch}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingLeft}>
                    <View style={[
                      styles.iconContainer,
                      { backgroundColor: item.isDanger ? '#dc354510' : `${colors.primary}10` }
                    ]}>
                      <Ionicons 
                        name={item.icon} 
                        size={22} 
                        color={item.isDanger ? colors.danger : colors.primary} 
                      />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[
                        styles.settingLabel,
                        { color: item.isDanger ? colors.danger : colors.text }
                      ]}>
                        {item.label}
                      </Text>
                      {item.subtitle && (
                        <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                          {item.subtitle}
                        </Text>
                      )}
                    </View>
                  </View>

                  {item.isSwitch ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: '#767577', true: colors.primary }}
                      thumbColor={item.value ? '#fff' : '#f4f3f4'}
                      ios_backgroundColor="#767577"
                    />
                  ) : item.showChevron ? (
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Change PIN Modal */}
      <Modal
        visible={showPinModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Change PIN</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Enter your current PIN and new 4-digit PIN
            </Text>

            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.background, 
                color: colors.text, 
                borderColor: colors.border 
              }]}
              placeholder="Current PIN"
              placeholderTextColor={colors.textSecondary}
              value={oldPin}
              onChangeText={setOldPin}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              editable={!loading}
            />

            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.background, 
                color: colors.text, 
                borderColor: colors.border 
              }]}
              placeholder="New PIN"
              placeholderTextColor={colors.textSecondary}
              value={pin}
              onChangeText={setPin}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              editable={!loading}
            />

            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.background, 
                color: colors.text, 
                borderColor: colors.border 
              }]}
              placeholder="Confirm New PIN"
              placeholderTextColor={colors.textSecondary}
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              editable={!loading}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowPinModal(false);
                  setOldPin('');
                  setPin('');
                  setConfirmPin('');
                }}
                disabled={loading}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  { backgroundColor: loading ? colors.border : colors.primary }
                ]}
                onPress={handleChangePin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Change PIN</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>

            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.background, 
                color: colors.text, 
                borderColor: colors.border 
              }]}
              placeholder="Current Password"
              placeholderTextColor={colors.textSecondary}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              editable={!loading}
            />

            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.background, 
                color: colors.text, 
                borderColor: colors.border 
              }]}
              placeholder="New Password"
              placeholderTextColor={colors.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              editable={!loading}
            />

            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.background, 
                color: colors.text, 
                borderColor: colors.border 
              }]}
              placeholder="Confirm New Password"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowChangePasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={loading}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  { backgroundColor: loading ? colors.border : colors.primary }
                ]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});