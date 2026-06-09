import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { FileText, Download, Calendar, BarChart2 } from 'lucide-react-native';

export default function AttendanceReportsScreen() {
  const reports = [
    { id: 1, name: 'Monthly Muster Roll - May 2024', type: 'PDF', generated: '01 Jun 2024' },
    { id: 2, name: 'Late Coming Analysis - Q1', type: 'XLSX', generated: '15 Apr 2024' },
    { id: 3, name: 'Overtime Summary', type: 'PDF', generated: '10 Jun 2024' }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Attendance Reports</Text>
          <Text style={styles.headerSubtitle}>Download & view attendance analytics</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <BarChart2 size={24} color="#4F46E5" />
            <Text style={styles.statValue}>94%</Text>
            <Text style={styles.statLabel}>Avg Present</Text>
          </View>
          <View style={styles.statCard}>
            <Calendar size={24} color="#4F46E5" />
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Available Reports</Text>

        {reports.map(r => (
          <View key={r.id} style={styles.card}>
            <View style={styles.iconBox}>
              <FileText size={24} color="#4F46E5" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{r.name}</Text>
              <Text style={styles.cardSub}>Generated: {r.generated} • {r.type}</Text>
            </View>
            <TouchableOpacity style={styles.downloadBtn}>
              <Download size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, backgroundColor: '#4F46E5', borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  scrollContent: { paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#E0E7FF', fontWeight: '500', marginTop: 4 },
  
  statsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 24, gap: 16 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, alignItems: 'center', shadowColor: '#4F46E5', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: {width:0, height:4}, elevation: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1E293B', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16, marginLeft: 24 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginHorizontal: 20, marginBottom: 12, shadowColor: '#64748B', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset:{width:0, height:2}, elevation: 2 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  cardSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  downloadBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
});
