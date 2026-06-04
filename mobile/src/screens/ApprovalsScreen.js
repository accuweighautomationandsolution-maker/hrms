import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Pending Leave Requests</Text>
        
        {pendingLeaves.length === 0 ? (
          <Text style={styles.emptyText}>You're all caught up! No pending approvals.</Text>
        ) : (
          pendingLeaves.map((l, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.header}>
                <View>
                  <Text style={styles.empName}>{l.empName || `Employee ID: ${l.empId}`}</Text>
                  <Text style={styles.department}>{l.department || 'General'}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{l.leaveType}</Text>
                </View>
              </View>

              <Text style={styles.dates}>
                {new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}
              </Text>
              <Text style={styles.reason}>"{l.reason}"</Text>

              <View style={styles.actions}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.rejectBtn]} 
                  onPress={() => handleAction(l, 'Rejected')}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" style={{marginRight: 6}} />
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionBtn, styles.approveBtn]} 
                  onPress={() => handleAction(l, 'Approved')}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{marginRight: 6}} />
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 40, fontSize: 16 },
  
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width:0, height:2}, elevation: 2
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  empName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  department: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  badge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#2563EB', fontSize: 12, fontWeight: '700' },
  
  dates: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  reason: { fontSize: 14, color: '#4B5563', fontStyle: 'italic', marginBottom: 16 },
  
  actions: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 8, marginHorizontal: 4 },
  rejectBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  approveBtn: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  rejectText: { color: '#EF4444', fontWeight: '600', fontSize: 15 },
  approveText: { color: '#10B981', fontWeight: '600', fontSize: 15 }
});
