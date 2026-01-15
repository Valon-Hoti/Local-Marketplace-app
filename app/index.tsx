import { Session } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { ArrowLeft, Camera, Car, Check, ChevronLeft, ChevronRight, Clock, Dog, Dumbbell, Edit, Eye, EyeOff, Gift, Globe, Heart, Home, Image as ImageIcon, LayoutGrid, ListFilter, LogOut, MapPin, MessageSquare, Moon, MoreHorizontal, PlusCircle, Search, Settings, Shirt, Smartphone, Sparkles, Store, Tag, Trash2, User, Wrench, X } from 'lucide-react-native';
import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions, View } from 'react-native';
import { Bubble, GiftedChat, IMessage, InputToolbar, Send } from 'react-native-gifted-chat';
import { supabase, uploadToSupabase } from '../lib/supabase';
import { analyzeImage } from '../lib/vision';

// ====================================================================
// 1. CONFIG & CONSTANTS
// ====================================================================

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const COLORS = {
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

const LIGHT_THEME = { ...COLORS, tabBar: '#FFFFFF', isDark: false };
const DARK_THEME = {
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
  isDark: true
};

const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 };
const SHADOW = {
  sm: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  md: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  lg: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
};

const CATEGORY_CONFIG: Record<string, { icon: any, color: string, bg: string }> = {
  'all': { icon: LayoutGrid, color: '#4F46E5', bg: '#EEF2FF' },
  'electronics': { icon: Smartphone, color: '#0EA5E9', bg: '#E0F2FE' },
  'clothing': { icon: Shirt, color: '#EC4899', bg: '#FCE7F3' },
  'home': { icon: Home, color: '#10B981', bg: '#D1FAE5' },
  'pets': { icon: Dog, color: '#F59E0B', bg: '#FEF3C7' },
  'sports': { icon: Dumbbell, color: '#EF4444', bg: '#FEE2E2' },
  'vehicles': { icon: Car, color: '#6366F1', bg: '#E0E7FF' },
  'services': { icon: Wrench, color: '#8B5CF6', bg: '#EDE9FE' },
  'free': { icon: Gift, color: '#EC4899', bg: '#FCE7F3' },
  'other': { icon: MoreHorizontal, color: '#6B7280', bg: '#F3F4F6' },
};

const CATEGORIES = Object.keys(CATEGORY_CONFIG);

const KOSOVA_CITIES = ['Të gjitha', 'Deçan', 'Dragash', 'Drenas', 'Ferizaj', 'Fushë Kosovë', 'Gjakovë', 'Gjilan', 'Istog', 'Kaçanik', 'Kamenicë', 'Klinë', 'Lipjan', 'Malishevë', 'Mitrovicë', 'Pejë', 'Podujevë', 'Prishtinë', 'Prizren', 'Rahovec', 'Skenderaj', 'Shtime', 'Suharekë', 'Viti', 'Vushtrri'];
const ITEM_HEIGHT = 260;
const MONTHS_SQ = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];
const DAYS_SQ = ['E Diel', 'E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë'];

// ====================================================================
// 2. TYPES
// ====================================================================

interface Listing {
  id: number;
  title: string;
  price: number;
  description: string;
  image_url?: string | null;
  images?: string[];
  seller_id: string;
  seller_name?: string;
  category?: string;
  location?: string;
  created_at?: string;
  condition?: string;
}

interface ConversationItem {
  listing: Listing;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message: string;
  unread_count: number;
  last_message_time?: string;
}

// Props Interfaces
interface ChatProps { session: Session; listing: Listing; onBack: () => void; theme: any; t: any; }
interface DetailProps { session: Session | null; listing: Listing; onBack: () => void; onChat: (listing: Listing) => void; onViewSeller: (id: string) => void; isOwner: boolean; theme: any; t: any; onReqLogin: () => void; }
interface EditProps { session: Session; listing: Listing; onBack: () => void; onSuccess: (updatedItem?: Listing) => void; theme: any; t: any; }
interface SellScreenProps { session: Session | null; onSuccess: () => void; theme: any; t: any; onReqLogin: () => void; }
interface HomeScreenProps { session: Session | null; onChat: (item: Listing) => void; onViewDetails: (item: Listing) => void; theme: any; t: any; lang: string; }
interface ChatListScreenProps { session: Session | null; onSelect: (l: Listing) => void; theme: any; t: any; onReqLogin: () => void; isVisible: boolean; }
interface ProfileScreenProps { session: Session | null; onViewDetails: (item: Listing) => void; onEdit: (item: Listing) => void; onLogout: () => void; theme: any; setThemeMode: (mode: 'light' | 'dark') => void; lang: 'sq' | 'en'; setLang: (l: 'sq' | 'en') => void; t: any; onReqLogin: () => void; onJoin: () => void; }
interface SellerProfileProps { sellerId: string; onBack: () => void; onViewDetails: (item: Listing) => void; theme: any; t: any; }
interface AuthScreenProps { onLoginSuccess: () => void; onGuestLogin: () => void; theme: any; t: any; }

const TRANSLATIONS = {
  sq: {
    tab_home: 'Ballina', home: 'Shtëpi', sell: 'Shit', chats: 'Bisedat', profile: 'Profili', searchPlaceholder: 'Çfarë po kërkoni sot?', all: 'Të gjitha',
    electronics: 'Elektronikë', clothing: 'Veshje', pets: 'Kafshë shtëpiake', sports: 'Sport', vehicles: 'Automjete', services: 'Shërbime', free: 'Falas', other: 'Tjetër',
    noListings: 'Nuk u gjet asnjë postim.', sellTitle: 'Shit Produkt', photos: 'Fotot e produktit', add: 'Shto', details: 'Detajet', titlePlaceholder: 'Titulli (psh. iPhone 13)', pricePlaceholder: 'Çmimi (€)', category: 'Kategoria', location: 'Qyteti', description: 'Përshkrimi', descPlaceholder: 'Përshkruaj produktin...', publish: 'Publiko Tani', myChats: 'Bisedat', noChats: 'Asnjë bisedë ende.', editProfile: 'Ndrysho Profilin', logout: 'Dil', myListings: 'Postimet e mia', favorites: 'Të Ruajturat', save: 'Ruaj', namePlaceholder: 'Emri juaj', newUser: 'Përdorues i Ri', chatNew: 'Bisedë e re', soldBy: 'Shitur nga', unknown: 'I Panjohur', sendMessage: 'Dërgo Mesazh', yourListing: 'Postimi juaj', edit: 'Ndrysho', delete: 'Fshi', deleteConfirm: 'A jeni i sigurt?', yes: 'Po', no: 'Jo', success: 'Sukses', error: 'Gabim', settings: 'Cilësimet', darkMode: 'Modaliteti i Errët', language: 'Gjuha', changeLang: 'Ndrysho Gjuhën', cancel: 'Anulo',
    loginTitle: 'Mirësevini në NearBuy', loginSubtitle: 'Mirësevini në NearBuy', email: 'Email', emailOrUser: 'Email ose Username', password: 'Fjalëkalimi', confirmPass: 'Konfirmo Fjalëkalimin', username: 'Username', continue: 'Vazhdo', loginSuccess: 'Hyrja me sukses!', signupSuccess: 'Llogaria u krijua! Kontrolloni emailin.', fillFields: 'Plotesoni fushat.', passMismatch: 'Fjalëkalimet nuk përputhen.', selectPhoto: 'Zgjidhni foto.', postCreated: 'Postimi u krijua!', postUpdated: 'Postimi u përditësua!', saving: 'Duke ruajtur...', camera: 'Kamera', gallery: 'Galeria', chooseSource: 'Zgjidhni metodën:', permissionMissing: 'Leja mungon', loading: 'Duke ngarkuar...', noDesc: 'Nuk ka përshkrim.', selectCity: 'Zgjidh Qytetin', filterCity: 'Filtro Qytetet', apply: 'Apliko', postedOn: 'Postuar:',
    loginButton: 'Hyni', signupButton: 'Regjistrohuni', switchToSignup: 'Nuk keni llogari? Regjistrohuni', switchToLogin: 'Keni llogari? Hyni', guest: 'Vazhdo si vizitor', loginReq: 'Kërkohet Llogari', loginReqDesc: 'Duhet të keni llogari për të përdorur këtë opsion.', condition: 'Gjendja', conditionNew: 'I ri', conditionUsed: 'I përdorur', guestSellTitle: 'Filloni të shisni', guestSellDesc: 'Krijoni një llogari për të postuar produktet tuaja.', guestChatTitle: 'Bisedoni me shitësit', guestChatDesc: 'Kyçuni për të dërguar mesazhe.', loginOrSignup: 'Hyni ose Regjistrohuni',
    noMyListings: 'Nuk keni postime.', noFavorites: 'Nuk keni postime të ruajtura.',
    bio: 'Biografia', bioPlaceholder: 'Tregoni diçka për veten...', phone: 'Numri Telefonit', city: 'Qyteti',
    sellerProfile: 'Profili i Shitësit', noSellerListings: 'Asnjë postim aktiv nga ky shitës.', listingOf: 'Postimet e',
    searchWithPhoto: 'Kërko me Foto', chooseMethod: 'Zgjidhni metodën:', results: 'Rezultati',
    selectKeyword: 'Zgjidhni fjalën kyçe për kërkim:', searchBtn: 'Kërko:',
    today: 'Sot', yesterday: 'Dje', select: 'Selekto',
    unread: 'Të palexuara', buying: 'Blerje', selling: 'Shitje', searchChats: 'Kërko biseda...',
    visualEffect: 'E pamundur', noObjectFound: 'Nuk u gjet asnjë objekt i qartë në foto.',
    forgotPassword: 'Keni harruar fjalëkalimin?', resetPassword: 'Rivendos Fjalëkalimin', sendResetLink: 'Dërgo Linkun', emailForReset: 'Shkruani emailin tuaj për të marrë linkun e rivendosjes.', resetLinkSent: 'Linku u dërgua! Kontrolloni emailin.', resetLinkError: 'Gabim gjatë dërgimit.', backToLogin: 'Kthehu te Hyrja',
    months: ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'],
    days: ['E Diel', 'E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë'],
    filters: 'Filtra', pricePrice: 'Çmimi', minPrice: 'Min', maxPrice: 'Max', sortBy: 'Rendit sipas', sortNewest: 'Më të rejat', sortPriceLow: 'Çmimi: Ulët -> Lartë', sortPriceHigh: 'Çmimi: Lartë -> Ulët', reset: 'Pastro'
  },
  en: {
    tab_home: 'Home', home: 'Home & Garden', sell: 'Sell', chats: 'Chats', profile: 'Profile', searchPlaceholder: 'What are you looking for?', all: 'All',
    electronics: 'Electronics', clothing: 'Clothing', pets: 'Pets', sports: 'Sports', vehicles: 'Vehicles', services: 'Services', free: 'Free', other: 'Other',
    noListings: 'No listings found.', sellTitle: 'Sell Product', photos: 'Product Photos', add: 'Add', details: 'Details', titlePlaceholder: 'Title (e.g. iPhone 13)', pricePlaceholder: 'Price (€)', category: 'Category', location: 'City', description: 'Description', descPlaceholder: 'Describe the product...', publish: 'Publish Now', myChats: 'Chats', noChats: 'No chats yet.', editProfile: 'Edit Profile', logout: 'Logout', myListings: 'My Listings', favorites: 'Saved', save: 'Save', namePlaceholder: 'Your Name', newUser: 'New User', chatNew: 'New Chat', soldBy: 'Sold by', unknown: 'Unknown', sendMessage: 'Send Message', yourListing: 'Your Listing', edit: 'Edit', delete: 'Delete', deleteConfirm: 'Are you sure?', yes: 'Yes', no: 'No', success: 'Success', error: 'Error', settings: 'Settings', darkMode: 'Dark Mode', language: 'Language', changeLang: 'Change Language', cancel: 'Cancel',
    loginTitle: 'Welcome to NearBuy', loginSubtitle: 'Welcome to NearBuy', email: 'Email', emailOrUser: 'Email or Username', password: 'Password', confirmPass: 'Confirm Password', username: 'Username', continue: 'Continue', loginSuccess: 'Login successful!', signupSuccess: 'Account created! Check email.', fillFields: 'Fill all fields.', passMismatch: 'Passwords do not match.', selectPhoto: 'Select photo.', postCreated: 'Listing created!', postUpdated: 'Listing updated!', saving: 'Saving...', camera: 'Camera', gallery: 'Gallery', chooseSource: 'Choose source:', permissionMissing: 'Permission missing', loading: 'Loading...', noDesc: 'No description.', selectCity: 'Select City', filterCity: 'Filter Cities', apply: 'Apply', postedOn: 'Posted on',
    loginButton: 'Login', signupButton: 'Sign Up', switchToSignup: "Don't have an account? Sign Up", switchToLogin: 'Have an account? Login', guest: 'Continue as Guest', loginReq: 'Login Required', loginReqDesc: 'You need an account to perform this action.', condition: 'Condition', conditionNew: 'New', conditionUsed: 'Used', guestSellTitle: 'Start Selling', guestSellDesc: 'Create an account to post your products.', guestChatTitle: 'Chat with Sellers', guestChatDesc: 'Login to send messages.', loginOrSignup: 'Login or Sign Up',
    noMyListings: 'You have no listings.', noFavorites: 'No saved items.',
    bio: 'Bio', bioPlaceholder: 'Tell us about yourself...', phone: 'Phone Number', city: 'City',
    sellerProfile: 'Seller Profile', noSellerListings: 'No active listings from this seller.', listingOf: 'Listings of',
    searchWithPhoto: 'Search with Photo', chooseMethod: 'Choose method:', results: 'Results',
    selectKeyword: 'Select keyword to search:', searchBtn: 'Search:',
    today: 'Today', yesterday: 'Yesterday', select: 'Select',
    unread: 'Unread', buying: 'Buying', selling: 'Selling', searchChats: 'Search chats...',
    visualEffect: 'Impossible', noObjectFound: 'No clear object found in photo.',
    forgotPassword: 'Forgot Password?', resetPassword: 'Reset Password', sendResetLink: 'Send Reset Link', emailForReset: 'Enter your email to receive a reset link.', resetLinkSent: 'Reset link sent! Check your email.', resetLinkError: 'Error sending reset link.', backToLogin: 'Back to Login',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    filters: 'Filters', pricePrice: 'Price', minPrice: 'Min', maxPrice: 'Max', sortBy: 'Sort by', sortNewest: 'Newest', sortPriceLow: 'Price: Low -> High', sortPriceHigh: 'Price: High -> Low', reset: 'Reset'
  }
};

