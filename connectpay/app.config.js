export default {
  expo: {
    name: "connectpay",
    slug: "connectpay",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "connectpay",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      runtimeVersion: {
        policy: "appVersion", // EAS Update runtime version
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.anonymous.connectpay",
      usesCleartextTraffic: true,
      runtimeVersion: "1.0.0", // EAS Update runtime version
    },
    web: {
      bundler: "metro",
      output: "static",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      "expo-asset",
      "expo-secure-store",
    ],
    experiments: {
      typedRoutes: true,
    },
    updates: {
      url: "https://u.expo.dev/f853cd0a-cdb5-4197-855e-4a1207a7f5c9", // Your EAS URL
    },
    extra: {
      EXPO_PUBLIC_API_URL:
        process.env.EXPO_PUBLIC_API_URL || "http://10.157.13.7:5000",
      EXPO_PUBLIC_API_URL_WEB:
        process.env.EXPO_PUBLIC_API_URL_WEB || "http://10.157.13.7:5000",
      router: {},
      eas: {
        projectId: "f853cd0a-cdb5-4197-855e-4a1207a7f5c9",
      },
    },
  },
};
