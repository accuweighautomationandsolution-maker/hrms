import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Alert, StatusBar
} from 'react-native';
import { ChevronLeft, ChevronRight, Clock, MapPin, Calendar as CalendarIcon, CheckCircle2, XCircle } from 'lucide-react-native';
import { authService } from '../utils/authService';
import { dataService } from '../utils/dataService';

export default function AttendanceHistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [empId, setEmpId] = useState(null);

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
      setEmpId(emp.id);

      const records = await dataService.getAttendanceForEmployee(emp.id);
      setAttendanceData(records || {});
      
      // Auto-select today
      const todayStr = new Date().toISOString().split('T')[0];
      setSelectedDate(todayStr);

    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load attendance history.');
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const days = Array(firstDay).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => i + 1));
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDayRecord = (dateStr) => {
    if (!empId) return null;
    return attendanceData[`${empId}_${dateStr}`];
  };

  const getDayStatusColor = (record) => {
    if (!record) return '#F1F5F9'; // Empty/No data
    if (record.status === 'Present') return '#10B981'; // Green
    if (record.status === 'Absent') return '#EF4444'; // Red
    if (record.status === 'Incomplete' || record.status === 'Half Day' || record.status === 'Late') return '#F59E0B'; // Yellow
    return '#3B82F6'; // Blue fallback
  };

  const getDayStatusTextColor = (record) => {
    if (!record) return '#64748B'; // Gray text
    return '#FFFFFF'; // White text on colored background
  };

  const selectedRecord = selectedDate ? getDayRecord(selectedDate) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Attendance History</Text>
          <Text style={styles.headerSubtitle}>Track your daily punches</Text>
        </View>

        {/* Calendar Card */}
        <View style={styles.card}>
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
          
          {loading ? (
             <View style={{height: 200, justifyContent:'center', alignItems:'center'}}>
               <ActivityIndicator size="large" color="#2563EB" />
             </View>
          ) : (
            <View style={styles.calGrid}>
              {days.map((d, i) => {
                if (!d) return <View key={`empty-${i}`} style={styles.calCell} />;
                
                const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isSelected = dateStr === selectedDate;
                const record = getDayRecord(dateStr);
                const bgColor = getDayStatusColor(record);
                const txtColor = getDayStatusTextColor(record);
                
                return (
                  <TouchableOpacity 
                    key={i} 
                    style={[
                      styles.calCell, 
                      { backgroundColor: bgColor },
                      isSelected && styles.calCellSelected
                    ]}
                    onPress={() => setSelectedDate(dateStr)}
                  >
                    <Text style={[
                      styles.calCellText, 
                      { color: txtColor },
                      isSelected && styles.calCellTextSelected
                    ]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#10B981'}]}/><Text style={styles.legendText}>Present</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#F59E0B'}]}/><Text style={styles.legendText}>Incomplete</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#EF4444'}]}/><Text style={styles.legendText}>Absent</Text></View>
          </View>
        </View>

        {/* Selected Date Details */}
        {selectedDate && (
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <CalendarIcon size={20} color="#2563EB" />
              <Text style={styles.detailsDateText}>
                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            
            <View style={styles.divider} />

            {selectedRecord ? (
              <View>
                <View style={styles.statusRow}>
                   {selectedRecord.status === 'Present' ? <CheckCircle2 size={24} color="#10B981" /> : (selectedRecord.status === 'Absent' ? <XCircle size={24} color="#EF4444" /> : <Clock size={24} color="#F59E0B" />)}
                   <Text style={[styles.statusBigText, { color: getDayStatusColor(selectedRecord) }]}>{selectedRecord.status}</Text>
                </View>
                
                <View style={styles.punchContainer}>
                  <View style={styles.punchBox}>
                    <Text style={styles.punchLabel}>PUNCH IN</Text>
                    <Text style={styles.punchTime}>{selectedRecord.punchIn || '--:--'}</Text>
                  </View>
                  <View style={styles.punchDivider} />
                  <View style={styles.punchBox}>
                    <Text style={styles.punchLabel}>PUNCH OUT</Text>
                    <Text style={styles.punchTime}>{selectedRecord.punchOut || '--:--'}</Text>
                  </View>
                </View>

                {!!selectedRecord.remark && (
                  <View style={styles.remarkBox}>
                    <Text style={styles.remarkLabel}>REMARK</Text>
                    <Text style={styles.remarkText}>{selectedRecord.remark}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noDataBox}>
                <Clock size={32} color="#CBD5E1" style={{ marginBottom: 10 }} />
                <Text style={styles.noDataText}>No attendance recorded for this date.</Text>
              </View>
            )}
          </View>
        )}
        <View style={{height: 30}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 220,
    backgroundColor: '#2563EB', borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  scrollContent: { padding: 20, paddingTop: 50 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#BFDBFE', fontWeight: '500', marginTop: 4 },
  
  card: { 
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 20,
    shadowColor: '#64748B', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset:{width:0, height:8}, elevation: 5
  },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calNavBtn: { padding: 10, backgroundColor: '#F1F5F9', borderRadius: 12 },
  calMonthName: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  calDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  calDayName: { width: 38, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  calCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 2, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  calCellSelected: { borderColor: '#1E293B', transform: [{scale: 1.05}] },
  calCellText: { fontSize: 15, fontWeight: '700' },
  calCellTextSelected: { fontWeight: '900' },
  
  legendContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  detailsCard: { 
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, 
    shadowColor: '#64748B', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset:{width:0, height:6}, elevation: 4
  },
  detailsHeader: { flexDirection: 'row', alignItems: 'center' },
  detailsDateText: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginLeft: 10 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statusBigText: { fontSize: 22, fontWeight: '800', marginLeft: 10 },
  
  punchContainer: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 16, paddingVertical: 16 },
  punchBox: { flex: 1, alignItems: 'center' },
  punchLabel: { fontSize: 12, color: '#64748B', fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  punchTime: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  punchDivider: { width: 1, height: '70%', backgroundColor: '#E2E8F0', alignSelf: 'center' },
  
  remarkBox: { marginTop: 20, backgroundColor: '#FFFBEB', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  remarkLabel: { fontSize: 11, color: '#D97706', fontWeight: '800', marginBottom: 4 },
  remarkText: { fontSize: 14, color: '#92400E', fontWeight: '500', fontStyle: 'italic' },
  
  noDataBox: { alignItems: 'center', paddingVertical: 20 },
  noDataText: { color: '#94A3B8', fontSize: 15, fontWeight: '500' }
});
