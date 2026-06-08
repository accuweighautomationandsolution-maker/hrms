import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, StatusBar
} from 'react-native';
import { ChevronLeft, ChevronRight, Calculator, IndianRupee, PieChart, TrendingUp, TrendingDown, Clock } from 'lucide-react-native';
import { dataService } from '../utils/dataService';

export default function PayrollLedgerScreen() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadPayroll();
  }, [currentDate]);

  const loadPayroll = async () => {
    setLoading(true);
    try {
      const month = currentDate.getMonth();
      const year = currentDate.getFullYear();
      const data = await dataService.getPayrollRecordsByMonth(month, year);
      setRecords(Object.values(data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  // Calculations for Chart
  const totals = useMemo(() => {
    let gross = 0;
    let net = 0;
    let ded = 0;
    let ot = 0;
    records.forEach(r => {
      gross += (r.grossSalary || 0);
      net += (r.netSalary || 0);
      ded += (r.totalDeductions || 0);
      ot += (r.overtimePay || 0);
    });
    return { gross, net, ded, ot };
  }, [records]);

  const maxChartVal = Math.max(totals.gross, 1); // Avoid division by 0

  const renderItem = ({ item }) => {
    const otPay = item.overtimePay || 0;
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.empName}>{item.empName || `Emp ID: ${item.empId}`}</Text>
          <View style={[styles.badge, item.status === 'Paid' ? styles.badgePaid : styles.badgePending]}>
            <Text style={[styles.badgeText, item.status === 'Paid' ? styles.badgeTextPaid : styles.badgeTextPending]}>
              {item.status || 'Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
             <Text style={styles.metricLabel}>Net Pay</Text>
             <Text style={[styles.metricValue, {color: '#2563EB'}]}>₹{Math.round(item.netSalary || 0).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.metricItem}>
             <Text style={styles.metricLabel}>Gross</Text>
             <Text style={styles.metricValue}>₹{Math.round(item.grossSalary || 0).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.metricItem}>
             <Text style={styles.metricLabel}>Deductions</Text>
             <Text style={[styles.metricValue, {color: '#EF4444'}]}>₹{Math.round(item.totalDeductions || 0).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {otPay > 0 && (
          <View style={styles.otContainer}>
            <Clock size={14} color="#F59E0B" style={{marginRight: 6}} />
            <Text style={styles.otText}>Includes <Text style={{fontWeight: '800'}}>₹{Math.round(otPay).toLocaleString('en-IN')}</Text> Overtime Payout</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <View style={styles.headerBackground} />

      {/* Header & Month Selector */}
      <View style={styles.topSection}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Payroll Dashboard</Text>
        </View>
        
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
            <ChevronRight size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Chart Dashboard Card */}
        <View style={styles.chartCard}>
          <View style={styles.chartTitleRow}>
             <PieChart size={20} color="#64748B" />
             <Text style={styles.chartTitle}>Company Monthly Summary</Text>
          </View>

          {loading ? (
             <View style={{height: 150, justifyContent:'center', alignItems:'center'}}>
                <ActivityIndicator size="large" color="#2563EB" />
             </View>
          ) : records.length === 0 ? (
             <View style={{height: 150, justifyContent:'center', alignItems:'center'}}>
                <Text style={{color: '#94A3B8'}}>No data to chart</Text>
             </View>
          ) : (
            <View style={styles.chartWrapper}>
              {/* Pure JS Bar Chart */}
              <View style={styles.barChartContainer}>
                 {/* Gross Bar */}
                 <View style={styles.barCol}>
                    <Text style={styles.barValue}>₹{(totals.gross/1000).toFixed(1)}k</Text>
                    <View style={styles.barTrack}>
                       <View style={[styles.barFill, { height: `${(totals.gross / maxChartVal) * 100}%`, backgroundColor: '#94A3B8' }]} />
                    </View>
                    <Text style={styles.barLabel}>Gross</Text>
                 </View>

                 {/* Net Bar */}
                 <View style={styles.barCol}>
                    <Text style={styles.barValue}>₹{(totals.net/1000).toFixed(1)}k</Text>
                    <View style={styles.barTrack}>
                       <View style={[styles.barFill, { height: `${(totals.net / maxChartVal) * 100}%`, backgroundColor: '#10B981' }]} />
                    </View>
                    <Text style={styles.barLabel}>Net Pay</Text>
                 </View>

                 {/* Deductions Bar */}
                 <View style={styles.barCol}>
                    <Text style={styles.barValue}>₹{(totals.ded/1000).toFixed(1)}k</Text>
                    <View style={styles.barTrack}>
                       <View style={[styles.barFill, { height: `${(totals.ded / maxChartVal) * 100}%`, backgroundColor: '#EF4444' }]} />
                    </View>
                    <Text style={styles.barLabel}>Dedct</Text>
                 </View>
              </View>
              
              {/* Quick Summary Row */}
              <View style={styles.summaryRow}>
                 <View style={styles.sumBox}>
                    <TrendingUp size={16} color="#10B981" />
                    <Text style={styles.sumTitle}>Total Disbursed</Text>
                    <Text style={[styles.sumAmount, {color: '#10B981'}]}>₹ {Math.round(totals.net).toLocaleString('en-IN')}</Text>
                 </View>
                 <View style={styles.sumBoxDivider} />
                 <View style={styles.sumBox}>
                    <TrendingDown size={16} color="#EF4444" />
                    <Text style={styles.sumTitle}>Total Deductions</Text>
                    <Text style={[styles.sumAmount, {color: '#EF4444'}]}>₹ {Math.round(totals.ded).toLocaleString('en-IN')}</Text>
                 </View>
              </View>
            </View>
          )}
        </View>

        {/* Payslips List */}
        <Text style={styles.sectionTitle}>Employee Payslips ({records.length})</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{marginTop: 20}} />
        ) : records.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Calculator size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No payroll records found for this month.</Text>
          </View>
        ) : (
          records.map((item, index) => renderItem({item, key: index}))
        )}
        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 260,
    backgroundColor: '#2563EB', borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  topSection: { paddingTop: 60, paddingHorizontal: 20 },
  headerTitleRow: { marginBottom: 16, alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  
  monthSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 8, marginBottom: 20
  },
  navBtn: { padding: 8 },
  monthText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
  
  chartCard: { 
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 30,
    shadowColor: '#64748B', shadowOpacity: 0.1, shadowRadius: 24, shadowOffset:{width:0, height:10}, elevation: 5
  },
  chartTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#475569', marginLeft: 8 },
  chartWrapper: { alignItems: 'center', width: '100%' },
  
  barChartContainer: { flexDirection: 'row', height: 160, width: '100%', justifyContent: 'space-around', alignItems: 'flex-end', paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  barCol: { alignItems: 'center', width: 60 },
  barTrack: { width: 30, height: 100, backgroundColor: '#F1F5F9', borderRadius: 6, justifyContent: 'flex-end', marginVertical: 8, overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 6 },
  barValue: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  barLabel: { fontSize: 13, fontWeight: '800', color: '#334155' },
  
  summaryRow: { flexDirection: 'row', width: '100%', paddingTop: 20 },
  sumBox: { flex: 1, alignItems: 'center' },
  sumBoxDivider: { width: 1, backgroundColor: '#F1F5F9' },
  sumTitle: { fontSize: 12, color: '#64748B', fontWeight: '700', marginTop: 8, marginBottom: 4 },
  sumAmount: { fontSize: 18, fontWeight: '800' },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16, marginLeft: 4 },
  
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#64748B', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width:0, height:4}, elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  empName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgePaid: { backgroundColor: '#D1FAE5' },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 12, fontWeight: '800' },
  badgeTextPaid: { color: '#059669' },
  badgeTextPending: { color: '#D97706' },
  
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  metricItem: { flex: 1, alignItems: 'center' },
  metricLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '700', marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: '800', color: '#334155' },
  
  otContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFBEB', paddingVertical: 10, borderRadius: 12, marginTop: 16 },
  otText: { fontSize: 13, color: '#B45309', fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', marginTop: 40, backgroundColor: '#FFFFFF', padding: 40, borderRadius: 24 },
  emptyText: { color: '#94A3B8', marginTop: 16, fontSize: 15, fontWeight: '600' }
});
