import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, StatusBar
} from 'react-native';
import { CalendarDays, Filter, Calendar } from 'lucide-react-native';
import { dataService } from '../utils/dataService';

const TYPE_COLORS = {
  'National': { bg: '#EFF6FF', border: '#2563EB', text: '#1D4ED8' },
  'State':    { bg: '#F5F3FF', border: '#8B5CF6', text: '#6D28D9' },
  'Festival': { bg: '#FEF3C7', border: '#F59E0B', text: '#B45309' },
  'Company':  { bg: '#DCFCE7', border: '#22C55E', text: '#15803D' },
  'Weekly':   { bg: '#F1F5F9', border: '#94A3B8', text: '#475569' },
};

export default function HolidayListScreen() {
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await dataService.getCustomHolidays();
      // Filter for current selected year
      const yearCustoms = data.filter(h => h.fromDate.startsWith(String(year)));
      
      yearCustoms.sort((a, b) => a.fromDate.localeCompare(b.fromDate));
      setHolidays(yearCustoms);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHolidays = filterType === 'All' 
    ? holidays 
    : holidays.filter(h => h.type === filterType);

  // Group by month
  const byMonth = {};
  filteredHolidays.forEach(h => {
    const mo = parseInt(h.fromDate.split('-')[1], 10) - 1;
    if (!byMonth[mo]) byMonth[mo] = [];
    byMonth[mo].push(h);
  });

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  if (loading && holidays.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
      <View style={styles.headerBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Holiday Calendar</Text>
          <Text style={styles.headerSubtitle}>Official company holidays for {year}</Text>
        </View>

        {/* Year Selector */}
        <View style={styles.yearSelector}>
          <TouchableOpacity onPress={() => setYear(y => y - 1)} style={styles.yearBtn}>
            <Text style={styles.yearBtnText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.yearText}>{year}</Text>
          <TouchableOpacity onPress={() => setYear(y => y + 1)} style={styles.yearBtn}>
            <Text style={styles.yearBtnText}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['All', 'National', 'State', 'Festival', 'Company'].map(f => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterBtn, filterType === f && styles.filterBtnActive]}
              onPress={() => setFilterType(f)}
            >
              <Text style={[styles.filterBtnText, filterType === f && styles.filterBtnTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Month-wise Holiday List */}
        {Object.keys(byMonth).length === 0 ? (
          <View style={styles.emptyCard}>
            <CalendarDays size={32} color="#CBD5E1" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No holidays found for this selection.</Text>
          </View>
        ) : (
          Object.keys(byMonth).sort((a,b)=>Number(a)-Number(b)).map((monthIndex) => (
            <View key={monthIndex} style={styles.monthSection}>
              <Text style={styles.monthTitle}>{MONTH_NAMES[monthIndex]} {year}</Text>
              
              {byMonth[monthIndex].map(h => {
                const tc = TYPE_COLORS[h.type] || TYPE_COLORS['Company'];
                
                // parse date
                const dateParts = h.fromDate.split('-');
                const dayNum = dateParts[2];
                const dateObj = new Date(h.fromDate);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                const isRange = h.fromDate !== h.toDate;

                return (
                  <View key={h.id} style={[styles.holidayCard, { backgroundColor: tc.bg, borderColor: tc.border }]}>
                    <View style={styles.dateBox}>
                      <Text style={[styles.dateNum, { color: tc.border }]}>
                        {isRange ? `${dayNum}-${h.toDate.split('-')[2]}` : dayNum}
                      </Text>
                      <Text style={styles.dateDay}>{isRange ? 'Range' : dayName}</Text>
                    </View>
                    
                    <View style={styles.holidayInfo}>
                      <Text style={styles.holidayName}>{h.name}</Text>
                      <View style={styles.badgesRow}>
                        <View style={[styles.badge, { backgroundColor: tc.border + '20' }]}>
                          <Text style={[styles.badgeText, { color: tc.text }]}>{h.type}</Text>
                        </View>
                        {h.compulsory ? (
                          <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                            <Text style={[styles.badgeText, { color: '#B91C1C' }]}>Compulsory</Text>
                          </View>
                        ) : (
                          <View style={[styles.badge, { backgroundColor: '#E2E8F0' }]}>
                            <Text style={[styles.badgeText, { color: '#475569' }]}>Optional</Text>
                          </View>
                        )}
                      </View>
                      {!!h.desc && <Text style={styles.holidayDesc}>{h.desc}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 200,
    backgroundColor: '#8B5CF6', borderBottomLeftRadius: 36, borderBottomRightRadius: 36, // Purple
  },
  scrollContent: { padding: 20, paddingTop: 40, paddingBottom: 100 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#DDD6FE', fontWeight: '500', marginTop: 4 },
  
  yearSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', padding: 8, borderRadius: 20, alignSelf: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: {width:0, height:4}, elevation: 4 },
  yearBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F1F5F9', borderRadius: 12 },
  yearBtnText: { color: '#64748B', fontWeight: '800' },
  yearText: { fontSize: 20, fontWeight: '800', color: '#1E293B', width: 80, textAlign: 'center' },

  filterScroll: { marginBottom: 24, paddingBottom: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFFFFF', marginRight: 8, shadowColor: '#64748B', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset:{width:0, height:2}, elevation: 1 },
  filterBtnActive: { backgroundColor: '#8B5CF6' },
  filterBtnText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  filterBtnTextActive: { color: '#FFFFFF' },

  monthSection: { marginBottom: 24 },
  monthTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 12, marginLeft: 4 },
  
  holidayCard: { flexDirection: 'row', padding: 12, borderRadius: 16, marginBottom: 10, borderWidth: 1, alignItems: 'center' },
  dateBox: { backgroundColor: '#FFFFFF', padding: 10, borderRadius: 12, alignItems: 'center', minWidth: 65, marginRight: 14 },
  dateNum: { fontSize: 22, fontWeight: '800', lineHeight: 24 },
  dateDay: { fontSize: 10, color: '#64748B', textTransform: 'uppercase', fontWeight: '700', marginTop: 2 },
  
  holidayInfo: { flex: 1 },
  holidayName: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 6, marginBottom: 4 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  holidayDesc: { fontSize: 12, color: '#64748B', marginTop: 4, fontStyle: 'italic' },

  emptyCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 20, alignItems: 'center', marginTop: 20 },
  emptyText: { color: '#94A3B8', fontSize: 15, fontWeight: '500' },
});
