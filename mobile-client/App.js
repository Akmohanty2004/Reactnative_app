import 'react-native-gesture-handler';
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { LogBox } from 'react-native';

LogBox.ignoreLogs(['[expo-av]']);

import NotificationManager from './src/components/NotificationManager';
import OfflineNetworkBanner from './src/components/OfflineNetworkBanner';

export default function App() {
  return (
    <Provider store={store}>
      <AppNavigator />
      <NotificationManager />
      <OfflineNetworkBanner />
      <Toast />
    </Provider>
  );
}
