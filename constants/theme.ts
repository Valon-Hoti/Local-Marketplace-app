import { Platform } from 'react-native';
import {
  Car,
  Dog,
  Dumbbell,
  Gift,
  Home,
  LayoutGrid,
  MoreHorizontal,
  Shirt,
  Smartphone,
  Wrench,
} from 'lucide-react-native';

export const COLORS = {
  primary: '#4F46E5',
  primaryDark: '#4338ca',
  secondary: '#10B981',
  background: '#F9FAFB',
  card: '#FFFFFF',
  text: '#111827',
  textLight: '#6B7280',
  border: '#E5E7EB',
  inputBg: '#F3F4F6',
  danger: '#EF4444',
  white: '#FFFFFF',
};

export const LIGHT_THEME = { ...COLORS, tabBar: '#FFFFFF', isDark: false };
export const DARK_THEME = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  secondary: '#34D399',
  background: '#111827',
  card: '#1F2937',
  text: '#F9FAFB',
  textLight: '#9CA3AF',
  border: '#374151',
  inputBg: '#374151',
  danger: '#F87171',
  white: '#1F2937',
  tabBar: '#1F2937',
  isDark: true,
};

export const Colors = {
  light: {
    text: '#111827',
    background: '#fff',
    tint: '#4F46E5',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#4F46E5',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 };
export const SHADOW = {
  sm: Platform.OS === 'web'
    ? { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)' }
    : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  md: Platform.OS === 'web'
    ? { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }
    : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  lg: Platform.OS === 'web'
    ? { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)' }
    : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
};

export const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  all: { icon: LayoutGrid, color: '#4F46E5', bg: '#EEF2FF' },
  electronics: { icon: Smartphone, color: '#0EA5E9', bg: '#E0F2FE' },
  clothing: { icon: Shirt, color: '#EC4899', bg: '#FCE7F3' },
  home: { icon: Home, color: '#10B981', bg: '#D1FAE5' },
  pets: { icon: Dog, color: '#F59E0B', bg: '#FEF3C7' },
  sports: { icon: Dumbbell, color: '#EF4444', bg: '#FEE2E2' },
  vehicles: { icon: Car, color: '#6366F1', bg: '#E0E7FF' },
  services: { icon: Wrench, color: '#8B5CF6', bg: '#EDE9FE' },
  free: { icon: Gift, color: '#EC4899', bg: '#FCE7F3' },
  other: { icon: MoreHorizontal, color: '#6B7280', bg: '#F3F4F6' },
};

export const CATEGORIES = Object.keys(CATEGORY_CONFIG);

export const POPULAR_CITIES = ['Të gjitha', 'Prishtinë', 'Prizren', 'Pejë', 'Ferizaj', 'Gjilan', 'Gjakovë', 'Mitrovicë', 'Fushë Kosovë', 'Podujevë', 'Vushtrri'];
export const KOSOVA_CITIES = ['Të gjitha', 'Deçan', 'Dragash', 'Drenas', 'Ferizaj', 'Fushë Kosovë', 'Gjakovë', 'Gjilan', 'Istog', 'Kaçanik', 'Kamenicë', 'Klinë', 'Lipjan', 'Malishevë', 'Mitrovicë', 'Pejë', 'Podujevë', 'Prishtinë', 'Prizren', 'Rahovec', 'Skenderaj', 'Shtime', 'Suharekë', 'Viti', 'Vushtrri'];
export const ITEM_HEIGHT = 260;
export const MONTHS_SQ = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];
export const DAYS_SQ = ['E Diel', 'E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë'];
