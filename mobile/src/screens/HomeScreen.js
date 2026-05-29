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
import { getDistance } from 'geolib'; // Oh wait, I don't have geolib installed. Let's do manual haversine formula.
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
      }

      await checkLocation();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
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
  actionText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
