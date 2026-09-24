import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { X, Search } from 'lucide-react-native';
import { PrimaryButton } from '../common/UIComponents';
import { getSafeImageUri } from '../../utils/helpers';

export interface VisualSearchModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onSearch: (keyword: string) => void;
  keywords: string[];
  theme: any;
  t: any;
}

export const VisualSearchModal = ({
  visible,
  imageUri,
  onClose,
  onSearch,
  keywords,
  theme,
  t,
}: VisualSearchModalProps) => {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  useEffect(() => {
    if (visible && keywords.length > 0) {
      setSelectedKeyword(keywords[0]);
    }
  }, [visible, keywords]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 24,
            padding: 20,
            maxHeight: '85%',
            width: '100%',
            maxWidth: 500,
            alignSelf: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>{t.results}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {imageUri && (
            <View
              style={{
                width: '100%',
                height: 220,
                backgroundColor: 'black',
                borderRadius: 16,
                marginBottom: 20,
                overflow: 'hidden',
              }}
            >
              <Image source={{ uri: getSafeImageUri(imageUri) }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            </View>
          )}

          <Text style={{ fontSize: 14, color: theme.textLight, marginBottom: 12, fontWeight: '600' }}>
            {t.selectKeyword}
          </Text>

          <ScrollView style={{ flexGrow: 0, marginBottom: 20 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {keywords.map((k: string) => (
              <TouchableOpacity
                key={k}
                onPress={() => setSelectedKeyword(k)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: selectedKeyword === k ? theme.primary : theme.inputBg,
                  borderWidth: 1,
                  borderColor: selectedKeyword === k ? theme.primary : theme.border,
                }}
              >
                <Text style={{ color: selectedKeyword === k ? 'white' : theme.text, fontWeight: '500' }}>{k}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <PrimaryButton
            title={`${t.searchBtn} ${selectedKeyword || '...'}`}
            onPress={() => {
              if (selectedKeyword) onSearch(selectedKeyword);
            }}
            theme={theme}
            disabled={!selectedKeyword}
            icon={Search}
          />
        </View>
      </View>
    </Modal>
  );
};
