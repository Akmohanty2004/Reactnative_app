import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import DashboardScreen from '../screens/admin/DashboardScreen';
import UsersScreen from '../screens/admin/UsersScreen';
import ExamsScreen from '../screens/admin/ExamsScreen';
import ResultsScreen from '../screens/admin/ResultsScreen';
import ProfileScreen from '../screens/admin/ProfileScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import ManageClassesScreen from '../screens/admin/ManageClassesScreen';
import ActivityLogsScreen from '../screens/admin/ActivityLogsScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';

const Tab = createBottomTabNavigator();

import { useSelector } from 'react-redux';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function AdminTabs() {
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  const isDarkMode = theme === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'grid';
          else if (route.name === 'Users') iconName = 'users';
          else if (route.name === 'Exams') iconName = 'book-open';
          else if (route.name === 'Classes') iconName = 'layers';
          else if (route.name === 'Reports') iconName = 'pie-chart';
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
      <Tab.Screen name="Users" component={UsersScreen} />
      <Tab.Screen name="Exams" component={ExamsScreen} />
      <Tab.Screen name="Classes" component={ManageClassesScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ActivityLogs" component={ActivityLogsScreen} />
    </Stack.Navigator>
  );
}
