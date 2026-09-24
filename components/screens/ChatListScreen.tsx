import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
  memo,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Search, X, Trash2, Check, User, MessageSquare } from 'lucide-react-native';
import { ChatListScreenProps, ConversationItem } from '../../types/marketplace';
import { styles } from '../../constants/styles';
import { getSafeImageUri, formatChatTime } from '../../utils/helpers';
import { supabase, checkSupportsBuyerId } from '../../lib/supabase';
import { GuestPlaceholder } from '../common/UIComponents';

const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {};

export const ChatListItem = memo(
  ({ item, onSelect, theme, t, selectionMode, isSelected, onToggleSelection }: any) => {
    const isUnread = (item.unread_count || 0) > 0;
    const rowBg = isUnread
      ? (theme.isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)')
      : theme.card;

    return (
      <TouchableOpacity
        style={[
          styles.listItemRow,
          {
            backgroundColor: rowBg,
            borderBottomColor: theme.border,
            borderLeftWidth: isUnread ? 3.5 : 0,
            borderLeftColor: '#EF4444',
            paddingVertical: 12,
            paddingHorizontal: 12,
          },
        ]}
        onPress={() =>
          selectionMode
            ? onToggleSelection(item.listing.id)
            : onSelect({
                ...item.listing,
                chat_other_user_id: item.other_user_id,
                chat_other_user_name: item.other_user_name,
                chat_other_user_avatar: item.other_user_avatar,
                chat_buyer_id: item.listing.chat_buyer_id,
              })
        }
        onLongPress={() => onToggleSelection(item.listing.id)}
        activeOpacity={0.7}
      >
        {selectionMode && (
          <View style={{ marginRight: 10, justifyContent: 'center' }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: isSelected ? theme.primary : theme.textLight,
                backgroundColor: isSelected ? theme.primary : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {isSelected && <Check size={16} color="white" />}
            </View>
          </View>
        )}

        {/* AVATAR WITH RED UNREAD BADGE / NUMBER AT TOP-LEFT */}
        <View style={{ position: 'relative', marginRight: 12 }}>
          {item.other_user_avatar ? (
            <Image
              source={{ uri: getSafeImageUri(item.other_user_avatar) }}
              style={{ width: 48, height: 48, borderRadius: 24 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: theme.inputBg,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <User size={24} color={theme.textLight} />
            </View>
          )}

          {isUnread && (
            <View
              style={{
                position: 'absolute',
                top: -3,
                left: -3,
                backgroundColor: '#EF4444',
                minWidth: 19,
                height: 19,
                borderRadius: 10,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: item.unread_count > 9 ? 4 : 2,
                borderWidth: 2,
                borderColor: rowBg,
                shadowColor: '#EF4444',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.45,
                shadowRadius: 3,
                elevation: 4,
                zIndex: 10,
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: '800',
                  textAlign: 'center',
                  includeFontPadding: false,
                }}
              >
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>

        {/* CONTENT */}
        <View style={{ flex: 1, marginRight: 10, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <Text
                style={[
                  styles.listTitle,
                  {
                    color: theme.text,
                    fontSize: 15,
                    fontWeight: isUnread ? '800' : '600',
                  },
                ]}
                numberOfLines={1}
              >
                {item.other_user_name || 'User'}
              </Text>
            </View>
            <Text
              style={{
                color: isUnread ? '#EF4444' : theme.textLight,
                fontSize: 11,
                fontWeight: isUnread ? '700' : '400',
              }}
            >
              {formatChatTime(item.last_message_time, t)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              style={{
                flex: 1,
                color: isUnread ? theme.text : theme.textLight,
                fontWeight: isUnread ? '700' : '400',
                fontSize: 13,
              }}
              numberOfLines={1}
            >
              {item.last_message}
            </Text>
            {isUnread && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#EF4444',
                  marginLeft: 6,
                }}
              />
            )}
          </View>
        </View>

        {/* LISTING THUMBNAIL */}
        {item.listing?.image_url || item.listing?.images?.[0] ? (
          <Image
            source={{ uri: getSafeImageUri(item.listing.image_url || item.listing.images?.[0]) }}
            style={{ width: 44, height: 44, borderRadius: 8 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : null}
      </TouchableOpacity>
    );
  }
);

export const ChatListScreen = memo(
  forwardRef(({ session, onSelect, theme, t, onReqLogin, isVisible }: ChatListScreenProps, ref) => {
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'selling' | 'buying'>('all');

    // SELECTION MODE STATE
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const fetchChats = useCallback(
      async (showSpinner = true) => {
        if (!session?.user) return;
        if (showSpinner) setRefreshing(true);
        try {
          const myId = session.user.id;
          const hasBuyerId = await checkSupportsBuyerId();

          // 1. Get listings I own
          const { data: myListings } = await supabase.from('listings').select('id').eq('seller_id', myId);
          const myListingIds = myListings?.map((l) => l.id) || [];

          // 2. Get listings where I sent a message as buyer
          const { data: mySentMessages } = await supabase.from('messages').select('listing_id').eq('user_id', myId);
          const buyerListingIds = [...new Set(mySentMessages?.map((m) => m.listing_id) || [])];

          // 3. If I own listings, check for messages on those listings
          let incomingListingIds: number[] = [];
          if (myListingIds.length > 0) {
            const { data: incomingMsgs } = await supabase
              .from('messages')
              .select('listing_id')
              .in('listing_id', myListingIds);
            incomingListingIds = incomingMsgs?.map((m) => m.listing_id) || [];
          }

          // 4. Combine all relevant listing IDs
          const allListingIds = [...new Set([...buyerListingIds, ...incomingListingIds])];
          if (allListingIds.length === 0) {
            setConversations([]);
            setRefreshing(false);
            setLoading(false);
            return;
          }

          // 5. Fetch all messages for these listings
          const { data: allMsgs, error: msgErr } = await supabase
            .from('messages')
            .select('*')
            .in('listing_id', allListingIds)
            .order('created_at', { ascending: false });

          if (msgErr || !allMsgs || allMsgs.length === 0) {
            setConversations([]);
            setRefreshing(false);
            setLoading(false);
            return;
          }

          // 6. Group messages into conversations
          const convMap = new Map<
            string,
            {
              listing_id: number;
              buyer_id: string;
              lastMsg: any;
              unreadCount: number;
            }
          >();

          for (const msg of allMsgs) {
            const isMyListing = myListingIds.includes(msg.listing_id);
            let bId = hasBuyerId ? msg.buyer_id : null;
            if (!bId) {
              bId = isMyListing ? (msg.user_id !== myId ? msg.user_id : '') : myId;
            }
            if (!bId && isMyListing) {
              const otherInListing = allMsgs.find(
                (m) => m.listing_id === msg.listing_id && m.user_id !== myId
              );
              bId = otherInListing ? otherInListing.user_id : '';
            }
            if (!bId && isMyListing) continue;
            if (!isMyListing) bId = myId;

            const convKey = `${msg.listing_id}_${bId}`;
            const existing = convMap.get(convKey);
            if (!existing) {
              convMap.set(convKey, {
                listing_id: msg.listing_id,
                buyer_id: bId,
                lastMsg: msg,
                unreadCount: !msg.is_read && msg.user_id !== myId ? 1 : 0,
              });
            } else {
              if (!msg.is_read && msg.user_id !== myId) {
                existing.unreadCount += 1;
              }
            }
          }

          const convList = Array.from(convMap.values());
          if (convList.length === 0) {
            setConversations([]);
            setRefreshing(false);
            setLoading(false);
            return;
          }

          // 7. Batch fetch needed listings
          const neededListingIds = [...new Set(convList.map((c) => c.listing_id))];
          const { data: listingsData } = await supabase
            .from('listings')
            .select('id, title, image_url, images, category, seller_id, seller_name, price, description, condition, location, created_at')
            .in('id', neededListingIds);
          const listingMap = new Map((listingsData || []).map((l) => [l.id, l]));

          // 8. Batch fetch needed user profiles
          const neededUserIds = new Set<string>();
          for (const c of convList) {
            const listing = listingMap.get(c.listing_id);
            if (!listing) continue;
            const otherId = listing.seller_id === myId ? c.buyer_id : listing.seller_id;
            if (otherId) neededUserIds.add(otherId);
          }

          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', Array.from(neededUserIds));
          const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));

          // 9. Build enriched conversations
          const enriched: ConversationItem[] = [];
          for (const c of convList) {
            const listing = listingMap.get(c.listing_id);
            if (!listing) continue;

            const isMeSeller = listing.seller_id === myId;
            const otherUserId = isMeSeller ? c.buyer_id : listing.seller_id;
            const otherProfile = profileMap.get(otherUserId);
            const otherName = otherProfile?.display_name || (isMeSeller ? 'Blerës' : listing.seller_name || 'Shitës');
            const otherAvatar = otherProfile?.avatar_url || null;

            enriched.push({
              listing: {
                ...listing,
                chat_other_user_id: otherUserId,
                chat_other_user_name: otherName,
                chat_other_user_avatar: otherAvatar,
                chat_buyer_id: c.buyer_id,
              } as any,
              other_user_id: otherUserId || '',
              other_user_name: otherName,
              other_user_avatar: otherAvatar,
              last_message: c.lastMsg?.text || t.chatNew,
              unread_count: c.unreadCount,
              last_message_time: c.lastMsg?.created_at,
            });
          }

          enriched.sort((a, b) => {
            const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
            const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
            return timeB - timeA;
          });

          setConversations(enriched);
        } catch (error) {
          console.error('fetchChats error:', error);
        }
        setRefreshing(false);
        setLoading(false);
      },
      [session?.user?.id, t]
    );

    useEffect(() => {
      if (isVisible && session?.user) fetchChats(false);
    }, [isVisible, session?.user?.id, fetchChats]);

    useEffect(() => {
      if (!session?.user) return;
      const channel = supabase
        .channel('chat_list_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          fetchChats(false);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }, [session?.user?.id, fetchChats]);

    useImperativeHandle(ref, () => ({
      refreshData: () => fetchChats(),
      markAsRead: (listingId: number) => {
        setConversations((prev) => prev.map((c) => (c.listing.id === listingId ? { ...c, unread_count: 0 } : c)));
      },
    }));

    const handleToggleSelection = (id: number) => {
      setSelectedIds((prev) => {
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
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const idsToDelete = Array.from(selectedIds);
            for (const lid of idsToDelete) {
              await supabase.from('messages').delete().eq('listing_id', lid);
            }
            setSelectionMode(false);
            setSelectedIds(new Set());
            fetchChats();
          },
        },
      ]);
    };

    // FILTER LOGIC - MUST BE BEFORE ANY EARLY RETURNS TO COMPLY WITH RULES OF HOOKS
    const filteredConversations = useMemo(() => {
      return conversations.filter((item) => {
        const matchesSearch =
          searchQuery === '' ||
          item.other_user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.last_message.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        const isSeller = item.listing.seller_id === session?.user?.id;
        switch (activeFilter) {
          case 'unread':
            return item.unread_count > 0;
          case 'selling':
            return isSeller;
          case 'buying':
            return !isSeller;
          default:
            return true;
        }
      });
    }, [conversations, searchQuery, activeFilter, session?.user?.id]);

    if (!session?.user) {
      return (
        <GuestPlaceholder
          t={t}
          theme={theme}
          onJoin={onReqLogin}
          title={t.guestChatTitle}
          desc={t.guestChatDesc}
          icon={MessageSquare}
        />
      );
    }

    if (loading && !refreshing) {
      return (
        <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      );
    }

    const FilterTab = ({ label, id }: { label: string; id: 'all' | 'unread' | 'selling' | 'buying' }) => (
      <TouchableOpacity
        onPress={() => setActiveFilter(id)}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: activeFilter === id ? theme.primary : theme.card,
          marginRight: 8,
          borderWidth: 1,
          borderColor: activeFilter === id ? theme.primary : theme.border,
        }}
      >
        <Text style={{ color: activeFilter === id ? 'white' : theme.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
      </TouchableOpacity>
    );

    return (
      <View style={styles.screen}>
        <View
          style={[
            styles.headerSimple,
            { backgroundColor: theme.card, borderBottomColor: theme.border, flexDirection: 'column', alignItems: 'stretch' },
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.headerTitle, { color: theme.text, fontSize: 28, fontWeight: '800' }]}>{t.myChats}</Text>
            {selectionMode ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectionMode(false);
                    setSelectedIds(new Set());
                  }}
                  style={{ marginRight: 16 }}
                >
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
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={theme.textLight} />
              </TouchableOpacity>
            ) : null}
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
          keyExtractor={(item) => `${item.listing.id}_${item.other_user_id}`}
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
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noChats}</Text>
            </View>
          }
        />
      </View>
    );
  })
);

ChatListScreen.displayName = 'ChatListScreen';
