import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import {
  ArrowLeft,
  Home,
  MessageSquare,
  PlusCircle,
  User,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from '../constants/styles';
import { COLORS, DARK_THEME, LIGHT_THEME } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { Listing, NavItem, TRANSLATIONS } from '../types/marketplace';

import { GuestPlaceholder, TabButton } from '../components/common/UIComponents';
import { AuthScreen } from '../components/screens/AuthScreen';
import { ChatListScreen } from '../components/screens/ChatListScreen';
import { ChatScreen } from '../components/screens/ChatScreen';
import { EditListingScreen } from '../components/screens/EditListingScreen';
import { HomeScreen } from '../components/screens/HomeScreen';
import { ListingDetailScreen } from '../components/screens/ListingDetailScreen';
import { ProfileScreen } from '../components/screens/ProfileScreen';
import { SellerProfileScreen } from '../components/screens/SellerProfileScreen';
import { SellScreen } from '../components/screens/SellScreen';

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

export default function App() {
  const homeScreenRef = useRef<any>(null);
  const profileScreenRef = useRef<any>(null);
  const chatListScreenRef = useRef<any>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [lang, setLang] = useState<'sq' | 'en'>('sq');

  const handleSetLang = useCallback(async (l: 'sq' | 'en') => {
    setLang(l);
    await AsyncStorage.setItem('@app_lang', l);
  }, []);

  const handleSetThemeMode = useCallback(async (mode: 'light' | 'dark') => {
    setThemeMode(mode);
    await AsyncStorage.setItem('@app_theme', mode);
  }, []);

  // NAVIGATION STATE
  const [currentTab, setCurrentTab] = useState('home');
  const [visitedTabs, setVisitedTabs] = useState<string[]>(['home']);
  const [navStack, setNavStack] = useState<NavItem[]>([]);
  const [isGuest, setIsGuest] = useState(false);

  const pushNav = useCallback((item: NavItem) => {
    setNavStack((prev) => [...prev, item]);
  }, []);

  const popNav = useCallback(() => {
    setNavStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const popped = next.pop();
      if (popped?.type === 'chat') {
        chatListScreenRef.current?.markAsRead(popped.listing.id);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!visitedTabs.includes(currentTab)) {
      setVisitedTabs((prev) => [...prev, currentTab]);
    }
  }, [currentTab, visitedTabs]);

  const t = TRANSLATIONS[lang];
  const theme = themeMode === 'light' ? LIGHT_THEME : DARK_THEME;

  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async (userId: string) => {
    try {
      // 1. Get my listings
      const { data: myListings } = await supabase.from('listings').select('id').eq('seller_id', userId);
      const myListingIds = myListings?.map((l) => l.id) || [];

      // 2. Count unread messages where I am the seller
      let count = 0;
      if (myListingIds.length > 0) {
        const { count: sellerCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('listing_id', myListingIds)
          .neq('user_id', userId)
          .eq('is_read', false);
        count += sellerCount || 0;
      }

      // 3. Count unread messages where I am the buyer
      const { data: myConversations } = await supabase.from('messages').select('listing_id').eq('user_id', userId);
      const myConvListingIds = [...new Set(myConversations?.map((m) => m.listing_id))];
      const buyerListingIds = myConvListingIds.filter((id) => !myListingIds.includes(id));

      if (buyerListingIds.length > 0) {
        const { count: buyerCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('listing_id', buyerListingIds)
          .neq('user_id', userId)
          .eq('is_read', false);
        count += buyerCount || 0;
      }

      setUnreadCount(count);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('@app_lang').then((stored) => {
      if (stored === 'sq' || stored === 'en') setLang(stored);
    });
    AsyncStorage.getItem('@app_theme').then((stored) => {
      if (stored === 'light' || stored === 'dark') setThemeMode(stored);
    });
    AsyncStorage.getItem('@is_guest').then((guestVal) => {
      if (guestVal === 'true') setIsGuest(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setIsGuest(false);
        AsyncStorage.removeItem('@is_guest');
      }
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setIsGuest(false);
        AsyncStorage.removeItem('@is_guest');
        fetchUnreadCount(session.user.id);
      }
    });

    if (Platform.OS !== 'web') {
      Notifications.requestPermissionsAsync();
    }
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!session?.user) return;

    const channel = supabase
      .channel('global_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const newMsg = payload.new as any;
        if (newMsg.user_id === session.user.id) return; // Ignore my own messages

        // Check if I am involved
        const { data: listing } = await supabase.from('listings').select('seller_id, title').eq('id', newMsg.listing_id).single();
        let isForMe = false;

        if (listing && listing.seller_id === session.user.id) {
          isForMe = true;
        } else {
          const { data: myMsgs } = await supabase
            .from('messages')
            .select('_id')
            .eq('listing_id', newMsg.listing_id)
            .eq('user_id', session.user.id)
            .limit(1);
          if (myMsgs && myMsgs.length > 0) isForMe = true;
        }

        if (isForMe) {
          setUnreadCount((prev) => prev + 1);
          if (Platform.OS !== 'web') {
            const notifPref = await AsyncStorage.getItem('@notifications_enabled');
            if (notifPref !== 'false') {
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
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const handleLoginSuccess = () => { };
  const handleGuestLogin = useCallback(async () => {
    setIsGuest(true);
    await AsyncStorage.setItem('@is_guest', 'true');
  }, []);
  const handleLogout = useCallback(async () => {
    setNavStack([]);
    setSession(null);
    setIsGuest(false);
    setCurrentTab('home');
    await AsyncStorage.removeItem('@is_guest');
    await supabase.auth.signOut();
  }, []);
  const handleReqLogin = useCallback(() => {
    Alert.alert(t.loginReq, t.loginReqDesc, [
      { text: t.cancel, style: 'cancel' },
      { text: t.loginButton, onPress: handleLogout },
    ]);
  }, [t, handleLogout]);
  const handleViewDetails = useCallback(
    (item: Listing) => {
      pushNav({ type: 'listing', listing: item });
    },
    [pushNav]
  );
  // Opens an existing conversation from the chat list — no self-check needed
  const handleOpenChat = useCallback(
    (item: Listing) => {
      if (!session?.user) {
        handleReqLogin();
        return;
      }
      pushNav({ type: 'chat', listing: item });
    },
    [pushNav, session?.user, handleReqLogin]
  );
  // Initiates a new chat from listing details — block chatting with yourself
  const handleChat = useCallback(
    (item: Listing) => {
      if (!session?.user) {
        handleReqLogin();
        return;
      }
      if (session?.user?.id && item.seller_id === session.user.id) {
        Alert.alert(t.error, t.selfChatError);
        return;
      }
      pushNav({ type: 'chat', listing: item });
    },
    [pushNav, session?.user, t, handleReqLogin]
  );
  const handleEdit = useCallback(
    (item: Listing) => {
      pushNav({ type: 'listing', listing: item, isEditing: true });
    },
    [pushNav]
  );
  const handleViewSeller = useCallback(
    (id: string) => {
      pushNav({ type: 'seller', sellerId: id });
    },
    [pushNav]
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!session && !isGuest) {
    return (
      <AuthScreen
        onLoginSuccess={handleLoginSuccess}
        onGuestLogin={handleGuestLogin}
        theme={theme}
        t={t}
        lang={lang}
        setLang={handleSetLang}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.card }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.card} />
      <View style={[styles.content, { backgroundColor: theme.background }]}>
        <View style={{ flex: 1, display: currentTab === 'home' ? 'flex' : 'none' }}>
          <HomeScreen
            ref={homeScreenRef}
            session={session}
            onChat={handleChat}
            onViewDetails={handleViewDetails}
            theme={theme}
            t={t}
            lang={lang}
          />
        </View>
        <View style={{ flex: 1, display: currentTab === 'sell' ? 'flex' : 'none' }}>
          {visitedTabs.includes('sell') && (
            <SellScreen session={session} onSuccess={() => setCurrentTab('home')} theme={theme} t={t} onReqLogin={handleReqLogin} />
          )}
        </View>
        <View style={{ flex: 1, display: currentTab === 'chats' ? 'flex' : 'none' }}>
          {visitedTabs.includes('chats') && (
            <ChatListScreen
              ref={chatListScreenRef}
              session={session}
              onSelect={handleOpenChat}
              theme={theme}
              t={t}
              onReqLogin={handleReqLogin}
              isVisible={currentTab === 'chats'}
            />
          )}
        </View>
        <View style={{ flex: 1, display: currentTab === 'profile' ? 'flex' : 'none' }}>
          {visitedTabs.includes('profile') && (
            <ProfileScreen
              ref={profileScreenRef}
              session={session}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onLogout={handleLogout}
              theme={theme}
              setThemeMode={handleSetThemeMode}
              lang={lang}
              setLang={handleSetLang}
              t={t}
              onReqLogin={handleReqLogin}
              onJoin={handleLogout}
              onProfileUpdated={() => homeScreenRef.current?.refreshData()}
            />
          )}
        </View>
      </View>

      {/* TAB BAR */}
      <View style={[styles.tabBar, { backgroundColor: theme.tabBar, borderTopColor: theme.border }]}>
        <TabButton
          icon={Home}
          label={t.tab_home}
          isActive={currentTab === 'home'}
          onPress={() => {
            if (currentTab === 'home') {
              homeScreenRef.current?.scrollToTopAndRefresh();
            }
            setCurrentTab('home');
          }}
          theme={theme}
        />
        <TabButton
          icon={PlusCircle}
          label={t.sell}
          isActive={currentTab === 'sell'}
          onPress={() => setCurrentTab('sell')}
          theme={theme}
          activeColor={theme.secondary}
        />
        <TabButton
          icon={MessageSquare}
          label={t.chats}
          isActive={currentTab === 'chats'}
          onPress={() => {
            setCurrentTab('chats');
            setUnreadCount(0);
          }}
          theme={theme}
          badge={unreadCount > 0 ? unreadCount : null}
        />
        <TabButton
          icon={User}
          label={t.profile}
          isActive={currentTab === 'profile'}
          onPress={() => setCurrentTab('profile')}
          theme={theme}
        />
      </View>

      {/* NAVIGATION MODAL STACK */}
      <Modal visible={navStack.length > 0} transparent={true} animationType="none" onRequestClose={popNav}>
        {navStack.map((item, index) => {
          const isTop = index === navStack.length - 1;
          const isVisible = index >= navStack.length - 2;
          const key = `${item.type}-${item.type === 'seller' ? item.sellerId : item.listing.id}-${index}`;
          return (
            <View
              key={key}
              style={[StyleSheet.absoluteFill, { zIndex: index }, !isVisible && { display: 'none' }]}
              pointerEvents={isTop ? 'auto' : 'none'}
            >
              {item.type === 'chat' ? (
                session?.user ? (
                  <ChatScreen
                    session={session}
                    listing={item.listing}
                    onBack={popNav}
                    onViewListingDetails={(l) => pushNav({ type: 'listing', listing: l })}
                    theme={theme}
                    t={t}
                  />
                ) : (
                  <View style={{ flex: 1, backgroundColor: theme.background }}>
                    <View
                      style={[
                        styles.headerSimple,
                        {
                          backgroundColor: theme.card,
                          borderBottomColor: theme.border,
                          paddingTop: Platform.OS === 'ios' ? 50 : 20,
                          height: Platform.OS === 'ios' ? 96 : 66,
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 16,
                        },
                      ]}
                    >
                      <TouchableOpacity onPress={popNav} style={{ padding: 8 }}>
                        <ArrowLeft size={24} color={theme.text} />
                      </TouchableOpacity>
                      <Text style={[styles.headerTitle, { color: theme.text, marginLeft: 8 }]}>{t.myChats}</Text>
                    </View>
                    <GuestPlaceholder
                      t={t}
                      theme={theme}
                      onJoin={() => {
                        popNav();
                        handleReqLogin();
                      }}
                      title={t.guestChatTitle}
                      desc={t.guestChatDesc}
                      icon={MessageSquare}
                    />
                  </View>
                )
              ) : item.type === 'seller' ? (
                <SellerProfileScreen
                  sellerId={item.sellerId}
                  onBack={popNav}
                  onViewDetails={(l) => pushNav({ type: 'listing', listing: l })}
                  theme={theme}
                  t={t}
                  session={session}
                  onReqLogin={handleReqLogin}
                />
              ) : item.type === 'listing' ? (
                item.isEditing && session?.user && item.listing.seller_id === session.user.id ? (
                  <EditListingScreen
                    session={session}
                    listing={item.listing}
                    onBack={popNav}
                    onSuccess={(updatedItem) => {
                      popNav();
                      if (updatedItem) {
                        if (homeScreenRef.current) homeScreenRef.current.updateItem(updatedItem);
                        if (profileScreenRef.current) profileScreenRef.current.updateItem(updatedItem);
                        setNavStack((prev) =>
                          prev.map((n) =>
                            n.type === 'listing' && n.listing.id === updatedItem.id
                              ? { ...n, listing: { ...n.listing, ...updatedItem } }
                              : n
                          )
                        );
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
                    listing={item.listing}
                    onBack={popNav}
                    onChat={handleChat}
                    onViewSeller={handleViewSeller}
                    isOwner={session?.user?.id === item.listing.seller_id}
                    theme={theme}
                    t={t}
                    onReqLogin={handleReqLogin}
                    onViewDetails={handleViewDetails}
                    onStatusChange={(id, newCondition) => {
                      if (homeScreenRef.current)
                        homeScreenRef.current.updateItem({ ...item.listing, condition: newCondition });
                      if (profileScreenRef.current)
                        profileScreenRef.current.updateItem({ ...item.listing, condition: newCondition });
                      setNavStack((prev) =>
                        prev.map((n) =>
                          n.type === 'listing' && n.listing.id === id
                            ? { ...n, listing: { ...n.listing, condition: newCondition } }
                            : n
                        )
                      );
                    }}
                  />
                )
              ) : null}
            </View>
          );
        })}
      </Modal>
    </SafeAreaView>
  );
}
