import React, { memo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Heart, Image as ImageIcon, MapPin } from 'lucide-react-native';
import { styles } from '../../constants/styles';
import { getListingImages, getSafeImageUri, formatDate, formatListingPrice } from '../../utils/helpers';
import { Listing } from '../../types/marketplace';

export const SkeletonListingCard = memo(({ width, theme }: any) => {
  const animatedValue = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, { toValue: 0.85, duration: 850, useNativeDriver: true }),
        Animated.timing(animatedValue, { toValue: 0.35, duration: 850, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animatedValue]);

  const skeletonColor = theme.isDark ? '#3A3A3C' : '#E2E8F0';

  return (
    <View style={[styles.card, { width, backgroundColor: theme.card, borderColor: theme.border }]}>
      <Animated.View style={[styles.cardImageContainer, { backgroundColor: skeletonColor, opacity: animatedValue }]} />
      <View style={styles.cardContent}>
        <Animated.View style={{ width: '85%', height: 14, borderRadius: 4, backgroundColor: skeletonColor, opacity: animatedValue, marginBottom: 8 }} />
        <Animated.View style={{ width: '45%', height: 16, borderRadius: 4, backgroundColor: skeletonColor, opacity: animatedValue, marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <Animated.View style={{ width: '50%', height: 10, borderRadius: 3, backgroundColor: skeletonColor, opacity: animatedValue }} />
          <Animated.View style={{ width: '25%', height: 10, borderRadius: 3, backgroundColor: skeletonColor, opacity: animatedValue }} />
        </View>
      </View>
    </View>
  );
});

export const SkeletonGrid = memo(({ cardWidth, gap, theme }: any) => {
  const placeholders = [1, 2, 3, 4, 5, 6];
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {placeholders.map((idx) => (
        <SkeletonListingCard key={idx} width={cardWidth} theme={theme} />
      ))}
    </View>
  );
});

export const ListingCard = memo(
  ({ item, width, onPress, onChat, isFavorited, toggleFavorite, theme, t }: any) => {
    const allImages = getListingImages(item);
    const imageUri = getSafeImageUri(allImages[0]);
    let categoryLabel = item.category;
    if (item.category === 'home') categoryLabel = t['home'];
    else if (item.category && t[item.category]) categoryLabel = t[item.category];
    const isSold = item.condition === 'sold';

    return (
      <TouchableOpacity
        style={[styles.card, { width, backgroundColor: theme.card, borderColor: theme.border }, isSold && { opacity: 0.88 }]}
        onPress={() => onPress(item)}
        activeOpacity={0.9}
      >
        <View style={[styles.cardImageContainer, { backgroundColor: 'black', borderBottomWidth: 1, borderBottomColor: theme.border }]}>
          <Image
            source={{ uri: imageUri }}
            style={styles.cardImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
          <View style={styles.cardBadgeContainer}>
            {item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
              </View>
            )}
          </View>
          {isSold && (
            <View style={styles.soldBadgeOverlay}>
              <Text style={styles.soldBadgeText}>{t.isSold || 'I SHITUR'}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.heartBtn, { backgroundColor: theme.card }]}
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorite(item.id);
            }}
          >
            <Heart size={18} color={isFavorited ? theme.danger : theme.text} fill={isFavorited ? theme.danger : 'transparent'} />
          </TouchableOpacity>
          {allImages.length > 1 && (
            <View
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                backgroundColor: 'rgba(0,0,0,0.6)',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <ImageIcon size={10} color="white" />
              <Text style={{ color: 'white', fontSize: 10, marginLeft: 4, fontWeight: '600' }}>{allImages.length}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 4 }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {formatListingPrice(item.price, item.category, t) ? (
              <Text style={[styles.cardPrice, { color: theme.primary }]}>{formatListingPrice(item.price, item.category, t)}</Text>
            ) : (
              <View />
            )}
            {item.location && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MapPin size={10} color={theme.textLight} />
                <Text style={{ fontSize: 10, color: theme.textLight, marginLeft: 2 }}>{item.location}</Text>
              </View>
            )}
          </View>
          <View style={[styles.cardFooter, { marginTop: 12 }]}>
            <Text style={[styles.sellerName, { color: theme.textLight, flex: 1 }]} numberOfLines={1}>
              👤 {item.seller_name || t.unknown}
            </Text>
            <Text style={{ fontSize: 10, color: theme.textLight }}>{formatDate(item.created_at, t)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) =>
    prev.item === next.item &&
    prev.isFavorited === next.isFavorited &&
    prev.width === next.width &&
    prev.theme.isDark === next.theme.isDark &&
    prev.t.home === next.t.home
);
