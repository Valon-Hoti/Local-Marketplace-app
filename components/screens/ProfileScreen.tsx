import React, {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  memo,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Linking,
  Modal,
  TextInput,
  FlatList,
  Switch,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Settings,
  X,
  Moon,
  Globe,
  Bell,
  Lock,
  ChevronRight,
  Trash2,
  HelpCircle,
  AlertTriangle,
  User,
  Camera,
  Phone,
  MapPin,
  ChevronDown,
  LogOut,
  Star,
  Edit,
  Heart,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileScreenProps, Listing } from '../../types/marketplace';
import { RADIUS } from '../../constants/theme';
import { styles } from '../../constants/styles';
import { getSafeImageUri, formatPhoneNumber, formatListingPrice } from '../../utils/helpers';
import { supabase, uploadToSupabase } from '../../lib/supabase';
import {
  checkRateLimit,
  getRemainingRateLimitTime,
  sanitizeText,
  sanitizePhone,
  sanitizeUrl,
} from '../../lib/security';
import { PrimaryButton, InputField } from '../common/UIComponents';
import { CitySelectionModal } from '../modals/CitySelectionModal';
import { SwipeDownImageModal, ZoomableImageModalItem } from '../modals/ImageViewerModal';

export const ProfileScreen = memo(
  forwardRef(
    (
      {
        session,
        onViewDetails,
        onEdit,
        onLogout,
        theme,
        setThemeMode,
        lang,
        setLang,
        t,
        onReqLogin,
        onJoin,
        onProfileUpdated,
      }: ProfileScreenProps,
      ref
    ) => {
      const { width, height } = useWindowDimensions();
      const insets = useSafeAreaInsets();
      const [displayName, setDisplayName] = useState('');
      const [avatar, setAvatar] = useState<string | null>(null);
      const [phone, setPhone] = useState('');
      const [bio, setBio] = useState('');
      const [city, setCity] = useState('');
      const [isEditing, setIsEditing] = useState(false);
      const [loading, setLoading] = useState(false);
      const [listings, setListings] = useState<Listing[]>([]);
      const [viewMode, setViewMode] = useState<'my_listings' | 'favorites'>('my_listings');
      const [showSettings, setShowSettings] = useState(false);
      const [showCityModal, setShowCityModal] = useState(false);
      const [avatarModalVisible, setAvatarModalVisible] = useState(false);
      const [avatarZoomed, setAvatarZoomed] = useState(false);
      const [sellerRating, setSellerRating] = useState<number | null>(null);
      const [notificationsEnabled, setNotificationsEnabled] = useState(true);

      const fetchProfile = useCallback(async () => {
        if (!session?.user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        if (data) {
          setDisplayName(data.display_name || '');
          setPhone(formatPhoneNumber(data.phone || ''));
          setBio(data.bio || '');
          setCity(data.city || '');
          const safeAv = data.avatar_url && !data.avatar_url.startsWith('blob:') ? data.avatar_url : null;
          setAvatar(safeAv);
        }

        // Load notifications preference
        try {
          const notifPref = await AsyncStorage.getItem('@notifications_enabled');
          if (notifPref !== null) setNotificationsEnabled(notifPref === 'true');
        } catch (e) {}

        // Load seller rating
        try {
          const { data: revData } = await supabase.from('seller_reviews').select('rating').eq('seller_id', session.user.id);
          let revs = revData || [];
          if (revs.length === 0) {
            const localRevRaw = await AsyncStorage.getItem(`@seller_reviews_${session.user.id}`);
            if (localRevRaw) revs = JSON.parse(localRevRaw);
          }
          if (revs && revs.length > 0) {
            const sum = revs.reduce((acc: number, curr: any) => acc + (Number(curr.rating) || 5), 0);
            setSellerRating(sum / revs.length);
          } else {
            setSellerRating(null);
          }
        } catch (e) {}
      }, [session?.user?.id]);

      const fetchData = useCallback(async () => {
        if (!session?.user) return;
        setLoading(true);
        setListings([]);
        if (viewMode === 'my_listings') {
          const { data } = await supabase
            .from('listings')
            .select('id, title, price, image_url, images, category, seller_id, seller_name, description, condition, location, created_at')
            .eq('seller_id', session.user.id)
            .order('created_at', { ascending: false });
          if (data) setListings(data);
        } else {
          const { data: favs } = await supabase
            .from('favorites')
            .select('listing:listings(id, title, price, image_url, images, category, seller_id, seller_name, description, condition, location, created_at)')
            .eq('user_id', session.user.id);
          if (favs) setListings(favs.map((f: any) => f.listing).filter((l: any) => l !== null));
        }
        setLoading(false);
      }, [session?.user?.id, viewMode]);

      useImperativeHandle(ref, () => ({
        refreshData: () => {
          fetchData();
          fetchProfile();
        },
        updateItem: (updatedItem: Listing) => {
          setListings((prev) => prev.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item)));
        },
      }));

      useEffect(() => {
        fetchData();
        fetchProfile();
      }, [fetchData, fetchProfile]);

      const saveProfile = async () => {
        if (!session?.user) return;
        if (!checkRateLimit(`profile_update_${session.user.id}`, 5, 60000)) {
          const sec = getRemainingRateLimitTime(`profile_update_${session.user.id}`, 60000);
          Alert.alert(t.error, (t.rateLimitCooldown || 'Prisni {seconds}s').replace('{seconds}', String(sec)));
          return;
        }
        let finalAvatar = avatar;
        if (avatar && !avatar.startsWith('http')) {
          const url = await uploadToSupabase(avatar);
          if (url) finalAvatar = url;
          else if (avatar.startsWith('blob:')) finalAvatar = null;
        }
        const cleanDisplayName = sanitizeText(displayName, 60);
        const cleanPhone = sanitizePhone(phone);
        const cleanBio = sanitizeText(bio, 500);
        const cleanCity = sanitizeText(city, 80);
        const cleanAvatar = finalAvatar ? sanitizeUrl(finalAvatar) : null;
        const updates = {
          id: session.user.id,
          display_name: cleanDisplayName,
          avatar_url: cleanAvatar,
          phone: cleanPhone,
          bio: cleanBio,
          city: cleanCity,
        };
        const { error } = await supabase.from('profiles').upsert(updates);
        if (error) {
          Alert.alert('Error', error.message);
          return;
        }
        if (cleanDisplayName) {
          await supabase.from('listings').update({ seller_name: cleanDisplayName }).eq('seller_id', session.user.id);
        }
        setIsEditing(false);
        fetchProfile();
        fetchData();
        onProfileUpdated?.();
      };

      const handleCancel = () => {
        setIsEditing(false);
        fetchProfile();
      };

      const pickAvatar = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.3,
        });
        if (!result.canceled) setAvatar(result.assets[0].uri);
      };

      const deleteListing = async (id: number) => {
        if (!session?.user?.id) return;
        Alert.alert(t.delete, t.deleteConfirm, [
          { text: t.no, style: 'cancel' },
          {
            text: t.yes,
            style: 'destructive',
            onPress: async () => {
              await supabase.from('listings').delete().eq('id', id).eq('seller_id', session.user.id);
              fetchData();
            },
          },
        ]);
      };

      const toggleNotifications = async (val: boolean) => {
        setNotificationsEnabled(val);
        await AsyncStorage.setItem('@notifications_enabled', val ? 'true' : 'false');
      };

      const handleChangePassword = async () => {
        if (!session?.user?.email) return;
        if (!checkRateLimit('reset_password_profile', 2, 60000)) {
          const sec = getRemainingRateLimitTime('reset_password_profile', 60000);
          Alert.alert(t.error, (t.rateLimitCooldown || 'Prisni {seconds}s').replace('{seconds}', String(sec)));
          return;
        }
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(session.user.email);
          if (error) {
            const msg = error.message || '';
            if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('rate exceeded')) {
              Alert.alert(t.error, t.rateLimitExceeded || 'Keni tejkaluar limitin e dërgimit të emaileve. Ju lutem provoni përsëri pas pak kohësh.');
            } else {
              Alert.alert(t.error, msg);
            }
          } else {
            Alert.alert(t.resetPassword, t.resetLinkSent);
          }
        } catch (e: any) {
          const msg = e?.message || '';
          if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('rate exceeded')) {
            Alert.alert(t.error, t.rateLimitExceeded || 'Keni tejkaluar limitin e dërgimit të emaileve. Ju lutem provoni përsëri pas pak kohësh.');
          } else {
            Alert.alert(t.error, msg || 'Gabim');
          }
        }
      };

      const handleClearHistory = () => {
        Alert.alert(t.clearHistoryBtn, t.deleteConfirm, [
          { text: t.cancel, style: 'cancel' },
          {
            text: t.yes,
            onPress: async () => {
              await AsyncStorage.removeItem('NEARBUY_SEARCH_HISTORY');
              await AsyncStorage.removeItem('@search_history');
              Alert.alert(t.success, t.historyCleared);
            },
          },
        ]);
      };

      const handleContactSupport = () => {
        Alert.alert(t.helpAndSupport, t.contactSupport, [
          { text: t.cancel, style: 'cancel' },
          {
            text: 'WhatsApp',
            onPress: () => Linking.openURL('https://wa.me/38349111111?text=Pershendetje%20NearBuy%20Suport'),
          },
          {
            text: 'Email',
            onPress: () => Linking.openURL('mailto:support@nearbuy-ks.com?subject=Ndihme%20NearBuy'),
          },
        ]);
      };

      const handleDeleteAccount = () => {
        if (!session?.user) return;
        Alert.alert(t.deleteAccountConfirmTitle, t.deleteAccountConfirmDesc, [
          { text: t.cancel, style: 'cancel' },
          {
            text: t.deleteAccountBtn,
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);
                await supabase.from('listings').delete().eq('seller_id', session.user.id);
                await supabase.from('favorites').delete().eq('user_id', session.user.id);
                await supabase.from('profiles').delete().eq('id', session.user.id);
                setShowSettings(false);
                await onLogout();
                Alert.alert(t.accountDeletedTitle, t.accountDeletedDesc);
              } catch (e: any) {
                Alert.alert(t.error, e?.message || 'Gabim');
              } finally {
                setLoading(false);
              }
            },
          },
        ]);
      };

      return (
        <View style={styles.screen}>
          <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.85 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>{t.settings}</Text>
                  <TouchableOpacity onPress={() => setShowSettings(false)} style={{ padding: 4 }}>
                    <X size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                  {/* PAMJA & GJUHA */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Moon size={20} color={theme.text} style={{ marginRight: 12 }} />
                      <Text style={{ fontSize: 15, color: theme.text, fontWeight: '500' }}>{t.darkMode}</Text>
                    </View>
                    <Switch
                      value={theme.isDark}
                      onValueChange={(val) => setThemeMode(val ? 'dark' : 'light')}
                      trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                      ios_backgroundColor="#D1D1D6"
                    />
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Globe size={20} color={theme.text} style={{ marginRight: 12 }} />
                      <Text style={{ fontSize: 15, color: theme.text, fontWeight: '500' }}>{t.language}</Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity
                        onPress={() => setLang('sq')}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          backgroundColor: lang === 'sq' ? theme.primary : theme.inputBg,
                          borderRadius: RADIUS.md,
                          marginRight: 8,
                        }}
                      >
                        <Text style={{ color: lang === 'sq' ? 'white' : theme.text, fontWeight: '600', fontSize: 13 }}>Shqip</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setLang('en')}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          backgroundColor: lang === 'en' ? theme.primary : theme.inputBg,
                          borderRadius: RADIUS.md,
                        }}
                      >
                        <Text style={{ color: lang === 'en' ? 'white' : theme.text, fontWeight: '600', fontSize: 13 }}>English</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* NJOFTIMET */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                      <Bell size={20} color={theme.text} style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, color: theme.text, fontWeight: '500' }}>{t.notifications}</Text>
                        <Text style={{ fontSize: 12, color: theme.textLight, marginTop: 2 }}>{t.pushNotificationsDesc}</Text>
                      </View>
                    </View>
                    <Switch
                      value={notificationsEnabled}
                      onValueChange={toggleNotifications}
                      trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                      ios_backgroundColor="#D1D1D6"
                    />
                  </View>

                  {/* LLOGARIA & SIGURIA */}
                  {session?.user && (
                    <TouchableOpacity
                      onPress={handleChangePassword}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Lock size={20} color={theme.text} style={{ marginRight: 12 }} />
                        <View>
                          <Text style={{ fontSize: 15, color: theme.text, fontWeight: '500' }}>{t.changePasswordBtn}</Text>
                          <Text style={{ fontSize: 12, color: theme.textLight, marginTop: 2 }}>{t.changePasswordDesc}</Text>
                        </View>
                      </View>
                      <ChevronRight size={18} color={theme.textLight} />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={handleClearHistory}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Trash2 size={20} color={theme.text} style={{ marginRight: 12 }} />
                      <Text style={{ fontSize: 15, color: theme.text, fontWeight: '500' }}>{t.clearHistoryBtn}</Text>
                    </View>
                    <ChevronRight size={18} color={theme.textLight} />
                  </TouchableOpacity>

                  {/* NDIHMË & SUPORT */}
                  <TouchableOpacity
                    onPress={handleContactSupport}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <HelpCircle size={20} color={theme.primary} style={{ marginRight: 12 }} />
                      <View>
                        <Text style={{ fontSize: 15, color: theme.text, fontWeight: '500' }}>{t.helpAndSupport}</Text>
                        <Text style={{ fontSize: 12, color: theme.textLight, marginTop: 2 }}>{t.contactSupport}</Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color={theme.textLight} />
                  </TouchableOpacity>

                  {/* RRETH APLIKACIONIT */}
                  <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textLight }}>{t.appVersion}</Text>
                    <Text style={{ fontSize: 11, color: theme.textLight, marginTop: 4 }}>{t.allRightsReserved}</Text>
                  </View>

                  {/* ZONA E RREZIKUT (DELETE ACCOUNT) */}
                  {session?.user && (
                    <View
                      style={{
                        marginTop: 8,
                        padding: 14,
                        borderRadius: RADIUS.md,
                        backgroundColor: theme.isDark ? '#7F1D1D20' : '#FEF2F2',
                        borderWidth: 1,
                        borderColor: theme.danger,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <AlertTriangle size={16} color={theme.danger} />
                        <Text style={{ color: theme.danger, fontWeight: '700', fontSize: 13 }}>{t.dangerZone}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={handleDeleteAccount}
                        style={{
                          backgroundColor: theme.danger,
                          paddingVertical: 10,
                          borderRadius: RADIUS.md,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>{t.deleteAccountBtn}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* AVATAR FULL SCREEN MODAL */}
          <SwipeDownImageModal
            visible={avatarModalVisible}
            onClose={() => {
              setAvatarModalVisible(false);
              setAvatarZoomed(false);
            }}
            isZoomed={avatarZoomed}
          >
            {avatar ? (
              <ZoomableImageModalItem uri={avatar} width={width} height={height} onZoomChange={setAvatarZoomed} />
            ) : (
              <User size={120} color="#666" />
            )}
          </SwipeDownImageModal>

          {/* CITY SELECTION MODAL FOR PROFILE */}
          <CitySelectionModal
            visible={showCityModal}
            onClose={() => setShowCityModal(false)}
            mode="single"
            selectedValues={city}
            onSelect={(val) => {
              setCity(val as string);
              setShowCityModal(false);
            }}
            theme={theme}
            t={t}
          />

          {!session?.user ? (
            <View style={{ flex: 1, backgroundColor: theme.background }}>
              <View
                style={[
                  styles.profileHeader,
                  { backgroundColor: theme.card, borderBottomColor: theme.border, paddingBottom: 20, alignItems: 'center' },
                ]}
              >
                <View style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}>
                  <TouchableOpacity onPress={() => setShowSettings(true)}>
                    <Settings size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>
                <View
                  style={[
                    styles.profileAvatar,
                    { backgroundColor: theme.inputBg, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
                  ]}
                >
                  <User size={40} color={theme.textLight} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginTop: 10 }}>{t.guest}</Text>
              </View>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 12, textAlign: 'center' }}>
                  {t.guestSellTitle || t.loginReq}
                </Text>
                <Text style={{ fontSize: 15, color: theme.textLight, textAlign: 'center', marginBottom: 28, lineHeight: 22 }}>
                  {t.loginReqDesc}
                </Text>
                <PrimaryButton title={t.loginOrSignup} onPress={onJoin} theme={theme} style={{ width: '100%', maxWidth: 320 }} />
              </View>
            </View>
          ) : (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
              <View style={[styles.profileHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <View style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}>
                  <TouchableOpacity onPress={() => setShowSettings(true)}>
                    <Settings size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={
                    isEditing
                      ? pickAvatar
                      : () => {
                          if (avatar) setAvatarModalVisible(true);
                        }
                  }
                  style={styles.profileAvatarContainer}
                >
                  {avatar ? (
                    <Image
                      source={{ uri: getSafeImageUri(avatar) }}
                      style={styles.profileAvatar}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={150}
                    />
                  ) : (
                    <View style={[styles.profileAvatar, { backgroundColor: theme.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
                      <User size={40} color={theme.textLight} />
                    </View>
                  )}
                  {isEditing && (
                    <View style={[styles.editAvatarBadge, { backgroundColor: theme.primary, borderColor: theme.card }]}>
                      <Camera size={14} color="white" />
                    </View>
                  )}
                </TouchableOpacity>

                {isEditing ? (
                  <ScrollView
                    style={{ width: '100%', maxHeight: 380, marginTop: 10 }}
                    contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <InputField value={displayName} onChangeText={setDisplayName} placeholder={t.namePlaceholder} icon={User} theme={theme} />
                    <InputField
                      value={phone}
                      onChangeText={(val: string) => setPhone(formatPhoneNumber(val))}
                      placeholder={t.phonePlaceholder}
                      icon={Phone}
                      keyboardType="phone-pad"
                      maxLength={20}
                      theme={theme}
                    />

                    {/* CITY SELECTION FIELD */}
                    <TouchableOpacity
                      onPress={() => setShowCityModal(true)}
                      style={[
                        styles.inputContainer,
                        {
                          backgroundColor: theme.inputBg,
                          borderWidth: 1,
                          borderColor: theme.border,
                          height: 50,
                          width: '100%',
                          justifyContent: 'space-between',
                          paddingHorizontal: 16,
                          marginBottom: 16,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <MapPin size={18} color={theme.primary} />
                        <Text style={{ color: city ? theme.text : theme.textLight, fontSize: 15 }}>{city || t.selectCity}</Text>
                      </View>
                      <ChevronDown size={18} color={theme.textLight} />
                    </TouchableOpacity>

                    {/* BIO INPUT */}
                    <TextInput
                      value={bio}
                      onChangeText={setBio}
                      placeholder={t.bioPlaceholder}
                      placeholderTextColor={theme.textLight}
                      multiline
                      numberOfLines={3}
                      style={{
                        width: '100%',
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        borderRadius: RADIUS.md,
                        padding: 12,
                        fontSize: 14,
                        minHeight: 70,
                        textAlignVertical: 'top',
                        borderWidth: 1,
                        borderColor: theme.border,
                        marginBottom: 16,
                      }}
                    />

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                      <TouchableOpacity
                        style={[styles.secondaryBtn, { borderColor: theme.border, flex: 1, paddingVertical: 8 }]}
                        onPress={handleCancel}
                      >
                        <Text style={[styles.secondaryBtnText, { color: theme.text, textAlign: 'center' }]}>
                          {t.cancel || 'Anulo'}
                        </Text>
                      </TouchableOpacity>
                      <PrimaryButton title={t.save} onPress={saveProfile} style={{ flex: 1, paddingVertical: 8 }} theme={theme} />
                    </View>
                  </ScrollView>
                ) : (
                  <View style={{ alignItems: 'center', marginTop: 10 }}>
                    <Text style={[styles.profileName, { color: theme.text }]}>{displayName || t.newUser}</Text>
                    <Text style={[styles.profileEmail, { color: theme.textLight }]}>{session.user.email}</Text>

                    {/* LOCATION & PHONE BADGES */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 6, gap: 8 }}>
                      {city ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.inputBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full }}>
                          <MapPin size={12} color={theme.primary} />
                          <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>{city}</Text>
                        </View>
                      ) : null}
                      {phone ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.inputBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full }}>
                          <Phone size={12} color={theme.primary} />
                          <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>{formatPhoneNumber(phone)}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* BIO DISPLAY */}
                    {bio ? (
                      <Text style={{ color: theme.textLight, fontSize: 13, textAlign: 'center', marginTop: 8, paddingHorizontal: 24, fontStyle: 'italic' }}>
                        {`"${bio}"`}
                      </Text>
                    ) : null}

                    {/* QUICK STATS ROW */}
                    <View
                      style={{
                        flexDirection: 'row',
                        width: '100%',
                        maxWidth: 280,
                        marginTop: 14,
                        paddingVertical: 7,
                        paddingHorizontal: 10,
                        backgroundColor: theme.inputBg,
                        borderRadius: RADIUS.md,
                        borderWidth: 1,
                        borderColor: theme.border,
                        justifyContent: 'space-around',
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text }}>
                          {listings.filter((l) => l.condition !== 'sold').length}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.textLight, marginTop: 1, fontWeight: '500' }}>
                          {t.activeListingsCount}
                        </Text>
                      </View>
                      <View style={{ width: 1, height: 18, backgroundColor: theme.border }} />
                      <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text }}>
                          {listings.filter((l) => l.condition === 'sold').length}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.textLight, marginTop: 1, fontWeight: '500' }}>
                          {t.soldListingsCount}
                        </Text>
                      </View>
                      <View style={{ width: 1, height: 18, backgroundColor: theme.border }} />
                      <View style={{ alignItems: 'center', flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Star size={13} color="#F59E0B" fill="#F59E0B" />
                          <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text }}>
                            {sellerRating ? sellerRating.toFixed(1) : t.noReviews}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: theme.textLight, marginTop: 1, fontWeight: '500' }}>
                          {t.sellerRatingLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
                      <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border }]} onPress={() => setIsEditing(true)}>
                        <Text style={[styles.secondaryBtnText, { color: theme.text }]}>{t.editProfile}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.danger }]} onPress={onLogout}>
                        <LogOut size={16} color={theme.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              <View style={[styles.profileTabs, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <TouchableOpacity
                  style={[styles.profileTabItem, viewMode === 'my_listings' && { borderBottomColor: theme.primary }]}
                  onPress={() => setViewMode('my_listings')}
                >
                  <Text style={[styles.profileTabText, { color: viewMode === 'my_listings' ? theme.primary : theme.textLight }]}>
                    {t.myListings}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.profileTabItem, viewMode === 'favorites' && { borderBottomColor: theme.primary }]}
                  onPress={() => setViewMode('favorites')}
                >
                  <Text style={[styles.profileTabText, { color: viewMode === 'favorites' ? theme.primary : theme.textLight }]}>
                    {t.favorites}
                  </Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={listings}
                refreshControl={<RefreshControl refreshing={false} onRefresh={fetchData} tintColor={theme.primary} />}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={[styles.listItemRow, { backgroundColor: theme.card }]} onPress={() => onViewDetails(item)}>
                    <Image
                      source={{ uri: getSafeImageUri(item.image_url) }}
                      style={[styles.listThumb, { backgroundColor: theme.inputBg }]}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={150}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listTitle, { color: theme.text }]}>{item.title}</Text>
                      {formatListingPrice(item.price, item.category, t) ? (
                        <Text style={[styles.listPrice, { color: theme.primary }]}>{formatListingPrice(item.price, item.category, t)}</Text>
                      ) : null}
                    </View>
                    {viewMode === 'my_listings' ? (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => onEdit(item)} style={styles.iconBtn}>
                          <Edit size={18} color={theme.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteListing(item.id)} style={[styles.iconBtn, { backgroundColor: '#FEF2F2' }]}>
                          <Trash2 size={18} color={theme.danger} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Heart size={20} color={theme.danger} fill={theme.danger} />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: theme.textLight }]}>
                      {viewMode === 'my_listings' ? t.noMyListings : t.noFavorites}
                    </Text>
                  </View>
                }
              />
            </KeyboardAvoidingView>
          )}
        </View>
      );
    }
  )
);

ProfileScreen.displayName = 'ProfileScreen';
