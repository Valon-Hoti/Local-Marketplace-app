import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { styles } from '../../constants/styles';

export const PrimaryButton = ({ title, onPress, loading, style, icon: Icon, theme }: any) => (
  <TouchableOpacity
    style={[styles.primaryBtn, { backgroundColor: theme.primary }, style, loading && { opacity: 0.7 }]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator color="white" />
    ) : (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {Icon && <Icon size={20} color="white" style={{ marginRight: 8 }} />}
        <Text style={styles.primaryBtnText}>{title}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {};

export const InputField = ({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  secureTextEntry,
  icon: Icon,
  theme,
  maxLength,
}: any) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = secureTextEntry !== undefined;
  return (
    <View
      style={[
        styles.inputContainer,
        { backgroundColor: theme.inputBg },
        multiline && { height: 100, alignItems: 'flex-start', paddingVertical: 10 },
      ]}
    >
      {Icon && <Icon size={20} color={theme.textLight} style={{ marginRight: 10 }} />}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textLight}
        style={[
          styles.modernInput,
          { color: theme.text },
          multiline && { height: '100%', textAlignVertical: 'top' },
          webNoOutline,
        ]}
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={isPassword && !isPasswordVisible}
        autoCapitalize="none"
        maxLength={maxLength}
      />
      {isPassword && (
        <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
          {isPasswordVisible ? <EyeOff size={20} color={theme.textLight} /> : <Eye size={20} color={theme.textLight} />}
        </TouchableOpacity>
      )}
    </View>
  );
};

export const TabButton = memo(({ icon: Icon, label, isActive, onPress, badge, theme, activeColor }: any) => {
  const iconColor = isActive ? (activeColor || theme.primary) : theme.textLight;
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      <View>
        <Icon color={iconColor} size={24} strokeWidth={isActive ? 2.5 : 2} />
        {badge ? (
          <View style={[styles.tabBadge, { backgroundColor: theme.danger, borderColor: theme.tabBar }]}>
            <Text style={styles.tabBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.tabLabel, { color: iconColor }]}>{label}</Text>
    </TouchableOpacity>
  );
});

export const GuestPlaceholder = ({ t, theme, onJoin, title, desc, icon: Icon }: any) => (
  <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
    <View
      style={{
        width: 100,
        height: 100,
        backgroundColor: theme.inputBg,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
      }}
    >
      <Icon size={48} color={theme.primary} />
    </View>
    <Text style={{ fontSize: 24, fontWeight: '800', color: theme.text, marginBottom: 12, textAlign: 'center' }}>
      {title || t.loginReq}
    </Text>
    <Text style={{ fontSize: 16, color: theme.textLight, textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
      {desc || t.loginReqDesc}
    </Text>
    <PrimaryButton title={t.loginOrSignup} onPress={onJoin} theme={theme} style={{ width: '100%' }} />
  </View>
);
