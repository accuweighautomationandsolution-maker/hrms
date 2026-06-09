import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { ShieldCheck, AlertTriangle, FileCheck } from 'lucide-react-native';

export default function ComplianceHubScreen() {
  const items = [
    { id: 1, title: 'POSH Declaration 2024', status: 'Pending Signature', urgent: true },
    { id: 2, title: 'Data Privacy Consent', status: 'Completed', urgent: false },
    { id: 3, title: 'IT Asset Policy', status: 'Completed', urgent: false },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Compliance Hub</Text>
          <Text style={styles.headerSubtitle}>Mandatory declarations & policies</Text>
        </View>

        <View style={styles.alertCard}>
          <AlertTriangle size={24} color="#DC2626" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.alertTitle}>Action Required</Text>
            <Text style={styles.alertDesc}>You have 1 pending compliance document that needs your signature by Friday.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>My Documents</Text>

        {items.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={styles.iconBox}>
              <ShieldCheck size={24} color={item.urgent ? "#DC2626" : "#16A34A"} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSub}>{item.status}</Text>
            </View>
            {item.urgent ? (
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Sign Now</Text>
              </TouchableOpacity>
            ) : (
              <FileCheck size={24} color="#16A34A" />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, backgroundColor: '#DC2626', borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  scrollContent: { paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#FEE2E2', fontWeight: '500', marginTop: 4 },
  
  alertCard: { flexDirection: 'row', backgroundColor: '#FEF2F2', padding: 16, marginHorizontal: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#FECACA' },
  alertTitle: { fontSize: 16, fontWeight: '800', color: '#991B1B', marginBottom: 4 },
  alertDesc: { fontSize: 13, color: '#B91C1C', lineHeight: 18 },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16, marginLeft: 24 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginHorizontal: 20, marginBottom: 12, shadowColor: '#64748B', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset:{width:0, height:2}, elevation: 2 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  cardSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  
  actionBtn: { backgroundColor: '#DC2626', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
