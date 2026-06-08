import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Modal, TextInput, Alert, StatusBar
} from 'react-native';
import { Calendar as CalendarIcon, Clock, FileText, CheckCircle, XCircle, ChevronLeft, ChevronRight, Plus, Map } from 'lucide-react-native';
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

export default function OutPassScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Calendar states
  const [calVisible, setCalVisible] = useState(false);

  const [formData, setFormData] = useState({
    date: '',
    outTime: '',
    expectedInTime: '',
    passType: 'Personal Work',
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
      const opRequests = allLeaves.filter(req => 
        req.type === 'Out Pass Request' && String(req.empId || req.emp_id) === String(emp.id)
      ).map(l => ({
        id: l.id,
        date: l.start_date || l.data?.date,
        outTime: l.data?.outTime || '',
        expectedInTime: l.data?.expectedInTime || '',
        passType: l.data?.passType || 'Personal Work',
        reason: l.reason || l.data?.reason || '',
        status: l.data?.status || l.status,
        appliedOn: l.appliedDate || l.created_at
      }));

      setRequests(opRequests.sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn)));
      
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load Out Pass data');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!formData.date || !formData.outTime || !formData.expectedInTime || !formData.reason) {
      Alert.alert('Validation', 'Please fill all required fields');
      return;
    }
    
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.outTime) || !timeRegex.test(formData.expectedInTime)) {
        Alert.alert('Validation', 'Time must be in HH:MM format (24-hour)');
        return;
    }

    setSubmitting(true);
    try {
      const user = authService.getCurrentUser();
      const emp = await dataService.getMyEmployeeProfile(user);
      
      const durationStr = `${formData.date} (${formData.outTime} - ${formData.expectedInTime})`;

      const requestPayload = {
        empId: emp.id,
        emp_id: String(emp.id),
        name: emp.name,
        type: 'Out Pass Request',
        startDate: formData.date,
        endDate: formData.date,
        start_date: formData.date,
        end_date: formData.date,
        duration: durationStr,
        days: 0,
        reason: formData.reason,
        status: 'Pending',
        appliedDate: new Date().toISOString().split('T')[0],
        data: {
          date: formData.date,
          outTime: formData.outTime,
          expectedInTime: formData.expectedInTime,
          passType: formData.passType,
          reason: formData.reason,
          status: 'Pending',
        }
      };
      
      await dataService.saveLeaveRequest(requestPayload);
      Alert.alert('Success', 'Out Pass request submitted successfully!');
      setModalVisible(false);
      setFormData({ date: '', outTime: '', expectedInTime: '', passType: 'Personal Work', reason: '' });
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
      case 'Correction Needed': return '#059669';
      default: return '#F59E0B';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Approved': return <CheckCircle size={16} color="#10B981" />;
      case 'Rejected': return <XCircle size={16} color="#EF4444" />;
      case 'Correction Needed': return <FileText size={16} color="#059669" />;
      default: return <Clock size={16} color="#F59E0B" />;
    }
  };

  if (loading && requests.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#059669" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Out Pass</Text>
          <Text style={styles.headerSubtitle}>Request short leave / personal passes</Text>
        </View>

        {/* Quick Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{requests.filter(r => r.status === 'Approved').length}</Text>
            <Text style={styles.statTitle}>Approved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{requests.filter(r => r.status === 'Pending').length}</Text>
            <Text style={styles.statTitle}>Pending</Text>
          </View>
        </View>

        {/* History Section */}
        <Text style={styles.sectionTitle}>Pass History</Text>
        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Map size={32} color="#CBD5E1" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No out pass requests found.</Text>
          </View>
        ) : (
          requests.map((r, i) => (
            <View key={i} style={styles.leaveCard}>
              <View style={styles.leaveHeader}>
                <View style={styles.purposeBadge}>
                  <Text style={styles.purposeText}>{r.passType}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(r.status) + '15' }]}>
                  {getStatusIcon(r.status)}
                  <Text style={[styles.leaveStatus, { color: getStatusColor(r.status) }]}>
                    {r.status}
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <CalendarIcon size={16} color="#64748B" />
                <Text style={styles.detailText}>
                  {new Date(r.date).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Clock size={16} color="#64748B" />
                <Text style={styles.detailText}>
                  {r.outTime} to {r.expectedInTime}
                </Text>
              </View>

              {r.reason && (
                <Text style={styles.reasonText} numberOfLines={2}>
                  "{r.reason}"
                </Text>
              )}
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
              <Text style={styles.modalTitle}>Request Out Pass</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <XCircle size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Date</Text>
                <TouchableOpacity 
                style={styles.dateSelector}
                onPress={() => setCalVisible(true)}
                >
                <CalendarIcon size={18} color="#64748B" />
                <Text style={[styles.dateSelectorText, !formData.date && styles.dateSelectorPlaceholder]}>
                    {formData.date || 'Select Date'}
                </Text>
                </TouchableOpacity>

                <View style={{flexDirection:'row', justifyContent:'space-between', marginTop: 12}}>
                    <View style={{flex: 1, marginRight: 8}}>
                        <Text style={styles.inputLabel}>Out Time (HH:MM)</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. 10:30" 
                            placeholderTextColor="#94A3B8"
                            value={formData.outTime}
                            onChangeText={(t) => setFormData({...formData, outTime: t})}
                        />
                    </View>
                    <View style={{flex: 1, marginLeft: 8}}>
                        <Text style={styles.inputLabel}>In Time (HH:MM)</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. 12:00" 
                            placeholderTextColor="#94A3B8"
                            value={formData.expectedInTime}
                            onChangeText={(t) => setFormData({...formData, expectedInTime: t})}
                        />
                    </View>
                </View>

                <Text style={styles.inputLabel}>Type of Pass</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {['Personal Work', 'Medical/Doctor', 'Other'].map(type => (
                    <TouchableOpacity 
                    key={type} 
                    style={[styles.typeBtn, formData.passType === type && styles.typeBtnActive]}
                    onPress={() => setFormData({...formData, passType: type})}
                    >
                    <Text style={[styles.typeBtnText, formData.passType === type && styles.typeBtnTextActive]}>
                        {type}
                    </Text>
                    </TouchableOpacity>
                ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Reason Details</Text>
                <TextInput 
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
                placeholder="Why do you need an out pass?..." 
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
                <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CustomCalendarPicker 
        visible={calVisible} 
        currentVal={formData.date}
        onClose={() => setCalVisible(false)}
        onSelect={(dateStr) => setFormData({...formData, date: dateStr})}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 200,
    backgroundColor: '#059669', borderBottomLeftRadius: 36, borderBottomRightRadius: 36, // Emerald green for out pass
  },
  scrollContent: { padding: 20, paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#A7F3D0', fontWeight: '500', marginTop: 4 },
  
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  statCard: { 
    backgroundColor: '#FFFFFF', flex: 1, marginHorizontal: 6, paddingVertical: 18, 
    borderRadius: 20, alignItems: 'center', shadowColor: '#64748B', 
    shadowOpacity: 0.08, shadowRadius: 15, shadowOffset: { width:0, height:6}, elevation: 3
  },
  statTitle: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 6, textTransform: 'uppercase' },
  statValue: { fontSize: 28, fontWeight: '800', color: '#1E293B' },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  
  leaveCard: {
    backgroundColor: '#FFFFFF', padding: 18, borderRadius: 20, marginBottom: 16,
    shadowColor: '#64748B', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: {width:0, height:4}, elevation: 2
  },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  purposeBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  purposeText: { color: '#059669', fontSize: 13, fontWeight: '800' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  leaveStatus: { fontSize: 13, fontWeight: '700', marginLeft: 6 },
  
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailText: { fontSize: 14, fontWeight: '500', color: '#334155', marginLeft: 8 },
  reasonText: { fontSize: 14, color: '#64748B', fontStyle: 'italic', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: '#F1F5F9' },
  
  emptyCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 20, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 15, fontWeight: '500' },

  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, 
    backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#059669', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset:{width:0, height:6}, elevation: 6
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  closeBtn: { padding: 4 },
  
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, fontSize: 15, color: '#1E293B', backgroundColor: '#F8FAFC' },
  
  dateSelector: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, backgroundColor: '#F8FAFC' },
  dateSelectorText: { fontSize: 15, color: '#1E293B', marginLeft: 10, fontWeight: '500' },
  dateSelectorPlaceholder: { color: '#94A3B8' },
  
  typeBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC', marginRight: 8 },
  typeBtnActive: { backgroundColor: '#ECFDF5', borderColor: '#059669', borderWidth: 2 },
  typeBtnText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
  typeBtnTextActive: { color: '#059669' },
  
  submitBtn: { backgroundColor: '#059669', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 24, shadowColor: '#059669', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset:{width:0, height:4}, elevation: 4 },
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
  calCellSelected: { backgroundColor: '#059669' },
  calCellText: { fontSize: 15, color: '#334155', fontWeight: '500' },
  calCellTextSelected: { color: '#FFF', fontWeight: '700' },
  calCancelBtn: { marginTop: 24, alignItems: 'center', paddingVertical: 12 },
  calCancelText: { color: '#64748B', fontSize: 16, fontWeight: '600' }
});
