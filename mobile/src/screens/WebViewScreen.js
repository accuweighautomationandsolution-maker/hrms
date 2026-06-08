import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '../utils/supabaseClient';
import { authService } from '../utils/authService';

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
        let script = '';

        if (data?.session) {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
          const urlObj = new URL(supabaseUrl);
          const projectId = urlObj.hostname.split('.')[0];
          const storageKey = `sb-${projectId}-auth-token`;
          const sessionStr = JSON.stringify(data.session);

          // We MUST inject APP_VERSION so the web app doesn't immediately clear localStorage!
          script = `
            try {
              window.localStorage.setItem('${storageKey}', JSON.stringify(${sessionStr}));
              window.localStorage.setItem('APP_VERSION', 'v3.4.3-EMP-ISOLATION-FIX');
              
              // If we are stuck on the login page despite having a token, reload to trigger auth.
              if (window.location.pathname.includes('/login') && !window.location.search.includes('logout')) {
                window.location.href = '${path}';
              }
            } catch(e) {}
            true;
          `;
        } else {
          // Fallback if they used Internal Shadow Auth
          const profile = authService.getCurrentUser();
          if (profile && profile.email) {
            // If they don't have a Supabase session but DO have a shadow profile, 
            // we can try to inject a script to auto-fill the login form as a fallback.
            // Note: password is in emp_id as base64
            const pwd = profile.emp_id ? atob(profile.emp_id) : '';
            script = `
              setTimeout(function() {
                try {
                  if (window.location.pathname.includes('/login')) {
                    const emailInput = document.querySelector('input[type="email"]');
                    const pwdInput = document.querySelector('input[type="password"]');
                    const btn = document.querySelector('button[type="submit"]');
                    
                    if (emailInput && pwdInput && btn) {
                      emailInput.value = '${profile.email}';
                      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                      
                      pwdInput.value = '${pwd}';
                      pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
                      
                      btn.click();
                    }
                  }
                } catch(e) {}
              }, 1000);
              true;
            `;
          } else {
            script = 'true;';
          }
        }
        setInjectedJs(script);
      } catch (err) {
        console.error("Failed to prepare session for WebView:", err);
        setInjectedJs('true;');
      }
    };
    
    prepareSession();
  }, []);

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
          injectedJavaScript={injectedJs}
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
