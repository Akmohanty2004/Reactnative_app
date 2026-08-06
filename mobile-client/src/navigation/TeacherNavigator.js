import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import DashboardScreen from '../screens/teacher/DashboardScreen';
import ExamsScreen from '../screens/teacher/ExamsScreen';
import ExamDetailsScreen from '../screens/teacher/ExamDetailsScreen';
import CreateExamScreen from '../screens/teacher/CreateExamScreen';
import ResultsScreen from '../screens/teacher/ResultsScreen';
import ProfileScreen from '../screens/teacher/ProfileScreen';
import ClassRequestsScreen from '../screens/teacher/ClassRequestsScreen';
import StudentsListScreen from '../screens/teacher/StudentsListScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ChatListScreen from '../screens/shared/ChatListScreen';
import ChatRoomScreen from '../screens/shared/ChatRoomScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TeacherTabs() {
  const { theme } = useSelector(state => state.ui || { theme: 'dark' });
  const isDarkMode = theme === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'ManageExams') iconName = 'book-open';
          else if (route.name === 'Students') iconName = 'users';
          else if (route.name === 'Results') iconName = 'pie-chart';
          else if (route.name === 'Profile') iconName = 'user';
          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#8b5cf6',
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
      <Tab.Screen name="ManageExams" component={ExamsScreen} options={{ title: 'Exams' }} />
      <Tab.Screen name="Students" component={StudentsListScreen} />
      <Tab.Screen name="Results" component={ResultsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function TeacherNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="TeacherTabs" component={TeacherTabs} />
      <Stack.Screen name="ExamDetails" component={ExamDetailsScreen} />
      <Stack.Screen name="CreateExam" component={CreateExamScreen} />
      <Stack.Screen name="Requests" component={ClassRequestsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
    </Stack.Navigator>
  );
}
