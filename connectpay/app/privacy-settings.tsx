import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

const PrivacySettingsScreen: React.FC = () => {
  const [isProfilePrivate, setIsProfilePrivate] = useState(false);
  const [isSearchable, setIsSearchable] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Private Profile</Text>
              <Text style={styles.settingDescription}>
                Make your profile private so only approved followers can see your information
              </Text>
            </View>
            <Switch
              value={isProfilePrivate}
              onValueChange={setIsProfilePrivate}
              trackColor={{ false: '#ccc', true: '#ff2b2b' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Allow Search</Text>
              <Text style={styles.settingDescription}>
                Allow others to find your profile through search
              </Text>
            </View>
            <Switch
              value={isSearchable}
              onValueChange={setIsSearchable}
              trackColor={{ false: '#ccc', true: '#ff2b2b' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Data Collection</Text>
              <Text style={styles.settingDescription}>
                Allow collection of usage data for service improvement
              </Text>
            </View>
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: '#ccc', true: '#ff2b2b' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account Privacy</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
              <Text style={styles.settingDescription}>
                Add an extra layer of security to your account
              </Text>
            </View>
            <Switch
              value={false}
              onValueChange={() => {}}
              trackColor={{ false: '#ccc', true: '#ff2b2b' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Login Notifications</Text>
              <Text style={styles.settingDescription}>
                Get notified when someone logs into your account
              </Text>
            </View>
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: '#ccc', true: '#ff2b2b' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacySettingsScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f8f8' 
  },
  scrollView: { 
    flex: 1 
  },
  scrollContent: { 
    paddingBottom: 30 
  },
  settingsSection: { 
    backgroundColor: '#fff', 
    marginBottom: 20, 
    paddingHorizontal: 20, 
    paddingVertical: 20 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 20 
  },
  settingItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 5,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: { 
    fontSize: 16, 
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
});