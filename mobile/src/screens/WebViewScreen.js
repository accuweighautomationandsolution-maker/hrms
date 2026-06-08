import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { authService } from '../utils/authService';

export default function WebViewScreen({ route }) {
  const { title, path } = route.params || { title: 'Module', path: '/' };
  const [finalUri, setFinalUri] = useState(null);
  
  const baseUrl = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:5173';

  useEffect(() => {
    // Generate the URL with SSO tokens securely attached
    const profile = authService.getCurrentUser();
    let uri = `${baseUrl}${path}`;
    
    if (profile && profile.email && profile.emp_id) {
      // emp_id contains the base64 encoded password for our internal shadow auth
      const connector = uri.includes('?') ? '&' : '?';
      uri = `${uri}${connector}sso_email=${encodeURIComponent(profile.email)}&sso_pwd=${encodeURIComponent(profile.emp_id)}`;
    }
    
    setFinalUri(uri);
  }, [baseUrl, path]);

  // On Web, use a native iframe
  if (Platform.OS === 'web') {
    if (!finalUri) return <View style={styles.container} />;
    return (
      <View style={styles.container}>
        <iframe src={finalUri} style={styles.iframe} title={title} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!finalUri ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <WebView 
          source={{ uri: finalUri }} 
          style={{ flex: 1 }} 
          startInLoadingState={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6'
  },
  iframe: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
  }
});
