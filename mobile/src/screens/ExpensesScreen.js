import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Modal, TextInput, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../utils/authService';
import { dataService } from '../utils/dataService';

export default function ExpensesScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    category: 'Travel'
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const user = authService.getCurrentUser();
      if (!user) return;
      const emp = await dataService.getMyEmployeeProfile(user);
      if (!emp) return;

      const userExpenses = await dataService.getPersonalExpenses(emp.id);
      setExpenses(userExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.amount || !formData.description) {
      Alert.alert('Validation', 'Please enter amount and description');
      return;
    }
    setSubmitting(true);
    try {
      const user = authService.getCurrentUser();
      const emp = await dataService.getMyEmployeeProfile(user);
      
      const newExpense = {
        id: Date.now().toString(),
        empId: emp.id,
        empName: emp.name,
        date: formData.date,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: formData.category,
        status: 'Pending'
      };
      
      await dataService.saveExpenses([newExpense]);
      Alert.alert('Success', 'Expense submitted successfully!');
      setModalVisible(false);
      setFormData({ date: new Date().toISOString().split('T')[0], amount: '', description: '', category: 'Travel' });
      await loadExpenses();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return '#10B981';
      case 'Rejected': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  if (loading && expenses.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>My Expenses</Text>
        
        {expenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses found.</Text>
        ) : (
          expenses.map((exp, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.header}>
                <View>
                  <Text style={styles.category}>{exp.category}</Text>
                  <Text style={styles.date}>{new Date(exp.date).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.amount}>₹ {exp.amount}</Text>
              </View>
              <Text style={styles.description}>{exp.description}</Text>
              <View style={styles.footer}>
                <Text style={[styles.status, { color: getStatusColor(exp.status) }]}>{exp.status || 'Pending'}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={24} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Expense</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Date</Text>
            <TextInput 
              style={styles.input} 
              value={formData.date}
              onChangeText={(t) => setFormData({...formData, date: t})}
            />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categorySelector}>
              {['Travel', 'Meals', 'Office', 'Other'].map(cat => (
                <TouchableOpacity 
                  key={cat} 
                  style={[styles.catBtn, formData.category === cat && styles.catBtnActive]}
                  onPress={() => setFormData({...formData, category: cat})}
                >
                  <Text style={[styles.catBtnText, formData.category === cat && styles.catBtnTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Amount (₹)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="0.00" 
              keyboardType="numeric"
              value={formData.amount}
              onChangeText={(t) => setFormData({...formData, amount: t})}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput 
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
              placeholder="What was this expense for?" 
              multiline
              value={formData.description}
              onChangeText={(t) => setFormData({...formData, description: t})}
            />

            <TouchableOpacity 
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]} 
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? 'Submitting...' : 'Submit Expense'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 40 },
  
  card: {
    backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  category: { fontSize: 16, fontWeight: '700', color: '#111827' },
  date: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  amount: { fontSize: 18, fontWeight: 'bold', color: '#059669' },
  description: { fontSize: 14, color: '#4B5563', marginBottom: 12 },
  footer: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  status: { fontSize: 13, fontWeight: '700' },

  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563EB',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 8, elevation: 4
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, 
    padding: 24, minHeight: 500 
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
  input: { 
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, 
    padding: 12, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB'
  },
  categorySelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { 
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, 
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF'
  },
  catBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  catBtnText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
  catBtnTextActive: { color: '#2563EB' },
  submitBtn: { 
    backgroundColor: '#2563EB', padding: 16, borderRadius: 12, 
    alignItems: 'center', marginTop: 32 
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
