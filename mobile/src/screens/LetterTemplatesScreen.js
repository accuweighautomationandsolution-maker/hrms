import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar 
} from 'react-native';
import { FileEdit, CheckCircle, Tag, Plus } from 'lucide-react-native';

export default function LetterTemplatesScreen() {
  const [templates] = useState([
    { id: 1, name: 'Standard Offer Letter', category: 'Recruitment', status: 'Active', vars: 12 },
    { id: 2, name: 'Promotion Letter', category: 'Internal', status: 'Active', vars: 8 },
    { id: 3, name: 'Warning Letter', category: 'Disciplinary', status: 'Draft', vars: 5 },
    { id: 4, name: 'Relieving Letter', category: 'Exit', status: 'Active', vars: 10 },
    { id: 5, name: 'Experience Certificate', category: 'Exit', status: 'Active', vars: 6 },
  ]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Letter Templates</Text>
          <Text style={styles.headerSubtitle}>Manage automated HR templates</Text>
        </View>

        <TouchableOpacity style={styles.createBtn}>
          <Plus size={20} color="#8B5CF6" />
          <Text style={styles.createBtnText}>Create New Template</Text>
        </TouchableOpacity>

        <View style={styles.list}>
          {templates.map(t => (
            <View key={t.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconBox}>
                  <FileEdit size={20} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>{t.name}</Text>
                  <Text style={styles.cardSub}>{t.category}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: t.status === 'Active' ? '#DCFCE7' : '#FEF3C7' }]}>
                  <Text style={[styles.badgeText, { color: t.status === 'Active' ? '#16A34A' : '#D97706' }]}>{t.status}</Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Tag size={14} color="#64748B" style={{marginRight: 4}} />
                  <Text style={styles.varsText}>{t.vars} Variables Configured</Text>
                </View>
                <TouchableOpacity style={styles.editBtn}>
                  <Text style={styles.editBtnText}>Edit</Text>
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
  headerBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
    backgroundColor: '#8B5CF6', borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  scrollContent: { paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#EDE9FE', fontWeight: '500', marginTop: 4 },
  
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, marginHorizontal: 20, borderRadius: 16, marginBottom: 24, justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: '#C4B5FD' },
  createBtnText: { color: '#8B5CF6', fontSize: 16, fontWeight: '700', marginLeft: 8 },

  list: { paddingHorizontal: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#8B5CF6', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset:{width:0, height:4}, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  cardSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  varsText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  editBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  editBtnText: { color: '#475569', fontSize: 13, fontWeight: '700' },
});
