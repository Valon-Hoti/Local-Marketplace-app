import React, { useState, useEffect } from 'react';
import {
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { X, Check, ChevronRight } from 'lucide-react-native';
import { KOSOVA_CITIES } from '../../constants/theme';

export interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  priceRange: { min: string; max: string };
  setPriceRange: (range: { min: string; max: string }) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  onApply: () => void;
  theme: any;
  t: any;
  selectedCities: string[];
  setSelectedCities: (cities: string[]) => void;
}

export const FilterModal = ({
  visible,
  onClose,
  priceRange,
  setPriceRange,
  sortBy,
  setSortBy,
  onApply,
  theme,
  t,
  selectedCities,
  setSelectedCities,
}: FilterModalProps) => {
  const [localMin, setLocalMin] = useState(priceRange.min);
  const [localMax, setLocalMax] = useState(priceRange.max);
  const [localSort, setLocalSort] = useState(sortBy);
  const [localCities, setLocalCities] = useState<string[]>(selectedCities || []);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setLocalMin(priceRange.min);
    setLocalMax(priceRange.max);
    setLocalSort(sortBy);
    setLocalCities(selectedCities || []);
  }, [visible, priceRange, sortBy, selectedCities]);

  const handleReset = () => {
    setLocalMin('');
    setLocalMax('');
    setLocalSort('newest');
    setLocalCities([]);
    setShowAdvanced(false);
  };

  const handleApply = () => {
    setPriceRange({ min: localMin, max: localMax });
    setSortBy(localSort);
    setSelectedCities(localCities);
    onApply();
  };

  const toggleCity = (city: string) => {
    setLocalCities((prev) => {
      if (city === 'Të gjitha') return [];
      if (prev.includes(city)) return prev.filter((c) => c !== city);
      return [...prev, city];
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <TouchableWithoutFeedback>
            <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 24,
                  paddingBottom: 10,
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>{t.filterCity}</Text>
                <TouchableOpacity onPress={onClose}>
                  <X size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 0 }}>
                <View style={{ marginBottom: 24 }}>
                  {KOSOVA_CITIES.map((city) => {
                    const isSelected = city === 'Të gjitha' ? localCities.length === 0 : localCities.includes(city);
                    return (
                      <TouchableOpacity
                        key={city}
                        onPress={() => toggleCity(city)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: theme.border,
                        }}
                      >
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            borderWidth: 2,
                            borderColor: isSelected ? theme.primary : theme.textLight,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 15,
                            backgroundColor: isSelected ? theme.primary : 'transparent',
                          }}
                        >
                          {isSelected && <Check size={16} color="white" />}
                        </View>
                        <Text style={{ fontSize: 16, color: theme.text }}>{city}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  onPress={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                    {t.filters} / {t.sortBy}
                  </Text>
                  {showAdvanced ? (
                    <ChevronRight size={20} color={theme.text} style={{ transform: [{ rotate: '90deg' }] }} />
                  ) : (
                    <ChevronRight size={20} color={theme.text} />
                  )}
                </TouchableOpacity>

                {showAdvanced && (
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 12 }}>
                      {t.pricePrice}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, color: theme.textLight, marginBottom: 4 }}>{t.minPrice}</Text>
                        <TextInput
                          keyboardType="decimal-pad"
                          value={localMin}
                          onChangeText={(txt) => setLocalMin(txt.replace(',', '.'))}
                          placeholder="0"
                          placeholderTextColor={theme.textLight}
                          style={{ backgroundColor: theme.inputBg, borderRadius: 12, padding: 12, color: theme.text }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, color: theme.textLight, marginBottom: 4 }}>{t.maxPrice}</Text>
                        <TextInput
                          keyboardType="decimal-pad"
                          value={localMax}
                          onChangeText={(txt) => setLocalMax(txt.replace(',', '.'))}
                          placeholder="MAX"
                          placeholderTextColor={theme.textLight}
                          style={{ backgroundColor: theme.inputBg, borderRadius: 12, padding: 12, color: theme.text }}
                        />
                      </View>
                    </View>

                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 12 }}>
                      {t.sortBy}
                    </Text>
                    <View style={{ gap: 8, marginBottom: 24 }}>
                      {[
                        { id: 'newest', label: t.sortNewest },
                        { id: 'oldest', label: t.sortOldest },
                        { id: 'price_asc', label: t.sortPriceLow },
                        { id: 'price_desc', label: t.sortPriceHigh },
                      ].map((opt) => (
                        <TouchableOpacity
                          key={opt.id}
                          onPress={() => setLocalSort(opt.id)}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                        >
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              borderWidth: 2,
                              borderColor: localSort === opt.id ? theme.primary : theme.textLight,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 12,
                            }}
                          >
                            {localSort === opt.id && (
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary }} />
                            )}
                          </View>
                          <Text style={{ fontSize: 16, color: theme.text, flex: 1 }}>{opt.label || opt.id}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={handleReset}
                    style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: theme.inputBg, alignItems: 'center' }}
                  >
                    <Text style={{ color: theme.text, fontWeight: 'bold' }}>{t.reset}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleApply}
                    style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center' }}
                  >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>{t.apply}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
