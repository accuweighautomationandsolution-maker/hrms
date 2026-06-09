import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ProgressBarAndroid } from 'react-native';
import { BookOpen, Award, PlayCircle } from 'lucide-react-native';

export default function GrowthTrainingScreen() {
  const courses = [
    { id: 1, title: 'Leadership Fundamentals', status: 'In Progress', progress: 65 },
    { id: 2, title: 'Information Security 2024', status: 'Not Started', progress: 0 },
    { id: 3, title: 'Code of Conduct Refresher', status: 'Completed', progress: 100 },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#10B981" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Growth & Training</Text>
          <Text style={styles.headerSubtitle}>Skill development and required courses</Text>
        </View>

        <Text style={styles.sectionTitle}>My Learning Path</Text>

        {courses.map(c => (
          <View key={c.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}>
                <BookOpen size={24} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardSub}>{c.status}</Text>
              </View>
              {c.progress === 100 ? (
                <Award size={28} color="#F59E0B" />
              ) : (
                <TouchableOpacity>
                  <PlayCircle size={32} color="#10B981" />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${c.progress}%`, backgroundColor: c.progress === 100 ? '#10B981' : '#3B82F6' }]} />
            </View>
            <Text style={styles.progressText}>{c.progress}% Completed</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, backgroundColor: '#10B981', borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  scrollContent: { paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#D1FAE5', fontWeight: '500', marginTop: 4 },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16, marginLeft: 24 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginHorizontal: 20, marginBottom: 16, shadowColor: '#10B981', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset:{width:0, height:4}, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  cardSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  
  progressContainer: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#64748B', textAlign: 'right', fontWeight: '600' }
});
