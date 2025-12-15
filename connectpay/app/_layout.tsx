import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';

// Custom theme with your red color
const customLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#ff3b30',
  },
};

const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#ff3b30',
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Deep link handling
  useEffect(() => {
    // Subscribe to incoming links while app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    checkInitialURL();

    return () => {
      subscription.remove();
    };
  }, []);

  const checkInitialURL = async () => {
    try {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('🚀 App opened with URL:', initialUrl);
        // Add small delay to ensure fonts and providers are loaded
        setTimeout(() => {
          handleDeepLink({ url: initialUrl });
        }, 500);
      }
    } catch (error) {
      console.error('❌ Error checking initial URL:', error);
    }
  };

  const handleDeepLink = ({ url }: { url: string }) => {
    try {
      console.log('🔗 Deep link received:', url);

      // Parse the URL
      const { hostname, path, queryParams } = Linking.parse(url);
      
      console.log('📍 Hostname:', hostname);
      console.log('📍 Path:', path);
      console.log('📋 Query params:', queryParams);

      // Handle reset-password deep link
      // Works with both formats:
      // connectpay://reset-password?token=xxx
      // https://connectpay.app/reset-password?token=xxx
      if (path === 'reset-password' || hostname === 'reset-password') {
        const token = queryParams?.token as string;
        
        if (token) {
          console.log('✅ Valid reset password token found');
          console.log('📝 Token length:', token.length);
          
          // Navigate to reset password screen with token
          router.push({
            pathname: '/auth/reset-password',
            params: { token }
          });
        } else {
          console.warn('⚠️ No token found in reset password link');
          Alert.alert(
            'Invalid Link',
            'The reset password link is invalid or has expired. Please request a new one.',
            [
              { 
                text: 'Request New Link', 
                onPress: () => router.push('/auth/forgot-password')
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }
      }

      // Handle email verification deep link (if you add this feature)
      else if (path === 'verify-email' || hostname === 'verify-email') {
        const token = queryParams?.token as string;
        if (token) {
          console.log('✅ Email verification token found');
          // Navigate to email verification screen
          // router.push({ pathname: '/auth/verify-email', params: { token } });
        }
      }

      // Add other deep link handlers as needed
      
    } catch (error) {
      console.error('❌ Error handling deep link:', error);
      Alert.alert(
        'Error',
        'There was a problem opening the link. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationThemeProvider value={colorScheme === 'dark' ? customDarkTheme : customLightTheme}>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: '#ff3b30',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                color: '#fff',
              },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="auth/index" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ headerShown: false }} />
            <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
            <Stack.Screen name="auth/pin-setup" options={{ headerShown: false }} />
            <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
            <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </NavigationThemeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}