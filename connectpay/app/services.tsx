import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../contexts/ThemeContext';

const SERVICES = [
  // Financial Services
  { 
    category: 'Financial Services',
    items: [
      { name: 'Buy Airtime', icon: 'call', color: '#E3F2FD', iconColor: '#2196F3', route: '/buy-airtime', description: 'Top up airtime' },
      { name: 'Buy Data', icon: 'wifi', color: '#FFF3E0', iconColor: '#FF9800', route: '/buy-data', description: 'Purchase data bundles' },
      { name: 'Transfer Money', icon: 'swap-horizontal', color: '#F3E5F5', iconColor: '#9C27B0', route: '/transfer', description: 'Send money to banks' },
      { name: 'Fund Wallet', icon: 'wallet', color: '#FFEBEE', iconColor: '#F44336', route: '/dashboard', description: 'Add money to wallet' },
    ]
  },
  // Bills Payment
  {
    category: 'Bills Payment',
    items: [
      { name: 'Cable TV', icon: 'tv', color: '#E8F5E9', iconColor: '#4CAF50', route: '/cable-tv', description: 'Pay TV subscriptions' },
      { name: 'Electricity', icon: 'flash', color: '#E1F5FE', iconColor: '#03A9F4', route: '/electricity', description: 'Pay electricity bills' },
      { name: 'Internet', icon: 'globe', color: '#E0F2F1', iconColor: '#009688', route: '/internet', description: 'Subscribe to internet' },
    ]
  },
  // Entertainment & Gaming
  {
    category: 'Entertainment & Gaming',
    items: [
      { name: 'Fund Betting', icon: 'football', color: '#FFF9C4', iconColor: '#FBC02D', route: '/fund-betting', description: 'Fund betting wallet' },
    ]
  },
  // Education & Others
  {
    category: 'Education & Others',
    items: [
      { name: 'Education', icon: 'school', color: '#FCE4EC', iconColor: '#E91E63', route: '/education', description: 'Pay school fees' },
      { name: 'Print Recharge', icon: 'print', color: '#F3E5F5', iconColor: '#9C27B0', route: '/print-recharge', description: 'Buy printing cards' },
    ]
  },
];

export default function Services() {
  const { isDark, colors } = useContext(ThemeContext);
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: isDark ? colors.border : '#f5f5f5' }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>All Services</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {SERVICES.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.serviceSection}>
            <Text style={[styles.categoryTitle, { color: colors.text }]}>{section.category}</Text>
            
            <View style={styles.servicesGrid}>
              {section.items.map((service, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.serviceCard, { backgroundColor: colors.cardBg }]}
                  onPress={() => router.push(service.route)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
                    <Ionicons name={service.icon} size={22} color={service.iconColor} />
                  </View>
                  <Text style={[styles.serviceName, { color: colors.text }]}>{service.name}</Text>
                  <Text style={[styles.serviceDescription, { color: colors.textSecondary }]}>
                    {service.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Coming Soon Section */}
        <View style={styles.serviceSection}>
          <Text style={[styles.categoryTitle, { color: colors.text }]}>Coming Soon</Text>
          <View style={[styles.comingSoonCard, { backgroundColor: colors.cardBg }]}>
            <Ionicons name="time-outline" size={40} color={colors.textSecondary} />
            <Text style={[styles.comingSoonText, { color: colors.text }]}>More Services</Text>
            <Text style={[styles.comingSoonSubtext, { color: colors.textSecondary }]}>
              We're working on adding more amazing services for you
            </Text>
          </View>
        </View>
      </ScrollView>
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
    paddingTop: Platform.OS === 'ios' ? 10 : (StatusBar.currentHeight || 0) + 10,
    paddingBottom: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  serviceSection: {
    marginBottom: 30,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 140,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  comingSoonCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});