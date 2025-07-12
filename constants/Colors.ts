export interface ColorScheme {
  background: string;
  cardBackground: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  overlay: string;
  divider: string;
  primaryLight: string;
  accentLight: string;
  accentContrast: string;
}

export const Colors: ColorScheme = {
  background: '#101010',
  cardBackground: '#1C1C1E',
  primary: '#FFFFFF',
  secondary: '#8E8E93',
  accent: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  overlay: 'rgba(0, 0, 0, 0.8)',
  divider: 'rgba(255, 255, 255, 0.1)',
  primaryLight: 'rgba(255, 255, 255, 0.1)',
  accentLight: 'rgba(0, 122, 255, 0.1)',
  accentContrast: '#FFFFFF',
};