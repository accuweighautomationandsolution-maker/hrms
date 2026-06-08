import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '../utils/supabaseClient';

export default function WebViewScreen({ route }) {
  const { title, path } = route.params || { title: 'Module', path: '/' };
  const [injectedJs, setInjectedJs] = useState(null);
  
  // Use localhost for dev, but this should be configurable
  const baseUrl = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:5173';
  const uri = `${baseUrl}${path}`;

  useEffect(() => {
    const prepareSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
          const urlObj = new URL(supabaseUrl);
          const projectId = urlObj.hostname.split('.')[0];
          const storageKey = `sb-${projectId}-auth-token`;
          const sessionStr = JSON.stringify(data.session);

          // We inject the token into localStorage before the page content loads.
          // This allows the web app's authService to immediately find the session.
          const script = `
            try {
              localStorage.setItem('${storageKey}', JSON.stringify(${sessionStr}));
            } catch(e) {}
            true;
          `;
          setInjectedJs(script);
        } else {
          setInjectedJs('true;');
        }
      } catch (err) {
        console.error("Failed to prepare session for WebView:", err);
        setInjectedJs('true;');
      }
    };
    
    prepareSession();
  }, []);

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
      {injectedJs === null ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <WebView 
          source={{ uri }} 
          style={{ flex: 1 }} 
          startInLoadingState={true}
          injectedJavaScriptBeforeContentLoaded={injectedJs}
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
