export default {
  expo: {
    name: "connectpay",
    slug: "connectpay",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "connectpay",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    
    // ✅ FIXED: Proper icon configuration (1024x1024 PNG required)
    icon: "./assets/images/icon.png", // Must be 1024x1024px
    
    // ✅ FIXED: Splash screen with red background
    splash: {
      image: "./assets/images/splash.png", // Must be at least 2048x2048px
      resizeMode: "contain",
      backgroundColor: "#ff3b30" // Red background color
    },
    
    ios: {
      supportsTablet: true,
      runtimeVersion: {
        policy: "appVersion",
      },
      bundleIdentifier: "com.anonymous.connectpay",
      // ✅ iOS-specific icon (optional, uses main icon if not specified)
      icon: "./assets/images/icon.png"
    },
    
    android: {
      // ✅ FIXED: Android adaptive icon with red background
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png", // Must be 1024x1024px
        backgroundColor: "#ff3b30", // Red background
        monochromeImage: "./assets/images/adaptive-icon.png" // Optional: for themed icons
      },
      softwareKeyboardLayoutMode: "resize",
      edgeToEdgeEnabled: true,
      package: "com.anonymous.connectpay",
      usesCleartextTraffic: true,
      runtimeVersion: "1.0.0",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "connectpay",
              host: "*",
            },
            {
              scheme: "https",
              host: "connectpay.app",
              pathPrefix: "/reset-password",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    
    web: {
      bundler: "metro",
      output: "static",
      // ✅ Web favicon
      favicon: "./assets/images/favicon.png"
    },
    
    plugins: [
      "expo-router",
      "expo-splash-screen",
      "expo-asset",
      "expo-secure-store",
      [
        "expo-local-authentication",
        {
          "faceIDPermission": "Allow ConnectPay to use Face ID."
        }
      ]
    ],
    
    experiments: {
      typedRoutes: true,
    },
    
    updates: {
      url: "https://u.expo.dev/f853cd0a-cdb5-4197-855e-4a1207a7f5c9",
    },
    
    extra: {
      EXPO_PUBLIC_API_URL:
        process.env.EXPO_PUBLIC_API_URL || "https://vtu-application.onrender.com",
      EXPO_PUBLIC_API_URL_WEB:
        process.env.EXPO_PUBLIC_API_URL_WEB || "https://vtu-application.onrender.com",
      router: {},
      eas: {
        projectId: "f853cd0a-cdb5-4197-855e-4a1207a7f5c9",
      },
    },
  },
};

