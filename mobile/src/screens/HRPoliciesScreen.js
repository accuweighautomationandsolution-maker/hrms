import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { Book, ChevronRight } from 'lucide-react-native';

export default function HRPoliciesScreen() {
  const policies = [
    { id: 1, title: 'Leave & Attendance Policy', updated: 'Jan 2024' },
    { id: 2, title: 'Travel & Expense Policy', updated: 'Feb 2024' },
    { id: 3, title: 'Remote Work Guidelines', updated: 'Mar 2024' },
    { id: 4, title: 'Employee Benefits Handbook', updated: 'Jan 2024' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>HR Policies</Text>
          <Text style={styles.headerSubtitle}>Read company guidelines and rules</Text>
        </View>

        <View style={styles.list}>
          {policies.map(p => (
            <TouchableOpacity key={p.id} style={styles.card}>
              <View style={styles.iconBox}>
                <Book size={24} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle}>{p.title}</Text>
                <Text style={styles.cardSub}>Updated: {p.updated}</Text>
              </View>
              <ChevronRight size={20} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, backgroundColor: '#8B5CF6', borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  scrollContent: { paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#EDE9FE', fontWeight: '500', marginTop: 4 },
  
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#64748B', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset:{width:0, height:2}, elevation: 2 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  cardSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
});
