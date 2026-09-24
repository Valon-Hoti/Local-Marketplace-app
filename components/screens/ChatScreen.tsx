import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GiftedChat, IMessage, Bubble, InputToolbar, Send } from 'react-native-gifted-chat';
import { ArrowLeft, Trash2, Send as SendIcon } from 'lucide-react-native';
import { ChatProps } from '../../types/marketplace';
import { styles } from '../../constants/styles';
import { getSafeImageUri, formatListingPrice } from '../../utils/helpers';
import { supabase, checkSupportsBuyerId } from '../../lib/supabase';
import { checkRateLimit, getRemainingRateLimitTime, sanitizeText } from '../../lib/security';
import { SwipeBackContainer, useSwipeBack } from '../common/SwipeBackContainer';
import { SellerProfileScreen } from './SellerProfileScreen';

export function ChatScreen({ session, listing, onBack, theme, t, onViewListingDetails }: ChatProps) {
  const swipeBack = useSwipeBack();
  const handleBack = swipeBack?.onBack || onBack;
  const [messages, setMessages] = useState<IMessage[]>([]);
  const isMeSeller = session.user.id === listing.seller_id;
  const initialOtherId = (listing as any).chat_other_user_id || (isMeSeller ? null : listing.seller_id);
  const initialOtherName = (listing as any).chat_other_user_name || (isMeSeller ? 'Blerës' : listing.seller_name || 'User');
  const initialOtherAvatar = (listing as any).chat_other_user_avatar || null;
  const currentBuyerId = isMeSeller ? ((listing as any).chat_buyer_id || initialOtherId) : session.user.id;

  const [otherUser, setOtherUser] = useState<{ id: string | null; name: string; avatar: string | null }>({
    id: initialOtherId,
    name: initialOtherName,
    avatar: initialOtherAvatar,
  });
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);


  const fetchProfile = useCallback(async (otherId: string) => {
    const { data } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', otherId).single();
    if (data) {
      const safeAvatar = data.avatar_url && !data.avatar_url.startsWith('blob:') ? data.avatar_url : null;
      setOtherUser({ id: otherId, name: data.display_name || 'User', avatar: safeAvatar });
    }
  }, []);

  useEffect(() => {
    if (initialOtherId) {
      fetchProfile(initialOtherId);
    }
  }, [initialOtherId, fetchProfile]);

  const fetchMessages = useCallback(async () => {
    try {
      const hasBuyerId = await checkSupportsBuyerId();
      let readUpdate = supabase
        .from('messages')
        .update({ is_read: true })
        .eq('listing_id', listing.id)
        .neq('user_id', session.user.id);
      if (hasBuyerId && currentBuyerId) {
        readUpdate = readUpdate.eq('buyer_id', currentBuyerId);
      }
      readUpdate.then();

      let msgQuery = supabase.from('messages').select('*').eq('listing_id', listing.id);
      if (hasBuyerId && currentBuyerId) {
        msgQuery = msgQuery.or(
          `buyer_id.eq.${currentBuyerId},and(buyer_id.is.null,user_id.eq.${currentBuyerId}),and(buyer_id.is.null,user_id.eq.${listing.seller_id})`
        );
      } else if (!hasBuyerId && isMeSeller && currentBuyerId) {
        msgQuery = msgQuery.or(`user_id.eq.${currentBuyerId},user_id.eq.${listing.seller_id}`);
      }
      const { data, error } = await msgQuery.order('created_at', { ascending: false });
      if (error) {
        console.error('fetchMessages error:', error);
        return;
      }

      if (data) {
        let targetId = (listing as any).chat_other_user_id || listing.seller_id;
        if (session.user.id === listing.seller_id) {
          const otherMsg = data.find((m: any) => m.user_id !== session.user.id);
          if (otherMsg) targetId = otherMsg.user_id;
        }

        if (targetId && targetId !== session.user.id) {
          fetchProfile(targetId);
        }

        setMessages(
          data.map((msg: any) => ({
            _id: msg._id ?? msg.id ?? String(msg.created_at || Math.random()),
            text: msg.text,
            createdAt: new Date(msg.created_at),
            user: {
              _id: msg.user_id,
              name: msg.user_name || 'User',
              avatar:
                msg.user_id === session.user.id ? undefined : otherUser.avatar ? getSafeImageUri(otherUser.avatar) : undefined,
            },
          }))
        );
      }
    } catch (err) {
      console.error('fetchMessages exception:', err);
    }
  }, [listing.id, listing.seller_id, session.user.id, currentBuyerId, isMeSeller, otherUser.avatar, fetchProfile]);

  useEffect(() => {
    fetchMessages();
    const channelName = `room:${listing.id}:${currentBuyerId || session.user.id}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `listing_id=eq.${listing.id}` }, () =>
        fetchMessages()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [listing.id, currentBuyerId, session.user.id, fetchMessages]);

  const onSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      const msg = newMessages[0];
      if (!msg || !msg.text?.trim()) return;

      // Rate limiting: max 25 messages per 60 seconds
      if (!checkRateLimit(`chat_msg_${session.user.id}`, 25, 60000)) {
        const sec = getRemainingRateLimitTime(`chat_msg_${session.user.id}`, 60000);
        Alert.alert(t.error, (t.rateLimitCooldown || 'Prisni {seconds}s').replace('{seconds}', String(sec)));
        return;
      }

      const cleanText = sanitizeText(msg.text, 2000);
      if (!cleanText.trim()) return;

      const tempId = String(Date.now() + Math.random());
      const sanitizedMsg: IMessage = {
        _id: tempId,
        text: cleanText,
        createdAt: new Date(),
        user: { _id: session.user.id },
      };
      setMessages((prev) => GiftedChat.append(prev, [sanitizedMsg]));

      const myChatName = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User';
      const hasBuyerId = await checkSupportsBuyerId();
      const insertPayload: any = {
        text: cleanText,
        user_id: session.user.id,
        listing_id: listing.id,
        user_name: myChatName,
        is_read: false,
      };
      if (hasBuyerId && currentBuyerId) {
        insertPayload.buyer_id = currentBuyerId;
      }

      const { data, error } = await supabase.from('messages').insert(insertPayload).select();
      if (error) {
        console.error('Failed to send message:', error);
        Alert.alert(t.error || 'Gabim', error.message || 'Mesazhi nuk mund të dërgohej.');
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
      } else if (data && data.length > 0) {
        const realId = data[0]._id ?? data[0].id ?? tempId;
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? { ...m, _id: realId } : m))
        );
      }
    },
    [listing.id, session.user.id, session.user.email, session.user.user_metadata, currentBuyerId, t]
  );

  const handleDeleteMessage = useCallback(
    (context: any, message: IMessage) => {
      if (message.user._id !== session.user.id) return;
      Alert.alert(t.delete, t.deleteConfirm, [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            const targetId = message._id || (message as any).id;
            let { error } = await supabase.from('messages').delete().eq('_id', targetId).eq('user_id', session.user.id);
            if (error) {
              const retry = await supabase.from('messages').delete().eq('id', targetId).eq('user_id', session.user.id);
              error = retry.error;
            }
            if (error) Alert.alert(t.error, error.message);
            else setMessages((prev) => prev.filter((m) => m._id !== message._id));
          },
        },
      ]);
    },
    [session.user.id, t]
  );

  const insets = useSafeAreaInsets();

  const chatUser = React.useMemo(() => ({ _id: session.user.id }), [session.user.id]);

  const handlePressAvatar = useCallback((user: any) => {
    if (user?._id && user._id !== session.user.id) {
      setViewingProfileId(user._id);
    }
  }, [session.user.id]);

  const renderTicks = useCallback(
    (message: any) => {
      if (message.user._id === session.user.id) {
        return (
          <TouchableOpacity onPress={() => handleDeleteMessage(null, message)} style={{ marginRight: 1, padding: 2 }}>
            <Trash2 size={14} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        );
      }
      return null;
    },
    [session.user.id, handleDeleteMessage]
  );

  const renderBubble = useCallback(
    (props: any) => (
      <Bubble
        {...props}
        wrapperStyle={{
          right: { backgroundColor: theme.primary },
          left: { backgroundColor: theme.inputBg },
        }}
        textStyle={{
          right: { color: 'white' },
          left: { color: theme.text },
        }}
      />
    ),
    [theme.primary, theme.inputBg, theme.text]
  );

  const textInputProps = React.useMemo(
    () => ({
      style: {
        flex: 1,
        color: theme.text,
        backgroundColor: theme.inputBg,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
        marginLeft: 4,
        marginRight: 4,
        marginTop: 4,
        marginBottom: 4,
        borderWidth: 0,
        fontSize: 15,
        minHeight: 40,
        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
      },
      placeholderTextColor: theme.textLight,
      keyboardAppearance: theme.isDark ? ('dark' as const) : ('light' as const),
    }),
    [theme.text, theme.inputBg, theme.textLight, theme.isDark]
  );

  const renderInputToolbar = useCallback(
    (props: any) => (
      <InputToolbar
        {...props}
        containerStyle={{
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          paddingHorizontal: 8,
          paddingVertical: 4,
        }}
      />
    ),
    [theme.card, theme.border]
  );

  const renderSend = useCallback(
    (props: any) => (
      <Send
        {...props}
        containerStyle={{
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'center',
          marginRight: 6,
          marginBottom: 4,
        }}
      >
        <View
          style={{
            backgroundColor: theme.primary,
            width: 38,
            height: 38,
            borderRadius: 19,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <SendIcon size={18} color="white" />
        </View>
      </Send>
    ),
    [theme.primary]
  );

  return (
    <SwipeBackContainer onBack={onBack} style={{ backgroundColor: theme.card }}>
      {/* SELLER PROFILE MODAL FROM CHAT */}
      <Modal visible={!!viewingProfileId} transparent={true} animationType="none" onRequestClose={() => setViewingProfileId(null)}>
        {viewingProfileId && (
          <SellerProfileScreen
            sellerId={viewingProfileId}
            onBack={() => setViewingProfileId(null)}
            onViewDetails={(item) => {
              setViewingProfileId(null);
              if (onViewListingDetails) onViewListingDetails(item);
              else onBack();
            }}
            theme={theme}
            t={t}
            session={session}
            onReqLogin={() => setViewingProfileId(null)}
          />
        )}
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.card }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.chatHeader, { backgroundColor: theme.card, borderBottomColor: theme.border, paddingTop: insets.top }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <ArrowLeft color={theme.text} size={24} />
          </TouchableOpacity>

          {/* AVATAR & NAME IN HEADER — TAPPABLE TO OPEN PROFILE */}
          <TouchableOpacity
            onPress={() => {
              const targetId = otherUser.id || (listing.seller_id !== session.user.id ? listing.seller_id : null);
              if (targetId) setViewingProfileId(targetId);
            }}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}
          >
            {otherUser.avatar ? (
              <Image
                source={{ uri: getSafeImageUri(otherUser.avatar) }}
                style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : (
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                <Text style={{ fontSize: 18, color: theme.text, fontWeight: 'bold' }}>{otherUser.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text }} numberOfLines={1}>
                {otherUser.name}
              </Text>
              <Text style={{ color: theme.textLight, fontSize: 12 }} numberOfLines={1}>
                {listing.title}
                {formatListingPrice(listing.price, listing.category, t) ? ` • ${formatListingPrice(listing.price, listing.category, t)}` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <GiftedChat
          messages={messages}
          onSend={onSend}
          user={chatUser}
          keyboardAvoidingViewProps={{ enabled: false }}
          keyboardShouldPersistTaps="handled"
          onPressAvatar={handlePressAvatar}
          onLongPress={handleDeleteMessage}
          renderTicks={renderTicks}
          renderBubble={renderBubble}
          textInputProps={textInputProps}
          renderInputToolbar={renderInputToolbar}
          renderSend={renderSend}
        />
      </KeyboardAvoidingView>

      {/* Safe area bottom spacer for home indicator on iPhone when keyboard is closed */}
      {Platform.OS === 'ios' && insets.bottom > 0 && (
        <View style={{ height: insets.bottom, backgroundColor: theme.card }} />
      )}
    </SwipeBackContainer>
  );
}
