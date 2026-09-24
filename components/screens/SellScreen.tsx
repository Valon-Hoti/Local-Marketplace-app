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
import { Tag, Camera, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { SellScreenProps } from '../../types/marketplace';
import { CATEGORIES } from '../../constants/theme';
import { styles } from '../../constants/styles';
import { getSafeImageUri } from '../../utils/helpers';
import { supabase, uploadToSupabase } from '../../lib/supabase';
import {
  validatePrice,
  checkRateLimit,
  getRemainingRateLimitTime,
  sanitizeText,
  sanitizeUrl,
} from '../../lib/security';
import { CitySelectionModal } from '../modals/CitySelectionModal';
import { PrimaryButton, InputField, GuestPlaceholder } from '../common/UIComponents';

export function SellScreen({ session, onSuccess, theme, t, onReqLogin }: SellScreenProps) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [condition, setCondition] = useState('');
  const [showCityModal, setShowCityModal] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user && !city) {
      supabase
        .from('profiles')
        .select('city')
        .eq('id', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.city) setCity(data.city);
        });
    }
  }, [session?.user?.id]);

  if (!session?.user) {
    return (
      <GuestPlaceholder
        t={t}
        theme={theme}
        onJoin={onReqLogin}
        title={t.guestSellTitle}
        desc={t.guestSellDesc}
        icon={Tag}
      />
    );
  }

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
    if (status !== 'granted') {
      Alert.alert(t.permissionMissing);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], aspect: [4, 3], quality: 0.3 });
    if (!result.canceled) {
      const url = await uploadToSupabase(result.assets[0].uri);
      if (url) setImages((prev) => [...prev, url]);
      else Alert.alert(t.error || 'Gabim', 'Dështoi ngarkimi i fotos.');
    }
  };

  const pickImagesLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.permissionMissing);
      return;
    }
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

  async function handlePost() {
    if (!session?.user) return Alert.alert(t.error, t.guestSellDesc);
    if (!title?.trim() || !category || !city || (isPriceRequired && !price?.trim())) {
      return Alert.alert(t.error, t.fillFields);
    }
    const priceValidation = validatePrice(price);
    if (isPriceRequired && !priceValidation.valid) {
      return Alert.alert(t.error, priceValidation.message || t.invalidPrice);
    }
    // Rate limiting: max 3 listing creations per 60 seconds
    if (!checkRateLimit(`post_listing_${session.user.id}`, 3, 60000)) {
      const sec = getRemainingRateLimitTime(`post_listing_${session.user.id}`, 60000);
      return Alert.alert(t.error, (t.rateLimitCooldown || 'Prisni {seconds}s').replace('{seconds}', String(sec)));
    }
    setLoading(true);
    let sellerName = 'Përdorues';
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', session.user.id)
      .maybeSingle();
    if (profile?.display_name) {
      sellerName = profile.display_name;
    } else if (session.user.user_metadata?.username) {
      sellerName = session.user.user_metadata.username;
    } else if (session.user.email) {
      sellerName = session.user.email.split('@')[0];
    }
    const cleanImages: string[] = images
      .map((img) => sanitizeUrl(img))
      .filter((u): u is string => typeof u === 'string' && u.length > 0);
    const finalImage =
      cleanImages.length > 0
        ? cleanImages[0]
        : 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400';
    const finalPrice = price && !isNaN(parseFloat(price)) ? parseFloat(price) : 0;
    const { error } = await supabase.from('listings').insert({
      title: sanitizeText(title, 120),
      price: finalPrice,
      description: sanitizeText(desc, 3000),
      seller_id: session.user.id,
      seller_name: sanitizeText(sellerName || '', 60),
      image_url: finalImage,
      images: cleanImages,
      category: sanitizeText(category, 50),
      location: sanitizeText(city, 80),
      condition: category === 'services' ? undefined : condition?.trim() ? sanitizeText(condition, 30) : undefined,
    });
    setLoading(false);
    if (error) Alert.alert(t.error, error.message);
    else {
      Alert.alert(t.success, t.postCreated);
      onSuccess();
      setTitle('');
      setPrice('');
      setDesc('');
      setCategory('');
      setCity('');
      setImages([]);
      setCondition('');
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
      <CitySelectionModal
        visible={showCityModal}
        onClose={() => setShowCityModal(false)}
        mode="single"
        selectedValues={city}
        onSelect={(val) => setCity(val as string)}
        theme={theme}
        t={t}
      />
      <View style={[styles.headerSimple, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t.sellTitle}</Text>
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
            <Text style={[styles.sectionLabel, { marginTop: 10, color: theme.text }]}>{t.condition}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setCondition('new')}
                style={[
                  styles.categoryChip,
                  { backgroundColor: condition === 'new' ? theme.primary : theme.card, borderColor: theme.border },
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
                  { backgroundColor: condition === 'used' ? theme.primary : theme.card, borderColor: theme.border },
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
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  setCategory(cat);
                  if (cat === 'services') setCondition('');
                }}
                style={[
                  styles.categoryChip,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  category === cat && { backgroundColor: theme.text, borderColor: theme.text },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: theme.text },
                    category === cat && { color: theme.background },
                  ]}
                >
                  {displayCat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Text style={[styles.sectionLabel, { color: theme.text }]}>{t.description}</Text>
        <InputField value={desc} onChangeText={setDesc} placeholder={t.description} multiline theme={theme} />
        <PrimaryButton title={t.publish} onPress={handlePost} loading={loading} style={{ marginTop: 10 }} theme={theme} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
