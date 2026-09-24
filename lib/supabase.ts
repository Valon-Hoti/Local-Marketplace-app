import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// VENDOSNI TË DHËNAT TUAJA KËTU
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

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

export const uploadToSupabase = async (uri: string): Promise<string | null> => {
    try {
        const cleanUri = uri.split('?')[0];
        const rawExt = cleanUri.includes('.') ? cleanUri.substring(cleanUri.lastIndexOf('.') + 1).toLowerCase() : 'jpg';
        const ext = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(rawExt) ? rawExt : 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

        if (Platform.OS === 'web') {
            const res = await fetch(uri);
            const blob = await res.blob();
            const { error: webError } = await supabase.storage.from('images').upload(fileName, blob, {
                contentType,
            });
            if (webError) {
                console.log("Web upload error:", webError.message || webError);
                return null;
            }
            const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
            return urlData.publicUrl;
        } else {
            // Native (iOS & Android)
            let arrayBuffer: ArrayBuffer | null = null;

            // 1. Provo me klasën e re File nga expo-file-system
            try {
                const file = new File(uri);
                if (file && typeof file.arrayBuffer === 'function') {
                    arrayBuffer = await file.arrayBuffer();
                }
            } catch (fileErr: any) {
                // Nëse File nuk e njeh formatin e rrugës, vazhdojmë me legacy
            }

            // 2. Fallback në modulin e testuar legacy të expo-file-system
            if (!arrayBuffer) {
                const base64 = await FileSystem.readAsStringAsync(uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                arrayBuffer = decode(base64);
            }

            const { error } = await supabase.storage.from('images').upload(fileName, arrayBuffer, {
                contentType,
            });

            if (error) {
                console.log("Upload error:", error.message || error.name || JSON.stringify(error));
                return null;
            }

            const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
            return urlData.publicUrl;
        }
    } catch (error: any) {
        console.log("Upload catch error:", error?.message || error?.name || String(error));
        return null;
    }
};

let _hasBuyerIdColumn: boolean | null = null;
export const checkSupportsBuyerId = async (): Promise<boolean> => {
    if (_hasBuyerIdColumn !== null) return _hasBuyerIdColumn;
    try {
        const { error } = await supabase.from('messages').select('buyer_id').limit(0);
        _hasBuyerIdColumn = !error;
    } catch {
        _hasBuyerIdColumn = false;
    }
    return _hasBuyerIdColumn;
};
