import React, { useEffect, useState } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { initAuth } from '../redux/slices/authSlice';

// Navigators
import StudentNavigator from './StudentNavigator';
import TeacherNavigator from './TeacherNavigator';
import AdminNavigator from './AdminNavigator';

// Placeholder Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

import GlobalChatbot from '../components/GlobalChatbot';

const Stack = createNativeStackNavigator();

// Auth Stack
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, isInitializing } = useSelector((state) => state.auth);
  const { theme } = useSelector((state) => state.ui || { theme: 'dark' });
  
  const [currentRouteName, setCurrentRouteName] = useState('');
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    dispatch(initAuth());
  }, [dispatch]);

  const statusBarStyle = theme === 'dark' ? 'light' : 'dark';

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc' }}>
        <StatusBar style={statusBarStyle} />
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        setCurrentRouteName(navigationRef.getCurrentRoute()?.name);
      }}
      onStateChange={() => {
        setCurrentRouteName(navigationRef.getCurrentRoute()?.name);
      }}
    >
      <StatusBar style={statusBarStyle} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : user?.role === 'admin' ? (
          <Stack.Screen name="AdminDashboard" component={AdminNavigator} />
        ) : user?.role === 'teacher' ? (
          <Stack.Screen name="TeacherDashboard" component={TeacherNavigator} />
        ) : (
          <Stack.Screen name="StudentDashboard" component={StudentNavigator} />
        )}
      </Stack.Navigator>
      <GlobalChatbot currentRouteName={currentRouteName} />
    </NavigationContainer>
  );
}
