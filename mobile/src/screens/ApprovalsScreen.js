import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Alert, StatusBar
} from 'react-native';
import { CheckCircle, XCircle, Calendar as CalendarIcon, User, Inbox, Briefcase } from 'lucide-react-native';
import { dataService } from '../utils/dataService';

export default function ApprovalsScreen() {
  const [loading, setLoading] = useState(true);
  const [pendingLeaves, setPendingLeaves] = useState([]);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const allLeaves = await dataService.getLeaves();
      // Filter for Pending leaves
      const pending = allLeaves.filter(l => l.status === 'Pending' || !l.status);
      setPendingLeaves(pending.sort((a, b) => new Date(b.created_at || b.appliedOn) - new Date(a.created_at || a.appliedOn)));
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (leave, status) => {
    try {
      setLoading(true);
      const updatedLeave = { ...leave, status };
      await dataService.saveLeaveRequest(updatedLeave);
      Alert.alert('Success', `Leave ${status} successfully.`);
      await loadApprovals();
    } catch (err) {
      Alert.alert('Error', err.message);
      setLoading(false);
    }
  };

  if (loading && pendingLeaves.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Manager Approvals</Text>
          <Text style={styles.headerSubtitle}>Review pending leave requests</Text>
        </View>

        {pendingLeaves.length === 0 ? (
          <View style={styles.emptyCard}>
            <Inbox size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptySubtitle}>No pending approvals at the moment.</Text>
          </View>
        ) : (
          pendingLeaves.map((l, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.avatarBox}>
                    <User size={20} color="#3B82F6" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.empName}>{l.empName || `Employee ID: ${l.empId}`}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Briefcase size={12} color="#64748B" />
                      <Text style={styles.department}>{l.department || 'General'}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{l.leaveType}</Text>
                </View>
              </View>

              <View style={styles.datesBox}>
                <CalendarIcon size={16} color="#64748B" />
                <Text style={styles.dates}>
                  {new Date(l.startDate).toLocaleDateString('en-GB', {day:'numeric', month:'short'})} - {new Date(l.endDate).toLocaleDateString('en-GB', {day:'numeric', month:'short'})}
                </Text>
              </View>
              
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reason}>"{l.reason}"</Text>

              <View style={styles.actions}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.rejectBtn]} 
                  onPress={() => handleAction(l, 'Rejected')}
                >
                  <XCircle size={20} color="#EF4444" style={{marginRight: 8}} />
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionBtn, styles.approveBtn]} 
                  onPress={() => handleAction(l, 'Approved')}
                >
                  <CheckCircle size={20} color="#10B981" style={{marginRight: 8}} />
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 180,
    backgroundColor: '#2563EB', borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  scrollContent: { padding: 20, paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 30 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#BFDBFE', fontWeight: '500', marginTop: 4 },
  
  emptyCard: { backgroundColor: '#FFFFFF', padding: 40, borderRadius: 24, alignItems: 'center', shadowColor: '#64748B', shadowOpacity: 0.05, shadowRadius: 15, shadowOffset:{width:0, height:6}, elevation: 3, marginTop: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center' },
  
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 20,
    shadowColor: '#64748B', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width:0, height:6}, elevation: 4
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  avatarBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  empName: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  department: { fontSize: 13, color: '#64748B', fontWeight: '600', marginLeft: 4 },
  typeBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  typeBadgeText: { color: '#475569', fontSize: 13, fontWeight: '800' },
  
  datesBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 16 },
  dates: { fontSize: 15, fontWeight: '700', color: '#334155', marginLeft: 10 },
  
  reasonLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  reason: { fontSize: 15, color: '#475569', fontStyle: 'italic', marginBottom: 24, lineHeight: 22 },
  
  actions: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 14, marginHorizontal: 6, borderWidth: 1 },
  rejectBtn: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  approveBtn: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  rejectText: { color: '#EF4444', fontWeight: '800', fontSize: 15 },
  approveText: { color: '#10B981', fontWeight: '800', fontSize: 15 }
});
