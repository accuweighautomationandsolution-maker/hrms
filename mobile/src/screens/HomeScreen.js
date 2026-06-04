import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  ScrollView
} from 'react-native';
import * as Location from 'expo-location';
import { authService } from '../utils/authService';
import { dataService } from '../utils/dataService';

// Office Coordinates (Update to real Accuweigh location)
const OFFICE_LAT = 18.5204;
const OFFICE_LON = 73.8567;
const ALLOWED_RADIUS_METERS = 200; // 200 meters

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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {employee?.name || 'Employee'}</Text>
          <Text style={styles.date}>{new Date().toDateString()}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location Status</Text>
        <Text style={[styles.statusText, inRange ? styles.success : styles.error]}>
          {locationStatus}
        </Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={checkLocation}>
          <Text style={styles.refreshText}>Refresh Location</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Attendance</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>Punch In:</Text>
          <Text style={styles.value}>{todayAttendance?.punchIn || '--:--'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Punch Out:</Text>
          <Text style={styles.value}>{todayAttendance?.punchOut || '--:--'}</Text>
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

      {/* Monthly Overtime Card - Visible for On-Roll Workers & Contractual Workers */}
      {showOT && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Overtime — {currentMonthName}</Text>
          
          <View style={styles.otContainer}>
            <View style={styles.otBox}>
              <Text style={styles.otValue}>{monthlyOT.otHours.toFixed(1)}</Text>
              <Text style={styles.otLabel}>Regular OT (hrs)</Text>
            </View>
            <View style={styles.otDivider} />
            <View style={styles.otBox}>
              <Text style={styles.otValue}>{monthlyOT.holidayOtHours.toFixed(1)}</Text>
              <Text style={styles.otLabel}>Holiday OT (hrs)</Text>
            </View>
          </View>

          <View style={styles.otTotalRow}>
            <Text style={styles.otTotalLabel}>Total OT This Month</Text>
            <View style={styles.otTotalBadge}>
              <Text style={styles.otTotalValue}>{totalOT.toFixed(1)} hrs</Text>
            </View>
          </View>

          <Text style={styles.otNote}>
            Regular OT = hours worked beyond 18:30 on working days.{'\n'}
            Holiday OT = hours worked on Sundays & odd Saturdays (30 min deducted if &gt;4 hrs).
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 40 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  date: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  logoutBtn: { backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  logoutText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
  statusText: { fontSize: 16, marginBottom: 12, lineHeight: 22 },
  success: { color: '#10B981' },
  error: { color: '#EF4444' },
  refreshBtn: { alignSelf: 'flex-start', backgroundColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  refreshText: { color: '#374151', fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  label: { fontSize: 16, color: '#6B7280' },
  value: { fontSize: 16, fontWeight: '600', color: '#111827' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  actionBtn: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  btnIn: { backgroundColor: '#10B981' },
  btnOut: { backgroundColor: '#F59E0B' },
  btnDisabled: { backgroundColor: '#9CA3AF', opacity: 0.7 },
  actionText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  // Overtime card styles
  otContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  otBox: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  otValue: { fontSize: 28, fontWeight: 'bold', color: '#2563EB' },
  otLabel: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  otDivider: { width: 1, height: 50, backgroundColor: '#E5E7EB' },
  otTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', marginBottom: 8 },
  otTotalLabel: { fontSize: 16, fontWeight: '600', color: '#374151' },
  otTotalBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  otTotalValue: { fontSize: 16, fontWeight: 'bold', color: '#2563EB' },
  otNote: { fontSize: 12, color: '#9CA3AF', lineHeight: 18, marginTop: 4 },
});
