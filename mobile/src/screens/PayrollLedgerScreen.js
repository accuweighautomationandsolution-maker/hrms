import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.empName}>{item.empName || `Emp ID: ${item.empId}`}</Text>
        <View style={[styles.badge, item.status === 'Paid' ? styles.badgePaid : styles.badgePending]}>
          <Text style={[styles.badgeText, item.status === 'Paid' ? styles.badgeTextPaid : styles.badgeTextPending]}>
            {item.status || 'Pending'}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Net Pay:</Text>
        <Text style={styles.value}>₹ {Math.round(item.netSalary || 0).toLocaleString('en-IN')}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Gross:</Text>
        <Text style={styles.value}>₹ {Math.round(item.grossSalary || 0).toLocaleString('en-IN')}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Deductions:</Text>
        <Text style={styles.value}>₹ {Math.round(item.totalDeductions || 0).toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={24} color="#4B5563" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calculator" size={16} color="#4B5563" />
              <Text style={styles.emptyText}>No payroll records found for this month.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  monthSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB'
  },
  navBtn: { padding: 8 },
  monthText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  empName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgePaid: { backgroundColor: '#D1FAE5' },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextPaid: { color: '#059669' },
  badgeTextPending: { color: '#D97706' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 14, color: '#6B7280' },
  value: { fontSize: 14, fontWeight: '600', color: '#374151' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#6B7280', marginTop: 16, fontSize: 16 }
});
