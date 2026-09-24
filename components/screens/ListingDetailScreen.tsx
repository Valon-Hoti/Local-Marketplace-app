import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Share,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Flag,
  Share2,
  Heart,
  CheckCircle,
  User,
  MapPin,
  Clock,
  Eye,
  ChevronRight,
  Phone,
  MessageCircle,
  MessageSquare,
  Image as ImageIcon,
  X,
  Check,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DetailProps, Listing } from '../../types/marketplace';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';
import { styles } from '../../constants/styles';
import { getListingImages, getSafeImageUri, formatListingPrice, formatDate } from '../../utils/helpers';
import { supabase } from '../../lib/supabase';
import { checkRateLimit, getRemainingRateLimitTime, sanitizeText } from '../../lib/security';
import { SwipeBackContainer, useSwipeBack } from '../common/SwipeBackContainer';
import { PrimaryButton } from '../common/UIComponents';
import { SwipeDownImageModal, ZoomableImageModalItem } from '../modals/ImageViewerModal';

export function ListingDetailScreen({
  session,
  listing,
  onBack,
  onChat,
  onViewSeller,
  isOwner,
  theme,
  t,
  onReqLogin,
  onViewDetails,
  onStatusChange,
}: DetailProps) {
  const swipeBack = useSwipeBack();
  const handleBack = swipeBack?.onBack || onBack;
  const [isFavorited, setIsFavorited] = useState(false);
  const [sellerProfile, setSellerProfile] = useState<{ display_name?: string; avatar_url?: string | null; phone?: string | null } | null>(null);
  const [currentCondition, setCurrentCondition] = useState(listing.condition || (listing.category === 'services' ? '' : 'used'));
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);
  const [viewsCount, setViewsCount] = useState<number>(listing.views || 1);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const isSold = currentCondition === 'sold';
  const images = getListingImages(listing);

  useEffect(() => {
    const recordView = async () => {
      try {
        const viewKey = `@viewed_listing_${listing.id}`;
        const alreadyViewed = await AsyncStorage.getItem(viewKey);
        if (!alreadyViewed) {
          await AsyncStorage.setItem(viewKey, '1');
          const nextViews = (listing.views || 0) + 1;
          setViewsCount(nextViews);
          supabase.rpc('increment_listing_views', { listing_id: listing.id }).then(({ error }) => {
            if (error) {
              supabase.from('listings').update({ views: nextViews }).eq('id', listing.id).then();
            }
          });
        }
      } catch (e) {
        // ignore
      }
    };
    recordView();
  }, [listing.id]);

  const reportReasons = [
    { key: 'fraud', label: t.reasonFraud },
    { key: 'spam', label: t.reasonSpam },
    { key: 'prohibited', label: t.reasonProhibited },
    { key: 'incorrect', label: t.reasonIncorrect },
    { key: 'unreachable', label: t.reasonUnreachable },
    { key: 'other', label: t.reasonOther },
  ];

  const handleReportSubmit = async () => {
    if (!selectedReason) {
      Alert.alert(t.error, t.selectReason);
      return;
    }
    const reporterKey = session?.user?.id || 'guest';
    if (!checkRateLimit(`report_${reporterKey}`, 3, 300000)) {
      const sec = getRemainingRateLimitTime(`report_${reporterKey}`, 300000);
      Alert.alert(t.error, (t.rateLimitCooldown || 'Prisni {seconds}s').replace('{seconds}', String(sec)));
      return;
    }
    setSubmittingReport(true);
    try {
      const reportPayload = {
        listing_id: listing.id,
        reporter_id: session?.user?.id || null,
        reason: sanitizeText(selectedReason, 100),
        details: sanitizeText(reportDetails, 1000),
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('reports').insert([reportPayload]);
      if (error) {
        const localReportsRaw = await AsyncStorage.getItem('@local_reports');
        const localReports = localReportsRaw ? JSON.parse(localReportsRaw) : [];
        localReports.push(reportPayload);
        await AsyncStorage.setItem('@local_reports', JSON.stringify(localReports));
      }
      setReportModalVisible(false);
      setSelectedReason('');
      setReportDetails('');
      Alert.alert(t.reportSuccessTitle, t.reportSuccessDesc);
    } catch (e) {
      setReportModalVisible(false);
      Alert.alert(t.reportSuccessTitle, t.reportSuccessDesc);
    } finally {
      setSubmittingReport(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      supabase
        .from('favorites')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('listing_id', listing.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setIsFavorited(true);
        });
    }
  }, [listing.id, session?.user]);

  useEffect(() => {
    if (listing.seller_id) {
      supabase
        .from('profiles')
        .select('display_name, avatar_url, phone')
        .eq('id', listing.seller_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const safeAv = data.avatar_url && !data.avatar_url.startsWith('blob:') ? data.avatar_url : null;
            setSellerProfile({ display_name: data.display_name, avatar_url: safeAv, phone: data.phone });
          }
        });
    }
  }, [listing.seller_id]);

  useEffect(() => {
    if (listing.category) {
      supabase
        .from('listings')
        .select('id, title, price, image_url, images, category, seller_id, seller_name, description, condition, location, created_at')
        .eq('category', listing.category)
        .neq('id', listing.id)
        .order('created_at', { ascending: false })
        .limit(6)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setSimilarListings(data);
          }
        });
    }
  }, [listing.id, listing.category]);

  const toggleFavorite = () => {
    if (!session?.user) {
      onReqLogin();
      return;
    }
    if (isFavorited) {
      setIsFavorited(false);
      supabase.from('favorites').delete().eq('user_id', session.user.id).eq('listing_id', listing.id).then();
    } else {
      setIsFavorited(true);
      supabase.from('favorites').insert({ user_id: session.user.id, listing_id: listing.id }).then();
    }
  };

  let categoryLabel = listing.category;
  if (listing.category === 'home') categoryLabel = t['home'];
  else if (listing.category && t[listing.category]) categoryLabel = t[listing.category];

  const handleShare = async () => {
    try {
      const priceDisplay = formatListingPrice(listing.price, listing.category, t);
      const loc = listing.location || (t.defaultCountry || 'Kosovë');
      const cat = categoryLabel || (t.all || 'Të gjitha');
      await Share.share({
        title: listing.title,
        message: `${t.shareMessageIntro || 'Shiko këtë shpallje në NearBuy:'} "${listing.title}"${priceDisplay ? ` - ${priceDisplay}` : ''}!\n${t.city || 'Qyteti'}: ${loc}\n${t.category || 'Kategoria'}: ${cat}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCall = () => {
    const rawPhone = sellerProfile?.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
    if (!cleanPhone) {
      Alert.alert(t.noPhoneTitle, t.noPhoneDesc);
      return;
    }
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleWhatsApp = () => {
    const rawPhone = sellerProfile?.phone || '';
    let cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
    if (!cleanPhone) {
      Alert.alert(t.noPhoneTitle, t.noPhoneDesc);
      return;
    }
    if (cleanPhone.startsWith('00383')) {
      cleanPhone = '383' + cleanPhone.substring(5);
    } else if (cleanPhone.startsWith('0')) {
      cleanPhone = '383' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.substring(1);
    }
    const displayPrice = formatListingPrice(listing.price, listing.category, t);
    const greeting = `${t.whatsappIntro || 'Përshëndetje! Po ju kontaktoj nga NearBuy në lidhje me shpalljen tuaj:'} "${listing.title}"${displayPrice ? ` (${displayPrice})` : ''}.`;
    const message = encodeURIComponent(greeting);
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${message}`).catch(() => {
      Alert.alert('WhatsApp', t.whatsappOpenError || 'Nuk mund të hapet WhatsApp. Sigurohuni që e keni të instaluar aplikacionin.');
    });
  };

  const handleToggleSold = () => {
    if (!isOwner || !session?.user?.id || session.user.id !== listing.seller_id) {
      Alert.alert(t.error, t.unauthorizedAction || 'Unauthorized');
      return;
    }
    Alert.alert(
      isSold ? t.confirmActiveTitle : t.confirmSoldTitle,
      isSold ? t.confirmActiveDesc : t.confirmSoldDesc,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.yes,
          onPress: async () => {
            const newCondition = isSold ? 'used' : 'sold';
            setCurrentCondition(newCondition);
            const { error } = await supabase
              .from('listings')
              .update({ condition: newCondition })
              .eq('id', listing.id)
              .eq('seller_id', session.user.id);
            if (error) {
              Alert.alert(t.error, error.message);
            } else {
              onStatusChange?.(listing.id, newCondition);
              Alert.alert(t.success, isSold ? t.markAsActive : t.markAsSold);
            }
          },
        },
      ]
    );
  };

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // MODAL STATE
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isModalZoomed, setIsModalZoomed] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const modalImages = useMemo(() => {
    if (images.length <= 1) return images;
    return [images[images.length - 1], ...images, images[0]];
  }, [images]);

  const handleOpenImage = (index: number) => {
    setActiveImageIndex(index);
    setIsModalZoomed(false);
    setImageModalVisible(true);
    const targetIndex = images.length > 1 ? index + 1 : index;
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: targetIndex, animated: false });
    }, 50);
  };

  const onMomentumScrollEnd = (event: any) => {
    if (images.length <= 1) return;
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(contentOffsetX / width);
    const N = images.length;

    if (pageIndex === 0) {
      flatListRef.current?.scrollToOffset({ offset: N * width, animated: false });
      setActiveImageIndex(N - 1);
    } else if (pageIndex === N + 1) {
      flatListRef.current?.scrollToOffset({ offset: 1 * width, animated: false });
      setActiveImageIndex(0);
    } else {
      setActiveImageIndex(pageIndex - 1);
    }
    setIsModalZoomed(false);
  };

  const isService = listing.category === 'services';
  const conditionLabel = isService
    ? isSold
      ? t.isSold
      : null
    : isSold
    ? t.isSold
    : currentCondition === 'new'
    ? t.conditionNew
    : currentCondition === 'used'
    ? t.conditionUsed
    : null;

  return (
    <SwipeBackContainer onBack={onBack} isDetail={true} style={[styles.screen, { backgroundColor: theme.card }]}>
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={{ height: 350, width: '100%' }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {images.length > 0 ? (
              images.map((img, i) => (
                <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => handleOpenImage(i)}>
                  <Image
                    source={{ uri: getSafeImageUri(img) }}
                    style={{ width, height: 350, backgroundColor: 'black' }}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={150}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <View style={[styles.imagePlaceholder, { width, height: 350, backgroundColor: theme.inputBg }]}>
                <ImageIcon size={50} color={theme.textLight} />
              </View>
            )}
          </ScrollView>
          <TouchableOpacity onPress={handleBack} style={[styles.floatingBackBtn, { backgroundColor: theme.card, top: Math.max(insets.top + 8, 48) }]}>
            <ArrowLeft color={theme.text} size={24} />
          </TouchableOpacity>
          {!isOwner && (
            <TouchableOpacity
              onPress={() => setReportModalVisible(true)}
              style={[styles.floatingReportBtn, { backgroundColor: theme.card, top: Math.max(insets.top + 8, 48) }]}
              activeOpacity={0.8}
            >
              <Flag size={20} color={theme.text} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleShare} style={[styles.floatingShareBtn, { backgroundColor: theme.card, top: Math.max(insets.top + 8, 48) }]}>
            <Share2 size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleFavorite} style={[styles.floatingHeartBtn, { backgroundColor: theme.card, top: Math.max(insets.top + 8, 48) }]}>
            <Heart size={24} color={isFavorited ? theme.danger : theme.text} fill={isFavorited ? theme.danger : 'transparent'} />
          </TouchableOpacity>
        </View>
        <View style={[styles.detailContainer, { backgroundColor: theme.card }]}>
          {isSold && (
            <View style={[styles.soldBanner, { backgroundColor: theme.isDark ? '#7F1D1D' : '#FEE2E2', borderColor: '#EF4444' }]}>
              <CheckCircle size={18} color="#EF4444" />
              <Text style={[styles.soldBannerText, { color: theme.isDark ? '#FCA5A5' : '#B91C1C' }]}>{t.productSoldBanner}</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailTitle, { color: theme.text }]}>{listing.title}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                <View style={[styles.tag, { backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.tagText, { color: theme.textLight }]}>{categoryLabel || listing.category}</Text>
                </View>
                {conditionLabel && (
                  <View style={[styles.tag, { backgroundColor: isSold ? '#EF4444' : currentCondition === 'new' ? COLORS.secondary : '#F59E0B' }]}>
                    <Text style={[styles.tagText, { color: 'white' }]}>{conditionLabel}</Text>
                  </View>
                )}
              </View>
            </View>
            {formatListingPrice(listing.price, listing.category, t) ? (
              <Text style={[styles.detailPrice, { color: theme.primary }]}>{formatListingPrice(listing.price, listing.category, t)}</Text>
            ) : null}
          </View>

          <TouchableOpacity onPress={() => onViewSeller(listing.seller_id)} style={[styles.sellerRow, { borderBottomColor: theme.border }]}>
            <View style={{ marginRight: 12 }}>
              {sellerProfile?.avatar_url ? (
                <Image
                  source={{ uri: getSafeImageUri(sellerProfile.avatar_url) }}
                  style={styles.sellerAvatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
              ) : (
                <View style={[styles.sellerAvatar, { backgroundColor: theme.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
                  <User size={22} color={theme.textLight} />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.textLight, fontSize: 12 }}>{t.soldBy}</Text>
              <Text style={{ fontWeight: '600', color: theme.text, fontSize: 15 }}>
                {sellerProfile?.display_name || listing.seller_name || t.unknown}
              </Text>
              {listing.location && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <MapPin size={12} color={theme.textLight} />
                  <Text style={{ fontSize: 12, color: theme.textLight, marginLeft: 2 }}>{listing.location}</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap', gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Clock size={12} color={theme.textLight} />
                  <Text style={{ fontSize: 12, color: theme.textLight, marginLeft: 2 }}>
                    {t.postedOn} {formatDate(listing.created_at, t)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Eye size={12} color={theme.textLight} />
                  <Text style={{ fontSize: 12, color: theme.textLight, marginLeft: 3 }}>
                    {viewsCount} {t.views}
                  </Text>
                </View>
              </View>
            </View>
            <ChevronRight size={18} color={theme.textLight} />
          </TouchableOpacity>

          {!isOwner && (
            <View style={styles.contactActionsRow}>
              <TouchableOpacity
                style={[styles.contactActionBtn, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                onPress={handleCall}
              >
                <Phone size={17} color={theme.primary} />
                <Text style={[styles.contactActionText, { color: theme.text }]}>{t.callSeller}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactActionBtn, { backgroundColor: '#25D36618', borderColor: '#25D36640' }]}
                onPress={handleWhatsApp}
              >
                <MessageCircle size={18} color="#25D366" />
                <Text style={[styles.contactActionText, { color: '#25D366', fontWeight: '700' }]}>{t.whatsapp}</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 10 }]}>{t.description}</Text>
          <Text style={[styles.detailDesc, { color: theme.textLight }]}>{listing.description || t.noDesc}</Text>

          {!isOwner && (
            <TouchableOpacity
              onPress={() => setReportModalVisible(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 12,
                marginTop: 14,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
              activeOpacity={0.7}
            >
              <Flag size={14} color={theme.danger} />
              <Text style={{ fontSize: 13, color: theme.danger, fontWeight: '600' }}>{t.reportListing}</Text>
            </TouchableOpacity>
          )}

          {similarListings.length > 0 && (
            <View style={{ marginTop: 26 }}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>{t.similarProducts}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {similarListings.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.similarCard, { backgroundColor: theme.card, borderColor: theme.border }, item.condition === 'sold' && { opacity: 0.85 }]}
                    onPress={() => {
                      if (onViewDetails) onViewDetails(item);
                    }}
                  >
                    <Image
                      source={{ uri: getSafeImageUri(item.image_url) }}
                      style={styles.similarThumb}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={150}
                    />
                    {item.condition === 'sold' && (
                      <View style={[styles.soldBadgeOverlay, { top: 4, left: 4, paddingHorizontal: 6, paddingVertical: 2 }]}>
                        <Text style={[styles.soldBadgeText, { fontSize: 9 }]}>{t.isSold}</Text>
                      </View>
                    )}
                    <View style={{ padding: 8 }}>
                      <Text numberOfLines={1} style={[styles.similarTitle, { color: theme.text }]}>
                        {item.title}
                      </Text>
                      {formatListingPrice(item.price, item.category, t) ? (
                        <Text style={[styles.similarPrice, { color: theme.primary }]}>{formatListingPrice(item.price, item.category, t)}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
      <View style={[styles.bottomActionContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        {isOwner ? (
          <TouchableOpacity
            onPress={handleToggleSold}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: isSold ? theme.primary : '#10B981',
                flexDirection: 'row',
                gap: 8,
              },
            ]}
          >
            <CheckCircle size={20} color="white" />
            <Text style={styles.primaryBtnText}>{isSold ? t.markAsActive : t.markAsSold}</Text>
          </TouchableOpacity>
        ) : (
          <PrimaryButton
            title={isSold ? t.productSoldBanner : t.sendMessage}
            onPress={() => {
              if (!session?.user) {
                onReqLogin();
                return;
              }
              onChat(listing);
            }}
            icon={MessageSquare}
            theme={theme}
            disabled={isSold}
            style={isSold ? { opacity: 0.6 } : undefined}
          />
        )}
      </View>

      <SwipeDownImageModal
        visible={imageModalVisible}
        onClose={() => {
          setImageModalVisible(false);
          setIsModalZoomed(false);
        }}
        isZoomed={isModalZoomed}
        counterText={images.length > 0 ? `${activeImageIndex + 1} / ${images.length}` : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={modalImages}
          horizontal
          pagingEnabled
          scrollEnabled={!isModalZoomed}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `${item}-${index}`}
          onMomentumScrollEnd={onMomentumScrollEnd}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          initialScrollIndex={images.length > 1 ? activeImageIndex + 1 : activeImageIndex}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
            }, 50);
          }}
          renderItem={({ item }) => (
            <ZoomableImageModalItem uri={item} width={width} height={height} onZoomChange={setIsModalZoomed} />
          )}
        />
      </SwipeDownImageModal>

      {/* REPORT MODAL */}
      <Modal visible={reportModalVisible} transparent={true} animationType="fade" onRequestClose={() => setReportModalVisible(false)}>
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
                <Flag size={20} color={theme.danger} />
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>{t.reportListing}</Text>
              </View>
              <TouchableOpacity onPress={() => setReportModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color={theme.textLight} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: theme.textLight, marginBottom: 14 }}>{t.reportReasonDesc}</Text>
            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
              {reportReasons.map((r) => {
                const isSelected = selectedReason === r.label;
                return (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => setSelectedReason(r.label)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: RADIUS.md,
                      backgroundColor: isSelected ? (theme.isDark ? '#3730A3' : '#EEF2FF') : theme.inputBg,
                      borderWidth: 1,
                      borderColor: isSelected ? theme.primary : theme.border,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? theme.primary : theme.text,
                        flex: 1,
                      }}
                    >
                      {r.label}
                    </Text>
                    {isSelected && <Check size={16} color={theme.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TextInput
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder={t.reportDetailsPlaceholder}
              placeholderTextColor={theme.textLight}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: theme.inputBg,
                color: theme.text,
                borderRadius: RADIUS.md,
                padding: 10,
                fontSize: 13,
                minHeight: 60,
                textAlignVertical: 'top',
                borderWidth: 1,
                borderColor: theme.border,
                marginTop: 8,
                marginBottom: 16,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setReportModalVisible(false)}
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
                onPress={handleReportSubmit}
                disabled={submittingReport || !selectedReason}
                style={{
                  flex: 1.5,
                  paddingVertical: 12,
                  borderRadius: RADIUS.md,
                  backgroundColor: theme.danger,
                  alignItems: 'center',
                  opacity: !selectedReason || submittingReport ? 0.6 : 1,
                }}
              >
                {submittingReport ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>{t.sendReport}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SwipeBackContainer>
  );
}
