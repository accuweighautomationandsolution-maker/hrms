import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ConfigScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Config & Masters Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  text: { fontSize: 18, color: '#374151' }
});
