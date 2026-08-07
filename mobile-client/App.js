import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';

import { store } from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationManager from './src/components/NotificationManager';
import OfflineNetworkBanner from './src/components/OfflineNetworkBanner';
import UserActivityTracker from './src/components/UserActivityTracker';
import CustomSplashScreen from './src/components/CustomSplashScreen';

LogBox.ignoreLogs(['[expo-av]']);

// Keep native splash screen visible until custom splash screen takes over
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  return (
    <Provider store={store}>
      <UserActivityTracker>
        {/* Main App Content starts loading immediately behind the splash */}
        <AppNavigator />
        <NotificationManager />
        <OfflineNetworkBanner />
        <Toast />

        {/* Custom Animated Splash Screen rendered on top */}
        {isSplashVisible && (
          <CustomSplashScreen onFinish={() => setIsSplashVisible(false)} />
        )}
      </UserActivityTracker>
    </Provider>
  );
}
