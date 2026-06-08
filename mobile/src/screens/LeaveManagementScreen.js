import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Modal, TextInput, Alert, StatusBar
} from 'react-native';
import { Calendar as CalendarIcon, FileText, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { authService } from '../utils/authService';
import { dataService } from '../utils/dataService';

// --- Pure JS Calendar Picker ---
const CustomCalendarPicker = ({ visible, onClose, onSelect, currentVal }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (visible && currentVal) {
      const d = new Date(currentVal);
      if (!isNaN(d)) setCurrentMonth(d);
    }
  }, [visible, currentVal]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const days = Array(firstDay).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => i + 1));
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.calOverlay}>
        <View style={styles.calContent}>
          <View style={styles.calHeader}>
            <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
              <ChevronLeft size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.calMonthName}>
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
              <ChevronRight size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.calDaysRow}>
            {dayNames.map((d, i) => <Text key={i} style={styles.calDayName}>{d}</Text>)}
          </View>
          
          <View style={styles.calGrid}>
            {days.map((d, i) => {
              if (!d) return <View key={`empty-${i}`} style={styles.calCell} />;
              
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isSelected = dateStr === currentVal;
              
              return (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.calCell, isSelected && styles.calCellSelected]}
                  onPress={() => { onSelect(dateStr); onClose(); }}
                >
                  <Text style={[styles.calCellText, isSelected && styles.calCellTextSelected]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <TouchableOpacity style={styles.calCancelBtn} onPress={onClose}>
            <Text style={styles.calCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function LeaveManagementScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState({ PL: 0, CL: 0, SL: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  
  // Calendar states
  const [calVisible, setCalVisible] = useState(false);
  const [activeDateField, setActiveDateField] = useState(''); // 'startDate' or 'endDate'

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
      setLeaves(userLeaves.sort((a, b) => new Date(b.created_at || b.appliedOn) - new Date(a.created_at || a.appliedOn)));

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

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Approved': return <CheckCircle size={16} color="#10B981" />;
      case 'Rejected': return <XCircle size={16} color="#EF4444" />;
      default: return <Clock size={16} color="#F59E0B" />;
    }
  };

  if (loading && leaves.length === 0) {
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
          <Text style={styles.headerTitle}>Leave Management</Text>
          <Text style={styles.headerSubtitle}>View balances and apply</Text>
        </View>

        {/* Balances Section */}
        <View style={styles.balanceContainer}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceValue}>{balances.CL}</Text>
            <Text style={styles.balanceTitle}>Casual Leave</Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceValue}>{balances.SL}</Text>
            <Text style={styles.balanceTitle}>Sick Leave</Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceValue}>{balances.PL}</Text>
            <Text style={styles.balanceTitle}>Privilege Leave</Text>
          </View>
        </View>

        {/* History Section */}
        <Text style={styles.sectionTitle}>Leave History</Text>
        {leaves.length === 0 ? (
          <View style={styles.emptyCard}>
            <FileText size={32} color="#CBD5E1" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No leave requests found.</Text>
          </View>
        ) : (
          leaves.map((l, i) => (
            <View key={i} style={styles.leaveCard}>
              <View style={styles.leaveHeader}>
                <View style={styles.leaveTypeBadge}>
                  <Text style={styles.leaveTypeText}>{l.leaveType}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(l.status) + '15' }]}>
                  {getStatusIcon(l.status)}
                  <Text style={[styles.leaveStatus, { color: getStatusColor(l.status) }]}>
                    {l.status}
                  </Text>
                </View>
              </View>
              <View style={styles.leaveDatesRow}>
                <CalendarIcon size={16} color="#64748B" />
                <Text style={styles.leaveDates}>
                  {new Date(l.startDate).toLocaleDateString('en-GB', {day:'numeric', month:'short'})} - {new Date(l.endDate).toLocaleDateString('en-GB', {day:'numeric', month:'short'})}
                </Text>
              </View>
              <Text style={styles.leaveReason} numberOfLines={2}>"{l.reason}"</Text>
              <Text style={styles.leaveAppliedOn}>Applied: {new Date(l.appliedOn || l.created_at).toLocaleDateString()}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Plus size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Application Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Leave</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <XCircle size={24} color="#94A3B8" />
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

            <View style={{flexDirection:'row', justifyContent:'space-between'}}>
              <View style={{flex: 1, marginRight: 8}}>
                <Text style={styles.inputLabel}>Start Date</Text>
                <TouchableOpacity 
                  style={styles.dateSelector}
                  onPress={() => { setActiveDateField('startDate'); setCalVisible(true); }}
                >
                  <CalendarIcon size={18} color="#64748B" />
                  <Text style={[styles.dateSelectorText, !formData.startDate && styles.dateSelectorPlaceholder]}>
                    {formData.startDate || 'Select Date'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{flex: 1, marginLeft: 8}}>
                <Text style={styles.inputLabel}>End Date</Text>
                <TouchableOpacity 
                  style={styles.dateSelector}
                  onPress={() => { setActiveDateField('endDate'); setCalVisible(true); }}
                >
                  <CalendarIcon size={18} color="#64748B" />
                  <Text style={[styles.dateSelectorText, !formData.endDate && styles.dateSelectorPlaceholder]}>
                    {formData.endDate || 'Select Date'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput 
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
              placeholder="Why are you taking leave?" 
              placeholderTextColor="#94A3B8"
              multiline
              value={formData.reason}
              onChangeText={(t) => setFormData({...formData, reason: t})}
            />

            <TouchableOpacity 
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]} 
              onPress={handleApply}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CustomCalendarPicker 
        visible={calVisible} 
        currentVal={formData[activeDateField]}
        onClose={() => setCalVisible(false)}
        onSelect={(dateStr) => setFormData({...formData, [activeDateField]: dateStr})}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 200,
    backgroundColor: '#2563EB', borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  scrollContent: { padding: 20, paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#BFDBFE', fontWeight: '500', marginTop: 4 },
  
  balanceContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  balanceCard: { 
    backgroundColor: '#FFFFFF', flex: 1, marginHorizontal: 4, paddingVertical: 18, 
    borderRadius: 20, alignItems: 'center', shadowColor: '#64748B', 
    shadowOpacity: 0.08, shadowRadius: 15, shadowOffset: { width:0, height:6}, elevation: 3
  },
  balanceTitle: { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 6, textTransform: 'uppercase' },
  balanceValue: { fontSize: 28, fontWeight: '800', color: '#1E293B' },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  
  leaveCard: {
    backgroundColor: '#FFFFFF', padding: 18, borderRadius: 20, marginBottom: 16,
    shadowColor: '#64748B', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: {width:0, height:4}, elevation: 2
  },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  leaveTypeBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  leaveTypeText: { color: '#2563EB', fontSize: 13, fontWeight: '800' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  leaveStatus: { fontSize: 13, fontWeight: '700', marginLeft: 6 },
  leaveDatesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  leaveDates: { fontSize: 15, fontWeight: '600', color: '#334155', marginLeft: 8 },
  leaveReason: { fontSize: 14, color: '#64748B', fontStyle: 'italic', marginBottom: 12, lineHeight: 20 },
  leaveAppliedOn: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  
  emptyCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 20, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 15, fontWeight: '500' },

  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, 
    backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset:{width:0, height:6}, elevation: 6
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  closeBtn: { padding: 4 },
  
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, fontSize: 15, color: '#1E293B', backgroundColor: '#F8FAFC' },
  
  dateSelector: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, backgroundColor: '#F8FAFC' },
  dateSelectorText: { fontSize: 15, color: '#1E293B', marginLeft: 10, fontWeight: '500' },
  dateSelectorPlaceholder: { color: '#94A3B8' },
  
  typeSelector: { flexDirection: 'row', justifyContent: 'space-between' },
  typeBtn: { flex: 1, marginHorizontal: 4, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC' },
  typeBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6', borderWidth: 2 },
  typeBtnText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
  typeBtnTextActive: { color: '#2563EB' },
  
  submitBtn: { backgroundColor: '#2563EB', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 32, shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset:{width:0, height:4}, elevation: 4 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  // Calendar Modal Styles
  calOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center' },
  calContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 24, padding: 20 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calNavBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 12 },
  calMonthName: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  calDaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  calDayName: { width: 36, textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
  calCell: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginVertical: 4, borderRadius: 18 },
  calCellSelected: { backgroundColor: '#2563EB' },
  calCellText: { fontSize: 15, color: '#334155', fontWeight: '500' },
  calCellTextSelected: { color: '#FFF', fontWeight: '700' },
  calCancelBtn: { marginTop: 24, alignItems: 'center', paddingVertical: 12 },
  calCancelText: { color: '#64748B', fontSize: 16, fontWeight: '600' }
});
