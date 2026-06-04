import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { decode, encode } from 'base-64';
if (!globalThis.btoa) { globalThis.btoa = encode; }
if (!globalThis.atob) { globalThis.atob = decode; }

import { authService } from './src/utils/authService';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import LeaveManagementScreen from './src/screens/LeaveManagementScreen';
import EmployeeDirectoryScreen from './src/screens/EmployeeDirectoryScreen';
import OutDutyScreen from './src/screens/OutDutyScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import ApprovalsScreen from './src/screens/ApprovalsScreen';
import PayrollLedgerScreen from './src/screens/PayrollLedgerScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';

import CustomDrawer from './src/components/CustomDrawer';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const userRole = authService.getUserRole();
  const isAdminOrManager = userRole === 'admin' || userRole === 'management' || userRole === 'manager';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerLeft: () => null, 
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'HomeTab') return <Ionicons name="home" size={size} color={color} />;
          if (route.name === 'LeavesTab') return <Ionicons name="calendar" size={size} color={color} />;
          if (route.name === 'ApprovalsTab') return <Ionicons name="checkmark-done" size={size} color={color} />;
          return <Ionicons name="home" size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: { paddingBottom: 5, height: 60, paddingTop: 5 }
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="LeavesTab" component={LeaveManagementScreen} options={{ title: 'Leaves' }} />
      {isAdminOrManager && (
        <Tab.Screen name="ApprovalsTab" component={ApprovalsScreen} options={{ title: 'Approvals' }} />
      )}
    </Tab.Navigator>
  );
}

function DrawerNavigator() {
  return (
    <Drawer.Navigator 
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{ headerShown: true, headerStyle: { backgroundColor: '#F3F4F6' }, headerShadowVisible: false }}
      initialRouteName="MainTabs"
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false, title: 'Dashboard' }} />
      <Drawer.Screen name="EmployeeDirectory" component={EmployeeDirectoryScreen} options={{ title: 'Employee Directory' }} />
      <Drawer.Screen name="LeaveManagement" component={LeaveManagementScreen} options={{ title: 'Leave Management' }} />
      <Drawer.Screen name="OutDuty" component={OutDutyScreen} options={{ title: 'Out Duty & Pass' }} />
      <Drawer.Screen name="Regularization" component={PlaceholderScreen} initialParams={{ title: 'Regularization', icon: 'time-outline' }} options={{ title: 'Regularization' }} />
      <Drawer.Screen name="MovementRequests" component={PlaceholderScreen} initialParams={{ title: 'Movement Requests', icon: 'walk-outline' }} options={{ title: 'Movement Requests' }} />
      <Drawer.Screen name="AttendanceReports" component={PlaceholderScreen} initialParams={{ title: 'Attendance Reports', icon: 'document-text-outline' }} options={{ title: 'Attendance Reports' }} />
      <Drawer.Screen name="AdvanceLoans" component={PlaceholderScreen} initialParams={{ title: 'Advance & Loans', icon: 'cash-outline' }} options={{ title: 'Advance & Loans' }} />
      <Drawer.Screen name="Expenses" component={ExpensesScreen} options={{ title: 'Expenses' }} />
      <Drawer.Screen name="HolidayList" component={PlaceholderScreen} initialParams={{ title: 'Holiday List', icon: 'calendar-outline' }} options={{ title: 'Holiday List' }} />
      <Drawer.Screen name="GrowthTraining" component={PlaceholderScreen} initialParams={{ title: 'Growth & Training', icon: 'trending-up-outline' }} options={{ title: 'Growth & Training' }} />
      <Drawer.Screen name="ComplianceHub" component={PlaceholderScreen} initialParams={{ title: 'Compliance Hub', icon: 'shield-checkmark-outline' }} options={{ title: 'Compliance Hub' }} />
      <Drawer.Screen name="HRPolicies" component={PlaceholderScreen} initialParams={{ title: 'HR Policies', icon: 'book-outline' }} options={{ title: 'HR Policies' }} />
      <Drawer.Screen name="MyDocuments" component={PlaceholderScreen} initialParams={{ title: 'My Documents', icon: 'folder-outline' }} options={{ title: 'My Documents' }} />
      
      <Drawer.Screen name="Approvals" component={ApprovalsScreen} options={{ title: 'Approvals' }} />
      <Drawer.Screen name="PayrollLedger" component={PayrollLedgerScreen} options={{ title: 'Payroll Ledger' }} />
      <Drawer.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <Drawer.Screen name="Config" component={ConfigScreen} options={{ title: 'Config & Masters' }} />
    </Drawer.Navigator>
  );
}

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      try {
        await authService.init();
        
        authService.onSessionChange((profile) => {
          if (mounted) {
            setUser(profile);
          }
        });

        const currentProfile = authService.getCurrentUser();
        if (currentProfile && mounted) {
          setUser(currentProfile);
        }
      } catch (err) {
        console.error('App init error:', err);
      } finally {
        if (mounted) setInitializing(false);
      }
    };

    setup();

    return () => {
      mounted = false;
    };
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <Stack.Screen name="DrawerRoot" component={DrawerNavigator} />
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
