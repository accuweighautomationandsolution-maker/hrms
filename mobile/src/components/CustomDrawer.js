import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AccuweighLogo from '../../assets/Accuweigh.svg';

import { authService } from '../utils/authService';

const DrawerItem = ({ iconName, label, onPress, active }) => (
  <TouchableOpacity 
    style={[styles.drawerItem, active && styles.drawerItemActive]} 
    onPress={onPress}
  >
    <Ionicons name={iconName} size={22} color={active ? '#2563EB' : '#4B5563'} style={styles.icon} />
    <Text style={[styles.drawerItemLabel, active && styles.drawerItemLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

const DrawerGroup = ({ title }) => (
  <Text style={styles.groupTitle}>{title}</Text>
);

export default function CustomDrawer(props) {
  const insets = useSafeAreaInsets();
  const { state, navigation } = props;
  const currentRouteName = state.routeNames[state.index];

  const handleLogout = async () => {
    await authService.logout();
  };

  const userRole = authService.getUserRole();
  const isAdmin = userRole === 'management' || userRole === 'admin';
  const isManager = userRole === 'manager';

  const navigateTo = (screenName) => {
    navigation.navigate(screenName);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: insets.top }}>
        <View style={styles.header}>
          <AccuweighLogo width={180} height={40} style={{ alignSelf: 'center' }} />
        </View>

        <View style={styles.navSection}>
          <DrawerItem 
            iconName="home" 
            label="Dashboard" 
            active={currentRouteName === 'MainTabs'}
            onPress={() => navigateTo('MainTabs')} 
          />
          <DrawerItem 
            iconName="people" 
            label="Employee Directory" 
            active={currentRouteName === 'EmployeeDirectory'}
            onPress={() => navigateTo('EmployeeDirectory')} 
          />
          <DrawerGroup title="ATTENDANCE & MOVEMENT" />
          <DrawerItem 
            iconName="calendar" 
            label="Leave Management" 
            active={currentRouteName === 'LeaveManagement'}
            onPress={() => navigateTo('LeaveManagement')} 
          />
          <DrawerItem 
            iconName="calendar-sharp" 
            label="Attendance History" 
            active={currentRouteName === 'AttendanceHistory'}
            onPress={() => navigateTo('AttendanceHistory')} 
          />
          <DrawerItem 
            iconName="car" 
            label="Out Duty Request" 
            active={currentRouteName === 'OutDuty'}
            onPress={() => navigateTo('OutDuty')} 
          />
          <DrawerItem 
            iconName="time" 
            label="Out Pass Request" 
            active={currentRouteName === 'OutPass'}
            onPress={() => navigateTo('OutPass')} 
          />
          <DrawerItem 
            iconName="walk" 
            label="Movement Requests" 
            active={currentRouteName === 'MovementRequests'}
            onPress={() => navigateTo('MovementRequests')} 
          />
          <DrawerItem 
            iconName="document-text" 
            label="Attendance Reports" 
            active={currentRouteName === 'AttendanceReports'}
            onPress={() => navigateTo('AttendanceReports')} 
          />

          <DrawerGroup title="FINANCE" />
          <DrawerItem 
            iconName="cash" 
            label="Advance & Loans" 
            active={currentRouteName === 'AdvanceLoans'}
            onPress={() => navigateTo('AdvanceLoans')} 
          />
          <DrawerItem 
            iconName="receipt" 
            label="Expenses" 
            active={currentRouteName === 'Expenses'}
            onPress={() => navigateTo('Expenses')} 
          />

          <DrawerGroup title="COMPANY" />
          <DrawerItem 
            iconName="calendar-outline" 
            label="Holiday List" 
            active={currentRouteName === 'HolidayList'}
            onPress={() => navigateTo('HolidayList')} 
          />
          <DrawerItem 
            iconName="trending-up" 
            label="Growth & Training" 
            active={currentRouteName === 'GrowthTraining'}
            onPress={() => navigateTo('GrowthTraining')} 
          />
          <DrawerItem 
            iconName="shield-checkmark" 
            label="Compliance Hub" 
            active={currentRouteName === 'ComplianceHub'}
            onPress={() => navigateTo('ComplianceHub')} 
          />
          <DrawerItem 
            iconName="book" 
            label="HR Policies" 
            active={currentRouteName === 'HRPolicies'}
            onPress={() => navigateTo('HRPolicies')} 
          />
          <DrawerItem 
            iconName="folder" 
            label="My Documents" 
            active={currentRouteName === 'MyDocuments'}
            onPress={() => navigateTo('MyDocuments')} 
          />

          <DrawerItem 
            iconName="checkmark-done" 
            label="Approvals" 
            active={currentRouteName === 'Approvals'}
            onPress={() => navigateTo('Approvals')} 
          />

          {isAdmin && (
            <>
              <DrawerGroup title="MANAGEMENT SUITE" />
              <DrawerItem 
                iconName="cash" 
                label="Payroll Ledger" 
                active={currentRouteName === 'PayrollLedger'}
                onPress={() => navigateTo('PayrollLedger')} 
              />
              <DrawerItem 
                iconName="document-text" 
                label="Reports" 
                active={currentRouteName === 'Reports'}
                onPress={() => navigateTo('Reports')} 
              />
              <DrawerItem 
                iconName="calculator" 
                label="Budget Control" 
                active={currentRouteName === 'BudgetControl'}
                onPress={() => navigateTo('BudgetControl')} 
              />
              <DrawerItem 
                iconName="person-add" 
                label="Hiring Requests" 
                active={currentRouteName === 'HiringRequests'}
                onPress={() => navigateTo('HiringRequests')} 
              />
              <DrawerItem 
                iconName="search" 
                label="Recruitment" 
                active={currentRouteName === 'Recruitment'}
                onPress={() => navigateTo('Recruitment')} 
              />
              <DrawerItem 
                iconName="documents" 
                label="Document Hub" 
                active={currentRouteName === 'DocumentHub'}
                onPress={() => navigateTo('DocumentHub')} 
              />
              <DrawerItem 
                iconName="mail-open" 
                label="Letter Templates" 
                active={currentRouteName === 'LetterTemplates'}
                onPress={() => navigateTo('LetterTemplates')} 
              />
              <DrawerItem 
                iconName="card" 
                label="Compensation & Offers" 
                active={currentRouteName === 'CompensationOffers'}
                onPress={() => navigateTo('CompensationOffers')} 
              />
              <DrawerItem 
                iconName="exit" 
                label="Exit & FnF Settlement" 
                active={currentRouteName === 'ExitManagement'}
                onPress={() => navigateTo('ExitManagement')} 
              />
              <DrawerItem 
                iconName="star" 
                label="Statutory Bonus" 
                active={currentRouteName === 'StatutoryBonus'}
                onPress={() => navigateTo('StatutoryBonus')} 
              />
              <DrawerItem 
                iconName="settings" 
                label="Config & Masters" 
                active={currentRouteName === 'Config'}
                onPress={() => navigateTo('Config')} 
              />
            </>
          )}
        </View>
      </DrawerContentScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.footerProfile}>
          <View style={[styles.avatar, { backgroundColor: isAdmin ? '#2563EB' : '#10B981' }]}>
            <Text style={styles.avatarText}>{isAdmin ? 'AD' : 'EM'}</Text>
          </View>
          <View style={styles.footerTextContainer}>
            <Text style={styles.footerRole}>{isAdmin ? 'Admin Portal' : 'Self Service'}</Text>
            <Text style={styles.footerSubText}>{isAdmin ? 'Management Access' : 'Restricted Access'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="power" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 140,
    height: 60,
  },
  navSection: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  drawerItemActive: {
    backgroundColor: '#EFF6FF',
  },
  icon: {
    marginRight: 14,
  },
  drawerItemLabel: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '500',
  },
  drawerItemLabelActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 16,
    letterSpacing: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
  },
  footerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  footerTextContainer: {
    justifyContent: 'center',
  },
  footerRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  footerSubText: {
    fontSize: 12,
    color: '#6B7280',
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  }
});
