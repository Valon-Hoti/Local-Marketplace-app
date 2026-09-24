import React, { useState } from 'react';
import {
  Alert,
  Platform,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Globe, Store, Eye, EyeOff } from 'lucide-react-native';
import { AuthScreenProps } from '../../types/marketplace';
import { supabase } from '../../lib/supabase';
import {
  checkRateLimit,
  getRemainingRateLimitTime,
  validateEmail,
  validatePassword,
  sanitizeText,
} from '../../lib/security';
import { styles } from '../../constants/styles';

const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {};

export function AuthScreen({ onLoginSuccess, onGuestLogin, theme, t, lang, setLang }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !username)) {
      Alert.alert(t.error, t.fillFields);
      return;
    }
    if (!validateEmail(email.trim())) {
      Alert.alert(t.error, t.invalidEmail);
      return;
    }
    if (!validatePassword(password)) {
      Alert.alert(t.error, t.passwordTooShort);
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      Alert.alert(t.error, t.passMismatch);
      return;
    }

    // Rate limiting: max 5 auth attempts per 60 seconds
    if (!checkRateLimit('auth_attempt', 5, 60000)) {
      const sec = getRemainingRateLimitTime('auth_attempt', 60000);
      Alert.alert(t.error, (t.rateLimitCooldown || 'Prisni {seconds}s').replace('{seconds}', String(sec)));
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        Alert.alert(t.success, t.loginSuccess);
        onLoginSuccess();
      } else {
        const cleanUsername = sanitizeText(username, 30);
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: cleanUsername } },
        });
        if (error) throw error;
        Alert.alert(t.success, t.signupSuccess);
        setIsLogin(true);
      }
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('rate exceeded')) {
        Alert.alert(t.error, t.rateLimitExceeded || 'Keni tejkaluar limitin e kërkesave. Ju lutem provoni përsëri më vonë.');
      } else {
        Alert.alert(t.error, msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert(t.error, t.fillFields);
      return;
    }
    if (!validateEmail(email.trim())) {
      Alert.alert(t.error, t.invalidEmail);
      return;
    }

    // Rate limiting: max 2 password resets per 60 seconds
    if (!checkRateLimit('reset_password', 2, 60000)) {
      const sec = getRemainingRateLimitTime('reset_password', 60000);
      Alert.alert(t.error, (t.rateLimitCooldown || 'Prisni {seconds}s').replace('{seconds}', String(sec)));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      Alert.alert(t.success, t.resetLinkSent);
      setIsReset(false);
      setIsLogin(true);
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('rate exceeded')) {
        Alert.alert(t.error, t.rateLimitExceeded || 'Keni tejkaluar limitin e dërgimit të emaileve. Ju lutem provoni përsëri pas pak kohësh.');
      } else {
        Alert.alert(t.error, msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isReset) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', padding: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 10, textAlign: 'center' }}>
          {t.resetPassword}
        </Text>
        <Text style={{ fontSize: 14, color: theme.textLight, marginBottom: 30, textAlign: 'center' }}>
          {t.emailForReset}
        </Text>
        <TextInput
          placeholder={t.email}
          placeholderTextColor={theme.textLight}
          value={email}
          onChangeText={setEmail}
          style={[{ backgroundColor: theme.inputBg, color: theme.text, borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 }, webNoOutline]}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={handleResetPassword}
          disabled={loading}
          style={{ backgroundColor: theme.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{t.sendResetLink}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setIsReset(false); setIsLogin(true); }} style={{ alignItems: 'center' }}>
          <Text style={{ color: theme.primary, fontWeight: '600' }}>{t.backToLogin}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, zIndex: 10 }}>
        {/* LANGUAGE SWITCHER */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderRadius: 20, padding: 3 }}>
          <Globe size={15} color={theme.textLight} style={{ marginLeft: 6, marginRight: 4 }} />
          <TouchableOpacity
            onPress={() => setLang('sq')}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 14,
              backgroundColor: lang === 'sq' ? theme.primary : 'transparent',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: lang === 'sq' ? 'white' : theme.textLight }}>SQ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setLang('en')}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 14,
              backgroundColor: lang === 'en' ? theme.primary : 'transparent',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: lang === 'en' ? 'white' : theme.textLight }}>EN</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onGuestLogin} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 16, marginRight: 4 }}>{t.guest}</Text>
          <ChevronRight size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
          {/* HEADER IMG OR LOGO */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Store size={40} color="white" />
            </View>
            <Text style={[styles.logoText, { fontSize: 32, color: theme.primary, marginBottom: 8 }]}>
              NearBuy<Text style={{ color: theme.secondary }}>.</Text>
            </Text>
            <Text style={{ fontSize: 16, color: theme.textLight }}>{t.loginSubtitle}</Text>
          </View>

          <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center' }}>
            <TextInput
              placeholder={t.emailOrUser}
              placeholderTextColor={theme.textLight}
              value={email}
              onChangeText={setEmail}
              style={[{ backgroundColor: theme.inputBg, color: theme.text, borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 }, webNoOutline]}
              autoCapitalize="none"
            />
            {/* Username Field if Sign Up */}
            {!isLogin && (
              <TextInput
                placeholder={t.username}
                placeholderTextColor={theme.textLight}
                value={username}
                onChangeText={setUsername}
                style={[{ backgroundColor: theme.inputBg, color: theme.text, borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 }, webNoOutline]}
                autoCapitalize="none"
              />
            )}

            {/* Password Field with Eye Toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderRadius: 12, paddingHorizontal: 16, marginBottom: 16 }}>
              <TextInput
                placeholder={t.password}
                placeholderTextColor={theme.textLight}
                value={password}
                onChangeText={setPassword}
                style={[{ flex: 1, color: theme.text, paddingVertical: 16, fontSize: 16 }, webNoOutline]}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ padding: 6 }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? <EyeOff size={20} color={theme.textLight} /> : <Eye size={20} color={theme.textLight} />}
              </TouchableOpacity>
            </View>

            {/* Confirm Password Field with Eye Toggle */}
            {!isLogin && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderRadius: 12, paddingHorizontal: 16, marginBottom: 16 }}>
                <TextInput
                  placeholder={t.confirmPass}
                  placeholderTextColor={theme.textLight}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={[{ flex: 1, color: theme.text, paddingVertical: 16, fontSize: 16 }, webNoOutline]}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ padding: 6 }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showConfirmPassword ? <EyeOff size={20} color={theme.textLight} /> : <Eye size={20} color={theme.textLight} />}
                </TouchableOpacity>
              </View>
            )}

            {isLogin && (
              <TouchableOpacity onPress={() => setIsReset(true)} style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
                <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '600' }}>{t.forgotPassword}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleAuth}
              disabled={loading}
              style={{ backgroundColor: theme.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{isLogin ? t.loginButton : t.signupButton}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: theme.textLight }}>{isLogin ? t.switchToSignup : t.switchToLogin}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
