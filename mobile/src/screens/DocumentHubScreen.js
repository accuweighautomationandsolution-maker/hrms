import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, StatusBar 
} from 'react-native';
import { FileText, Folder, Download, Search, ShieldAlert, ChevronRight } from 'lucide-react-native';
import { dataService } from '../utils/dataService';

export default function DocumentHubScreen() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      // Mock data representing company policies and templates
      const mockDocs = [
        { id: 1, title: 'Employee Handbook 2024', category: 'Policies', size: '2.4 MB', type: 'PDF', isSecure: false },
        { id: 2, title: 'Travel & Expense Policy', category: 'Policies', size: '1.1 MB', type: 'PDF', isSecure: false },
        { id: 3, title: 'Offer Letter Template', category: 'Templates', size: '45 KB', type: 'DOCX', isSecure: true },
        { id: 4, title: 'NDA Template - Standard', category: 'Templates', size: '50 KB', type: 'DOCX', isSecure: true },
        { id: 5, title: 'Q3 Financial Disclosures', category: 'Confidential', size: '4.2 MB', type: 'PDF', isSecure: true },
        { id: 6, title: 'Code of Conduct', category: 'Policies', size: '1.8 MB', type: 'PDF', isSecure: false },
      ];
      setDocuments(mockDocs);
      const cats = ['All', ...new Set(mockDocs.map(d => d.category))];
      setCategories(cats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = activeCategory === 'All' 
    ? documents 
    : documents.filter(d => d.category === activeCategory);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Document Hub</Text>
          <Text style={styles.headerSubtitle}>Company policies, templates & files</Text>
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {categories.map(c => (
            <TouchableOpacity 
              key={c} 
              style={[styles.catPill, activeCategory === c && styles.catPillActive]}
              onPress={() => setActiveCategory(c)}
            >
              <Text style={[styles.catText, activeCategory === c && styles.catTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Recent Files</Text>

        <View style={styles.grid}>
          {filteredDocs.map(doc => (
            <TouchableOpacity key={doc.id} style={styles.docCard}>
              <View style={styles.docIconBox}>
                {doc.type === 'PDF' ? <FileText size={24} color="#EF4444" /> : <FileText size={24} color="#2563EB" />}
              </View>
              <View style={styles.docContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  {doc.isSecure && <ShieldAlert size={12} color="#D97706" style={{ marginRight: 4 }} />}
                  <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
                </View>
                <Text style={styles.docMeta}>{doc.category} • {doc.size}</Text>
              </View>
              <TouchableOpacity style={styles.downloadBtn}>
                <Download size={18} color="#64748B" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
    backgroundColor: '#3B82F6', borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  scrollContent: { paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#DBEAFE', fontWeight: '500', marginTop: 4 },
  
  catScroll: { paddingHorizontal: 20, marginBottom: 24, paddingBottom: 5 },
  catPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  catPillActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  catText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  catTextActive: { color: '#FFFFFF' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16, marginLeft: 24 },

  grid: { paddingHorizontal: 20 },
  docCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#64748B', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset:{width:0, height:2}, elevation: 2 },
  docIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  docContent: { flex: 1 },
  docTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  docMeta: { fontSize: 12, color: '#64748B' },
  downloadBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }
});
