import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { KOSOVA_CITIES } from '../../constants/theme';
import { PrimaryButton } from '../common/UIComponents';

export interface CitySelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (val: string | string[]) => void;
  selectedValues: string | string[];
  mode: 'single' | 'multiple';
  theme: any;
  t: any;
}

export const CitySelectionModal = ({
  visible,
  onClose,
  onSelect,
  selectedValues,
  mode,
  theme,
  t,
}: CitySelectionModalProps) => {
  const [tempSelected, setTempSelected] = useState<string[]>(
    Array.isArray(selectedValues) ? selectedValues : selectedValues ? [selectedValues] : []
  );

  useEffect(() => {
    setTempSelected(Array.isArray(selectedValues) ? selectedValues : selectedValues ? [selectedValues] : []);
  }, [visible, selectedValues]);

  const toggleCity = (city: string) => {
    if (mode === 'single') {
      onSelect(city);
      onClose();
    } else {
      setTempSelected((prev) => (prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]));
    }
  };

  const handleApply = () => {
    onSelect(tempSelected);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: theme.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            height: '80%',
            padding: 20,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>
              {mode === 'single' ? t.selectCity : t.filterCity}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {KOSOVA_CITIES.map((city) => {
              const isSelected = tempSelected.includes(city);
              return (
                <TouchableOpacity
                  key={city}
                  onPress={() => toggleCity(city)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 15,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: mode === 'single' ? 12 : 4,
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
          </ScrollView>
          {mode === 'multiple' && (
            <PrimaryButton title={t.apply} onPress={handleApply} theme={theme} style={{ marginTop: 10 }} />
          )}
        </View>
      </View>
    </Modal>
  );
};
