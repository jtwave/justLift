import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '@/components/ThemeProvider';
import { FontSizes, FontWeights } from '@/constants/Fonts';
import { useAuth } from '@/hooks/useAuth';
import { useSocialStore } from '@/store/socialStore';
import { Eye, EyeOff } from 'lucide-react-native';

export function AuthScreen() {
  const { colors } = useThemeContext();
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { signIn, signUp } = useAuth();
  const { checkUsernameAvailable } = useSocialStore();

  // Clear error message when user starts typing or switches modes
  const clearError = () => {
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  // Clear error when switching between sign in/up
  const handleModeSwitch = () => {
    setIsSignUp(!isSignUp);
    setErrorMessage('');
  };

  const handleAuth = async () => {
    setErrorMessage('');
    
    if (!emailOrUsername || !password) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    if (isSignUp && !username) {
      setErrorMessage('Please choose a username');
      return;
    }

    // For sign up, emailOrUsername should be an email
    if (isSignUp && !emailOrUsername.includes('@')) {
      setErrorMessage('Please enter a valid email address for sign up');
      return;
    }

    if (isSignUp) {
      // Check username availability
      const isAvailable = await checkUsernameAvailable(username);
      if (!isAvailable) {
        setErrorMessage('Username is already taken. Please choose another one.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(emailOrUsername, password, username, username);
        if (error) {
          // Handle specific Supabase auth errors
          if (error.message.includes('User already registered') || error.message.includes('user_already_exists')) {
            setErrorMessage('An account with this email already exists. Please try signing in instead.');
            return;
          }
          throw error;
        }
        Alert.alert('Success', 'Account created! Please check your email to verify your account.');
      } else {
        const { error } = await signIn(emailOrUsername, password);
        if (error) {
          if (error.message === 'Username not found') {
            setErrorMessage('Username not found. Please check your username or try signing in with email.');
          } else if (error.message.includes('Invalid login credentials')) {
            setErrorMessage('Invalid credentials. Please check your username/email and password.');
          } else {
            throw error;
          }
          return;
        }
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Lift</Text>
              <Text style={styles.subtitle}>
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </Text>
            </View>

            <View style={styles.form}>
              {errorMessage ? (
                <View style={[styles.errorContainer, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
                </View>
              ) : null}

              {isSignUp && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.primary }]}>Username</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.primary }]}
                    value={username}
                    onChangeText={(text) => {
                      setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                      clearError();
                    }}
                    placeholder="Choose a username"
                    placeholderTextColor={colors.secondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={20}
                  />
                  <Text style={styles.inputHint}>
                    Letters, numbers, and underscores only
                  </Text>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.primary }]}>
                  {isSignUp ? 'Email' : 'Email or Username'}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.primary }]}
                  value={emailOrUsername}
                  onChangeText={(text) => {
                    setEmailOrUsername(text);
                    clearError();
                  }}
                  placeholder={isSignUp ? "Enter your email" : "Enter your email or username"}
                  placeholderTextColor={colors.secondary}
                  keyboardType={isSignUp ? "email-address" : "default"}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.primary }]}>Password</Text>
                <View style={[styles.passwordContainer, { backgroundColor: colors.cardBackground }]}>
                  <TextInput
                    style={[styles.passwordInput, { color: colors.primary }]}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      clearError();
                    }}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.secondary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color={colors.secondary} />
                    ) : (
                      <Eye size={20} color={colors.secondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.authButton, { backgroundColor: colors.accent }, loading && styles.authButtonDisabled]}
                onPress={handleAuth}
                disabled={loading}
              >
                <Text style={styles.authButtonText}>
                  {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchButton}
                onPress={handleModeSwitch}
              >
                <Text style={[styles.switchButtonText, { color: colors.accent }]}>
                  {isSignUp 
                    ? 'Already have an account? Sign In' 
                    : "Don't have an account? Sign Up"
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: '100%',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: FontSizes.screenTitle,
    fontWeight: FontWeights.bold,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    color: '#FFFFFF'
  },
  subtitle: {
    fontSize: FontSizes.body,
    color: '#FFFFFF'
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: FontSizes.body,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: FontSizes.body,
  },
  eyeButton: {
    padding: 16,
  },
  authButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: '#FFFFFF',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  switchButtonText: {
    fontSize: FontSizes.body,
  },
  inputHint: {
    fontSize: FontSizes.caption,
    marginTop: 4,
    color: '#FFFFFF'
  },
  errorContainer: {
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: FontSizes.body,
    textAlign: 'center',
  },
});