import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar 
} from 'react-native';
import { MapPin, Clock, ArrowRight, Activity, Calendar } from 'lucide-react-native';

export default function MovementRequestsScreen() {
  const [requests] = useState([
    { id: 1, type: 'Client Visit', location: 'Downtown Hub', date: '2024-03-15', status: 'Approved', duration: '4 Hours' },
    { id: 2, type: 'Field Duty', location: 'Sector 42', date: '2024-03-12', status: 'Completed', duration: 'Full Day' },
    { id: 3, type: 'Training', location: 'HQ', date: '2024-03-20', status: 'Pending', duration: '2 Days' },
  ]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return { bg: '#DCFCE7', text: '#16A34A' };
      case 'Completed': return { bg: '#E0F2FE', text: '#0284C7' };
      case 'Pending': return { bg: '#FEF3C7', text: '#D97706' };
      default: return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0284C7" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Movement Requests</Text>
          <Text style={styles.headerSubtitle}>Track outdoor & field duties</Text>
        </View>

        <TouchableOpacity style={styles.createBtn}>
          <MapPin size={20} color="#0284C7" />
          <Text style={styles.createBtnText}>Log New Movement</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Recent Logs</Text>
        <View style={styles.list}>
          {requests.map(r => {
            const colors = getStatusColor(r.status);
            return (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.iconBox}>
                    <Activity size={20} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardTitle}>{r.type}</Text>
                    <Text style={styles.cardSub}>{r.location}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.badgeText, { color: colors.text }]}>{r.status}</Text>
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <View style={styles.metaRow}>
                    <Calendar size={14} color="#64748B" style={{marginRight: 6}} />
                    <Text style={styles.metaText}>{r.date}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Clock size={14} color="#64748B" style={{marginRight: 6}} />
                    <Text style={styles.metaText}>{r.duration}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
    backgroundColor: '#0284C7', borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  scrollContent: { paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#E0F2FE', fontWeight: '500', marginTop: 4 },
  
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, marginHorizontal: 20, borderRadius: 16, marginBottom: 24, justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: '#BAE6FD' },
  createBtnText: { color: '#0284C7', fontSize: 16, fontWeight: '700', marginLeft: 8 },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16, marginLeft: 24 },

  list: { paddingHorizontal: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#0284C7', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset:{width:0, height:4}, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  cardSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

  cardBottom: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 13, color: '#64748B', fontWeight: '600' }
});
