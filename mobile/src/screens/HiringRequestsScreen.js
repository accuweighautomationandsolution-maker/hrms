import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, StatusBar, TextInput, Alert
} from 'react-native';
import { UserPlus, Clock, CheckCircle, ShieldAlert, AlertTriangle } from 'lucide-react-native';
import { dataService } from '../utils/dataService';

const formatCurrency = (i) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(i);

export default function HiringRequestsScreen() {
  const [loading, setLoading] = useState(true);
  
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [proposedCTC, setProposedCTC] = useState('');
  
  const [requestsData, setRequestsData] = useState([]);
  const [departmentsData, setDepartmentsData] = useState([]);
  const [budgetsData, setBudgetsData] = useState([]);
  const [utilizationMap, setUtilizationMap] = useState({});
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    fetchData();
  }, [reloads]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqs, budgets, depts] = await Promise.all([
        dataService.getManpowerRequests(),
        dataService.getDeptBudgets(),
        dataService.getDepartments()
      ]);
      setRequestsData(reqs);
      setBudgetsData(budgets);
      setDepartmentsData(depts);

      const uMap = {};
      await Promise.all(budgets.map(async (b) => {
        uMap[b.department] = await dataService.getBudgetUtilization(b.department);
      }));
      setUtilizationMap(uMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const budgetContext = useMemo(() => {
    if (!department) return null;
    const targetBudget = budgetsData.find(b => b.department === department);
    if (!targetBudget) return { noBudget: true, utilized: utilizationMap[department] || 0 };

    const utilized = utilizationMap[department] || 0;
    const projectedCTC = Number(proposedCTC) || 0;
    const newTotal = utilized + projectedCTC;
    
    const absoluteLimit = targetBudget.totalBudget * (1 + (targetBudget.buffer / 100));
    const isExceeded = newTotal > targetBudget.totalBudget;
    const isCritical = newTotal > absoluteLimit;

    return {
      utilized,
      limit: targetBudget.totalBudget,
      absoluteLimit,
      projectedTotal: newTotal,
      isExceeded,
      isCritical,
      breachAmount: Math.max(0, newTotal - targetBudget.totalBudget)
    };
  }, [department, proposedCTC, budgetsData, reloads, utilizationMap]);

  const submitRequest = async () => {
    if (!department || !role || !proposedCTC) {
      Alert.alert('Missing Info', 'Please fill out all requisition fields.');
      return;
    }
    
    if (budgetContext && budgetContext.isCritical) {
      Alert.alert(
        'Critical Alert',
        `This crosses your hard Buffer bounds for ${department} by ${formatCurrency(budgetContext.projectedTotal - budgetContext.absoluteLimit)}. You must explicitly ask for Director permission. Proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Proceed', onPress: doSubmit }
        ]
      );
      return;
    }

    doSubmit();
  };

  const doSubmit = async () => {
    const newReq = {
      id: Date.now(),
      department,
      role,
      proposedCTC: Number(proposedCTC),
      grade: 'G3',
      justification: 'Mobile submission',
      date: new Date().toISOString().split('T')[0],
      status: (!budgetContext || budgetContext.noBudget || budgetContext.isExceeded) ? 'Pending Approval' : 'Auto-Approved',
      breachAmount: (budgetContext && budgetContext.isExceeded) ? budgetContext.breachAmount : 0
    };

    const existing = await dataService.getManpowerRequests();
    await dataService.saveManpowerRequests([newReq, ...existing]);
    
    setRole('');
    setProposedCTC('');
    setDepartment('');
    setReloads(r => r + 1);
    Alert.alert('Success', 'Requisition processed successfully.');
  };

  if (loading && requestsData.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hiring Requests</Text>
          <Text style={styles.headerSubtitle}>File requisitions & track approvals</Text>
        </View>

        {/* New Requisition Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}><UserPlus size={20} color="#FFFFFF" /></View>
            <Text style={styles.cardTitle}>New Hire Request</Text>
          </View>

          {/* Department Picker mock (Using buttons for mobile friendly demo) */}
          <Text style={styles.label}>Target Department</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptScroll}>
            {departmentsData.map(d => (
              <TouchableOpacity 
                key={d} 
                style={[styles.deptPill, department === d && styles.deptPillActive]}
                onPress={() => setDepartment(d)}
              >
                <Text style={[styles.deptPillText, department === d && styles.deptPillTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Role Designation</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Senior Frontend Engineer"
            value={role}
            onChangeText={setRole}
          />

          <Text style={styles.label}>Proposed Annual CTC (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="1000000"
            keyboardType="numeric"
            value={proposedCTC}
            onChangeText={setProposedCTC}
          />

          {budgetContext && (
            <View style={[styles.alertBox, { 
              backgroundColor: budgetContext.isExceeded || budgetContext.noBudget ? '#FEF2F2' : '#F0FDF4',
              borderColor: budgetContext.isExceeded || budgetContext.noBudget ? '#FECACA' : '#BBF7D0'
            }]}>
              <View style={styles.alertRow}>
                {budgetContext.noBudget ? <AlertTriangle size={24} color="#DC2626" /> : 
                 budgetContext.isExceeded ? <ShieldAlert size={24} color="#DC2626" /> : 
                 <CheckCircle size={24} color="#16A34A" />}
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: budgetContext.isExceeded || budgetContext.noBudget ? '#DC2626' : '#16A34A' }]}>
                    {budgetContext.noBudget ? 'No Budget Defined' : 
                     budgetContext.isExceeded ? 'Approval Override Required' : 
                     'Pre-Cleared: Within Budget'}
                  </Text>
                  <Text style={styles.alertDesc}>
                    {budgetContext.noBudget ? 'Submission requires CFO override.' : 
                     `Projected: ${formatCurrency(budgetContext.projectedTotal)} / ${formatCurrency(budgetContext.limit)}`}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.submitBtn} onPress={submitRequest}>
            <Text style={styles.submitBtnText}>Dispatch Hire Request</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Active Queues</Text>

        {requestsData.slice(0, 10).map(r => (
          <View key={r.id} style={styles.queueCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.queueRole}>{r.role}</Text>
              <Text style={styles.queueDept}>{r.department} • {formatCurrency(r.proposedCTC)}</Text>
            </View>
            <View style={[styles.statusBadge, { 
              backgroundColor: r.status === 'Auto-Approved' ? '#DCFCE7' : r.status === 'Rejected' ? '#FEE2E2' : '#FEF3C7' 
            }]}>
              {r.status === 'Pending Approval' && <Clock size={12} color="#D97706" style={{ marginRight: 4 }} />}
              <Text style={[styles.statusText, {
                color: r.status === 'Auto-Approved' ? '#15803D' : r.status === 'Rejected' ? '#B91C1C' : '#B45309'
              }]}>{r.status}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 200,
    backgroundColor: '#6366F1', borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  scrollContent: { padding: 20, paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#E0E7FF', fontWeight: '500', marginTop: 4 },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 24, shadowColor: '#6366F1', shadowOpacity: 0.1, shadowRadius: 15, shadowOffset:{width:0, height:6}, elevation: 5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 16 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  
  label: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 16 },
  
  deptScroll: { marginBottom: 16 },
  deptPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  deptPillActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  deptPillText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  deptPillTextActive: { color: '#4F46E5', fontWeight: '700' },

  alertBox: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 20 },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start' },
  alertTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  alertDesc: { fontSize: 12, color: '#475569', lineHeight: 18 },

  submitBtn: { backgroundColor: '#6366F1', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16, marginLeft: 4 },

  queueCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  queueRole: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  queueDept: { fontSize: 13, color: '#64748B' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
});
