import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar 
} from 'react-native';
import { Calculator, DollarSign, Send, ArrowRight } from 'lucide-react-native';

const formatCurrency = (i) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(i);

export default function CompensationOffersScreen() {
  const [baseCTC, setBaseCTC] = useState('1200000');
  
  const calculateBreakdown = () => {
    const ctc = Number(baseCTC) || 0;
    const basic = ctc * 0.40;
    const hra = basic * 0.50;
    const pf = basic * 0.12;
    const specialAllowance = ctc - (basic + hra + pf);
    
    return { basic, hra, pf, specialAllowance, ctc };
  };

  const breakdown = calculateBreakdown();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#EC4899" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Compensation & Offers</Text>
          <Text style={styles.headerSubtitle}>CTC Structuring & Offer Rollouts</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}><Calculator size={20} color="#FFFFFF" /></View>
            <Text style={styles.cardTitle}>CTC Calculator</Text>
          </View>

          <Text style={styles.label}>Proposed Annual CTC (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={baseCTC}
            onChangeText={setBaseCTC}
          />

          <View style={styles.breakdownBox}>
            <Text style={styles.breakdownTitle}>Salary Structure Breakup</Text>
            
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Basic Salary (40%)</Text>
              <Text style={styles.rowValue}>{formatCurrency(breakdown.basic)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>HRA (50% of Basic)</Text>
              <Text style={styles.rowValue}>{formatCurrency(breakdown.hra)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Special Allowance</Text>
              <Text style={styles.rowValue}>{formatCurrency(breakdown.specialAllowance)}</Text>
            </View>
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <Text style={styles.rowLabel}>PF Employer (12% of Basic)</Text>
              <Text style={styles.rowValue}>{formatCurrency(breakdown.pf)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total CTC</Text>
              <Text style={styles.totalValue}>{formatCurrency(breakdown.ctc)}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.submitBtn}>
            <Send size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.submitBtnText}>Generate & Send Offer</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recent Offers Drafted</Text>
        {[1, 2].map(i => (
          <View key={i} style={styles.draftCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.draftName}>Candidate {i}</Text>
              <Text style={styles.draftMeta}>Software Engineer • {formatCurrency(1200000)}</Text>
            </View>
            <View style={styles.draftBadge}>
              <Text style={styles.draftBadgeText}>Draft</Text>
            </View>
          </View>
        ))}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 180,
    backgroundColor: '#EC4899', borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  scrollContent: { paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#FCE7F3', fontWeight: '500', marginTop: 4 },
  
  card: { marginHorizontal: 20, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 24, shadowColor: '#EC4899', shadowOpacity: 0.1, shadowRadius: 15, shadowOffset:{width:0, height:6}, elevation: 5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 16 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EC4899', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  
  label: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 20 },

  breakdownBox: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  breakdownTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  rowLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  rowValue: { fontSize: 14, color: '#1E293B', fontWeight: '700' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 2, borderTopColor: '#EC4899', borderStyle: 'dashed' },
  totalLabel: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#EC4899' },

  submitBtn: { flexDirection: 'row', backgroundColor: '#EC4899', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16, marginLeft: 24 },

  draftCard: { marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  draftName: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  draftMeta: { fontSize: 13, color: '#64748B' },
  draftBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  draftBadgeText: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' },
});
