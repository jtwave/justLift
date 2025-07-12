import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string, username?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
          username: username,
        },
      },
    });
    return { data, error };
  };

  const signIn = async (emailOrUsername: string, password: string) => {
    // Check if the input is an email (contains @) or username
    const isEmail = emailOrUsername.includes('@');
    
    if (isEmail) {
      // Sign in with email directly
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailOrUsername,
        password,
      });
      return { data, error };
    } else {
      // Look up email by username first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', emailOrUsername.toLowerCase())
        .single();
      
      if (profileError || !profile) {
        return { 
          data: null, 
          error: { message: 'Username not found' } 
        };
      }
      
      // Sign in with the found email
      const { data, error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });
      return { data, error };
    }
  };

  const signOut = async () => {
    console.log('Starting sign out process...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase sign out error:', error);
    } else {
      console.log('Sign out successful');
    }
    return { error };
  };

  return {
    session,
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };
}