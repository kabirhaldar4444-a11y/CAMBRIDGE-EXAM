import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseUrl = rawUrl ? rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '') : '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
}

// Generate a unique storage key per browser tab.
// This isolates auth state completely — logging out in one tab won't affect
// another tab, even if both are logged in with different accounts.
const getTabStorageKey = () => {
  const KEY = '_cls_tab_id';
  let tabId = window.sessionStorage.getItem(KEY);
  if (!tabId) {
    tabId = 'sb_' + Math.random().toString(36).slice(2, 10);
    window.sessionStorage.setItem(KEY, tabId);
  }
  return tabId;
};

const validUrl = supabaseUrl || 'https://placeholder-project.supabase.co';
const validKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(validUrl, validKey, {
  auth: {
    storage: window.sessionStorage,
    storageKey: getTabStorageKey(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
