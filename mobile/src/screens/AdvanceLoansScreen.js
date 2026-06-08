import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Modal, TextInput, Alert, StatusBar
} from 'react-native';
import { IndianRupee, HandCoins, CheckCircle, XCircle, Clock, FileText, Plus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { authService } from '../utils/authService';
import { dataService } from '../utils/dataService';

export default function AdvanceLoansScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [advances, setAdvances] = useState([]);
  const [stats, setStats] = useState({ activeDeduction: 0, totalPrincipal: 0 });
  const [modalVisible, setModalVisible] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    installments: '1'
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

      const history = await dataService.getAdvanceHistory();
      const myAdvances = history.filter(h => String(h.empId) === String(emp.id));
      
      const activeAdv = myAdvances.filter(a => a.status === 'Approved' || a.status === 'Active' || a.status === 'Foreclosed');
      const activeDeduction = activeAdv.reduce((sum, a) => sum + (a.status === 'Foreclosed' ? ((a.amount||0) - (a.totalRepaid||0)) : (a.emi || 0)), 0);
      const totalPrincipal = myAdvances.reduce((sum, h) => sum + (h.amount || 0), 0);

      setAdvances(myAdvances.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setStats({ activeDeduction, totalPrincipal });
      
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load Advance data');
    } finally {
      setLoading(false);
    }
  };

  const calculateEmi = () => {
    const total = Number(formData.amount) || 0;
    const inst = Number(formData.installments) || 1;
    return Math.round(total / inst);
  };

  const handleApply = async () => {
    if (!formData.amount || Number(formData.amount) <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount');
      return;
    }
    if (!formData.installments || Number(formData.installments) <= 0) {
      Alert.alert('Validation', 'Please enter a valid tenure (months)');
      return;
    }

    setSubmitting(true);
    try {
      const user = authService.getCurrentUser();
      const emp = await dataService.getMyEmployeeProfile(user);
      const history = await dataService.getAdvanceHistory();
      
      const emi = calculateEmi();
      const totalAmount = Number(formData.amount);

      const newAdvance = {
        id: `ADV-${Date.now()}`,
        empId: emp.id,
        empName: emp.name,
        type: 'Personal Advance',
        amount: totalAmount,
        installments: Number(formData.installments),
        emi: emi,
        totalRepaid: 0,
        isForeclosed: false,
        date: new Date().toISOString().split('T')[0],
        issueDate: new Date().toLocaleDateString('en-GB'),
        status: 'Pending Admin Approval',
        approvals: { admin: false, director: false, finance: false }
      };
      
      const finalHistory = [...history, newAdvance];
      await dataService.saveAdvanceHistory(finalHistory);
      
      Alert.alert('Success', 'Advance request submitted successfully!');
      setModalVisible(false);
      setFormData({ amount: '', installments: '1' });
      await loadData();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Approved' || status === 'Active' || status === 'Foreclosed') return '#10B981';
    if (status === 'Rejected' || status === 'Cancelled') return '#EF4444';
    if (status === 'Closed') return '#64748B';
    return '#F59E0B'; // Pending
  };

  const getStatusIcon = (status) => {
    if (status === 'Approved' || status === 'Active' || status === 'Foreclosed') return <CheckCircle size={16} color="#10B981" />;
    if (status === 'Rejected' || status === 'Cancelled') return <XCircle size={16} color="#EF4444" />;
    if (status === 'Closed') return <CheckCircle size={16} color="#64748B" />;
    return <Clock size={16} color="#F59E0B" />;
  };

  if (loading && advances.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284C7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0284C7" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Advances & Loans</Text>
          <Text style={styles.headerSubtitle}>Manage your salary advances</Text>
        </View>

        {/* Quick Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{stats.activeDeduction.toLocaleString()}</Text>
            <Text style={styles.statTitle}>Active EMI / Mo</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{stats.totalPrincipal.toLocaleString()}</Text>
            <Text style={styles.statTitle}>Total Principal</Text>
          </View>
        </View>

        {/* History Section */}
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {advances.length === 0 ? (
          <View style={styles.emptyCard}>
            <HandCoins size={32} color="#CBD5E1" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No advance requests found.</Text>
          </View>
        ) : (
          advances.map((a, i) => (
            <View key={i} style={styles.leaveCard}>
              <View style={styles.leaveHeader}>
                <View style={styles.purposeBadge}>
                  <Text style={styles.purposeText}>{a.type}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(a.status) + '15' }]}>
                  {getStatusIcon(a.status)}
                  <Text style={[styles.leaveStatus, { color: getStatusColor(a.status) }]}>
                    {a.status === 'Pending Admin Approval' ? 'Pending' : 
                     a.status.includes('Pending') ? a.status : 
                     a.status}
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <IndianRupee size={16} color="#64748B" />
                <Text style={styles.amountText}>
                  Principal: ₹{a.amount?.toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Clock size={16} color="#64748B" />
                <Text style={styles.detailText}>
                  {a.emi > 0 ? `EMI: ₹${a.emi.toLocaleString()} / mo` : 'Lump-sum Settlement'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <FileText size={16} color="#64748B" />
                <Text style={styles.detailText}>
                  Repaid: ₹{(a.totalRepaid || 0).toLocaleString()}
                </Text>
              </View>

              <Text style={styles.appliedDate}>Applied: {a.issueDate}</Text>
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
              <Text style={styles.modalTitle}>Apply for Advance</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <XCircle size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                
                <Text style={styles.inputLabel}>Advance Amount (₹)</Text>
                <View style={styles.inputContainer}>
                  <IndianRupee size={18} color="#94A3B8" />
                  <TextInput 
                    style={styles.inputText} 
                    placeholder="e.g. 10000" 
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={formData.amount}
                    onChangeText={(t) => setFormData({...formData, amount: t})}
                  />
                </View>

                <Text style={styles.inputLabel}>Tenure (Months)</Text>
                <View style={styles.inputContainer}>
                  <Clock size={18} color="#94A3B8" />
                  <TextInput 
                    style={styles.inputText} 
                    placeholder="e.g. 3" 
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={formData.installments}
                    onChangeText={(t) => setFormData({...formData, installments: t})}
                  />
                </View>

                <View style={styles.summaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Principal</Text>
                    <Text style={styles.summaryValue}>₹{(Number(formData.amount) || 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabelEmi}>Monthly EMI</Text>
                    <Text style={styles.summaryValueEmi}>₹{calculateEmi().toLocaleString()} / mo</Text>
                  </View>
                  <Text style={styles.summaryDisclaimer}>
                    * This amount will be automatically deducted from your salary for {formData.installments || 1} month(s).
                  </Text>
                </View>

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

    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 200,
    backgroundColor: '#0284C7', borderBottomLeftRadius: 36, borderBottomRightRadius: 36, // Sky blue for finance
  },
  scrollContent: { padding: 20, paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#BAE6FD', fontWeight: '500', marginTop: 4 },
  
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  statCard: { 
    backgroundColor: '#FFFFFF', flex: 1, marginHorizontal: 6, paddingVertical: 18, 
    borderRadius: 20, alignItems: 'center', shadowColor: '#64748B', 
    shadowOpacity: 0.08, shadowRadius: 15, shadowOffset: { width:0, height:6}, elevation: 3
  },
  statTitle: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 6, textTransform: 'uppercase' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  
  leaveCard: {
    backgroundColor: '#FFFFFF', padding: 18, borderRadius: 20, marginBottom: 16,
    shadowColor: '#64748B', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: {width:0, height:4}, elevation: 2
  },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  purposeBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  purposeText: { color: '#0284C7', fontSize: 13, fontWeight: '800' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  leaveStatus: { fontSize: 13, fontWeight: '700', marginLeft: 6 },
  
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailText: { fontSize: 15, fontWeight: '500', color: '#334155', marginLeft: 8 },
  amountText: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginLeft: 8 },
  appliedDate: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginTop: 8, textAlign: 'right' },
  
  emptyCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 20, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 15, fontWeight: '500' },

  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, 
    backgroundColor: '#0284C7', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#0284C7', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset:{width:0, height:6}, elevation: 6
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  closeBtn: { padding: 4 },
  
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, backgroundColor: '#F8FAFC' },
  inputText: { flex: 1, paddingVertical: 16, paddingLeft: 10, fontSize: 16, color: '#1E293B', fontWeight: '500' },
  
  summaryBox: { marginTop: 24, padding: 16, borderRadius: 16, backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#475569' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  summaryLabelEmi: { fontSize: 15, color: '#0284C7', fontWeight: '700' },
  summaryValueEmi: { fontSize: 16, fontWeight: '800', color: '#0284C7' },
  summaryDisclaimer: { marginTop: 12, fontSize: 11, color: '#64748B', fontStyle: 'italic', lineHeight: 16 },

  submitBtn: { backgroundColor: '#0284C7', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 24, shadowColor: '#0284C7', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset:{width:0, height:4}, elevation: 4 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