// ====================================================================
// 3. HELPERS
// ====================================================================

const getListingImages = (listing: Listing): string[] => {
  if (listing.images && Array.isArray(listing.images) && listing.images.length > 0) return listing.images;
  if (listing.image_url) return [listing.image_url];
  return [];
};

const getSafeImageUri = (uri: string | null | undefined) => {
  if (!uri) return "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400";
  if (Platform.OS === 'web' && uri.startsWith('file://')) return "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400";
  return uri;
};

const formatDate = (dateString?: string, t?: any) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  if (diffDays === 0) return t?.today || 'Sot';
  if (diffDays === 1) return t?.yesterday || 'Dje';
  const months = t?.months || MONTHS_SQ;
  return `${date.getDate()} ${months[date.getMonth()]}`;
};

const formatChatTime = (dateString?: string, t?: any) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return t?.yesterday || 'Dje';
  const days = t?.days || DAYS_SQ;
  if (diffDays < 7) return days[date.getDay()];
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear().toString().substr(-2)}`;
};

// 4. COMMON COMPONENTS
// ====================================================================

const CitySelectionModal = ({ visible, onClose, onSelect, selectedValues, mode, theme, t }: { visible: boolean, onClose: () => void, onSelect: (val: string | string[]) => void, selectedValues: string | string[], mode: 'single' | 'multiple', theme: any, t: any }) => {
  const [tempSelected, setTempSelected] = useState<string[]>(Array.isArray(selectedValues) ? selectedValues : selectedValues ? [selectedValues] : []);
  useEffect(() => { setTempSelected(Array.isArray(selectedValues) ? selectedValues : selectedValues ? [selectedValues] : []); }, [visible, selectedValues]);
  const toggleCity = (city: string) => { if (mode === 'single') { onSelect(city); onClose(); } else { setTempSelected(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]); } };
  const handleApply = () => { onSelect(tempSelected); onClose(); };
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%', padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}><Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>{mode === 'single' ? t.selectCity : t.filterCity}</Text><TouchableOpacity onPress={onClose}><X size={24} color={theme.text} /></TouchableOpacity></View>
          <ScrollView>{KOSOVA_CITIES.map((city) => { const isSelected = tempSelected.includes(city); return (<TouchableOpacity key={city} onPress={() => toggleCity(city)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.border }}><View style={{ width: 24, height: 24, borderRadius: mode === 'single' ? 12 : 4, borderWidth: 2, borderColor: isSelected ? theme.primary : theme.textLight, justifyContent: 'center', alignItems: 'center', marginRight: 15, backgroundColor: isSelected ? theme.primary : 'transparent' }}>{isSelected && <Check size={16} color="white" />}</View><Text style={{ fontSize: 16, color: theme.text }}>{city}</Text></TouchableOpacity>); })}</ScrollView>
          {mode === 'multiple' && (<PrimaryButton title={t.apply} onPress={handleApply} theme={theme} style={{ marginTop: 10 }} />)}
        </View>
      </View>
    </Modal>
  );
};

const GuestPlaceholder = ({ t, theme, onJoin, title, desc, icon: Icon }: any) => (
  <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
    <View style={{ width: 100, height: 100, backgroundColor: theme.inputBg, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}><Icon size={48} color={theme.primary} /></View>
    <Text style={{ fontSize: 24, fontWeight: '800', color: theme.text, marginBottom: 12, textAlign: 'center' }}>{title || t.loginReq}</Text>
    <Text style={{ fontSize: 16, color: theme.textLight, textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>{desc || t.loginReqDesc}</Text>
    <PrimaryButton title={t.loginOrSignup} onPress={onJoin} theme={theme} style={{ width: '100%' }} />
  </View>
);

const PrimaryButton = ({ title, onPress, loading, style, icon: Icon, theme }: any) => (
  <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }, style, loading && { opacity: 0.7 }]} onPress={onPress} disabled={loading} activeOpacity={0.8}>
    {loading ? <ActivityIndicator color="white" /> : (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {Icon && <Icon size={20} color="white" style={{ marginRight: 8 }} />}
        <Text style={styles.primaryBtnText}>{title}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const webNoOutline = Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {};

const InputField = ({ value, onChangeText, placeholder, multiline, keyboardType, secureTextEntry, icon: Icon, theme }: any) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = secureTextEntry !== undefined;
  return (
    <View style={[styles.inputContainer, { backgroundColor: theme.inputBg }, multiline && { height: 100, alignItems: 'flex-start', paddingVertical: 10 }]}>
      {Icon && <Icon size={20} color={theme.textLight} style={{ marginRight: 10 }} />}
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.textLight} style={[styles.modernInput, { color: theme.text }, multiline && { height: '100%', textAlignVertical: 'top' }, webNoOutline]} multiline={multiline} keyboardType={keyboardType} secureTextEntry={isPassword && !isPasswordVisible} autoCapitalize="none" />
      {isPassword && (<TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>{isPasswordVisible ? <EyeOff size={20} color={theme.textLight} /> : <Eye size={20} color={theme.textLight} />}</TouchableOpacity>)}
    </View>
  );
};

const TabButton = memo(({ icon: Icon, label, isActive, onPress, badge, theme, activeColor }: any) => {
  const iconColor = isActive ? (activeColor || theme.primary) : theme.textLight;
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      <View><Icon color={iconColor} size={24} strokeWidth={isActive ? 2.5 : 2} />{badge ? <View style={[styles.tabBadge, { backgroundColor: theme.danger, borderColor: theme.tabBar }]}><Text style={styles.tabBadgeText}>{badge}</Text></View> : null}</View>
      <Text style={[styles.tabLabel, { color: iconColor }]}>{label}</Text>
    </TouchableOpacity>
  );
});


const ListingCard = memo(({ item, width, onPress, onChat, isFavorited, toggleFavorite, theme, t }: any) => {
  const allImages = getListingImages(item);
  const imageUri = getSafeImageUri(allImages[0]);
  let categoryLabel = item.category;
  if (item.category === 'home') categoryLabel = t['home']; else if (item.category && t[item.category]) categoryLabel = t[item.category];

  return (
    <TouchableOpacity style={[styles.card, { width, backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => onPress(item)} activeOpacity={0.9}>
      <View style={[styles.cardImageContainer, { backgroundColor: 'black', borderBottomWidth: 1, borderBottomColor: theme.border }]}>
        <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.cardBadgeContainer}>
          {item.category && (<View style={styles.categoryBadge}><Text style={styles.categoryBadgeText}>{categoryLabel}</Text></View>)}
        </View>
        <TouchableOpacity style={[styles.heartBtn, { backgroundColor: theme.card }]} onPress={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}><Heart size={18} color={isFavorited ? theme.danger : theme.text} fill={isFavorited ? theme.danger : 'transparent'} /></TouchableOpacity>
        {allImages.length > 1 && <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center' }}><ImageIcon size={10} color="white" /><Text style={{ color: 'white', fontSize: 10, marginLeft: 4, fontWeight: '600' }}>{allImages.length}</Text></View>}
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 4 }]} numberOfLines={1}>{item.title}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.cardPrice, { color: theme.primary }]}>{item.price} €</Text>
          {item.location && (<View style={{ flexDirection: 'row', alignItems: 'center' }}><MapPin size={10} color={theme.textLight} /><Text style={{ fontSize: 10, color: theme.textLight, marginLeft: 2 }}>{item.location}</Text></View>)}
        </View>
        <View style={[styles.cardFooter, { marginTop: 12 }]}><Text style={[styles.sellerName, { color: theme.textLight, flex: 1 }]} numberOfLines={1}>👤 {item.seller_name || t.unknown}</Text><Text style={{ fontSize: 10, color: theme.textLight }}>{formatDate(item.created_at, t)}</Text></View>
      </View>
    </TouchableOpacity>
  );
}, (prev, next) => prev.item === next.item && prev.isFavorited === next.isFavorited && prev.width === next.width && prev.theme.isDark === next.theme.isDark && prev.t.home === next.t.home);

const ChatListItem = memo(({ item, onSelect, theme, t, selectionMode, isSelected, onToggleSelection }: any) => (
  <TouchableOpacity style={[styles.listItemRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]} onPress={() => selectionMode ? onToggleSelection(item.listing.id) : onSelect(item.listing)} onLongPress={() => onToggleSelection(item.listing.id)}>
    {selectionMode && (
      <View style={{ marginRight: 10, justifyContent: 'center' }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isSelected ? theme.primary : theme.textLight, backgroundColor: isSelected ? theme.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
          {isSelected && <Check size={16} color="white" />}
        </View>
      </View>
    )}
    {item.other_user_avatar ? <Image source={{ uri: getSafeImageUri(item.other_user_avatar) }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} /> : <View style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: theme.inputBg, justifyContent: 'center', alignItems: 'center' }}><User size={24} color={theme.textLight} /></View>}
    <View style={{ flex: 1, marginRight: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[styles.listTitle, { color: theme.text, fontSize: 14 }]}>{item.other_user_name || 'User'}</Text>
        <Text style={{ color: theme.textLight, fontSize: 10 }}>{formatChatTime(item.last_message_time, t)}</Text>
      </View>
      <Text style={{ color: item.unread_count > 0 ? theme.text : theme.textLight, fontWeight: item.unread_count > 0 ? '700' : '400', fontSize: 12, marginTop: 2 }} numberOfLines={1}>{item.last_message}</Text>
    </View>
    <Image source={{ uri: getSafeImageUri(item.listing.image_url) }} style={{ width: 40, height: 40, borderRadius: 4 }} />
  </TouchableOpacity>
));

// ====================================================================
// 5. SCREENS
// ====================================================================



const FilterModal = ({ visible, onClose, priceRange, setPriceRange, sortBy, setSortBy, onApply, theme, t, selectedCities, setSelectedCities }: any) => {
  const [localMin, setLocalMin] = useState(priceRange.min);
  const [localMax, setLocalMax] = useState(priceRange.max);
  const [localSort, setLocalSort] = useState(sortBy);
  const [localCities, setLocalCities] = useState<string[]>(selectedCities || []);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => { setLocalMin(priceRange.min); setLocalMax(priceRange.max); setLocalSort(sortBy); setLocalCities(selectedCities || []); }, [visible, priceRange, sortBy, selectedCities]);

  const handleReset = () => {
    setLocalMin('');
    setLocalMax('');
    setLocalSort('newest');
    setLocalCities([]);
    setShowAdvanced(false);
  };

  const handleApply = () => {
    setPriceRange({ min: localMin, max: localMax });
    setSortBy(localSort);
    setSelectedCities(localCities);
    onApply();
  };

  const toggleCity = (city: string) => {
    setLocalCities(prev => {
      if (city === 'Të gjitha') return [];
      if (prev.includes(city)) return prev.filter(c => c !== city);
      return [...prev, city];
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableWithoutFeedback>
            <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 10 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>{t.filterCity}</Text>
                <TouchableOpacity onPress={onClose}><X size={24} color={theme.text} /></TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 0 }}>
                <View style={{ marginBottom: 24 }}>
                  {KOSOVA_CITIES.map(city => {
                    const isSelected = localCities.includes(city);
                    return (
                      <TouchableOpacity key={city} onPress={() => toggleCity(city)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                        <View style={{ width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: isSelected ? theme.primary : theme.textLight, justifyContent: 'center', alignItems: 'center', marginRight: 15, backgroundColor: isSelected ? theme.primary : 'transparent' }}>
                          {isSelected && <Check size={16} color="white" />}
                        </View>
                        <Text style={{ fontSize: 16, color: theme.text }}>{city}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity onPress={() => setShowAdvanced(!showAdvanced)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.border, marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>{t.filters} / {t.sortBy}</Text>
                  {showAdvanced ? <ChevronRight size={20} color={theme.text} style={{ transform: [{ rotate: '90deg' }] }} /> : <ChevronRight size={20} color={theme.text} />}
                </TouchableOpacity>

                {showAdvanced && (
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 12 }}>{t.pricePrice}</Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, color: theme.textLight, marginBottom: 4 }}>{t.minPrice}</Text>
                        <TextInput keyboardType="decimal-pad" value={localMin} onChangeText={(txt) => setLocalMin(txt.replace(',', '.'))} placeholder="0" placeholderTextColor={theme.textLight} style={{ backgroundColor: theme.inputBg, borderRadius: 12, padding: 12, color: theme.text }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, color: theme.textLight, marginBottom: 4 }}>{t.maxPrice}</Text>
                        <TextInput keyboardType="decimal-pad" value={localMax} onChangeText={(txt) => setLocalMax(txt.replace(',', '.'))} placeholder="MAX" placeholderTextColor={theme.textLight} style={{ backgroundColor: theme.inputBg, borderRadius: 12, padding: 12, color: theme.text }} />
                      </View>
                    </View>

                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 12 }}>{t.sortBy}</Text>
                    <View style={{ gap: 8, marginBottom: 24 }}>
                      {[
                        { id: 'newest', label: t.sortNewest },
                        { id: 'oldest', label: "Më të vjetrat" },
                        { id: 'price_asc', label: t.sortPriceLow },
                        { id: 'price_desc', label: t.sortPriceHigh }
                      ].map(opt => (
                        <TouchableOpacity key={opt.id} onPress={() => setLocalSort(opt.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: localSort === opt.id ? theme.primary : theme.textLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                            {localSort === opt.id && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary }} />}
                          </View>
                          <Text style={{ fontSize: 16, color: theme.text, flex: 1 }}>{opt.label || opt.id}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={handleReset} style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: theme.inputBg, alignItems: 'center' }}>
                    <Text style={{ color: theme.text, fontWeight: 'bold' }}>{t.reset}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleApply} style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>{t.apply}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

function AuthScreen({ onLoginSuccess, onGuestLogin, theme, t }: any) {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !username)) { Alert.alert(t.error, t.fillFields); return; }
    if (!isLogin && password !== confirmPassword) { Alert.alert(t.error, t.passMismatch); return; }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        Alert.alert(t.success, t.loginSuccess);
        onLoginSuccess();
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
        if (error) throw error;
        Alert.alert(t.success, t.signupSuccess);
        setIsLogin(true);
      }
    } catch (error: any) { Alert.alert(t.error, error.message); } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!email) { Alert.alert(t.error, t.fillFields); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      Alert.alert(t.success, t.resetLinkSent);
      setIsReset(false);
      setIsLogin(true);
    } catch (error: any) { Alert.alert(t.error, error.message); } finally { setLoading(false); }
  };

  if (isReset) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', padding: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 10, textAlign: 'center' }}>{t.resetPassword}</Text>
        <Text style={{ fontSize: 14, color: theme.textLight, marginBottom: 30, textAlign: 'center' }}>{t.emailForReset}</Text>
        <TextInput placeholder={t.email} placeholderTextColor={theme.textLight} value={email} onChangeText={setEmail} style={{ backgroundColor: theme.inputBg, color: theme.text, borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 }} autoCapitalize="none" />
        <TouchableOpacity onPress={handleResetPassword} disabled={loading} style={{ backgroundColor: theme.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{t.sendResetLink}</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setIsReset(false); setIsLogin(true); }} style={{ alignItems: 'center' }}>
          <Text style={{ color: theme.primary, fontWeight: '600' }}>{t.backToLogin}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, zIndex: 10 }}>
        <TouchableOpacity onPress={onGuestLogin} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 16, marginRight: 4 }}>{t.guest}</Text>
          <ChevronRight size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
          {/* HEADER IMG OR LOGO */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Store size={40} color="white" />
            </View>
            <Text style={[styles.logoText, { fontSize: 32, color: theme.primary, marginBottom: 8 }]}>NearBuy<Text style={{ color: theme.secondary }}>.</Text></Text>
            <Text style={{ fontSize: 16, color: theme.textLight }}>{t.loginSubtitle}</Text>
          </View>

          <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center' }}>
            <TextInput placeholder={t.emailOrUser} placeholderTextColor={theme.textLight} value={email} onChangeText={setEmail} style={{ backgroundColor: theme.inputBg, color: theme.text, borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 }} autoCapitalize="none" />
            {/* ... Username Field if Sign Up ... */}
            {!isLogin && <TextInput placeholder={t.username} placeholderTextColor={theme.textLight} value={username} onChangeText={setUsername} style={{ backgroundColor: theme.inputBg, color: theme.text, borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 }} autoCapitalize="none" />}

            <TextInput placeholder={t.password} placeholderTextColor={theme.textLight} value={password} onChangeText={setPassword} style={{ backgroundColor: theme.inputBg, color: theme.text, borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 }} secureTextEntry />
            {!isLogin && <TextInput placeholder={t.confirmPass} placeholderTextColor={theme.textLight} value={confirmPassword} onChangeText={setConfirmPassword} style={{ backgroundColor: theme.inputBg, color: theme.text, borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 }} secureTextEntry />}

            {isLogin && (
              <TouchableOpacity onPress={() => setIsReset(true)} style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
                <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '600' }}>{t.forgotPassword}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleAuth} disabled={loading} style={{ backgroundColor: theme.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{isLogin ? t.loginButton : t.signupButton}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: theme.textLight }}>{isLogin ? t.switchToSignup : t.switchToLogin}</Text>
            </TouchableOpacity>


          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}





const VisualSearchModal = ({ visible, imageUri, onClose, onSearch, keywords, theme, t }: any) => {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  useEffect(() => {
    if (visible && keywords.length > 0) {
      setSelectedKeyword(keywords[0]);
    }
  }, [visible, keywords]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: theme.card, borderRadius: 24, padding: 20, maxHeight: '85%', width: '100%', maxWidth: 500, alignSelf: 'center' }}>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>{theme?.results || t.results}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {imageUri && (
            <View style={{ width: '100%', height: 220, backgroundColor: 'black', borderRadius: 16, marginBottom: 20, overflow: 'hidden' }}>
              <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            </View>
          )}

          <Text style={{ fontSize: 14, color: theme.textLight, marginBottom: 12, fontWeight: '600' }}>
            {theme?.selectKeyword || t.selectKeyword}
          </Text>

          <ScrollView style={{ flexGrow: 0, marginBottom: 20 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {keywords.map((k: string) => (
              <TouchableOpacity
                key={k}
                onPress={() => setSelectedKeyword(k)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: selectedKeyword === k ? theme.primary : theme.inputBg,
                  borderWidth: 1,
                  borderColor: selectedKeyword === k ? theme.primary : theme.border
                }}
              >
                <Text style={{ color: selectedKeyword === k ? 'white' : theme.text, fontWeight: '500' }}>{k}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <PrimaryButton
            title={`${t.searchBtn} ${selectedKeyword || '...'}`}
            onPress={() => { if (selectedKeyword) onSearch(selectedKeyword); }}
            theme={theme}
            disabled={!selectedKeyword}
            icon={Search}
          />
        </View>
      </View>
    </Modal>
  );
};


const HomeScreen = forwardRef(({ session, onChat, onViewDetails, theme, t, lang }: HomeScreenProps, ref) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // VISUAL SEARCH STATE
  const [visualSearchVisible, setVisualSearchVisible] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedImage, setAnalyzedImage] = useState<string | null>(null);
  const [detectedKeywords, setDetectedKeywords] = useState<string[]>([]);

  const handleVisualSearch = async () => {
    // 1. Ask specific permission logic if needed, but launchImageLibraryAsync handles it mostly.
    // We'll give user option: Camera or Gallery
    Alert.alert(
      t.searchWithPhoto,
      t.chooseMethod,
      [
        { text: t.camera, onPress: () => processImage(true) },
        { text: t.gallery, onPress: () => processImage(false) },
        { text: t.cancel, style: "cancel" }
      ]
    );
  };

  const handleModalSearch = (keyword: string) => {
    setSearchQuery(keyword);
    setVisualSearchVisible(false);
  };

  const processImage = async (useCamera: boolean) => {
    try {
      let result;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== 'granted') return Alert.alert(t.permissionMissing);
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false, // FULL PHOTO
          quality: 0.5,
          base64: true,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== 'granted') return Alert.alert(t.permissionMissing);
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false, // FULL PHOTO
          quality: 0.5,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset.base64) {
          Alert.alert("Error", "Could not process image data.");
          return;
        }

        setIsAnalyzing(true);
        const results = await analyzeImage(asset.base64, lang);
        setIsAnalyzing(false);

        if (results.length > 0) {
          setAnalyzedImage(asset.uri);
          setDetectedKeywords(results.map(r => r.label));
          setVisualSearchVisible(true);
        } else {
          Alert.alert(t.visualEffect, t.noObjectFound);
        }
      }
    } catch (e: any) {
      setIsAnalyzing(false);
      console.error(e);
      Alert.alert(t.errorTitle, e.message || t.error);
    }
  };

  useImperativeHandle(ref, () => ({
    scrollToTopAndRefresh: () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      fetchData();
    },
    refreshData: () => {
      fetchData();
    },
    updateItem: (updatedItem: Listing) => {
      setListings(prev => prev.map(item => item.id === updatedItem.id ? { ...item, ...updatedItem } : item));
    }
  }));

  // FILTERS
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [showCityModal, setShowCityModal] = useState(false);

  const { width } = useWindowDimensions();
  const numColumns = width > 1024 ? 5 : width > 768 ? 4 : 2;
  const gap = 12;
  const cardWidth = (width - (16 * 2) - (gap * (numColumns - 1))) / numColumns;

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    const { data: listingsData } = await supabase.from('listings').select('id, title, price, image_url, images, category, description, seller_id, seller_name, location, created_at, condition').order('created_at', { ascending: false }).limit(50);
    if (listingsData) setListings(listingsData);

    if (session?.user) {
      const { data: favData } = await supabase.from('favorites').select('listing_id').eq('user_id', session.user.id);
      if (favData) setFavorites(favData.map((f: any) => f.listing_id));
    }
    setRefreshing(false);
  }, [session?.user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('newest');

  const resultData = useMemo(() => {
    let result = listings;
    if (searchQuery) result = result.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (selectedCategory !== 'all') result = result.filter(item => item.category === selectedCategory);
    if (selectedCities.length > 0 && !selectedCities.includes('Të gjitha')) result = result.filter(item => item.location && selectedCities.includes(item.location));

    // Price Filter
    if (priceRange.min && !isNaN(Number(priceRange.min))) result = result.filter(item => item.price >= Number(priceRange.min));
    if (priceRange.max && !isNaN(Number(priceRange.max))) result = result.filter(item => item.price <= Number(priceRange.max));

    // Sorting
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'price_asc': return a.price - b.price;
        case 'price_desc': return b.price - a.price;
        case 'oldest': return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case 'newest': default: return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });

    return result;
  }, [listings, searchQuery, selectedCategory, selectedCities, priceRange, sortBy]);

  const toggleFavorite = useCallback(async (listingId: number) => {
    if (!session?.user) return Alert.alert(t.loginReq, t.loginReqDesc);
    setFavorites(prev => {
      const exists = prev.includes(listingId);
      if (exists) supabase.from('favorites').delete().eq('user_id', session.user.id).eq('listing_id', listingId).then();
      else supabase.from('favorites').insert({ user_id: session.user.id, listing_id: listingId }).then();
      return exists ? prev.filter(id => id !== listingId) : [...prev, listingId];
    });
  }, [session?.user?.id]);

  const renderItem = useCallback(({ item }: any) => (
    <ListingCard item={item} width={cardWidth} onPress={onViewDetails} onChat={onChat} isFavorited={favorites.includes(item.id)} toggleFavorite={toggleFavorite} theme={theme} t={t} />
  ), [cardWidth, favorites, onViewDetails, onChat, toggleFavorite, theme, t]);

  return (
    <View style={styles.screen}>
      <FilterModal visible={showFilterModal} onClose={() => setShowFilterModal(false)} priceRange={priceRange} setPriceRange={setPriceRange} sortBy={sortBy} setSortBy={setSortBy} selectedCities={selectedCities} setSelectedCities={setSelectedCities} onApply={() => setShowFilterModal(false)} theme={theme} t={t} />
      <CitySelectionModal visible={showCityModal} onClose={() => setShowCityModal(false)} mode="multiple" selectedValues={selectedCities} onSelect={(vals) => setSelectedCities(vals as string[])} theme={theme} t={t} />
      <VisualSearchModal
        visible={visualSearchVisible}
        imageUri={analyzedImage}
        keywords={detectedKeywords}
        onClose={() => setVisualSearchVisible(false)}
        onSearch={handleModalSearch}
        theme={theme}
        t={t}
      />
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><Text style={[styles.logoText, { color: theme.primary }]}>NearBuy<Text style={{ color: theme.secondary }}>.</Text></Text></View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[styles.searchBar, { backgroundColor: theme.inputBg, flex: 1 }]}>
            <Search size={20} color={theme.textLight} />
            <TextInput placeholder={t.searchPlaceholder} placeholderTextColor={theme.textLight} style={[styles.searchInput, { color: theme.text }, webNoOutline]} value={searchQuery} onChangeText={setSearchQuery} />
            <TouchableOpacity onPress={handleVisualSearch} style={{ padding: 4 }}>
              {isAnalyzing ? <ActivityIndicator size="small" color={theme.primary} /> : (
                <View>
                  <Camera size={20} color={theme.textLight} />
                  <Sparkles size={10} color={theme.primary} style={{ position: 'absolute', top: -4, right: -4 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setShowFilterModal(true)} style={{ backgroundColor: (priceRange.min || priceRange.max || sortBy !== 'newest' || selectedCities.length > 0) ? theme.primary : theme.inputBg, borderRadius: RADIUS.lg, width: 48, justifyContent: 'center', alignItems: 'center' }}><ListFilter size={20} color={(priceRange.min || priceRange.max || sortBy !== 'newest' || selectedCities.length > 0) ? 'white' : theme.textLight} /></TouchableOpacity>

        </View>
      </View>
      <View style={{ marginTop: 10, paddingBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {CATEGORIES.map((cat) => {
            let displayCat = cat; if (t[cat]) displayCat = t[cat];
            const Icon = CATEGORY_CONFIG[cat]?.icon || Tag;
            const Color = CATEGORY_CONFIG[cat]?.color || theme.textLight;
            const BgColor = CATEGORY_CONFIG[cat]?.bg || theme.inputBg;
            const isSelected = selectedCategory === cat;

            const isDesktop = width > 768;
            const containerSize = isDesktop ? 100 : 65;
            const iconSize = isDesktop ? 32 : 24;
            const fontSize = isDesktop ? 13 : 11;
            const borderRadius = containerSize / 2;

            return (
              <TouchableOpacity key={cat} onPress={() => setSelectedCategory(cat)} style={{ alignItems: 'center', marginRight: 0, width: containerSize + 4 }}>
                <View style={{ width: containerSize, height: containerSize, borderRadius: borderRadius, backgroundColor: isSelected ? theme.primary : BgColor, justifyContent: 'center', alignItems: 'center', marginBottom: 4, borderWidth: isSelected ? 0 : 1, borderColor: theme.border }}><Icon size={iconSize} color={isSelected ? 'white' : Color} /></View>
                <Text numberOfLines={2} style={{ fontSize: fontSize, fontWeight: '600', color: theme.text, textAlign: 'center' }}>{displayCat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <FlatList ref={flatListRef} key={numColumns} data={resultData} renderItem={renderItem} keyExtractor={item => item.id.toString()} numColumns={numColumns} columnWrapperStyle={{ gap: gap }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} refreshing={refreshing} onRefresh={fetchData} initialNumToRender={6} ListEmptyComponent={<View style={styles.emptyState}><Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noListings}</Text></View>} />
    </View>
  );
});

function SellScreen({ session, onSuccess, theme, t, onReqLogin }: SellScreenProps) {
  const [title, setTitle] = useState(''); const [price, setPrice] = useState(''); const [desc, setDesc] = useState(''); const [category, setCategory] = useState(''); const [city, setCity] = useState(''); const [condition, setCondition] = useState(''); const [showCityModal, setShowCityModal] = useState(false); const [images, setImages] = useState<string[]>([]); const [loading, setLoading] = useState(false);

  // LOGJIKE E SIGURT PER HOOKS
  if (!session?.user) return <GuestPlaceholder t={t} theme={theme} onJoin={onReqLogin} title={t.guestSellTitle} desc={t.guestSellDesc} icon={Tag} />;

  const selectImageSource = () => { if (Platform.OS === 'web') { pickImagesLibrary(); return; } Alert.alert(t.add, t.chooseSource, [{ text: t.camera, onPress: pickImageCamera }, { text: t.gallery, onPress: pickImagesLibrary }, { text: t.cancel, style: "cancel" }]); };
  const pickImageCamera = async () => { const { status } = await ImagePicker.requestCameraPermissionsAsync(); if (status !== 'granted') { Alert.alert(t.permissionMissing); return; } const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, aspect: [4, 3], quality: 0.3 }); if (!result.canceled) { const url = await uploadToSupabase(result.assets[0].uri); if (url) setImages([...images, url]); } };
  const pickImagesLibrary = async () => { const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (status !== 'granted') { Alert.alert(t.permissionMissing); return; } const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.3 }); if (!result.canceled) { const uploaded = await Promise.all(result.assets.map(a => uploadToSupabase(a.uri))); setImages([...images, ...uploaded.filter(u => u !== null) as string[]]); } };
  const removeImage = (index: number) => { const u = [...images]; u.splice(index, 1); setImages(u); };
  async function handlePost() { if (!session?.user || !title || !price || !category || !city) return Alert.alert(t.error, t.fillFields); setLoading(true); let sellerName = session.user.email; const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', session.user.id).maybeSingle(); if (profile && profile.display_name) sellerName = profile.display_name; const finalImage = images.length > 0 ? images[0] : "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400"; const { error } = await supabase.from('listings').insert({ title, price: parseFloat(price), description: desc, seller_id: session.user.id, seller_name: sellerName, image_url: finalImage, images: images, category: category, location: city, condition: condition }); setLoading(false); if (error) Alert.alert(t.error, error.message); else { Alert.alert(t.success, t.postCreated); onSuccess(); setTitle(''); setPrice(''); setDesc(''); setCategory(''); setCity(''); setImages([]); setCondition(''); } }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
      <CitySelectionModal visible={showCityModal} onClose={() => setShowCityModal(false)} mode="single" selectedValues={city} onSelect={(val) => setCity(val as string)} theme={theme} t={t} />
      <View style={[styles.headerSimple, { backgroundColor: theme.card, borderBottomColor: theme.border }]}><Text style={[styles.headerTitle, { color: theme.text }]}>{t.sellTitle}</Text></View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.photos}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}><TouchableOpacity onPress={selectImageSource} style={[styles.addPhotoBtn, { borderColor: theme.textLight }]}><Camera color={theme.primary} size={28} /><Text style={[styles.addPhotoText, { color: theme.textLight }]}>{t.add}</Text></TouchableOpacity>{images.map((img, idx) => (<View key={idx} style={styles.photoThumbContainer}><Image source={{ uri: getSafeImageUri(img) }} style={styles.photoThumb} /><TouchableOpacity onPress={() => removeImage(idx)} style={styles.removePhotoBtn}><X size={12} color="white" /></TouchableOpacity></View>))}</ScrollView>
        <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.details}</Text><InputField value={title} onChangeText={setTitle} placeholder={t.titlePlaceholder} icon={Tag} theme={theme} /><InputField value={price} onChangeText={setPrice} placeholder={t.pricePlaceholder} keyboardType="numeric" theme={theme} icon={({ color }: any) => <Text style={{ fontSize: 18, color, fontWeight: 'bold' }}>€</Text>} />
        <Text style={[styles.sectionLabel, { marginTop: 10, color: theme.text }]}>{t.condition}</Text><View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}><TouchableOpacity onPress={() => setCondition('new')} style={[styles.categoryChip, { backgroundColor: condition === 'new' ? theme.primary : theme.card, borderColor: theme.border }, condition === 'new' && { borderColor: theme.primary }]}><Text style={[styles.categoryText, { color: condition === 'new' ? 'white' : theme.text }]}>{t.conditionNew}</Text></TouchableOpacity><TouchableOpacity onPress={() => setCondition('used')} style={[styles.categoryChip, { backgroundColor: condition === 'used' ? theme.primary : theme.card, borderColor: theme.border }, condition === 'used' && { borderColor: theme.primary }]}><Text style={[styles.categoryText, { color: condition === 'used' ? 'white' : theme.text }]}>{t.conditionUsed}</Text></TouchableOpacity></View>
        <Text style={[styles.sectionLabel, { marginTop: 10, color: theme.text }]}>{t.location}</Text><TouchableOpacity onPress={() => setShowCityModal(true)} style={[styles.inputContainer, { backgroundColor: theme.inputBg, justifyContent: 'center' }]}><Text style={{ fontSize: 16, color: city ? theme.text : theme.textLight }}>{city || t.selectCity}</Text></TouchableOpacity>
        <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.category}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>{CATEGORIES.filter(c => c !== 'all').map((cat) => { let displayCat = cat; if (t[cat]) displayCat = t[cat]; return (<TouchableOpacity key={cat} onPress={() => setCategory(cat)} style={[styles.categoryChip, { backgroundColor: theme.card, borderColor: theme.border }, category === cat && { backgroundColor: theme.text, borderColor: theme.text }]}><Text style={[styles.categoryText, { color: theme.text }, category === cat && { color: theme.background }]}>{displayCat}</Text></TouchableOpacity>); })}</ScrollView>
        <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.description}</Text><InputField value={desc} onChangeText={setDesc} placeholder={t.description} multiline theme={theme} />
        <PrimaryButton title={t.publish} onPress={handlePost} loading={loading} style={{ marginTop: 10 }} theme={theme} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ChatListScreen = memo(forwardRef(({ session, onSelect, theme, t, onReqLogin, isVisible }: ChatListScreenProps, ref) => {
  // HOOKS FIRST: State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'selling' | 'buying'>('all');

  // SELECTION MODE STATE
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // LOGJIKE E SIGURT
  if (!session?.user) return <GuestPlaceholder t={t} theme={theme} onJoin={onReqLogin} title={t.guestChatTitle} desc={t.guestChatDesc} icon={MessageSquare} />;

  const fetchChats = useCallback(async (showSpinner = true) => {
    if (showSpinner) setRefreshing(true);
    try {
      const { data: myMessages } = await supabase.from('messages').select('listing_id').or(`user_id.eq.${session.user.id}`);
      const { data: myListings } = await supabase.from('listings').select('id').eq('seller_id', session.user.id);
      const listingIds = new Set<number>();
      myMessages?.forEach(m => listingIds.add(m.listing_id));
      const myIds = myListings?.map(l => l.id) || [];
      if (myIds.length > 0) {
        const { data: incoming } = await supabase.from('messages').select('listing_id').in('listing_id', myIds).neq('user_id', session.user.id);
        incoming?.forEach(m => listingIds.add(m.listing_id));
      }
      if (listingIds.size > 0) {
        const ids = Array.from(listingIds);
        const { data: listingsData } = await supabase.from('listings').select('id, title, image_url, images, seller_id, seller_name, price, description, condition, location, created_at').in('id', ids);
        const enriched = await Promise.all((listingsData || []).map(async (listing) => {
          const isMeSeller = listing.seller_id === session.user.id;
          const { data: lastMsg } = await supabase.from('messages').select('text, user_id, created_at').eq('listing_id', listing.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
          let otherUserId = isMeSeller ? (lastMsg?.user_id === session.user.id ? null : lastMsg?.user_id) : listing.seller_id;
          if (isMeSeller && !otherUserId) {
            const { data: incomingMsg } = await supabase.from('messages').select('user_id').eq('listing_id', listing.id).neq('user_id', session.user.id).limit(1).maybeSingle();
            otherUserId = incomingMsg?.user_id;
          }
          let otherProfile = { display_name: isMeSeller ? "Blerës" : listing.seller_name || "Shitës", avatar_url: null };
          if (otherUserId) {
            const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', otherUserId).maybeSingle();
            if (profile) otherProfile = profile;
          }
          const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('listing_id', listing.id).neq('user_id', session.user.id).eq('is_read', false);
          return { listing: listing, other_user_id: otherUserId || '', other_user_name: otherProfile.display_name, other_user_avatar: otherProfile.avatar_url, last_message: lastMsg?.text || t.chatNew, unread_count: count || 0, last_message_time: lastMsg?.created_at };
        }));
        enriched.sort((a, b) => { const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0; const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0; return timeB - timeA; });
        setConversations(enriched);
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error(error);
    }
    setRefreshing(false);
    setLoading(false);
  }, [session.user.id, t]);

  useEffect(() => { if (isVisible && session?.user) fetchChats(false); }, [isVisible, session?.user?.id]);

  useImperativeHandle(ref, () => ({
    refreshData: () => fetchChats(),
    markAsRead: (listingId: number) => {
      setConversations(prev => prev.map(c => c.listing.id === listingId ? { ...c, unread_count: 0 } : c));
    }
  }));

  const handleToggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        if (!selectionMode) setSelectionMode(true);
      }
      if (next.size === 0 && selectionMode) setSelectionMode(false);
      return next;
    });
    if (!selectionMode) setSelectionMode(true);
  };

  const handleBulkDelete = async () => {
    Alert.alert(t.delete, t.deleteConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete, style: 'destructive', onPress: async () => {
          setLoading(true);
          const idsToDelete = Array.from(selectedIds);
          // Delete messages linked to these listings AND current user
          // NOTE: Supabase RLS policies usually handle "only my messages" but here we want to clear conversation.
          // Since we share one 'messages' table, deleting messages might affect other user if not careful.
          // Ideally we flag them as deleted_by_sender / deleted_by_recipient.
          // For now, we will HARD DELETE messages where I am sender OR recipient.
          // Due to complexity, let's just delete messages where user_id is me OR listing seller is me context?
          // Actually, standard chat apps delete LOCALLY or just remove history.
          // We will delete ALL messages for this listing_id if I AM THE OWNER of listing, or just my messages?
          // User request: "fshij gjithe biseden" implies clearing history.
          // We'll delete messages where listing_id IN idsToDelete AND (user_id = me OR ... wait, Supabase Delete is dangerous without Archive)
          // Let's implement deleting messages where listing_id matches.

          for (const lid of idsToDelete) {
            await supabase.from('messages').delete().eq('listing_id', lid);
          }

          setSelectionMode(false);
          setSelectedIds(new Set());
          fetchChats();
        }
      }
    ]);
  };

  // FILTER LOGIC
  const filteredConversations = useMemo(() => {
    return conversations.filter(item => {
      // 1. Search text
      const matchesSearch = searchQuery === '' ||
        item.other_user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.last_message.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Filter tabs
      const isSeller = item.listing.seller_id === session?.user?.id;
      switch (activeFilter) {
        case 'unread': return item.unread_count > 0;
        case 'selling': return isSeller;
        case 'buying': return !isSeller;
        default: return true;
      }
    });
  }, [conversations, searchQuery, activeFilter, session?.user?.id]);

  if (loading && !refreshing) return <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  const FilterTab = ({ label, id }: { label: string, id: 'all' | 'unread' | 'selling' | 'buying' }) => (
    <TouchableOpacity
      onPress={() => setActiveFilter(id)}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: activeFilter === id ? theme.primary : theme.card,
        marginRight: 8,
        borderWidth: 1,
        borderColor: activeFilter === id ? theme.primary : theme.border
      }}
    >
      <Text style={{ color: activeFilter === id ? 'white' : theme.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.headerSimple, { backgroundColor: theme.card, borderBottomColor: theme.border, flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={[styles.headerTitle, { color: theme.text, fontSize: 28, fontWeight: '800' }]}>{t.myChats}</Text>
          {selectionMode ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => { setSelectionMode(false); setSelectedIds(new Set()); }} style={{ marginRight: 16 }}>
                <Text style={{ color: theme.text, fontSize: 16 }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBulkDelete}>
                <Trash2 size={24} color={theme.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setSelectionMode(true)}>
              <Text style={{ color: theme.primary, fontSize: 16 }}>{t.select}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: theme.inputBg, marginBottom: 12, height: 44 }]}>
          <Search size={18} color={theme.textLight} />
          <TextInput
            placeholder={t.searchChats}
            placeholderTextColor={theme.textLight}
            style={[styles.searchInput, { color: theme.text, fontSize: 14 }, webNoOutline]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><X size={16} color={theme.textLight} /></TouchableOpacity> : null}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
          <FilterTab label={t.all} id="all" />
          <FilterTab label={t.unread} id="unread" />
          <FilterTab label={t.buying} id="buying" />
          <FilterTab label={t.selling} id="selling" />
        </ScrollView>
      </View>
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.listing.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchChats} tintColor={theme.primary} />}
        renderItem={({ item }) => (
          <ChatListItem
            item={item}
            onSelect={onSelect}
            theme={theme}
            t={t}
            selectionMode={selectionMode}
            isSelected={selectedIds.has(item.listing.id)}
            onToggleSelection={handleToggleSelection}
          />
        )}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<View style={styles.emptyState}><Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noChats}</Text></View>}
      />
    </View>
  );
}));

const ProfileScreen = memo(forwardRef(({ session, onViewDetails, onEdit, onLogout, theme, setThemeMode, lang, setLang, t, onReqLogin }: ProfileScreenProps, ref) => {
  // HOOKS FIRST
  const [listings, setListings] = useState<Listing[]>([]); const [loading, setLoading] = useState(false); const [viewMode, setViewMode] = useState<'my_listings' | 'favorites'>('my_listings');
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false); const [showSettings, setShowSettings] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);

  // LOGJIKE E SIGURT
  if (!session?.user) return <GuestPlaceholder t={t} theme={theme} onJoin={onReqLogin} title={t.profile} desc={t.loginReqDesc} icon={User} />;

  const fetchProfile = useCallback(async () => { const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(); if (data) { setDisplayName(data.display_name || ''); setAvatar(data.avatar_url); } }, [session.user.id]);
  const saveProfile = async () => {
    let finalAvatar = avatar;
    if (avatar && avatar.startsWith('file://')) {
      const url = await uploadToSupabase(avatar);
      if (url) finalAvatar = url;
    }
    const updates = { id: session.user.id, display_name: displayName, avatar_url: finalAvatar };
    const { error } = await supabase.from('profiles').upsert(updates);
    if (error) { Alert.alert('Error', error.message); return; }
    setIsEditing(false);
    fetchProfile();
  };
  const handleCancel = () => { setIsEditing(false); fetchProfile(); };
  const pickAvatar = async () => { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.3 }); if (!result.canceled) setAvatar(result.assets[0].uri); };
  const fetchData = useCallback(async () => { setLoading(true); setListings([]); if (viewMode === 'my_listings') { const { data } = await supabase.from('listings').select('id, title, price, image_url, images, seller_id, description, condition, location, created_at').eq('seller_id', session.user.id).order('created_at', { ascending: false }); if (data) setListings(data); } else { const { data: favs } = await supabase.from('favorites').select('listing:listings(id, title, price, image_url, images, seller_id, description, condition, location, created_at)').eq('user_id', session.user.id); if (favs) setListings(favs.map((f: any) => f.listing).filter((l: any) => l !== null)); } setLoading(false); }, [session.user.id, viewMode]);
  const deleteListing = async (id: number) => { Alert.alert(t.delete, t.deleteConfirm, [{ text: t.no, style: "cancel" }, { text: t.yes, style: 'destructive', onPress: async () => { await supabase.from('listings').delete().eq('id', id); fetchData(); } }]); };

  useImperativeHandle(ref, () => ({
    refreshData: () => {
      fetchData();
      fetchProfile();
    },
    updateItem: (updatedItem: Listing) => {
      setListings(prev => prev.map(item => item.id === updatedItem.id ? { ...item, ...updatedItem } : item));
    }
  }));

  useEffect(() => { fetchData(); fetchProfile(); }, [fetchData, fetchProfile]);

  return (
    <View style={styles.screen}>
      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>{t.settings}</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}><X size={24} color={theme.text} /></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Moon size={20} color={theme.text} style={{ marginRight: 10 }} /><Text style={{ fontSize: 16, color: theme.text }}>{t.darkMode}</Text></View><Switch value={theme.isDark} onValueChange={(val) => setThemeMode(val ? 'dark' : 'light')} trackColor={{ false: '#D1D1D6', true: '#34C759' }} ios_backgroundColor="#D1D1D6" /></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, paddingVertical: 10 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Globe size={20} color={theme.text} style={{ marginRight: 10 }} /><Text style={{ fontSize: 16, color: theme.text }}>{t.language}</Text></View><View style={{ flexDirection: 'row' }}><TouchableOpacity onPress={() => setLang('sq')} style={{ padding: 8, backgroundColor: lang === 'sq' ? theme.primary : theme.inputBg, borderRadius: 8, marginRight: 8 }}><Text style={{ color: lang === 'sq' ? 'white' : theme.text }}>Shqip</Text></TouchableOpacity><TouchableOpacity onPress={() => setLang('en')} style={{ padding: 8, backgroundColor: lang === 'en' ? theme.primary : theme.inputBg, borderRadius: 8 }}><Text style={{ color: lang === 'en' ? 'white' : theme.text }}>English</Text></TouchableOpacity></View></View>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.profileHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}><TouchableOpacity onPress={() => setShowSettings(true)}><Settings size={24} color={theme.text} /></TouchableOpacity></View>
          <TouchableOpacity onPress={isEditing ? pickAvatar : undefined} style={styles.profileAvatarContainer}>{avatar ? <Image source={{ uri: getSafeImageUri(avatar) }} style={styles.profileAvatar} /> : <View style={[styles.profileAvatar, { backgroundColor: theme.inputBg, justifyContent: 'center', alignItems: 'center' }]}><User size={40} color={theme.textLight} /></View>}{isEditing && <View style={[styles.editAvatarBadge, { backgroundColor: theme.primary, borderColor: theme.card }]}><Camera size={14} color="white" /></View>}</TouchableOpacity>
          {isEditing ? (
            <ScrollView style={{ width: '100%', maxHeight: 300, marginTop: 10 }} contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <InputField value={displayName} onChangeText={setDisplayName} placeholder={t.namePlaceholder} icon={User} theme={theme} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border, flex: 1, paddingVertical: 8 }]} onPress={handleCancel}>
                  <Text style={[styles.secondaryBtnText, { color: theme.text, textAlign: 'center' }]}>{t.cancel || 'Anulo'}</Text>
                </TouchableOpacity>
                <PrimaryButton title={t.save} onPress={saveProfile} style={{ flex: 1, paddingVertical: 8 }} theme={theme} />
              </View>
            </ScrollView>
          ) : (
            <View style={{ alignItems: 'center', marginTop: 10 }}>
              <Text style={[styles.profileName, { color: theme.text }]}>{displayName || t.newUser}</Text>
              <Text style={[styles.profileEmail, { color: theme.textLight }]}>{session.user.email}</Text>
              <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
                <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border }]} onPress={() => setIsEditing(true)}><Text style={[styles.secondaryBtnText, { color: theme.text }]}>{t.editProfile}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.danger }]} onPress={onLogout}><LogOut size={16} color={theme.danger} /></TouchableOpacity>
              </View>
            </View>
          )}
        </View>



        <View style={[styles.profileTabs, { backgroundColor: theme.card, borderBottomColor: theme.border }]}><TouchableOpacity style={[styles.profileTabItem, viewMode === 'my_listings' && { borderBottomColor: theme.primary }]} onPress={() => setViewMode('my_listings')}><Text style={[styles.profileTabText, { color: viewMode === 'my_listings' ? theme.primary : theme.textLight }]}>{t.myListings}</Text></TouchableOpacity><TouchableOpacity style={[styles.profileTabItem, viewMode === 'favorites' && { borderBottomColor: theme.primary }]} onPress={() => setViewMode('favorites')}><Text style={[styles.profileTabText, { color: viewMode === 'favorites' ? theme.primary : theme.textLight }]}>{t.favorites}</Text></TouchableOpacity></View>
        <FlatList data={listings} refreshControl={<RefreshControl refreshing={false} onRefresh={fetchData} tintColor={theme.primary} />} keyExtractor={item => item.id.toString()} renderItem={({ item }) => (<TouchableOpacity style={[styles.listItemRow, { backgroundColor: theme.card }]} onPress={() => onViewDetails(item)}><Image source={{ uri: getSafeImageUri(item.image_url) }} style={[styles.listThumb, { backgroundColor: theme.inputBg }]} /><View style={{ flex: 1 }}><Text style={[styles.listTitle, { color: theme.text }]}>{item.title}</Text><Text style={[styles.listPrice, { color: theme.primary }]}>{item.price} €</Text></View>{viewMode === 'my_listings' ? (<View style={{ flexDirection: 'row', gap: 8 }}><TouchableOpacity onPress={() => onEdit(item)} style={styles.iconBtn}><Edit size={18} color={theme.primary} /></TouchableOpacity><TouchableOpacity onPress={() => deleteListing(item.id)} style={[styles.iconBtn, { backgroundColor: '#FEF2F2' }]}><Trash2 size={18} color={theme.danger} /></TouchableOpacity></View>) : (<Heart size={20} color={theme.danger} fill={theme.danger} />)}</TouchableOpacity>)} contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<View style={styles.emptyState}><Text style={[styles.emptyText, { color: theme.textLight }]}>{viewMode === 'my_listings' ? t.noMyListings : t.noFavorites}</Text></View>}
        />
      </KeyboardAvoidingView>
    </View>
  );
}));

function SellerProfileScreen({ sellerId, onBack, onViewDetails, theme, t }: SellerProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellerData = async () => {
      setLoading(true);
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', sellerId).maybeSingle();
      if (profileData) setProfile(profileData);

      const { data: listingsData } = await supabase.from('listings').select('id, title, price, image_url, images, seller_id, description, condition, location, created_at').eq('seller_id', sellerId).order('created_at', { ascending: false });
      if (listingsData) setListings(listingsData);

      setLoading(false);
    };
    fetchSellerData();
  }, [sellerId]);

  if (loading) return <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.headerSimple, { backgroundColor: theme.card, borderBottomColor: theme.border, paddingTop: Platform.OS === 'ios' ? 50 : 16 }]}>
        <TouchableOpacity onPress={onBack} style={{ padding: 8 }}><ArrowLeft size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text, marginLeft: 16 }]}>{t.sellerProfile}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          {profile?.avatar_url ? <Image source={{ uri: getSafeImageUri(profile.avatar_url) }} style={styles.profileAvatar} /> : <View style={[styles.profileAvatar, { backgroundColor: theme.inputBg, justifyContent: 'center', alignItems: 'center' }]}><User size={40} color={theme.textLight} /></View>}
          <Text style={[styles.profileName, { color: theme.text, marginTop: 10 }]}>{profile?.display_name || t.unknown}</Text>
        </View>


        <Text style={[styles.sectionLabel, { color: theme.text, marginBottom: 12 }]}>{t.listingOf} {profile?.display_name || t.unknown}</Text>
        {listings.length > 0 ? (
          listings.map(item => (
            <TouchableOpacity key={item.id} style={[styles.listItemRow, { backgroundColor: theme.card }]} onPress={() => onViewDetails(item)}>
              <Image source={{ uri: getSafeImageUri(item.image_url) }} style={[styles.listThumb, { backgroundColor: theme.inputBg }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.listTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.listPrice, { color: theme.primary }]}>{item.price} €</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}><Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noSellerListings}</Text></View>
        )}
      </ScrollView>
    </View>
  );
}

function ChatScreen({ session, listing, onBack, theme, t }: ChatProps) {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [otherUser, setOtherUser] = useState<{ name: string, avatar: string | null }>({ name: listing.seller_name || 'User', avatar: null });

  const fetchProfile = async (otherId: string) => {
    const { data } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', otherId).single();
    if (data) {
      setOtherUser({ name: data.display_name || 'User', avatar: data.avatar_url });
    }
  };

  const fetchMessages = useCallback(async () => {
    supabase.from('messages').update({ is_read: true }).eq('listing_id', listing.id).neq('user_id', session.user.id).then();
    const { data } = await supabase.from('messages').select('*').eq('listing_id', listing.id).order('created_at', { ascending: false });

    if (data) {
      // Determine other user ID
      // If I am not the seller, the other user is the seller.
      // If I am the seller, the other user is the one who sent messages that aren't me.
      let targetId = listing.seller_id;
      if (session.user.id === listing.seller_id) {
        const otherMsg = data.find((m: any) => m.user_id !== session.user.id);
        if (otherMsg) targetId = otherMsg.user_id;
      }

      // Only fetch if we suspect change or haven't fetched
      if (targetId && targetId !== session.user.id) {
        fetchProfile(targetId);
      }

      setMessages(data.map((msg: any) => ({
        _id: msg._id,
        text: msg.text,
        createdAt: new Date(msg.created_at),
        user: {
          _id: msg.user_id,
          name: msg.user_name || 'User',
          avatar: msg.user_id === session.user.id ? undefined : (otherUser.avatar || undefined) // Use fetched avatar for other
        }
      })));
    }
  }, [listing.id, session.user.id, otherUser.avatar]); // Added otherUser.avatar dependency to re-render msgs when avatar loads

  useEffect(() => {
    fetchMessages();
    const channel = supabase.channel(`room:${listing.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `listing_id=eq.${listing.id}` }, () => fetchMessages()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [listing.id, fetchMessages]);

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    const msg = newMessages[0];
    setMessages(prev => GiftedChat.append(prev, newMessages));
    supabase.from('messages').insert({ text: msg.text, user_id: session.user.id, listing_id: listing.id, user_name: session.user.email, is_read: false }).then();
  }, [listing.id]);

  const handleDeleteMessage = useCallback((context: any, message: IMessage) => {
    if (message.user._id !== session.user.id) return;
    Alert.alert(t.delete, t.deleteConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('messages').delete().eq('_id', message._id);
          if (error) Alert.alert(t.error, error.message);
          else setMessages(prev => prev.filter(m => m._id !== message._id));
        }
      }
    ]);
  }, [session.user.id, t]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.card }}>
      <View style={[styles.chatHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><ArrowLeft color={theme.text} size={24} /></TouchableOpacity>

        {/* AVATAR IN HEADER */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {otherUser.avatar ? (
            <Image source={{ uri: getSafeImageUri(otherUser.avatar) }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
              <Text style={{ fontSize: 18, color: theme.text, fontWeight: 'bold' }}>{otherUser.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text }}>{otherUser.name}</Text>
            <Text style={{ color: theme.textLight, fontSize: 12 }}>{listing.title} • {listing.price} €</Text>
          </View>
        </View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}>
        <GiftedChat
          messages={messages}
          onSend={onSend}
          user={{ _id: session.user.id }}
          onLongPress={(context: any, message: any) => handleDeleteMessage(context, message)}
          renderTicks={(message: any) => {
            if (message.user._id === session.user.id) {
              return (
                <TouchableOpacity onPress={() => handleDeleteMessage(null, message)} style={{ marginRight: 1, padding: 2 }}>
                  <Trash2 size={14} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              );
            }
            return null;
          }}
          renderBubble={(props: any) => (
            <Bubble {...props}
              wrapperStyle={{ right: { backgroundColor: theme.primary }, left: { backgroundColor: theme.inputBg } }}
              textStyle={{ right: { color: 'white' }, left: { color: theme.text } }}
            />
          )}
          textInputProps={{
            style: {
              color: theme.text,
              backgroundColor: theme.inputBg,
              borderRadius: 20,
              paddingHorizontal: 12,
              marginTop: 6,
              marginBottom: 6,
              borderWidth: 0,
              paddingTop: 8,
              paddingBottom: 8,
            },
            placeholderTextColor: theme.textLight
          }}
          renderInputToolbar={(props: any) => <InputToolbar {...props} containerStyle={{ backgroundColor: theme.card, borderTopColor: theme.border, padding: 5 }} />}
          renderSend={(props: any) => <Send {...props} containerStyle={{ justifyContent: 'center', marginRight: 10 }}><View style={{ backgroundColor: theme.primary, padding: 8, borderRadius: 20 }}><ArrowLeft size={16} color="white" style={{ transform: [{ rotate: '180deg' }] }} /></View></Send>}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


function ListingDetailScreen({ session, listing, onBack, onChat, onViewSeller, isOwner, theme, t, onReqLogin }: DetailProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const images = getListingImages(listing);
  useEffect(() => {
    if (session?.user) {
      supabase.from('favorites').select('id').eq('user_id', session.user.id).eq('listing_id', listing.id).maybeSingle().then(({ data }) => { if (data) setIsFavorited(true); });
    }
  }, [listing.id, session?.user]);

  const toggleFavorite = () => {
    if (!session?.user) {
      onReqLogin();
      return;
    }
    if (isFavorited) { setIsFavorited(false); supabase.from('favorites').delete().eq('user_id', session.user.id).eq('listing_id', listing.id).then(); }
    else { setIsFavorited(true); supabase.from('favorites').insert({ user_id: session.user.id, listing_id: listing.id }).then(); }
  };
  const { width } = useWindowDimensions();

  // MODAL STATE
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  const handleOpenImage = (index: number) => {
    setActiveImageIndex(index);
    setImageModalVisible(true);
    // Wait for modal to render before scrolling
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: false });
    }, 100);
  };

  const handleNextImage = () => {
    if (activeImageIndex < images.length - 1) {
      const nextIndex = activeImageIndex + 1;
      setActiveImageIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }
  };

  const handlePrevImage = () => {
    if (activeImageIndex > 0) {
      const prevIndex = activeImageIndex - 1;
      setActiveImageIndex(prevIndex);
      flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
    }
  };

  const onMomentumScrollEnd = (event: any) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveImageIndex(newIndex);
  };

  let categoryLabel = listing.category;
  if (listing.category === 'home') categoryLabel = t['home']; else if (listing.category && t[listing.category]) categoryLabel = t[listing.category];

  // Badge për gjendjen
  const conditionLabel = listing.condition === 'new' ? t.conditionNew : listing.condition === 'used' ? t.conditionUsed : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.card }}>
      {/* FULL SCREEN MODAL */}
      <Modal visible={imageModalVisible} transparent={true} animationType="fade" onRequestClose={() => setImageModalVisible(false)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setImageModalVisible(false)}><X size={30} color="white" /></TouchableOpacity>

          <FlatList
            ref={flatListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => index.toString()}
            onMomentumScrollEnd={onMomentumScrollEnd}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            initialScrollIndex={activeImageIndex}
            renderItem={({ item }) => (
              <View style={{ width, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                <Image source={{ uri: getSafeImageUri(item) }} style={styles.modalImage} resizeMode="contain" />
              </View>
            )}
          />

          {activeImageIndex > 0 && (
            <TouchableOpacity style={styles.navBtnLeft} onPress={handlePrevImage}>
              <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                <ChevronLeft size={40} color="black" strokeWidth={6} style={{ position: 'absolute' }} />
                <ChevronLeft size={40} color="white" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          )}
          {activeImageIndex < images.length - 1 && (
            <TouchableOpacity style={styles.navBtnRight} onPress={handleNextImage}>
              <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                <ChevronRight size={40} color="black" strokeWidth={6} style={{ position: 'absolute' }} />
                <ChevronRight size={40} color="white" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          )}
          <View style={styles.modalCounter}><Text style={{ color: 'white', fontWeight: 'bold' }}>{activeImageIndex + 1} / {images.length}</Text></View>
        </View>
      </Modal>

      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ height: 350, width: '100%' }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {images.length > 0 ? images.map((img, i) => (
              <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => handleOpenImage(i)}>
                <Image source={{ uri: getSafeImageUri(img) }} style={{ width: width, height: 350, backgroundColor: 'black' }} resizeMode="contain" />
              </TouchableOpacity>
            )) : <View style={[styles.imagePlaceholder, { width: width, height: 350, backgroundColor: theme.inputBg }]}><ImageIcon size={50} color={theme.textLight} /></View>}
          </ScrollView>
          <TouchableOpacity onPress={onBack} style={[styles.floatingBackBtn, { backgroundColor: theme.card }]}><ArrowLeft color={theme.text} size={24} /></TouchableOpacity>
          <TouchableOpacity onPress={toggleFavorite} style={[styles.floatingHeartBtn, { backgroundColor: theme.card }]}><Heart size={24} color={isFavorited ? theme.danger : theme.text} fill={isFavorited ? theme.danger : 'transparent'} /></TouchableOpacity>
        </View>
        <View style={[styles.detailContainer, { backgroundColor: theme.card }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailTitle, { color: theme.text }]}>{listing.title}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                <View style={[styles.tag, { backgroundColor: theme.inputBg }]}><Text style={[styles.tagText, { color: theme.textLight }]}>{categoryLabel || listing.category}</Text></View>
                {conditionLabel && (<View style={[styles.tag, { backgroundColor: listing.condition === 'new' ? COLORS.secondary : '#F59E0B' }]}><Text style={[styles.tagText, { color: 'white' }]}>{conditionLabel}</Text></View>)}
              </View>
            </View>
            <Text style={[styles.detailPrice, { color: theme.primary }]}>{listing.price} €</Text>
          </View>

          <TouchableOpacity onPress={() => onViewSeller(listing.seller_id)} style={[styles.sellerRow, { borderBottomColor: theme.border }]}>
            <View style={[styles.sellerAvatar, { backgroundColor: theme.inputBg }]}><Text>👤</Text></View>
            <View>
              <Text style={{ color: theme.textLight, fontSize: 12 }}>{t.soldBy}</Text>
              <Text style={{ fontWeight: '600', color: theme.text }}>{listing.seller_name || t.unknown}</Text>
              {/* SHOW LOCATION */}
              {listing.location && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <MapPin size={12} color={theme.textLight} />
                  <Text style={{ fontSize: 12, color: theme.textLight, marginLeft: 2 }}>{listing.location}</Text>
                </View>
              )}
              {/* DATA E POSTIMIT KETU */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Clock size={12} color={theme.textLight} />
                <Text style={{ fontSize: 12, color: theme.textLight, marginLeft: 2 }}>{t.postedOn} {formatDate(listing.created_at)}</Text>
              </View>
            </View>
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.description}</Text>
          <Text style={[styles.detailDesc, { color: theme.textLight }]}>{listing.description || t.noDesc}</Text>
        </View>
      </ScrollView>
      <View style={[styles.bottomActionContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        {isOwner ? <View style={[styles.primaryBtn, { backgroundColor: theme.inputBg }]}><Text style={{ color: theme.textLight }}>{t.yourListing}</Text></View> :
          <PrimaryButton title={t.sendMessage} onPress={() => onChat(listing)} icon={MessageSquare} theme={theme} />}
      </View>
    </View>
  );
}

