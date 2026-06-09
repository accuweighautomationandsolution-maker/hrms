import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerToggleButton } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';

import { decode, encode } from 'base-64';
if (!globalThis.btoa) { globalThis.btoa = encode; }
if (!globalThis.atob) { globalThis.atob = decode; }

import { authService } from './src/utils/authService';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import LeaveManagementScreen from './src/screens/LeaveManagementScreen';
import EmployeeDirectoryScreen from './src/screens/EmployeeDirectoryScreen';
import OutDutyScreen from './src/screens/OutDutyScreen';
import OutPassScreen from './src/screens/OutPassScreen';
import AdvanceLoansScreen from './src/screens/AdvanceLoansScreen';
import HolidayListScreen from './src/screens/HolidayListScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import ApprovalsScreen from './src/screens/ApprovalsScreen';
import AttendanceHistoryScreen from './src/screens/AttendanceHistoryScreen';
import MovementRequestsScreen from './src/screens/MovementRequestsScreen';
import PayrollLedgerScreen from './src/screens/PayrollLedgerScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import BudgetControlScreen from './src/screens/BudgetControlScreen';
import HiringRequestsScreen from './src/screens/HiringRequestsScreen';
import RecruitmentScreen from './src/screens/RecruitmentScreen';
import DocumentHubScreen from './src/screens/DocumentHubScreen';
import LetterTemplatesScreen from './src/screens/LetterTemplatesScreen';
import CompensationOffersScreen from './src/screens/CompensationOffersScreen';
import AttendanceReportsScreen from './src/screens/AttendanceReportsScreen';
import GrowthTrainingScreen from './src/screens/GrowthTrainingScreen';
import ComplianceHubScreen from './src/screens/ComplianceHubScreen';
import HRPoliciesScreen from './src/screens/HRPoliciesScreen';
import ExitManagementScreen from './src/screens/ExitManagementScreen';
import StatutoryBonusScreen from './src/screens/StatutoryBonusScreen';

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
          headerLeft: () => <DrawerToggleButton tintColor="#111827" />, 
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
      <Tab.Screen name="ApprovalsTab" component={ApprovalsScreen} options={{ title: 'Approvals' }} />
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
      <Drawer.Screen name="OutDuty" component={OutDutyScreen} options={{ title: 'Out Duty Request' }} />
      <Drawer.Screen name="OutPass" component={OutPassScreen} options={{ title: 'Out Pass Request' }} />
      <Drawer.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} options={{ title: 'Attendance History' }} />
      <Drawer.Screen name="MovementRequests" component={MovementRequestsScreen} options={{ title: 'Movement Requests' }} />
      <Drawer.Screen name="AttendanceReports" component={AttendanceReportsScreen} options={{ title: 'Attendance Reports' }} />
      <Drawer.Screen name="AdvanceLoans" component={AdvanceLoansScreen} options={{ title: 'Advance & Loans' }} />
      <Drawer.Screen name="Expenses" component={ExpensesScreen} options={{ title: 'Expenses' }} />
      <Drawer.Screen name="HolidayList" component={HolidayListScreen} options={{ title: 'Holiday List' }} />
      <Drawer.Screen name="GrowthTraining" component={GrowthTrainingScreen} options={{ title: 'Growth & Training' }} />
      <Drawer.Screen name="ComplianceHub" component={ComplianceHubScreen} options={{ title: 'Compliance Hub' }} />
      <Drawer.Screen name="HRPolicies" component={HRPoliciesScreen} options={{ title: 'HR Policies' }} />
      <Drawer.Screen name="MyDocuments" component={DocumentHubScreen} options={{ title: 'My Documents' }} />
      
      {/* Admin Modules */}
      <Drawer.Screen name="Approvals" component={ApprovalsScreen} options={{ title: 'Approvals' }} />
      <Drawer.Screen name="PayrollLedger" component={PayrollLedgerScreen} options={{ title: 'Payroll Ledger' }} />
      <Drawer.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <Drawer.Screen name="BudgetControl" component={BudgetControlScreen} options={{ title: 'Budget Control' }} />
      <Drawer.Screen name="HiringRequests" component={HiringRequestsScreen} options={{ title: 'Hiring Requests' }} />
      <Drawer.Screen name="Recruitment" component={RecruitmentScreen} options={{ title: 'Recruitment' }} />
      <Drawer.Screen name="DocumentHub" component={DocumentHubScreen} options={{ title: 'Document Hub' }} />
      <Drawer.Screen name="LetterTemplates" component={LetterTemplatesScreen} options={{ title: 'Letter Templates' }} />
      <Drawer.Screen name="CompensationOffers" component={CompensationOffersScreen} options={{ title: 'Compensation & Offers' }} />
      <Drawer.Screen name="ExitManagement" component={ExitManagementScreen} options={{ title: 'Exit & FnF Settlement' }} />
      <Drawer.Screen name="StatutoryBonus" component={StatutoryBonusScreen} options={{ title: 'Statutory Bonus' }} />
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
        
        // Check for OTA updates immediately
        try {
          if (!__DEV__) {
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            }
          }
        } catch (e) {
          console.log("Update check failed", e);
        }
        
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
