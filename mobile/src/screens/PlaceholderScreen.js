import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PlaceholderScreen({ route }) {
  const { title, icon } = route.params || { title: 'Module', icon: 'construct' };

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color="#9CA3AF" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>This module is currently being optimized for mobile. Please use the web portal to access these features.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