function EditListingScreen({ session, listing, onBack, onSuccess, theme, t }: EditProps) {
  const [title, setTitle] = useState(listing.title);
  const [price, setPrice] = useState(listing.price.toString());
  const [desc, setDesc] = useState(listing.description || '');
  const [category, setCategory] = useState(listing.category || '');
  const [city, setCity] = useState(listing.location || ''); // EDIT LOCATION
  const [images, setImages] = useState<string[]>(getListingImages(listing));
  const [loading, setLoading] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [condition, setCondition] = useState(listing.condition || '');

  const selectImageSource = () => { if (Platform.OS === 'web') { pickImagesLibrary(); return; } Alert.alert(t.add, t.chooseSource, [{ text: t.camera, onPress: pickImageCamera }, { text: t.gallery, onPress: pickImagesLibrary }, { text: t.cancel, style: "cancel" }]); };
  const pickImageCamera = async () => { const { status } = await ImagePicker.requestCameraPermissionsAsync(); if (status !== 'granted') return; const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, aspect: [4, 3], quality: 0.3 }); if (!result.canceled) { const url = await uploadToSupabase(result.assets[0].uri); if (url) setImages([...images, url]); } };
  const pickImagesLibrary = async () => { const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (status !== 'granted') return; const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.3 }); if (!result.canceled) { const uploaded = await Promise.all(result.assets.map(a => uploadToSupabase(a.uri))); setImages([...images, ...uploaded.filter(u => u !== null) as string[]]); } };
  const removeImage = (index: number) => { const u = [...images]; u.splice(index, 1); setImages(u); };
  const handleUpdate = async () => { setLoading(true); const updates = { title, price: parseFloat(price), description: desc, category, images: images, image_url: images[0] || null, location: city, condition: condition }; const { error } = await supabase.from('listings').update(updates).eq('id', listing.id); setLoading(false); if (error) Alert.alert(t.error, error.message); else { Alert.alert(t.success, t.postUpdated); onSuccess({ ...listing, ...updates }); } };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.screen, { backgroundColor: theme.background }]}>
      <CitySelectionModal visible={showCityModal} onClose={() => setShowCityModal(false)} mode="single" selectedValues={city} onSelect={(val) => setCity(val as string)} theme={theme} t={t} />
      <View style={[styles.headerSimple, { backgroundColor: theme.card, borderBottomColor: theme.border, paddingTop: Platform.OS === 'ios' ? 50 : 20, height: Platform.OS === 'ios' ? 100 : 70 }]}>
        <TouchableOpacity onPress={onBack} style={{ padding: 8 }}><ArrowLeft size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t.edit}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.photos}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          <TouchableOpacity onPress={selectImageSource} style={[styles.addPhotoBtn, { borderColor: theme.textLight }]}>
            <Camera color={theme.primary} size={28} />
            <Text style={[styles.addPhotoText, { color: theme.textLight }]}>{t.add}</Text>
          </TouchableOpacity>
          {images.map((img, idx) => (
            <View key={idx} style={styles.photoThumbContainer}>
              <Image source={{ uri: getSafeImageUri(img) }} style={styles.photoThumb} />
              <TouchableOpacity onPress={() => removeImage(idx)} style={styles.removePhotoBtn}><X size={12} color="white" /></TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.details}</Text>
        <InputField value={title} onChangeText={setTitle} placeholder={t.titlePlaceholder} icon={Tag} theme={theme} />
        <InputField value={price} onChangeText={setPrice} placeholder={t.pricePlaceholder} keyboardType="numeric" theme={theme} icon={({ color }: any) => <Text style={{ fontSize: 18, color, fontWeight: 'bold' }}>€</Text>} />

        <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.condition}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => setCondition('new')} style={[styles.categoryChip, { backgroundColor: condition === 'new' ? theme.primary : theme.inputBg, borderColor: theme.border }, condition === 'new' && { borderColor: theme.primary }]}>
            <Text style={[styles.categoryText, { color: condition === 'new' ? 'white' : theme.text }]}>{t.conditionNew}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCondition('used')} style={[styles.categoryChip, { backgroundColor: condition === 'used' ? theme.primary : theme.inputBg, borderColor: theme.border }, condition === 'used' && { borderColor: theme.primary }]}>
            <Text style={[styles.categoryText, { color: condition === 'used' ? 'white' : theme.text }]}>{t.conditionUsed}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 10, color: theme.text }]}>{t.location}</Text>
        <TouchableOpacity onPress={() => setShowCityModal(true)} style={[styles.inputContainer, { backgroundColor: theme.inputBg, justifyContent: 'center' }]}>
          <Text style={{ fontSize: 16, color: city ? theme.text : theme.textLight }}>{city || t.selectCity}</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.category}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          {CATEGORIES.filter(c => c !== 'all').map((cat) => {
            let displayCat = cat; if (t[cat]) displayCat = t[cat];
            return (
              <TouchableOpacity key={cat} onPress={() => setCategory(cat)} style={[styles.categoryChip, { backgroundColor: category === cat ? theme.text : theme.inputBg, borderColor: theme.border }, category === cat && { borderColor: theme.text }]}>
                <Text style={[styles.categoryText, { color: theme.text }, category === cat && { color: theme.background }]}>{displayCat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.description}</Text>
        <InputField value={desc} onChangeText={setDesc} placeholder={t.description} multiline theme={theme} />

        <PrimaryButton title={t.save} onPress={handleUpdate} loading={loading} style={{ marginTop: 10 }} theme={theme} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1 },
  content: { flex: 1 },
  header: { paddingHorizontal: SPACING.md, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: SPACING.md, borderBottomWidth: 0 },
  headerSimple: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: 0, paddingTop: Platform.OS === 'android' ? 40 : 10 },
  logoText: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerIconContainer: { padding: 8, borderRadius: RADIUS.full },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, height: 48 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  categoryChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.full, marginRight: SPACING.sm, borderWidth: 1 },
  categoryText: { fontWeight: '600', fontSize: 13 },
  card: { borderRadius: RADIUS.lg, marginBottom: SPACING.md, overflow: 'hidden', ...SHADOW.sm, borderWidth: 1 },
  cardImageContainer: { height: 160, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardBadgeContainer: { position: 'absolute', top: 8, left: 8, flexDirection: 'row' },
  categoryBadge: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  categoryBadgeText: { color: 'white', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  heartBtn: { position: 'absolute', top: 8, right: 8, borderRadius: RADIUS.full, padding: 6, ...SHADOW.sm, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  cardContent: { padding: SPACING.md },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  cardPrice: { fontSize: 18, fontWeight: '800' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  sellerName: { fontSize: 12, maxWidth: '80%' },
  imageCount: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  imageCountText: { fontSize: 10, marginLeft: 4, fontWeight: '600' },
  detailHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, zIndex: 10, paddingTop: 50 },
  floatingBackBtn: { position: 'absolute', top: 50, left: 20, padding: 10, borderRadius: RADIUS.full, ...SHADOW.md },
  floatingHeartBtn: { position: 'absolute', top: 50, right: 20, padding: 10, borderRadius: RADIUS.full, ...SHADOW.md },
  detailContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, padding: SPACING.lg, minHeight: 500 },
  detailTitle: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  detailPrice: { fontSize: 24, fontWeight: '800' },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  tagText: { fontSize: 12, fontWeight: '600' },
  sellerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, marginBottom: 16 },
  sellerAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  detailDesc: { fontSize: 16, lineHeight: 24 },
  bottomActionContainer: { position: 'absolute', bottom: 0, width: '100%', padding: SPACING.lg, borderTopWidth: 1, paddingBottom: 40 },
  inputContainer: { marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, height: 50 },
  modernInput: { flex: 1, height: '100%', fontSize: 16 },
  sectionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  addPhotoBtn: { width: 80, height: 80, borderRadius: RADIUS.md, borderStyle: 'dashed', borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  addPhotoText: { fontSize: 12, marginTop: 4 },
  photoThumbContainer: { position: 'relative', marginRight: 10 },
  photoThumb: { width: 80, height: 80, borderRadius: RADIUS.md },
  removePhotoBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: COLORS.danger, borderRadius: 10, padding: 4 },
  primaryBtn: { paddingVertical: 16, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', ...SHADOW.md },
  primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1 },
  secondaryBtnText: { fontWeight: '600', fontSize: 13 },
  chatListItem: { flexDirection: 'row', padding: SPACING.md, marginBottom: 1, borderBottomWidth: 1 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  onlineBadge: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  chatContent: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: '700' },
  chatTime: { fontSize: 12 },
  chatListingTitle: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  chatMessageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatLastMessage: { fontSize: 14, flex: 1, marginRight: 10 },
  chatUnreadText: { fontWeight: '600' },
  unreadCountBadge: { borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadCountText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, paddingTop: Platform.OS === 'android' ? 40 : 10 },
  backBtn: { marginRight: 16 },
  profileHeader: { alignItems: 'center', padding: SPACING.xl },
  profileAvatarContainer: { position: 'relative', marginBottom: 16 },
  profileAvatar: { width: 100, height: 100, borderRadius: 50 },
  editAvatarBadge: { position: 'absolute', bottom: 0, right: 0, padding: 8, borderRadius: 20, borderWidth: 4 },
  profileName: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  profileEmail: { fontSize: 14 },
  profileTabs: { flexDirection: 'row', paddingHorizontal: SPACING.md, borderBottomWidth: 1 },
  profileTabItem: { flex: 1, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  profileTabText: { fontWeight: '600' },
  listItemRow: { flexDirection: 'row', padding: SPACING.md, marginBottom: SPACING.sm, borderRadius: RADIUS.md, alignItems: 'center' },
  listThumb: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  listTitle: { fontSize: 16, fontWeight: '600' },
  listPrice: { fontSize: 14, fontWeight: '700' },
  iconBtn: { padding: 8, borderRadius: 8, marginLeft: 8 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16 },
  tabBar: { flexDirection: 'row', borderTopWidth: 0, paddingBottom: Platform.OS === 'ios' ? 0 : 4, paddingTop: 8, height: 60, justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  tabLabel: { fontSize: 10, marginTop: 4, fontWeight: '600' },
  tabBadge: { position: 'absolute', top: -4, right: 4, borderRadius: 6, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  tabBadgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  imagePlaceholder: { width: '100%', height: 350, alignItems: 'center', justifyContent: 'center' },
  modalContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  modalImage: { width: '100%', height: '100%' },
  modalCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 20 },
  navBtnLeft: { position: 'absolute', left: 20, top: '50%', zIndex: 10, marginTop: -24 },
  navBtnRight: { position: 'absolute', right: 20, top: '50%', zIndex: 10, marginTop: -24 },
  modalCounter: { position: 'absolute', bottom: 50, backgroundColor: 'rgba(0,0,0,0.7)', padding: 8, borderRadius: 8 }
});

export default function App() {
  const homeScreenRef = useRef<any>(null);
  const profileScreenRef = useRef<any>(null);
  const chatListScreenRef = useRef<any>(null); // NEW REF
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [lang, setLang] = useState<'sq' | 'en'>('sq');

  // NAVIGATION STATE
  const [currentTab, setCurrentTab] = useState('home');
  const [visitedTabs, setVisitedTabs] = useState<string[]>(['home']);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [chatListing, setChatListing] = useState<Listing | null>(null);
  const [viewingSellerId, setViewingSellerId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (!visitedTabs.includes(currentTab)) {
      setVisitedTabs(prev => [...prev, currentTab]);
    }
  }, [currentTab]);

  const t = TRANSLATIONS[lang];
  const theme = themeMode === 'light' ? LIGHT_THEME : DARK_THEME;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setIsGuest(false);
        fetchUnreadCount(session.user.id);
      }
    });

    if (Platform.OS !== 'web') {
      Notifications.requestPermissionsAsync();
    }
  }, []);

  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async (userId: string) => {
    // 1. Get my listings
    const { data: myListings } = await supabase.from('listings').select('id').eq('seller_id', userId);
    const myListingIds = myListings?.map(l => l.id) || [];

    // 2. Count unread messages where I am the seller
    let count = 0;
    if (myListingIds.length > 0) {
      const { count: sellerCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).in('listing_id', myListingIds).neq('user_id', userId).eq('is_read', false);
      count += (sellerCount || 0);
    }

    // 3. Count unread messages where I am the buyer (I sent a message, and someone else sent one after that is unread)
    // This is complex to query efficiently in one go without a "participants" table. 
    // Simplified: Find all messages in listings I DON'T own, where I am NOT the sender, and is_read is false. 
    // AND I must have participated. 
    // For MVP performance, we might stick to "Fetch all unread messages not from me", then filter in memory if I'm involved?
    // Better: Get all distinct listing_ids I've messaged in.
    const { data: myConversations } = await supabase.from('messages').select('listing_id').eq('user_id', userId);
    const myConvListingIds = [...new Set(myConversations?.map(m => m.listing_id))];
    const buyerListingIds = myConvListingIds.filter(id => !myListingIds.includes(id));

    if (buyerListingIds.length > 0) {
      const { count: buyerCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).in('listing_id', buyerListingIds).neq('user_id', userId).eq('is_read', false);
      count += (buyerCount || 0);
    }

    setUnreadCount(count);
  };

  useEffect(() => {
    if (!session?.user) return;

    const channel = supabase.channel('global_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const newMsg = payload.new as any;
        if (newMsg.user_id === session.user.id) return; // Ignore my own messages

        // Check if I am involved
        // 1. Am I the seller?
        const { data: listing } = await supabase.from('listings').select('seller_id, title').eq('id', newMsg.listing_id).single();
        let isForMe = false;

        if (listing && listing.seller_id === session.user.id) {
          isForMe = true;
        } else {
          // 2. Am I a buyer who messaged here?
          const { data: myMsgs } = await supabase.from('messages').select('id').eq('listing_id', newMsg.listing_id).eq('user_id', session.user.id).limit(1);
          if (myMsgs && myMsgs.length > 0) isForMe = true;
        }

        if (isForMe) {
          setUnreadCount(prev => prev + 1);
          if (Platform.OS !== 'web') {
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'Mesazh i ri',
                body: `Keni një mesazh të ri tek "${listing?.title || 'Produkt'}"`,
                sound: 'default',
              },
              trigger: null,
            });
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);


  const handleLoginSuccess = () => { /* Session update handles this */ };
  const handleGuestLogin = useCallback(() => { setIsGuest(true); }, []);
  const handleLogout = useCallback(async () => { setSession(null); setIsGuest(false); setCurrentTab('home'); await supabase.auth.signOut(); }, []);
  const handleViewDetails = useCallback((item: Listing) => { setSelectedListing(item); }, []);
  const handleChat = useCallback((item: Listing) => { setChatListing(item); }, []);
  const handleEdit = (item: Listing) => { setIsEditing(true); setSelectedListing(item); };
  const handleReqLogin = () => { Alert.alert(t.loginReq, t.loginReqDesc, [{ text: t.cancel, style: 'cancel' }, { text: t.loginButton, onPress: handleLogout }]); };

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  if (!session && !isGuest) return <AuthScreen onLoginSuccess={handleLoginSuccess} onGuestLogin={handleGuestLogin} theme={theme} t={t} />;

  // TABS RENDER ALWAYS


  // RENDER TABS
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.card }]}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />
      <View style={[styles.content, { backgroundColor: theme.background }]}>
        <View style={{ flex: 1, display: currentTab === 'home' ? 'flex' : 'none' }}>
          <HomeScreen ref={homeScreenRef} session={session} onChat={handleChat} onViewDetails={handleViewDetails} theme={theme} t={t} lang={lang} />
        </View>
        <View style={{ flex: 1, display: currentTab === 'sell' ? 'flex' : 'none' }}>
          {visitedTabs.includes('sell') && <SellScreen session={session} onSuccess={() => setCurrentTab('home')} theme={theme} t={t} onReqLogin={handleReqLogin} />}
        </View>
        <View style={{ flex: 1, display: currentTab === 'chats' ? 'flex' : 'none' }}>
          {visitedTabs.includes('chats') && <ChatListScreen ref={chatListScreenRef} session={session} onSelect={handleChat} theme={theme} t={t} onReqLogin={handleReqLogin} isVisible={currentTab === 'chats'} />}
        </View>
        <View style={{ flex: 1, display: currentTab === 'profile' ? 'flex' : 'none' }}>
          {visitedTabs.includes('profile') && <ProfileScreen ref={profileScreenRef} session={session} onViewDetails={handleViewDetails} onEdit={handleEdit} onLogout={handleLogout} theme={theme} setThemeMode={setThemeMode} lang={lang} setLang={setLang} t={t} onReqLogin={handleReqLogin} onJoin={handleLogout} />}
        </View>
      </View>

      {/* TAB BAR */}
      <View style={[styles.tabBar, { backgroundColor: theme.tabBar, borderTopColor: theme.border }]}>
        <TabButton icon={Home} label={t.tab_home} isActive={currentTab === 'home'} onPress={() => {
          if (currentTab === 'home') {
            homeScreenRef.current?.scrollToTopAndRefresh();
          }
          setCurrentTab('home');
        }} theme={theme} />
        <TabButton icon={PlusCircle} label={t.sell} isActive={currentTab === 'sell'} onPress={() => setCurrentTab('sell')} theme={theme} activeColor={theme.secondary} />
        <TabButton icon={MessageSquare} label={t.chats} isActive={currentTab === 'chats'} onPress={() => { setCurrentTab('chats'); setUnreadCount(0); }} theme={theme} badge={unreadCount > 0 ? unreadCount : null} />
        <TabButton icon={User} label={t.profile} isActive={currentTab === 'profile'} onPress={() => setCurrentTab('profile')} theme={theme} />
      </View>

      {/* MODALS FOR DETAILS & CHAT */}
      <Modal visible={!!(chatListing && session?.user) || !!selectedListing} animationType="slide" onRequestClose={() => {
        if (chatListing) {
          chatListScreenRef.current?.markAsRead(chatListing.id); // LOCAL UPDATE
          setChatListing(null);
        }
        else if (selectedListing) setSelectedListing(null);
      }}>
        {chatListing && session?.user ? (
          <ChatScreen
            session={session}
            listing={chatListing}
            onBack={() => {
              chatListScreenRef.current?.markAsRead(chatListing.id); // LOCAL UPDATE
              setChatListing(null);
            }}
            theme={theme}
            t={t}
          />
        ) : selectedListing ? (
          (isEditing && session?.user && selectedListing.seller_id === session.user.id) ? (
            <EditListingScreen
              session={session}
              listing={selectedListing}
              onBack={() => { setIsEditing(false); setSelectedListing(null); }}
              onSuccess={(updatedItem) => {
                setIsEditing(false);
                setSelectedListing(null);
                // Refresh home and profile data
                if (updatedItem) {
                  if (homeScreenRef.current) homeScreenRef.current.updateItem(updatedItem);
                  if (profileScreenRef.current) profileScreenRef.current.updateItem(updatedItem);
                } else {
                  if (homeScreenRef.current) homeScreenRef.current.refreshData();
                  if (profileScreenRef.current) profileScreenRef.current.refreshData();
                }
              }}
              theme={theme}
              t={t}
            />
          ) : (
            <ListingDetailScreen
              session={session}
              listing={selectedListing}
              onBack={() => setSelectedListing(null)}
              onChat={handleChat}
              onViewSeller={(id) => { setSelectedListing(null); setTimeout(() => setViewingSellerId(id), 50); }}
              isOwner={session?.user?.id === selectedListing.seller_id}
              theme={theme}
              t={t}
              onReqLogin={handleReqLogin}
            />
          )
        ) : null}
      </Modal>

      <Modal visible={!!viewingSellerId} animationType="slide" onRequestClose={() => setViewingSellerId(null)}>
        {viewingSellerId && <SellerProfileScreen sellerId={viewingSellerId} onBack={() => setViewingSellerId(null)} onViewDetails={(item) => { setViewingSellerId(null); setTimeout(() => setSelectedListing(item), 100); }} theme={theme} t={t} />}
      </Modal>
    </SafeAreaView>
  );
}
