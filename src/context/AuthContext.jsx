import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid, email) => {
    try {
      // 1. Master Admin Sync
      const adminEmails = [
        'admin@cambridgelearningservices.com',
        'admin@cls.com',
        'admin@pmi.com',
        'kabirhaldar4444@gmail.com'
      ];
      if (adminEmails.includes(email?.toLowerCase())) {
        const isSuper = email === 'kabirhaldar4444@gmail.com';
        const adminProfile = {
          id: uid,
          email: email,
          role: isSuper ? 'super_admin' : 'admin',
          full_name: isSuper ? 'Super Admin' : 'Cambridge Administrator',
          profile_completed: true
        };
        
        // Ensure profile exists in DB for RLS to work properly
        const { data: existingAdmin } = await supabase.from('profiles').select('id, role').eq('id', uid).single();
        if (!existingAdmin) {
          await supabase.from('profiles').insert(adminProfile);
        } else if (existingAdmin.role !== adminProfile.role) {
          await supabase.from('profiles').update({ role: adminProfile.role }).eq('id', uid);
        }

        setProfile(adminProfile);
        setLoading(false);
        return;
      }

      // 2. Standard Profile Fetch
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error || !data) {
        console.warn('Profile not found, signing out...');
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        throw new Error('Profile not found');
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setLoading(false);
      return;
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id, session.user.email);
      else setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id, session.user.email);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription?.unsubscribe?.();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
