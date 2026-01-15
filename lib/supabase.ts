import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// VENDOSNI TË DHËNAT TUAJA KËTU
const supabaseUrl = 'https://anvtfezkuayunvocaihj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFudnRmZXprdWF5dW52b2NhaWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMzU0NzQsImV4cCI6MjA3OTgxMTQ3NH0.rlm-2ggyUN2SDoPMR4A_CZYK9RL_2gzp0s8fLPyFMZY';

// --- Custom Storage Adapter ---
// Ky funksion parandalon errorin "window is not defined" duke kontrolluar nëse jemi në Web/Server
const ExpoStorageAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return Promise.resolve(null);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoStorageAdapter, // Përdorim adapterin tonë të sigurt
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const uploadToSupabase = async (uri: string) => {
  try {
    const ext = uri.substring(uri.lastIndexOf('.') + 1);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const formData = new FormData();
    formData.append('file', { uri: uri, name: fileName, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` } as any);
    const { data, error } = await supabase.storage.from('images').upload(fileName, formData);
    if (error) {
      if (Platform.OS === 'web') {
        const res = await fetch(uri); const blob = await res.blob();
        const { data: webData, error: webError } = await supabase.storage.from('images').upload(fileName, blob);
        if (webError) throw webError;
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName); return urlData.publicUrl;
      }
      return null;
    }
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName); return urlData.publicUrl;
  } catch (error) { console.log("Upload error:", JSON.stringify(error, null, 2)); return null; }
};
