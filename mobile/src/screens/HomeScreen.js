import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  StatusBar
} from 'react-native';
import { MapPin, Clock, LogOut, CalendarClock, RefreshCw } from 'lucide-react-native';
import * as Location from 'expo-location';
import { authService } from '../utils/authService';
import { dataService } from '../utils/dataService';

// Office Coordinates (Update to real Accuweigh location)
const OFFICE_LAT = 18.5204;
const OFFICE_LON = 73.8567;
const ALLOWED_RADIUS_METERS = 9999999; // Essentially unlimited for testing

// Haversine formula to calculate distance between two lat/long points in meters
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; // Distance in m
  return d;
}

export default function HomeScreen() {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('Checking location...');
  const [inRange, setInRange] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [monthlyOT, setMonthlyOT] = useState({ otHours: 0, holidayOtHours: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = authService.getCurrentUser();
      if (!user) return;
      
      const empProfile = await dataService.getMyEmployeeProfile(user);
      setEmployee(empProfile);

      if (empProfile) {
        // Check if attendance exists for today
        const todayStr = new Date().toISOString().split('T')[0];
        const allAtt = await dataService.getAttendanceForEmployee(empProfile.id);
        const record = allAtt[`${empProfile.id}_${todayStr}`];
        if (record) {
          setTodayAttendance(record);
        }

        // Calculate monthly overtime from attendance records
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const otStats = calculateMonthlyOT(empProfile.id, year, month, allAtt);
        setMonthlyOT(otStats);
      }

      // Fire and forget so we don't block UI load if permissions hang on web
      checkLocation();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate OT hours for current month from attendance records
  // Uses same logic as web app payrollCalculator.js
  const calculateMonthlyOT = (empId, year, month, recordsMap) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toMins = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const shiftEnd = toMins('18:30'); // 18:30

    // Determine holidays (Sundays + odd Saturdays)
    const holidaySet = new Set();
    let satCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (dow === 0) {
        holidaySet.add(d);
      } else if (dow === 6) {
        satCount++;
        if (satCount % 2 !== 0) { // Odd Saturdays are holidays
          holidaySet.add(d);
        }
      }
    }

    let otHours = 0;
    let holidayOtHours = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      if (dateObj > today) continue; // Skip future days

      const key = `${empId}_${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec = recordsMap[key];
      if (!rec || !rec.punchIn || !rec.punchOut) continue;

      const inMins = toMins(rec.punchIn);
      const outMins = toMins(rec.punchOut);
      if (!inMins || !outMins || outMins <= inMins) continue;

      const duration = outMins - inMins;
      const isHoliday = holidaySet.has(d);

      if (isHoliday && duration) {
        // Holiday OT: 30 min deduction if worked > half day
        let payableMins = duration;
        if (duration >= 240) {
          payableMins = Math.max(0, duration - 30);
        }
        holidayOtHours += (payableMins / 60);
      } else if (!isHoliday && outMins > shiftEnd) {
        // Regular day OT: time worked beyond shift end
        const otDuration = outMins - shiftEnd;
        otHours += (otDuration / 60);
      }
    }

    return { otHours: Math.round(otHours * 100) / 100, holidayOtHours: Math.round(holidayOtHours * 100) / 100 };
  };

  const checkLocation = async () => {
    setLocationStatus('Requesting permissions...');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationStatus('Permission denied. Cannot mark attendance.');
      return;
    }

    setLocationStatus('Getting GPS location...');
    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      
      const distance = getDistanceFromLatLonInM(latitude, longitude, OFFICE_LAT, OFFICE_LON);
      
      if (distance <= ALLOWED_RADIUS_METERS) {
        setInRange(true);
        setLocationStatus('You are at the office. Ready to punch.');
      } else {
        setInRange(false);
        setLocationStatus(`You are ${Math.round(distance)}m away from office. (Max allowed: ${ALLOWED_RADIUS_METERS}m)`);
      }
    } catch (err) {
      setLocationStatus('Failed to get location. Make sure GPS is enabled.');
    }
  };

  const handlePunch = async (type) => {
    if (!inRange) {
      Alert.alert('Not In Range', 'You must be at the office location to mark attendance.');
      return;
    }
    if (!employee) {
      Alert.alert('Error', 'Employee profile not found.');
      return;
    }

    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      
      const key = `${employee.id}_${todayStr}`;
      const record = { ...todayAttendance };
      record.id = record.id || undefined;
      
      if (type === 'IN') {
        record.punchIn = nowTime;
        record.source = 'Mobile App (Geo)';
      } else {
        record.punchOut = nowTime;
      }
      
      const updateMap = { [key]: record };
      await dataService.saveAttendance(updateMap);
      
      Alert.alert('Success', `Successfully Punched ${type}!`);
      await loadData(); // Reload
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
  };

  // Check if employee type is eligible for OT display
  const empType = (employee?.empType || '').toLowerCase().trim();
  const showOT = empType === 'on role worker' || empType === 'on-roll worker' || empType === 'contractual worker';
  const totalOT = monthlyOT.otHours + monthlyOT.holidayOtHours;
  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  if (loading && !employee) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <View style={styles.headerBackground} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            <Text style={styles.greeting} numberOfLines={2}>Hi, {employee?.name?.split(' ')[0] || 'Employee'} 👋</Text>
          </View>
          <TouchableOpacity style={styles.logoutIconBtn} onPress={handleLogout}>
            <LogOut size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Location Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <MapPin size={20} color="#3B82F6" />
            </View>
            <Text style={styles.cardTitle}>Location Status</Text>
            <TouchableOpacity onPress={checkLocation} style={{ marginLeft: 'auto', padding: 8 }}>
              <RefreshCw size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          <View style={[styles.statusBanner, inRange ? styles.statusBannerSuccess : styles.statusBannerError]}>
            <Text style={[styles.statusText, inRange ? styles.successText : styles.errorText]}>
              {locationStatus}
            </Text>
          </View>
        </View>

        {/* Attendance Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Clock size={20} color="#10B981" />
            </View>
            <Text style={styles.cardTitle}>Today's Attendance</Text>
          </View>
          
          <View style={styles.timeRow}>
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>PUNCH IN</Text>
              <Text style={styles.timeValue}>{todayAttendance?.punchIn || '--:--'}</Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>PUNCH OUT</Text>
              <Text style={styles.timeValue}>{todayAttendance?.punchOut || '--:--'}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[
                styles.actionBtn, 
                styles.btnIn, 
                (!inRange || todayAttendance?.punchIn) && styles.btnDisabled
              ]} 
              onPress={() => handlePunch('IN')}
              disabled={!inRange || !!todayAttendance?.punchIn || loading}
            >
              <Text style={styles.actionText}>PUNCH IN</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.actionBtn, 
                styles.btnOut, 
                (!inRange || !todayAttendance?.punchIn || todayAttendance?.punchOut) && styles.btnDisabled
              ]} 
              onPress={() => handlePunch('OUT')}
              disabled={!inRange || !todayAttendance?.punchIn || !!todayAttendance?.punchOut || loading}
            >
              <Text style={styles.actionText}>PUNCH OUT</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Monthly Overtime Card */}
        {showOT && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: '#FFFBEB' }]}>
                <CalendarClock size={20} color="#F59E0B" />
              </View>
              <Text style={styles.cardTitle}>Monthly Overtime</Text>
              <Text style={styles.monthBadge}>{currentMonthName.substring(0, 3)}</Text>
            </View>
            
            <View style={styles.otContainer}>
              <View style={styles.otBox}>
                <Text style={styles.otValue}>{monthlyOT.otHours.toFixed(1)}</Text>
                <Text style={styles.otLabel}>Regular OT</Text>
              </View>
              <View style={styles.otDivider} />
              <View style={styles.otBox}>
                <Text style={styles.otValue}>{monthlyOT.holidayOtHours.toFixed(1)}</Text>
                <Text style={styles.otLabel}>Holiday OT</Text>
              </View>
            </View>

            <View style={styles.otTotalRow}>
              <Text style={styles.otTotalLabel}>Total Approved OT</Text>
              <View style={styles.otTotalBadge}>
                <Text style={styles.otTotalValue}>{totalOT.toFixed(1)} hrs</Text>
              </View>
            </View>
          </View>
        )}
        <View style={{height: 30}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    backgroundColor: '#2563EB',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  scrollContent: { padding: 20, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  greeting: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginTop: 6, letterSpacing: -0.5 },
  date: { fontSize: 13, color: '#BFDBFE', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5 },
  logoutIconBtn: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 14 },
  
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 24, 
    marginBottom: 20, 
    shadowColor: '#64748B', 
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08, 
    shadowRadius: 20, 
    elevation: 4 
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  cardIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardTitle: { fontSize: 19, fontWeight: '700', color: '#1E293B' },
  monthBadge: { marginLeft: 'auto', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, fontSize: 13, fontWeight: '700', color: '#475569', textTransform: 'uppercase' },
  
  statusBanner: { padding: 16, borderRadius: 16, backgroundColor: '#F8FAFC', borderLeftWidth: 4, borderLeftColor: '#CBD5E1' },
  statusBannerSuccess: { backgroundColor: '#ECFDF5', borderLeftColor: '#10B981' },
  statusBannerError: { backgroundColor: '#FEF2F2', borderLeftColor: '#EF4444' },
  statusText: { fontSize: 15, fontWeight: '600', color: '#475569', lineHeight: 22 },
  successText: { color: '#047857' },
  errorText: { color: '#B91C1C' },
  
  timeRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 20, backgroundColor: '#F8FAFC', borderRadius: 20, marginBottom: 24 },
  timeBox: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: 12, color: '#64748B', fontWeight: '700', marginBottom: 8, letterSpacing: 0.8 },
  timeValue: { fontSize: 26, fontWeight: '800', color: '#0F172A' },
  timeDivider: { width: 1, height: '70%', backgroundColor: '#E2E8F0', alignSelf: 'center' },
  
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flex: 1, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginHorizontal: 6, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  btnIn: { backgroundColor: '#10B981' },
  btnOut: { backgroundColor: '#F59E0B' },
  btnDisabled: { backgroundColor: '#E2E8F0', shadowOpacity: 0, elevation: 0 },
  actionText: { color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  
  otContainer: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 16, paddingVertical: 20, marginBottom: 16 },
  otBox: { flex: 1, alignItems: 'center' },
  otValue: { fontSize: 32, fontWeight: '800', color: '#2563EB' },
  otLabel: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 6 },
  otDivider: { width: 1, height: '100%', backgroundColor: '#E2E8F0' },
  
  otTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  otTotalLabel: { fontSize: 16, fontWeight: '700', color: '#334155' },
  otTotalBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  otTotalValue: { fontSize: 16, fontWeight: '800', color: '#1D4ED8' },
});
