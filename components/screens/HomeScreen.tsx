import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {
  Search,
  X,
  Camera,
  Sparkles,
  ListFilter,
  Clock,
  Trash2,
  ChevronRight,
  Tag,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeScreenProps, Listing } from '../../types/marketplace';
import { CATEGORIES, CATEGORY_CONFIG, RADIUS } from '../../constants/theme';
import { styles } from '../../constants/styles';
import { supabase } from '../../lib/supabase';
import { analyzeImage } from '../../lib/vision';
import { ListingCard, SkeletonGrid } from '../common/ListingCard';
import { CitySelectionModal } from '../modals/CitySelectionModal';
import { FilterModal } from '../modals/FilterModal';
import { VisualSearchModal } from '../modals/VisualSearchModal';

const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {};

export const HomeScreen = forwardRef(
  ({ session, onChat, onViewDetails, theme, t, lang }: HomeScreenProps, ref) => {
    const [listings, setListings] = useState<Listing[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [favorites, setFavorites] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [remoteSuggestions, setRemoteSuggestions] = useState<string[]>([]);
    const flatListRef = useRef<FlatList>(null);
    const searchInputRef = useRef<TextInput>(null);

    const dismissSearch = useCallback(() => {
      setIsSearchFocused(false);
      Keyboard.dismiss();
      searchInputRef.current?.blur();
    }, []);

    // VISUAL SEARCH STATE
    const [visualSearchVisible, setVisualSearchVisible] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzedImage, setAnalyzedImage] = useState<string | null>(null);
    const [detectedKeywords, setDetectedKeywords] = useState<string[]>([]);

    const handleVisualSearch = async () => {
      Alert.alert(t.searchWithPhoto, t.chooseMethod, [
        { text: t.camera, onPress: () => processImage(true) },
        { text: t.gallery, onPress: () => processImage(false) },
        { text: t.cancel, style: 'cancel' },
      ]);
    };

    const handleModalSearch = (keyword: string) => {
      setSearchQuery(keyword);
      saveToHistory(keyword);
      setIsSearchFocused(false);
      setVisualSearchVisible(false);
    };

    const processImage = async (useCamera: boolean) => {
      try {
        let result;
        if (useCamera) {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (perm.status !== 'granted') return Alert.alert(t.permissionMissing);
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.5,
            base64: true,
          });
        } else {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (perm.status !== 'granted') return Alert.alert(t.permissionMissing);
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.5,
            base64: true,
          });
        }

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          if (!asset.base64) {
            Alert.alert('Error', 'Could not process image data.');
            return;
          }

          setIsAnalyzing(true);
          const results = await analyzeImage(asset.base64, lang);
          setIsAnalyzing(false);

          if (results.length > 0) {
            setAnalyzedImage(asset.uri);
            setDetectedKeywords(results.map((r) => r.label));
            setVisualSearchVisible(true);
          } else {
            Alert.alert(t.visualEffect, t.noObjectFound);
          }
        }
      } catch (e: any) {
        setIsAnalyzing(false);
        console.error(e);
        Alert.alert(t.error, e.message || t.error);
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
        setListings((prev) => prev.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item)));
      },
    }));

    // FILTERS
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [showCityModal, setShowCityModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [sortBy, setSortBy] = useState('newest');

    const { width } = useWindowDimensions();
    const numColumns = width > 1024 ? 5 : width > 768 ? 4 : 2;
    const gap = 12;
    const cardWidth = (width - 16 * 2 - gap * (numColumns - 1)) / numColumns;

    const [initialLoading, setInitialLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const PAGE_SIZE = 16;

    const buildQuery = useCallback(
      (targetPage: number) => {
        let q = supabase
          .from('listings')
          .select('id, title, price, image_url, images, category, description, seller_id, seller_name, location, created_at, condition, views');

        const trimmedQ = searchQuery.trim();
        if (trimmedQ) {
          q = q.ilike('title', `%${trimmedQ}%`);
        }
        if (selectedCategory !== 'all') {
          q = q.eq('category', selectedCategory);
        }
        if (selectedCities.length > 0 && !selectedCities.includes('Të gjitha')) {
          q = q.in('location', selectedCities);
        }
        if (priceRange.min && !isNaN(Number(priceRange.min))) {
          q = q.gte('price', Number(priceRange.min));
        }
        if (priceRange.max && !isNaN(Number(priceRange.max))) {
          q = q.lte('price', Number(priceRange.max));
        }

        if (sortBy === 'price_asc') {
          q = q.order('price', { ascending: true });
        } else if (sortBy === 'price_desc') {
          q = q.order('price', { ascending: false });
        } else if (sortBy === 'oldest') {
          q = q.order('created_at', { ascending: true });
        } else {
          q = q.order('created_at', { ascending: false });
        }

        const from = targetPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        return q.range(from, to);
      },
      [searchQuery, selectedCategory, selectedCities, priceRange, sortBy]
    );

    const fetchData = useCallback(
      async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        const { data: listingsData, error } = await buildQuery(0);
        if (!error && listingsData) {
          setListings(listingsData);
          setPage(0);
          setHasMore(listingsData.length === PAGE_SIZE);
        }
        if (session?.user) {
          const { data: favData } = await supabase.from('favorites').select('listing_id').eq('user_id', session.user.id);
          if (favData) setFavorites(favData.map((f: any) => f.listing_id));
        }
        setRefreshing(false);
        setInitialLoading(false);
      },
      [buildQuery, session?.user?.id]
    );

    const fetchMore = useCallback(async () => {
      if (!hasMore || loadingMore || refreshing || initialLoading) return;
      setLoadingMore(true);
      const nextPage = page + 1;
      const { data: moreData, error } = await buildQuery(nextPage);
      if (!error && moreData && moreData.length > 0) {
        setListings((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const filteredNew = moreData.filter((i) => !existingIds.has(i.id));
          return [...prev, ...filteredNew];
        });
        setPage(nextPage);
        setHasMore(moreData.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
      setLoadingMore(false);
    }, [hasMore, loadingMore, refreshing, initialLoading, page, buildQuery]);

    useEffect(() => {
      fetchData();
    }, [fetchData]);

    // LOAD SEARCH HISTORY FROM ASYNCSTORAGE
    useEffect(() => {
      AsyncStorage.getItem('NEARBUY_SEARCH_HISTORY').then((val) => {
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) setSearchHistory(parsed);
          } catch {}
        }
      });
    }, []);

    const saveToHistory = useCallback((term: string) => {
      const trimmed = term.trim();
      if (!trimmed || trimmed.length < 2) return;
      setSearchHistory((prev) => {
        const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
        const updated = [trimmed, ...filtered].slice(0, 8);
        AsyncStorage.setItem('NEARBUY_SEARCH_HISTORY', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    }, []);

    const removeFromHistory = useCallback((termToRemove: string) => {
      setSearchHistory((prev) => {
        const updated = prev.filter((item) => item !== termToRemove);
        AsyncStorage.setItem('NEARBUY_SEARCH_HISTORY', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    }, []);

    const clearAllHistory = useCallback(() => {
      setSearchHistory([]);
      AsyncStorage.removeItem('NEARBUY_SEARCH_HISTORY').catch(() => {});
    }, []);

    // REAL-TIME SEARCH QUERY FROM SUPABASE
    useEffect(() => {
      const q = searchQuery.trim();
      if (q.length < 2) {
        setRemoteSuggestions([]);
        return;
      }

      const timer = setTimeout(async () => {
        try {
          const { data, error } = await supabase.from('listings').select('title').ilike('title', `%${q}%`).limit(8);

          if (!error && data && data.length > 0) {
            const titles = data.map((d: any) => d.title.trim()).filter((t: string) => Boolean(t));
            setRemoteSuggestions(titles);
          }
        } catch (err) {}
      }, 250);

      return () => clearTimeout(timer);
    }, [searchQuery]);

    // AUTOCOMPLETE / SEARCH SUGGESTIONS
    const searchSuggestions = useMemo(() => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return [];

      const popularKeywords = [
        'Laptop',
        'Laptop HP',
        'Laptop Lenovo',
        'Laptop Dell',
        'Laptop Apple MacBook',
        'Laptop Gaming',
        'iPhone',
        'iPhone 13',
        'iPhone 14',
        'iPhone 15',
        'Samsung Galaxy',
        'Samsung Ultra',
        'PlayStation 5',
        'Bicikletë',
        'Televizor Smart',
        'Karrige Zyre',
        'Tavolinë',
        'Patika Nike',
        'Patika Adidas',
        'Golf 7',
        'Golf 6',
        'Audi A4',
        'BMW',
        'Mercedes-Benz',
        'Apartament me qira',
        'Shtëpi',
        'Apple Watch',
        'AirPods',
      ];

      const listingTitles = listings.map((l) => l.title);
      const wordsFromTitles = listings.flatMap((l) => l.title.split(/[\s,.\-_/]+/).filter((w) => w.length >= 3));

      const candidateMap = new Map<string, string>();
      [...remoteSuggestions, ...listingTitles, ...wordsFromTitles, ...popularKeywords].forEach((word) => {
        const trimmed = word.trim();
        if (trimmed && !candidateMap.has(trimmed.toLowerCase())) {
          candidateMap.set(trimmed.toLowerCase(), trimmed);
        }
      });

      const allCandidates = Array.from(candidateMap.values());
      const startsWith = allCandidates.filter((item) => item.toLowerCase().startsWith(query));
      const contains = allCandidates.filter(
        (item) => !item.toLowerCase().startsWith(query) && item.toLowerCase().includes(query)
      );

      return [...startsWith, ...contains].slice(0, 6);
    }, [searchQuery, listings, remoteSuggestions]);

    const handleSelectSuggestion = useCallback(
      (suggestion: string) => {
        setSearchQuery(suggestion);
        saveToHistory(suggestion);
        setIsSearchFocused(false);
        Keyboard.dismiss();
      },
      [saveToHistory]
    );

    const toggleFavorite = useCallback(
      async (listingId: number) => {
        if (!session?.user) return Alert.alert(t.loginReq, t.loginReqDesc);
        setFavorites((prev) => {
          const exists = prev.includes(listingId);
          if (exists) supabase.from('favorites').delete().eq('user_id', session.user.id).eq('listing_id', listingId).then();
          else supabase.from('favorites').insert({ user_id: session.user.id, listing_id: listingId }).then();
          return exists ? prev.filter((id) => id !== listingId) : [...prev, listingId];
        });
      },
      [session?.user?.id, t]
    );

    const renderItem = useCallback(
      ({ item }: any) => (
        <ListingCard
          item={item}
          width={cardWidth}
          onPress={onViewDetails}
          onChat={onChat}
          isFavorited={favorites.includes(item.id)}
          toggleFavorite={toggleFavorite}
          theme={theme}
          t={t}
        />
      ),
      [cardWidth, favorites, onViewDetails, onChat, toggleFavorite, theme, t]
    );

    return (
      <View style={styles.screen}>
        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          sortBy={sortBy}
          setSortBy={setSortBy}
          selectedCities={selectedCities}
          setSelectedCities={setSelectedCities}
          onApply={() => setShowFilterModal(false)}
          theme={theme}
          t={t}
        />
        <CitySelectionModal
          visible={showCityModal}
          onClose={() => setShowCityModal(false)}
          mode="multiple"
          selectedValues={selectedCities}
          onSelect={(vals) => setSelectedCities(vals as string[])}
          theme={theme}
          t={t}
        />
        <VisualSearchModal
          visible={visualSearchVisible}
          imageUri={analyzedImage}
          keywords={detectedKeywords}
          onClose={() => setVisualSearchVisible(false)}
          onSearch={handleModalSearch}
          theme={theme}
          t={t}
        />

        {/* DISMISS SEARCH BACKDROP */}
        {isSearchFocused && (
          <TouchableWithoutFeedback onPress={dismissSearch}>
            <View style={[StyleSheet.absoluteFill, { zIndex: 90, backgroundColor: 'transparent' }]} />
          </TouchableWithoutFeedback>
        )}

        <View
          style={[
            styles.header,
            { backgroundColor: theme.card, borderBottomColor: theme.border, zIndex: 100, elevation: Platform.OS === 'android' ? 10 : undefined },
          ]}
        >
          <TouchableWithoutFeedback onPress={dismissSearch}>
            <View style={{ width: '100%', paddingVertical: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={[styles.logoText, { color: theme.primary }]}>
                  NearBuy<Text style={{ color: theme.secondary }}>.</Text>
                </Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
          <View style={{ position: 'relative', zIndex: 101 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[styles.searchBar, { backgroundColor: theme.inputBg, flex: 1 }]}>
                <Search size={20} color={theme.textLight} />
                <TextInput
                  ref={searchInputRef}
                  placeholder={t.searchPlaceholder}
                  placeholderTextColor={theme.textLight}
                  style={[styles.searchInput, { color: theme.text }, webNoOutline]}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setIsSearchFocused(true);
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    if (searchQuery.trim()) {
                      saveToHistory(searchQuery);
                      dismissSearch();
                    }
                  }}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      dismissSearch();
                    }}
                    style={{ padding: 4, marginRight: 2 }}
                  >
                    <X size={16} color={theme.textLight} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleVisualSearch} style={{ padding: 4 }}>
                  {isAnalyzing ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <View>
                      <Camera size={20} color={theme.textLight} />
                      <Sparkles size={10} color={theme.primary} style={{ position: 'absolute', top: -4, right: -4 }} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setShowFilterModal(true)}
                style={{
                  backgroundColor:
                    priceRange.min || priceRange.max || sortBy !== 'newest' || selectedCities.length > 0
                      ? theme.primary
                      : theme.inputBg,
                  borderRadius: RADIUS.lg,
                  width: 48,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ListFilter
                  size={20}
                  color={
                    priceRange.min || priceRange.max || sortBy !== 'newest' || selectedCities.length > 0
                      ? 'white'
                      : theme.textLight
                  }
                />
              </TouchableOpacity>
            </View>

            {/* AUTOCOMPLETE DROPDOWN & HISTORIKU I KËRKIMEVE */}
            {isSearchFocused &&
              ((searchQuery.trim().length === 0 && searchHistory.length > 0) ||
                (searchQuery.trim().length > 0 && searchSuggestions.length > 0)) && (
                <View style={[styles.suggestionsDropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  {/* Rasti 1: Historiku i kërkimeve kur fusha është bosh */}
                  {searchQuery.trim().length === 0 && searchHistory.length > 0 && (
                    <>
                      <View style={[styles.dropdownHeader, { borderBottomColor: theme.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Clock size={13} color={theme.textLight} />
                          <Text style={[styles.dropdownHeaderText, { color: theme.textLight }]}>{t.recentSearches}</Text>
                        </View>
                        <TouchableOpacity onPress={clearAllHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
                          <Trash2 size={15} color={theme.danger} />
                        </TouchableOpacity>
                      </View>
                      {searchHistory.map((item, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.suggestionRow,
                            idx < searchHistory.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                          ]}
                        >
                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => handleSelectSuggestion(item)}
                          >
                            <View style={[styles.suggestionIconBg, { backgroundColor: theme.inputBg }]}>
                              <Clock size={13} color={theme.textLight} />
                            </View>
                            <Text style={[styles.suggestionText, { color: theme.text }]} numberOfLines={1}>
                              {item}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => removeFromHistory(item)}
                            style={styles.historyDeleteBtn}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <X size={14} color={theme.textLight} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Rasti 2: Sugjerimet dinamike kur përdoruesi shkruan */}
                  {searchQuery.trim().length > 0 &&
                    searchSuggestions.length > 0 &&
                    searchSuggestions.map((item, idx) => {
                      const isFromHistory = searchHistory.some((h) => h.toLowerCase() === item.toLowerCase());
                      return (
                        <View
                          key={idx}
                          style={[
                            styles.suggestionRow,
                            idx < searchSuggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                          ]}
                        >
                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => handleSelectSuggestion(item)}
                          >
                            <View style={[styles.suggestionIconBg, { backgroundColor: theme.inputBg }]}>
                              {isFromHistory ? <Clock size={13} color={theme.textLight} /> : <Search size={13} color={theme.primary} />}
                            </View>
                            <Text style={[styles.suggestionText, { color: theme.text }]} numberOfLines={1}>
                              {item}
                            </Text>
                          </TouchableOpacity>
                          {isFromHistory ? (
                            <TouchableOpacity
                              onPress={() => removeFromHistory(item)}
                              style={styles.historyDeleteBtn}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <X size={14} color={theme.textLight} />
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity onPress={() => handleSelectSuggestion(item)} style={{ padding: 4 }}>
                              <ChevronRight size={14} color={theme.textLight} />
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                </View>
              )}
          </View>
        </View>

        <View style={{ marginTop: 10, paddingBottom: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {CATEGORIES.map((cat) => {
              let displayCat = cat;
              if (t[cat]) displayCat = t[cat];
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
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={{ alignItems: 'center', marginRight: 0, width: containerSize + 4 }}
                >
                  <View
                    style={{
                      width: containerSize,
                      height: containerSize,
                      borderRadius,
                      backgroundColor: isSelected ? theme.primary : BgColor,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 4,
                      borderWidth: isSelected ? 0 : 1,
                      borderColor: theme.border,
                    }}
                  >
                    <Icon size={iconSize} color={isSelected ? 'white' : Color} />
                  </View>
                  <Text numberOfLines={2} style={{ fontSize, fontWeight: '600', color: theme.text, textAlign: 'center' }}>
                    {displayCat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        {initialLoading ? (
          <SkeletonGrid cardWidth={cardWidth} gap={gap} theme={theme} />
        ) : (
          <FlatList
            ref={flatListRef}
            key={numColumns}
            data={listings}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={numColumns}
            columnWrapperStyle={{ gap }}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            onEndReached={fetchMore}
            onEndReachedThreshold={0.4}
            initialNumToRender={6}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => {
              setIsSearchFocused(false);
              Keyboard.dismiss();
            }}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.textLight }]}>{t.noListings}</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }
);

HomeScreen.displayName = 'HomeScreen';
