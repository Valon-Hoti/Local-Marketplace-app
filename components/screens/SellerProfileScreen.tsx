import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, MapPin, Phone, Star, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SellerProfileProps, Listing } from '../../types/marketplace';
import { RADIUS, SHADOW } from '../../constants/theme';
import { styles } from '../../constants/styles';
import { getSafeImageUri, formatPhoneNumber, formatListingPrice } from '../../utils/helpers';
import { supabase } from '../../lib/supabase';
import { checkRateLimit, getRemainingRateLimitTime, sanitizeText } from '../../lib/security';
import { SwipeBackContainer, useSwipeBack } from '../common/SwipeBackContainer';
import { SwipeDownImageModal, ZoomableImageModalItem } from '../modals/ImageViewerModal';

export function SellerProfileScreen({
  sellerId,
  onBack,
  onViewDetails,
  theme,
  t,
  session,
  onReqLogin,
}: SellerProfileProps) {
  const swipeBack = useSwipeBack();
  const handleBack = swipeBack?.onBack || onBack;
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerAvatarModal, setSellerAvatarModal] = useState(false);
  const [sellerAvatarZoomed, setSellerAvatarZoomed] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchSellerData = async () => {
      setLoading(true);
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', sellerId).maybeSingle();
      if (profileData) {
        if (profileData.avatar_url && profileData.avatar_url.startsWith('blob:')) {
          profileData.avatar_url = null;
        }
        setProfile(profileData);
      }

      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, title, price, image_url, images, category, seller_id, seller_name, description, condition, location, created_at')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });
      if (listingsData) setListings(listingsData);

      // Fetch reviews with fallback
      try {
        let loadedReviews: any[] = [];
        const { data: revData, error: revError } = await supabase
          .from('seller_reviews')
          .select('*')
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false });

        if (!revError && revData && revData.length > 0) {
          loadedReviews = revData;
        } else {
          const localRevRaw = await AsyncStorage.getItem(`@seller_reviews_${sellerId}`);
          if (localRevRaw) {
            loadedReviews = JSON.parse(localRevRaw);
          }
        }
        setReviews(loadedReviews);
        if (loadedReviews.length > 0) {
          const sum = loadedReviews.reduce((acc: number, curr: any) => acc + (Number(curr.rating) || 5), 0);
          setAverageRating(sum / loadedReviews.length);
        } else {
          setAverageRating(null);
        }
      } catch (e) {
        // ignore
      }

      setLoading(false);
    };
    fetchSellerData();
  }, [sellerId]);

  const handleReviewSubmit = async () => {
    if (!session?.user) {
      setReviewModalVisible(false);
      onReqLogin?.();
      return;
    }
    if (session.user.id === sellerId) {
      setReviewModalVisible(false);
      Alert.alert(t.error, t.selfReviewError);
      return;
    }
    if (!checkRateLimit(`review_${session.user.id}`, 2, 60000)) {
      const sec = getRemainingRateLimitTime(`review_${session.user.id}`, 60000);
      Alert.alert(t.error, (t.rateLimitCooldown || 'Prisni {seconds}s').replace('{seconds}', String(sec)));
      return;
    }
    setSubmittingReview(true);
    try {
      const rawReviewerName = session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || t.newUser;
      const cleanReviewerName = sanitizeText(rawReviewerName, 60);
      const cleanComment = sanitizeText(reviewComment, 500);
      const cleanRating = Math.max(1, Math.min(5, Math.round(Number(ratingScore) || 5)));
      const reviewPayload: any = {
        seller_id: sellerId,
        reviewer_id: session.user.id,
        reviewer_name: cleanReviewerName,
        rating: cleanRating,
        comment: cleanComment,
        created_at: new Date().toISOString(),
      };

      const { data: insertedRows, error } = await supabase.from('seller_reviews').insert([reviewPayload]).select();
      if (error) {
        console.warn('Supabase review error:', error.message);
        const localRevRaw = await AsyncStorage.getItem(`@seller_reviews_${sellerId}`);
        const localList = localRevRaw ? JSON.parse(localRevRaw) : [];
        const fallbackItem = { ...reviewPayload, id: Date.now() };
        localList.unshift(fallbackItem);
        await AsyncStorage.setItem(`@seller_reviews_${sellerId}`, JSON.stringify(localList));
        setReviews([fallbackItem, ...reviews]);
      } else {
        const newReview = insertedRows && insertedRows[0] ? insertedRows[0] : { ...reviewPayload, id: Date.now() };
        const updated = [newReview, ...reviews];
        setReviews(updated);
        const sum = updated.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0);
        setAverageRating(sum / updated.length);
      }

      setReviewModalVisible(false);
      setReviewComment('');
      setRatingScore(5);
      Alert.alert(t.reviewSuccessTitle, t.reviewSuccessDesc);
    } catch (e) {
      setReviewModalVisible(false);
      Alert.alert(t.reviewSuccessTitle, t.reviewSuccessDesc);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <SwipeBackContainer onBack={onBack} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.headerSimple,
          {
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
            paddingTop: Math.max(insets.top, 16),
          },
        ]}
      >
        <TouchableOpacity onPress={handleBack} style={{ padding: 8 }}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text, marginLeft: 16 }]}>{t.sellerProfile}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => {
              if (profile?.avatar_url) setSellerAvatarModal(true);
            }}
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: getSafeImageUri(profile.avatar_url) }}
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
          </TouchableOpacity>
          <Text style={[styles.profileName, { color: theme.text, marginTop: 10 }]}>{profile?.display_name || t.unknown}</Text>

          {/* CITY & PHONE BADGES */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 8, gap: 8 }}>
            {profile?.city ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: theme.inputBg,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: RADIUS.full,
                }}
              >
                <MapPin size={13} color={theme.primary} />
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{profile.city}</Text>
              </View>
            ) : null}
            {profile?.phone ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${profile.phone.replace(/[^0-9+]/g, '')}`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  backgroundColor: theme.inputBg,
                  borderRadius: RADIUS.full,
                }}
              >
                <Phone size={14} color={theme.primary} />
                <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>{formatPhoneNumber(profile.phone)}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* BIO DISPLAY */}
          {profile?.bio ? (
            <Text style={{ color: theme.textLight, fontSize: 13, textAlign: 'center', marginTop: 8, paddingHorizontal: 24, fontStyle: 'italic' }}>
              {`"${profile.bio}"`}
            </Text>
          ) : null}

          {/* STAR RATING DISPLAY */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={15}
                  color="#F59E0B"
                  fill={averageRating && star <= Math.round(averageRating) ? '#F59E0B' : 'transparent'}
                />
              ))}
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>
              {averageRating ? `${averageRating.toFixed(1)} (${reviews.length})` : t.noReviews}
            </Text>
          </View>

          {/* VLERËSO SHITËSIN BUTTON */}
          {session?.user?.id !== sellerId && (
            <TouchableOpacity
              onPress={() => {
                if (!session?.user) {
                  onReqLogin?.();
                  return;
                }
                setReviewModalVisible(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 12,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: RADIUS.full,
                backgroundColor: theme.isDark ? '#312E81' : '#EEF2FF',
                borderWidth: 1,
                borderColor: theme.primary,
              }}
              activeOpacity={0.8}
            >
              <Star size={14} color={theme.primary} fill={theme.primary} />
              <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700' }}>{t.rateSeller}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* REVIEWS LIST (IF ANY) */}
        {reviews.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.sectionLabel, { color: theme.text, marginBottom: 10 }]}>
              {t.reviewsTitle} ({reviews.length})
            </Text>
            {reviews.slice(0, 3).map((rev, idx) => (
              <View
                key={rev.id || idx}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: RADIUS.md,
                  padding: 12,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontWeight: '700', color: theme.text, fontSize: 13 }}>{rev.reviewer_name || t.newUser}</Text>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={12} color="#F59E0B" fill={s <= (Number(rev.rating) || 5) ? '#F59E0B' : 'transparent'} />
                    ))}
                  </View>
                </View>
                {rev.comment ? <Text style={{ fontSize: 13, color: theme.textLight }}>{rev.comment}</Text> : null}
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: theme.text, marginBottom: 12 }]}>
          {t.listingOf} {profile?.display_name || t.unknown}
        </Text>
        {listings.length > 0 ? (
          listings.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.listItemRow, { backgroundColor: theme.card }]} onPress={() => onViewDetails(item)}>
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
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noSellerListings}</Text>
          </View>
        )}
      </ScrollView>

      <SwipeDownImageModal
        visible={sellerAvatarModal}
        onClose={() => {
          setSellerAvatarModal(false);
          setSellerAvatarZoomed(false);
        }}
        isZoomed={sellerAvatarZoomed}
      >
        {profile?.avatar_url ? (
          <ZoomableImageModalItem uri={profile.avatar_url} width={width} height={height} onZoomChange={setSellerAvatarZoomed} />
        ) : (
          <User size={120} color="#666" />
        )}
      </SwipeDownImageModal>

      {/* REVIEW MODAL */}
      <Modal visible={reviewModalVisible} transparent={true} animationType="fade" onRequestClose={() => setReviewModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: theme.card,
              borderRadius: RADIUS.lg,
              padding: 20,
              ...SHADOW.lg,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Star size={20} color="#F59E0B" fill="#F59E0B" />
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>{t.rateSeller}</Text>
              </View>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color={theme.textLight} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, color: theme.textLight, textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
              {t.ratePrompt}
            </Text>

            {/* 5 INTERACTIVE STARS */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRatingScore(s)} activeOpacity={0.7} style={{ padding: 4 }}>
                  <Star size={34} color="#F59E0B" fill={s <= ratingScore ? '#F59E0B' : 'transparent'} />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder={t.reviewPlaceholder}
              placeholderTextColor={theme.textLight}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: theme.inputBg,
                color: theme.text,
                borderRadius: RADIUS.md,
                padding: 10,
                fontSize: 13,
                minHeight: 70,
                textAlignVertical: 'top',
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 16,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setReviewModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: RADIUS.md,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReviewSubmit}
                disabled={submittingReview}
                style={{
                  flex: 1.5,
                  paddingVertical: 12,
                  borderRadius: RADIUS.md,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                }}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>{t.sendReview}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SwipeBackContainer>
  );
}
