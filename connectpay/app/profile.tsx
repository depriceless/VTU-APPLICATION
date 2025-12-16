import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { useRouter } from 'expo-router';

export default function Profile() {
  const { token, logout } = useContext(AuthContext);
  const { isDark, colors } = useContext(ThemeContext);
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, [token]);
  
 const fetchUserProfile = async () => {
    try {
      setLoading(true);
      if (!token) {
        // Don't show alert, just return silently
        return;
      }

      const response = await fetch(
        `${Platform.OS === 'web' ? process.env.EXPO_PUBLIC_API_URL_WEB : process.env.EXPO_PUBLIC_API_URL}/api/auth/profile`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();

        if (data.success && data.user) {
          const userData = {
            id: data.user.id || data.user._id,
            name: data.user.name || data.user.username || 'User',
            email: data.user.email || 'user@example.com',
            phone: data.user.phone || '',
            username: data.user.username || '',
            dateJoined: data.user.createdAt || data.user.dateJoined || new Date().toISOString(),
          };

          setUser(userData);
        } else {
          const defaultUser = {
            name: 'User',
            email: 'user@example.com',
            phone: '',
            username: '',
            dateJoined: new Date().toISOString(),
          };
          setUser(defaultUser);
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.log('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');

      const defaultUser = {
        name: 'User',
        email: 'user@example.com',
        phone: '',
        username: '',
        dateJoined: new Date().toISOString(),
      };
      setUser(defaultUser);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await logout();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.replace('/auth/login');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Information */}
        <View style={[styles.infoSection, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile Information</Text>

          {/* Full Name */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>Full Name</Text>
            <Text style={[styles.infoValue, { color: colors.textSecondary }]}>{user?.name || 'Not provided'}</Text>
          </View>

          {/* Username */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>Username</Text>
            <Text style={[styles.infoValue, { color: colors.textSecondary }]}>{user?.username || 'Not provided'}</Text>
          </View>

          {/* Email */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>Email</Text>
            <Text style={[styles.infoValue, { color: colors.textSecondary }]}>{user?.email || 'Not provided'}</Text>
          </View>

          {/* Phone */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>Phone Number</Text>
            <Text style={[styles.infoValue, { color: colors.textSecondary }]}>{user?.phone || 'Not provided'}</Text>
          </View>

          {/* Date Joined */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>Member Since</Text>
            <Text style={[styles.infoValue, { color: colors.textSecondary }]}>{formatDate(user?.dateJoined)}</Text>
          </View>
        </View>

        {/* Account Options */}
        <View style={[styles.optionsSection, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Options</Text>

          <TouchableOpacity 
            style={[styles.optionItem, { borderBottomColor: colors.border }]} 
            onPress={() => router.push('/privacy-settings')}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIconContainer, { backgroundColor: '#ff2b2b10' }]}>
                <Ionicons name="shield-outline" size={20} color="#ff2b2b" />
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>Privacy Settings</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.optionItem, { borderBottomColor: colors.border }]} 
            onPress={() => router.push('/notification-settings')}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIconContainer, { backgroundColor: '#ff2b2b10' }]}>
                <Ionicons name="notifications-outline" size={20} color="#ff2b2b" />
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>Notification Settings</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Settings Option */}
          <TouchableOpacity 
            style={[styles.optionItem, { borderBottomColor: colors.border }]} 
            onPress={() => router.push('/settings')}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIconContainer, { backgroundColor: '#ff2b2b10' }]}>
                <Ionicons name="settings-outline" size={20} color="#ff2b2b" />
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>Settings</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Logout Option - ✅ UPDATED COLOR */}
          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={handleLogout}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIconContainer, { backgroundColor: '#ff2b2b10' }]}>
                <Ionicons name="log-out-outline" size={20} color="#ff2b2b" />
              </View>
              <Text style={[styles.optionText, { color: '#ff2b2b' }]}>Logout</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.confirmationOverlay}>
          <View style={[styles.confirmationModal, { backgroundColor: colors.cardBg }]}>
            <View style={styles.logoutIconContainer}>
              <Ionicons name="log-out-outline" size={48} color="#ff2b2b" />
            </View>
            
            <Text style={[styles.confirmationTitle, { color: colors.text }]}>Logout</Text>
            <Text style={[styles.confirmationMessage, { color: colors.textSecondary }]}>
              Are you sure you want to logout?
            </Text>

            <View style={styles.confirmationButtons}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: isDark ? colors.border : '#f3f4f6' }]} 
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.logoutConfirmButton} 
                onPress={confirmLogout}
              >
                <Text style={styles.logoutConfirmButtonText}>Logout</Text>
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
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    fontSize: 16,
  },
  scrollView: { 
    flex: 1 
  },
  scrollContent: { 
    paddingTop: 20,
    paddingBottom: 30 
  },
  infoSection: { 
    marginTop: 40,
    marginBottom: 20, 
    marginHorizontal: 20,
    paddingHorizontal: 20, 
    paddingVertical: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 20 
  },
  infoItem: { 
    marginBottom: 20 
  },
  infoLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginBottom: 8 
  },
  infoValue: { 
    fontSize: 16, 
    lineHeight: 22 
  },
  optionsSection: { 
    marginHorizontal: 20,
    paddingHorizontal: 20, 
    paddingVertical: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 15, 
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: { 
    flex: 1, 
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Logout Modal - ✅ UPDATED COLORS
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmationModal: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    alignItems: 'center',
  },
  logoutIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff2b2b10', // ✅ Changed from #dc354510
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmationTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmationMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  confirmationButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  logoutConfirmButton: {
    flex: 1,
    backgroundColor: '#ff2b2b', // ✅ Changed from #dc3545
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutConfirmButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
});