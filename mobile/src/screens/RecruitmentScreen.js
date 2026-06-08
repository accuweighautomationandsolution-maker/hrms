import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, StatusBar, TextInput, Alert
} from 'react-native';
import { Search, Mail, UserPlus, CheckCircle, XCircle, FileText, ArrowRight } from 'lucide-react-native';
import { dataService } from '../utils/dataService';

export default function RecruitmentScreen() {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const data = await dataService.getCandidates();
      setCandidates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const name = (c.name || '').toLowerCase();
      const roleStr = (c.role || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      const matchesSearch = name.includes(term) || roleStr.includes(term);
      const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [candidates, searchTerm, filterStatus]);

  const updateStatus = async (id, newStatus) => {
    const updated = candidates.map(c => {
      if (c.id === id) return { ...c, status: newStatus };
      return c;
    });
    setCandidates(updated);
    await dataService.saveCandidates(updated);
  };

  const onboardCandidate = (candidate) => {
    Alert.alert('Onboarding', `Redirecting ${candidate.name} to Employee Directory (Mock)`);
    updateStatus(candidate.id, 'Joined');
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Applied': return { bg: '#FEF3C7', text: '#D97706' };
      case 'Selected': return { bg: '#DBEAFE', text: '#2563EB' };
      case 'Offer Sent': return { bg: '#E0E7FF', text: '#4F46E5' };
      case 'Offer Accepted': return { bg: '#DCFCE7', text: '#16A34A' };
      case 'Joined': return { bg: '#DCFCE7', text: '#16A34A' };
      case 'Rejected': return { bg: '#FEE2E2', text: '#DC2626' };
      default: return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  if (loading && candidates.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#14B8A6" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} stickyHeaderIndices={[2]}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Recruitment Pipeline</Text>
          <Text style={styles.headerSubtitle}>Manage candidates & applicant tracking</Text>
        </View>

        {/* Quick Stats */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#14B8A6' }]}>{candidates.length}</Text>
            <Text style={styles.statLabel}>Total Pipeline</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#D97706' }]}>{candidates.filter(c => c.status === 'Applied').length}</Text>
            <Text style={styles.statLabel}>New Applicants</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{candidates.filter(c => c.status === 'Joined').length}</Text>
            <Text style={styles.statLabel}>Onboarded</Text>
          </View>
        </ScrollView>

        {/* Sticky Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.searchBox}>
            <Search size={18} color="#94A3B8" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search candidate or role..."
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
            {['All', 'Applied', 'Selected', 'Offer Sent', 'Joined', 'Rejected'].map(s => (
              <TouchableOpacity 
                key={s} 
                style={[styles.filterPill, filterStatus === s && styles.filterPillActive]}
                onPress={() => setFilterStatus(s)}
              >
                <Text style={[styles.filterPillText, filterStatus === s && styles.filterPillTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Candidate List */}
        <View style={styles.listContainer}>
          {filteredCandidates.map(c => {
            const colors = getStatusColor(c.status);
            return (
              <View key={c.id} style={styles.candidateCard}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.candidateName}>{c.name}</Text>
                    <View style={styles.emailRow}>
                      <Mail size={12} color="#64748B" />
                      <Text style={styles.candidateEmail}>{c.email}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.statusText, { color: colors.text }]}>{c.status}</Text>
                  </View>
                </View>

                <View style={styles.roleSection}>
                  <Text style={styles.roleTitle}>{c.role}</Text>
                  <Text style={styles.deptTitle}>{c.department}</Text>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  {c.status === 'Applied' && (
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#16A34A' }]} onPress={() => updateStatus(c.id, 'Selected')}>
                      <CheckCircle size={14} color="#16A34A" style={{marginRight: 6}} />
                      <Text style={[styles.actionBtnText, { color: '#16A34A' }]}>Select</Text>
                    </TouchableOpacity>
                  )}
                  
                  {(c.status === 'Selected' || c.status === 'Offer Sent') && (
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#2563EB', backgroundColor: '#EFF6FF' }]} onPress={() => Alert.alert('Offer', 'Generate Offer Letter from Desktop Hub.')}>
                      <FileText size={14} color="#2563EB" style={{marginRight: 6}} />
                      <Text style={[styles.actionBtnText, { color: '#2563EB' }]}>Issue Offer</Text>
                    </TouchableOpacity>
                  )}

                  {c.status === 'Offer Accepted' && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#16A34A', borderColor: '#16A34A' }]} onPress={() => onboardCandidate(c)}>
                      <UserPlus size={14} color="#FFFFFF" style={{marginRight: 6}} />
                      <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Onboard</Text>
                    </TouchableOpacity>
                  )}

                  {c.status !== 'Joined' && c.status !== 'Rejected' && (
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2', paddingHorizontal: 10 }]} onPress={() => updateStatus(c.id, 'Rejected')}>
                      <XCircle size={16} color="#DC2626" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
          {filteredCandidates.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No candidates match your search.</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 180,
    backgroundColor: '#14B8A6', borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  scrollContent: { paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#CCFBF1', fontWeight: '500', marginTop: 4 },
  
  statsScroll: { paddingHorizontal: 20, marginBottom: 20 },
  statCard: { width: 120, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, marginRight: 12, shadowColor: '#14B8A6', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: {width:0, height:4}, elevation: 4 },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' },

  filtersContainer: { backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingVertical: 10, zIndex: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 10 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1E293B' },
  
  statusScroll: { paddingBottom: 4 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  filterPillActive: { backgroundColor: '#14B8A6', borderColor: '#14B8A6' },
  filterPillText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterPillTextActive: { color: '#FFFFFF' },

  listContainer: { paddingHorizontal: 20, marginTop: 10 },
  candidateCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#64748B', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset:{width:0, height:2}, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  candidateName: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
  emailRow: { flexDirection: 'row', alignItems: 'center' },
  candidateEmail: { fontSize: 12, color: '#64748B', marginLeft: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  roleSection: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 16 },
  roleTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },
  deptTitle: { fontSize: 12, color: '#14B8A6', fontWeight: '600', marginTop: 2 },

  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, backgroundColor: '#FFFFFF' },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

  emptyBox: { padding: 30, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontWeight: '500' },
});
