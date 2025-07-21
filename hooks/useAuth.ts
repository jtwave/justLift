import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

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
      // Look up email by username first (case-insensitive)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', emailOrUsername)
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

  const signInWithApple = async () => {
    if (Platform.OS !== 'ios') {
      return { error: { message: 'Apple Sign-In is only available on iOS devices.' } };
    }
    try {
      const appleAuthRequestResponse = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, email, fullName, user } = appleAuthRequestResponse;
      if (!identityToken) {
        return { error: { message: 'Apple Sign-In failed: No identity token returned.' } };
      }

      // Use Supabase signInWithIdToken for Apple
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
        nonce: undefined, // Expo handles nonce internally
      });
      return { data, error };
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_CANCELED') {
        return { error: { message: 'Apple Sign-In was canceled.' } };
      }
      if (error instanceof Error) {
        return { error: { message: error.message } };
      }
      return { error: { message: 'An unknown error occurred during Apple Sign-In.' } };
    }
  };

  return {
    session,
    user,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithApple, // Add this to the returned object
  };
}