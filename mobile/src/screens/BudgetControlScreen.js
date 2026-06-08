import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, StatusBar
} from 'react-native';
import { Building2, TrendingUp, AlertTriangle, TrendingDown } from 'lucide-react-native';
import { dataService } from '../utils/dataService';

const formatCurrency = (i) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(i);

export default function BudgetControlScreen() {
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState({ totalBudget: 0, totalUtilized: 0, overBudget: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const budgetData = await dataService.getDeptBudgets();
      
      let totalBudget = 0;
      let totalUtilized = 0;
      let overBudget = 0;

      const enriched = await Promise.all(budgetData.map(async b => {
        const utilized = await dataService.getBudgetUtilization(b.department);
        const percentage = b.totalBudget > 0 ? (utilized / b.totalBudget) * 100 : 0;
        
        totalBudget += b.totalBudget;
        totalUtilized += utilized;
        if (percentage > 100 + Number(b.buffer)) {
          overBudget++;
        }

        return {
          ...b,
          utilized,
          available: Math.max(0, b.totalBudget - utilized),
          percentage: percentage.toFixed(1),
          status: percentage <= 70 ? 'green' : percentage <= 90 ? 'yellow' : 'red'
        };
      }));

      setBudgets(enriched);
      setSummary({ totalBudget, totalUtilized, overBudget });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && budgets.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0EA5E9" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Budget Control</Text>
          <Text style={styles.headerSubtitle}>Departmental limits & headcount tracking</Text>
        </View>

        {/* Global Summary Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          <View style={styles.statCard}>
            <View style={styles.statIconBox}><Building2 size={24} color="#0EA5E9" /></View>
            <Text style={styles.statLabel}>Global Budget</Text>
            <Text style={styles.statValue}>{formatCurrency(summary.totalBudget)}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}><TrendingUp size={24} color="#D97706" /></View>
            <Text style={styles.statLabel}>Live Utilization</Text>
            <Text style={[styles.statValue, { color: '#D97706' }]}>{formatCurrency(summary.totalUtilized)}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: summary.overBudget > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
              {summary.overBudget > 0 ? <AlertTriangle size={24} color="#DC2626" /> : <TrendingDown size={24} color="#16A34A" />}
            </View>
            <Text style={styles.statLabel}>Over-Budget</Text>
            <Text style={[styles.statValue, { color: summary.overBudget > 0 ? '#DC2626' : '#16A34A' }]}>{summary.overBudget} Depts</Text>
          </View>
        </ScrollView>

        <Text style={styles.sectionTitle}>Envelope Matrix</Text>

        {budgets.map((dept, idx) => {
          const isDanger = dept.status === 'red';
          const isWarning = dept.status === 'yellow';
          const barColor = isDanger ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981';
          const maxPerc = Math.min(Number(dept.percentage), 100);

          return (
            <View key={dept.id || idx} style={styles.deptCard}>
              <View style={styles.deptHeader}>
                <Text style={styles.deptName}>{dept.department}</Text>
                <View style={[styles.badge, { backgroundColor: barColor + '20' }]}>
                  <Text style={[styles.badgeText, { color: barColor }]}>{dept.percentage}% Burn</Text>
                </View>
              </View>

              <View style={styles.deptMetaRow}>
                <View>
                  <Text style={styles.metaLabel}>Allocated Limit</Text>
                  <Text style={styles.metaValue}>{formatCurrency(dept.totalBudget)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.metaLabel}>Used Volume</Text>
                  <Text style={[styles.metaValue, { color: '#475569' }]}>{formatCurrency(dept.utilized)}</Text>
                </View>
              </View>

              <View style={styles.progressBg}>
                <View style={[styles.progressBar, { width: `${maxPerc}%`, backgroundColor: barColor }]} />
              </View>
              
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>{dept.type} ({dept.year})</Text>
                <Text style={styles.footerText}>Buffer: +{dept.buffer}%</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 200,
    backgroundColor: '#0EA5E9', borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  scrollContent: { padding: 20, paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#E0F2FE', fontWeight: '500', marginTop: 4 },
  
  statsScroll: { overflow: 'visible', marginBottom: 24, paddingBottom: 10 },
  statCard: { width: 150, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, marginRight: 16, shadowColor: '#0EA5E9', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: {width:0, height:4}, elevation: 4 },
  statIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 12, marginLeft: 4 },

  deptCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, marginBottom: 16, shadowColor: '#64748B', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset:{width:0, height:4}, elevation: 2 },
  deptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  deptName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  
  deptMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  metaLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 2 },
  metaValue: { fontSize: 15, fontWeight: '700', color: '#1E293B' },

  progressBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  progressBar: { height: '100%', borderRadius: 4 },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  footerText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
});
