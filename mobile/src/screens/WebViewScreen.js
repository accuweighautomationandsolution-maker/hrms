import React from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { authService } from '../utils/authService';

export default function WebViewScreen({ route }) {
  const { title, path } = route.params || { title: 'Module', path: '/' };
  
  // Use localhost for dev, but this should be configurable
  const baseUrl = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:5173';
  const uri = `${baseUrl}${path}`;

  // On Web, use a native iframe since react-native-webview's web support is basically an iframe anyway
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe src={uri} style={styles.iframe} title={title} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView 
        source={{ uri }} 
        style={{ flex: 1 }} 
        startInLoadingState={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  iframe: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
  }
});
