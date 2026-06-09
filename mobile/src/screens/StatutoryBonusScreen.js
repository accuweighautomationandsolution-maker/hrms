import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { Gift, CheckCircle } from 'lucide-react-native';

export default function StatutoryBonusScreen() {
  const bonuses = [
    { id: 1, type: 'Annual Diwali Bonus', period: 'FY 2023-24', status: 'Processed' },
    { id: 2, type: 'Performance Bonus', period: 'Q4 2024', status: 'Pending Approval' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F59E0B" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Statutory Bonus</Text>
          <Text style={styles.headerSubtitle}>Manage annual bonus disbursements</Text>
        </View>

        <View style={styles.list}>
          {bonuses.map(b => (
            <View key={b.id} style={styles.card}>
              <View style={styles.iconBox}>
                <Gift size={24} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle}>{b.type}</Text>
                <Text style={styles.cardSub}>{b.period}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{b.status}</Text>
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
  headerBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, backgroundColor: '#F59E0B', borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  scrollContent: { paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#FEF3C7', fontWeight: '500', marginTop: 4 },
  
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#F59E0B', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset:{width:0, height:2}, elevation: 2 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFFBEB', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  cardSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F1F5F9' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },
});
