import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  TextInput, TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dataService } from '../utils/dataService';

export default function EmployeeDirectoryScreen() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await dataService.getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = employees.filter(e => 
    e.name?.toLowerCase().includes(search.toLowerCase()) || 
    e.department?.toLowerCase().includes(search.toLowerCase()) ||
    e.role?.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name?.substring(0, 2).toUpperCase() || 'UN'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.role}>{item.role} • {item.department}</Text>
        <View style={styles.contactRow}>
          {item.contact ? (
            <View style={styles.contactItem}>
              <Ionicons name="call" size={20} color="#2563EB" />
              <Text style={styles.contactText}>{item.contact}</Text>
            </View>
          ) : null}
          {item.email ? (
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={20} color="#2563EB" />
              <Text style={styles.contactText}>{item.email}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <TouchableOpacity style={styles.chevron}>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );

  if (loading && employees.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search employees..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id?.toString() || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No employees found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  searchContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', 
    margin: 16, paddingHorizontal: 16, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#111827' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 16
  },
  avatarText: { color: '#2563EB', fontWeight: 'bold', fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  role: { fontSize: 13, color: '#4B5563', marginBottom: 6 },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactText: { fontSize: 12, color: '#6B7280' },
  chevron: { padding: 8 },
  emptyText: { textAlign: 'center', color: '#6B7280', marginTop: 40 }
});
