import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Modal, TextInput, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../utils/authService';
import { dataService } from '../utils/dataService';

export default function LeaveManagementScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState({ PL: 0, CL: 0, SL: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    leaveType: 'CL',
    reason: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = authService.getCurrentUser();
      if (!user) return;
      const emp = await dataService.getMyEmployeeProfile(user);
      if (!emp) return;

      const allLeaves = await dataService.getLeaveRequests();
      const userLeaves = allLeaves.filter(req => req.empId === emp.id);
      setLeaves(userLeaves.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

      const currentYear = new Date().getFullYear();
      const userBalances = await dataService.getLeaveBalances(emp.id, currentYear);
      setBalances(userBalances || { PL: 0, CL: 0, SL: 0 });
      
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      Alert.alert('Validation', 'Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      const user = authService.getCurrentUser();
      const emp = await dataService.getMyEmployeeProfile(user);
      
      const newLeave = {
        empId: emp.id,
        empName: emp.name,
        department: emp.department,
        startDate: formData.startDate,
        endDate: formData.endDate,
        leaveType: formData.leaveType,
        reason: formData.reason,
        status: 'Pending',
        appliedOn: new Date().toISOString()
      };
      
      await dataService.saveLeaveRequest(newLeave);
      Alert.alert('Success', 'Leave application submitted successfully!');
      setModalVisible(false);
      setFormData({ startDate: '', endDate: '', leaveType: 'CL', reason: '' });
      await loadData();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return '#10B981';
      case 'Rejected': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Balances Section */}
        <Text style={styles.sectionTitle}>Leave Balances</Text>
        <View style={styles.balanceContainer}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceTitle}>Casual (CL)</Text>
            <Text style={styles.balanceValue}>{balances.CL}</Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceTitle}>Sick (SL)</Text>
            <Text style={styles.balanceValue}>{balances.SL}</Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceTitle}>Privilege (PL)</Text>
            <Text style={styles.balanceValue}>{balances.PL}</Text>
          </View>
        </View>

        {/* History Section */}
        <Text style={styles.sectionTitle}>Leave History</Text>
        {leaves.length === 0 ? (
          <Text style={styles.emptyText}>No leave requests found.</Text>
        ) : (
          leaves.map((l, i) => (
            <View key={i} style={styles.leaveCard}>
              <View style={styles.leaveHeader}>
                <View style={styles.leaveTypeBadge}>
                  <Text style={styles.leaveTypeText}>{l.leaveType}</Text>
                </View>
                <Text style={[styles.leaveStatus, { color: getStatusColor(l.status) }]}>
                  {l.status}
                </Text>
              </View>
              <Text style={styles.leaveDates}>
                {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
              </Text>
              <Text style={styles.leaveReason} numberOfLines={2}>{l.reason}</Text>
              <Text style={styles.leaveAppliedOn}>Applied: {new Date(l.appliedOn || l.created_at).toLocaleDateString()}</Text>
            </View>
          ))
        )}

      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Application Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Leave</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="calendar" size={16} color="#6B7280" style={{marginRight: 6}} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Leave Type</Text>
            <View style={styles.typeSelector}>
              {['CL', 'SL', 'PL', 'LWP'].map(type => (
                <TouchableOpacity 
                  key={type} 
                  style={[styles.typeBtn, formData.leaveType === type && styles.typeBtnActive]}
                  onPress={() => setFormData({...formData, leaveType: type})}
                >
                  <Text style={[styles.typeBtnText, formData.leaveType === type && styles.typeBtnTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. 2026-06-10" 
              value={formData.startDate}
              onChangeText={(t) => setFormData({...formData, startDate: t})}
            />

            <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. 2026-06-12" 
              value={formData.endDate}
              onChangeText={(t) => setFormData({...formData, endDate: t})}
            />

            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput 
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
              placeholder="Why are you taking leave?" 
              multiline
              value={formData.reason}
              onChangeText={(t) => setFormData({...formData, reason: t})}
            />

            <TouchableOpacity 
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]} 
              onPress={handleApply}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16, marginTop: 8 },
  balanceContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  balanceCard: { 
    backgroundColor: '#FFF', 
    flex: 1, 
    marginHorizontal: 4, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width:0, height:2}, elevation: 2
  },
  balanceTitle: { fontSize: 12, color: '#6B7280', marginBottom: 8, fontWeight: '500' },
  balanceValue: { fontSize: 24, fontWeight: 'bold', color: '#2563EB' },
  
  leaveCard: {
    backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1
  },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  leaveTypeBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  leaveTypeText: { color: '#2563EB', fontSize: 12, fontWeight: '700' },
  leaveStatus: { fontSize: 13, fontWeight: '700' },
  leaveDates: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 6 },
  leaveReason: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  leaveAppliedOn: { fontSize: 12, color: '#9CA3AF' },
  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 20 },

  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563EB',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 8, elevation: 4
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, 
    padding: 24, minHeight: 500 
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
  input: { 
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, 
    padding: 12, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB'
  },
  typeSelector: { flexDirection: 'row', justifyContent: 'space-between' },
  typeBtn: { 
    flex: 1, marginHorizontal: 4, paddingVertical: 10, borderRadius: 8, 
    borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#FFF'
  },
  typeBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  typeBtnText: { color: '#6B7280', fontWeight: '600' },
  typeBtnTextActive: { color: '#2563EB' },
  submitBtn: { 
    backgroundColor: '#2563EB', padding: 16, borderRadius: 12, 
    alignItems: 'center', marginTop: 32 
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
