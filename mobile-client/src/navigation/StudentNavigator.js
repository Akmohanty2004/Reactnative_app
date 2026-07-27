import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import DashboardScreen from '../screens/student/DashboardScreen';
import ExamsScreen from '../screens/student/ExamsScreen';
import ResultsScreen from '../screens/student/ResultsScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import ExamScreen from '../screens/student/ExamScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ChatListScreen from '../screens/shared/ChatListScreen';
import ChatRoomScreen from '../screens/shared/ChatRoomScreen';
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

import { useSelector } from 'react-redux';

// Temporary placeholders until we create them
const DummyScreen = () => null;

function StudentTabs() {
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  const isDarkMode = theme === 'dark';
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Exams') iconName = 'book-open';
          else if (route.name === 'Results') iconName = 'award';
          else if (route.name === 'Profile') iconName = 'user';
          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: isDarkMode ? '#94a3b8' : '#64748b',
        headerStyle: { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' },
        headerTintColor: isDarkMode ? '#fff' : '#000',
        tabBarStyle: { 
          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', 
          borderTopColor: isDarkMode ? '#334155' : '#e2e8f0' 
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Exams" component={ExamsScreen} />
      <Tab.Screen name="Results" component={ResultsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function StudentNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentTabs" component={StudentTabs} />
      <Stack.Screen name="Exam" component={ExamScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
    </Stack.Navigator>
  );
}
