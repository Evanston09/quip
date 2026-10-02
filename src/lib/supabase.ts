import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Publishable (or legacy anon) keys only. Never put a secret key in EXPO_PUBLIC_*.
export const supabase =
  supabaseUrl &&
  supabaseKey &&
  !(Platform.OS === "web" && typeof window === "undefined")
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          storage:
            Platform.OS === "web"
              ? AsyncStorage
              : {
                  getItem: (key: string) => SecureStore.getItemAsync(key),
                  setItem: (key: string, value: string) =>
                    SecureStore.setItemAsync(key, value),
                  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
                },
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          ...(Platform.OS !== "web" ? { lock: processLock } : {}),
        },
      })
    : null;
