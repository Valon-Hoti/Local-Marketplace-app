import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { Tag, Camera, X, ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { EditProps, Listing } from '../../types/marketplace';
import { CATEGORIES } from '../../constants/theme';
import { styles } from '../../constants/styles';
import { getListingImages, getSafeImageUri } from '../../utils/helpers';
import { supabase, uploadToSupabase } from '../../lib/supabase';
import { validatePrice, sanitizeText, sanitizeUrl } from '../../lib/security';
import { CitySelectionModal } from '../modals/CitySelectionModal';
import { SwipeBackContainer, useSwipeBack } from '../common/SwipeBackContainer';
import { PrimaryButton, InputField } from '../common/UIComponents';

export function EditListingScreen({ session, listing, onBack, onSuccess, theme, t }: EditProps) {
  const swipeBack = useSwipeBack();
  const handleBack = swipeBack?.onBack || onBack;
  const [title, setTitle] = useState(listing.title);
  const [price, setPrice] = useState(listing.price ? listing.price.toString() : '');
  const [desc, setDesc] = useState(listing.description || '');
  const [category, setCategory] = useState(listing.category || '');
  const [city, setCity] = useState(listing.location || '');
  const [images, setImages] = useState<string[]>(getListingImages(listing));
  const [loading, setLoading] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [condition, setCondition] = useState(listing.condition || '');

  useEffect(() => {
    setTitle(listing.title || '');
    setPrice(listing.price ? listing.price.toString() : '');
    setDesc(listing.description || '');
    setCategory(listing.category || '');
    setCity(listing.location || '');
    setImages(getListingImages(listing));
    setCondition(listing.condition || '');
  }, [listing]);

  const selectImageSource = () => {
    if (Platform.OS === 'web') {
      pickImagesLibrary();
      return;
    }
    Alert.alert(t.add, t.chooseSource, [
      { text: t.camera, onPress: pickImageCamera },
      { text: t.gallery, onPress: pickImagesLibrary },
      { text: t.cancel, style: 'cancel' },
    ]);
  };

  const pickImageCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], aspect: [4, 3], quality: 0.3 });
    if (!result.canceled) {
      const url = await uploadToSupabase(result.assets[0].uri);
      if (url) setImages((prev) => [...prev, url]);
      else Alert.alert(t.error || 'Gabim', 'Dështoi ngarkimi i fotos.');
    }
  };

  const pickImagesLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.3,
    });
    if (!result.canceled) {
      const uploaded = await Promise.all(result.assets.map((a) => uploadToSupabase(a.uri)));
      const valid = uploaded.filter((u): u is string => !!u);
      if (valid.length > 0) setImages((prev) => [...prev, ...valid]);
      if (valid.length < uploaded.length) Alert.alert(t.error || 'Gabim', 'Disa foto nuk mund të ngarkoheshin.');
    }
  };

  const removeImage = (index: number) => {
    const u = [...images];
    u.splice(index, 1);
    setImages(u);
  };

  const isPriceRequired = category !== 'services' && category !== 'free';

  const handleUpdate = async () => {
    if (!session?.user?.id || session.user.id !== listing.seller_id) {
      Alert.alert(t.error, t.unauthorizedAction || 'Unauthorized');
      return;
    }
    if (!title?.trim() || !category || !city || (isPriceRequired && !price?.trim())) {
      Alert.alert(t.error, t.fillFields);
      return;
    }
    const priceValidation = validatePrice(price);
    if (isPriceRequired && !priceValidation.valid) {
      Alert.alert(t.error, priceValidation.message || t.invalidPrice);
      return;
    }
    setLoading(true);
    const finalPrice = price && !isNaN(parseFloat(price)) ? parseFloat(price) : 0;
    const cleanImages: string[] = images
      .map((img) => sanitizeUrl(img))
      .filter((u): u is string => typeof u === 'string' && u.length > 0);
    const updates: Partial<Listing> = {
      title: sanitizeText(title, 120),
      price: finalPrice,
      description: sanitizeText(desc, 3000),
      category: sanitizeText(category, 50),
      images: cleanImages,
      image_url: cleanImages[0] || null,
      location: sanitizeText(city, 80),
      condition: category === 'services' ? undefined : condition?.trim() ? sanitizeText(condition, 30) : undefined,
    };
    const { error } = await supabase
      .from('listings')
      .update(updates)
      .eq('id', listing.id)
      .eq('seller_id', session.user.id);
    setLoading(false);
    if (error) Alert.alert(t.error, error.message);
    else {
      Alert.alert(t.success, t.postUpdated);
      onSuccess({ ...listing, ...updates });
    }
  };

  return (
    <SwipeBackContainer onBack={onBack} style={{ backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.screen, { backgroundColor: theme.background }]}
      >
        <CitySelectionModal
          visible={showCityModal}
          onClose={() => setShowCityModal(false)}
          mode="single"
          selectedValues={city}
          onSelect={(val) => setCity(val as string)}
          theme={theme}
          t={t}
        />
        <View
          style={[
            styles.headerSimple,
            {
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
              paddingTop: Platform.OS === 'ios' ? 50 : 20,
              height: Platform.OS === 'ios' ? 100 : 70,
            },
          ]}
        >
          <TouchableOpacity onPress={handleBack} style={{ padding: 8 }}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
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
                <Image
                  source={{ uri: getSafeImageUri(img) }}
                  style={styles.photoThumb}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
                <TouchableOpacity onPress={() => removeImage(idx)} style={styles.removePhotoBtn}>
                  <X size={12} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.details}</Text>
          <InputField value={title} onChangeText={setTitle} placeholder={t.titlePlaceholder} icon={Tag} theme={theme} />
          <InputField
            value={price}
            onChangeText={setPrice}
            placeholder={
              category === 'services'
                ? t.pricePlaceholderServices || 'Çmimi (€) - Opsionale'
                : category === 'free'
                ? t.free
                : t.pricePlaceholder
            }
            keyboardType="numeric"
            theme={theme}
            icon={({ color }: any) => (
              <Text style={{ fontSize: 18, color, fontWeight: 'bold' }}>€</Text>
            )}
          />

          {category !== 'services' && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.condition}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => setCondition('new')}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: condition === 'new' ? theme.primary : theme.inputBg,
                      borderColor: theme.border,
                    },
                    condition === 'new' && { borderColor: theme.primary },
                  ]}
                >
                  <Text style={[styles.categoryText, { color: condition === 'new' ? 'white' : theme.text }]}>
                    {t.conditionNew}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCondition('used')}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: condition === 'used' ? theme.primary : theme.inputBg,
                      borderColor: theme.border,
                    },
                    condition === 'used' && { borderColor: theme.primary },
                  ]}
                >
                  <Text style={[styles.categoryText, { color: condition === 'used' ? 'white' : theme.text }]}>
                    {t.conditionUsed}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <Text style={[styles.sectionLabel, { marginTop: 10, color: theme.text }]}>{t.location}</Text>
          <TouchableOpacity
            onPress={() => setShowCityModal(true)}
            style={[styles.inputContainer, { backgroundColor: theme.inputBg, justifyContent: 'center' }]}
          >
            <Text style={{ fontSize: 16, color: city ? theme.text : theme.textLight }}>{city || t.selectCity}</Text>
          </TouchableOpacity>

          <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.category}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {CATEGORIES.filter((c) => c !== 'all').map((cat) => {
              let displayCat = cat;
              if (t[cat]) displayCat = t[cat];
              const isSelected = category?.toLowerCase() === cat.toLowerCase();
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.inputBg,
                      borderColor: theme.border,
                    },
                    isSelected && { borderColor: theme.primary },
                  ]}
                >
                  <Text style={[styles.categoryText, { color: isSelected ? 'white' : theme.text }]}>{displayCat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.description}</Text>
          <InputField value={desc} onChangeText={setDesc} placeholder={t.description} multiline theme={theme} />

          <PrimaryButton title={t.save} onPress={handleUpdate} loading={loading} style={{ marginTop: 10 }} theme={theme} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SwipeBackContainer>
  );
}
