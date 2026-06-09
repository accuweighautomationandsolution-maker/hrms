import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { LogOut, CheckCircle, Clock } from 'lucide-react-native';

export default function ExitManagementScreen() {
  const exits = [
    { id: 1, name: 'Alice Smith', role: 'Frontend Engineer', lwd: '30 Jun 2024', status: 'Notice Period' },
    { id: 2, name: 'Bob Jones', role: 'Sales Exec', lwd: '15 May 2024', status: 'FnF Pending' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#EF4444" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Exit Management</Text>
          <Text style={styles.headerSubtitle}>Process resignations & FnF settlements</Text>
        </View>

        <View style={styles.list}>
          {exits.map(e => (
            <View key={e.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconBox}>
                  <LogOut size={20} color="#EF4444" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>{e.name}</Text>
                  <Text style={styles.cardSub}>{e.role}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{e.status}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.metaText}>Last Working Day: {e.lwd}</Text>
                <TouchableOpacity style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>Process</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, backgroundColor: '#EF4444', borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  scrollContent: { paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#FEE2E2', fontWeight: '500', marginTop: 4 },
  
  list: { paddingHorizontal: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#EF4444', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset:{width:0, height:2}, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  cardSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F1F5F9' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { fontSize: 13, color: '#1E293B', fontWeight: '600' },
  actionBtn: { backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
