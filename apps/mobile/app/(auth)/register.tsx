import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

type UserType = 'FARMER' | 'BUYER';

export default function RegisterScreen() {
  const { login } = useAuth();
  const [userType, setUserType] = useState<UserType>('BUYER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'البريد الإلكتروني مطلوب';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'بريد إلكتروني غير صالح';
    if (!password) e.password = 'كلمة المرور مطلوبة';
    else if (password.length < 8) e.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    if (!confirmPassword) e.confirmPassword = 'تأكيد كلمة المرور مطلوب';
    else if (password !== confirmPassword) e.confirmPassword = 'كلمتا المرور غير متطابقتين';
    if (!businessName.trim()) e.businessName = 'اسم الشركة مطلوب';
    if (!contactPersonName.trim()) e.contactPersonName = 'اسم المسؤول مطلوب';
    if (!phone.trim()) e.phone = 'رقم الجوال مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      await authApi.register({
        email: email.trim(),
        password,
        userType,
        businessName: businessName.trim(),
        contactPersonName: contactPersonName.trim(),
        phone: phone.trim(),
      });
      // Auto-login after register
      await login(email.trim(), password);
      router.replace('/(tabs)/');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        'فشل إنشاء الحساب. حاول مرة أخرى';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-forward" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Ionicons name="leaf" size={36} color="#fff" />
            </View>
            <Text style={styles.appName}>جمارت</Text>
            <Text style={styles.tagline}>إنشاء حساب جديد</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* User Type Selector */}
            <Text style={styles.sectionLabel}>نوع الحساب</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  userType === 'FARMER' && styles.typeBtnActive,
                ]}
                onPress={() => setUserType('FARMER')}
              >
                <Ionicons
                  name="leaf"
                  size={20}
                  color={userType === 'FARMER' ? '#fff' : '#6b7280'}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    userType === 'FARMER' && styles.typeBtnTextActive,
                  ]}
                >
                  مزارع
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  userType === 'BUYER' && styles.typeBtnActive,
                ]}
                onPress={() => setUserType('BUYER')}
              >
                <Ionicons
                  name="storefront"
                  size={20}
                  color={userType === 'BUYER' ? '#fff' : '#6b7280'}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    userType === 'BUYER' && styles.typeBtnTextActive,
                  ]}
                >
                  مشتري
                </Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="البريد الإلكتروني"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="example@email.com"
              error={errors.email}
            />

            <Input
              label="كلمة المرور"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="8 أحرف على الأقل"
              error={errors.password}
            />

            <Input
              label="تأكيد كلمة المرور"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="أعد كتابة كلمة المرور"
              error={errors.confirmPassword}
            />

            <Input
              label={userType === 'FARMER' ? 'اسم المزرعة / الشركة' : 'اسم الشركة'}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder={userType === 'FARMER' ? 'مزرعة النخيل' : 'شركة التوريدات'}
              error={errors.businessName}
            />

            <Input
              label="اسم المسؤول"
              value={contactPersonName}
              onChangeText={setContactPersonName}
              placeholder="محمد أحمد"
              error={errors.contactPersonName}
            />

            <Input
              label="رقم الجوال"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="05xxxxxxxx"
              error={errors.phone}
            />

            <Button
              label="إنشاء الحساب"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerBtn}
            />

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>لديك حساب بالفعل؟ </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.loginLink}>تسجيل الدخول</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#16a34a' },
  container: { flexGrow: 1 },
  header: {
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    right: 20,
    top: 20,
    padding: 8,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appName: { fontSize: 26, fontWeight: '800', color: '#fff' },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  card: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingTop: 28,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  typeBtnActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  typeBtnText: { fontSize: 15, fontWeight: '700', color: '#6b7280' },
  typeBtnTextActive: { color: '#fff' },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  errorText: { color: '#dc2626', fontSize: 13, flex: 1, textAlign: 'right' },
  registerBtn: { marginTop: 8 },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  loginText: { color: '#6b7280', fontSize: 14 },
  loginLink: { color: '#16a34a', fontSize: 14, fontWeight: '700' },
});
