import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, Image, ScrollView, StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { registerUser, setFullProfile } from '../redux/userSlice';
import { setExpenses } from '../redux/expenseSlice';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import { useTranslation } from '../i18n/I18nContext';
import { supabase } from '../utils/supabaseClient';

const AVATAR_OPTIONS = ['Felix', 'Aneka', 'Oliver', 'Jasper', 'Chloe', 'Max', 'Luna'];

const FEATURES = [
  { icon: 'chart-donut',    label: 'Suivi en temps réel' },
  { icon: 'shield-check',   label: 'Données 100 % locales' },
  { icon: 'calendar-month', label: 'Budgets prévisionnels' },
];

export default function Onboarding() {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const dispatch   = useDispatch();

  const FEATURES_LOCALIZED = [
    { icon: 'chart-donut',    label: language === 'en' ? 'Real-time tracking' : 'Suivi en temps réel' },
    { icon: 'shield-check',   label: language === 'en' ? '100% local data' : 'Données 100 % locales' },
    { icon: 'calendar-month', label: language === 'en' ? 'Forecast budgets' : 'Budgets prévisionnels' },
  ];

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [avatarSeed, setAvatarSeed] = useState('Felix');
  const [avatarUri,  setAvatarUri]  = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const handleStart = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert(language === 'en' ? 'Please enter your first and last name.' : 'Veuillez entrer votre nom et prénom.');
      return;
    }
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      alert(language === 'en' ? 'Please enter your phone number to synchronize your data.' : 'Veuillez entrer votre numéro de téléphone pour synchroniser vos données.');
      return;
    }

    setLoading(true);

    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: cleanPhone,
      avatarSeed,
      avatarUri,
      securityMode: 'none' as const,
      biometricEnabled: false,
      notificationsEnabled: false,
      language: language,
    };

    try {
      // 1. Vérifier si le profil existe déjà sur Supabase
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message);
      }

      if (profile) {
        // Utilisateur existant trouvé ! Restauration de ses données
        alert(language === 'en' 
          ? `Welcome back, ${profile.first_name}! Restoring your transactions...` 
          : `Ravi de vous revoir, ${profile.first_name} ! Restauration de vos données...`
        );

        // Récupérer ses dépenses
        const { data: dbExpenses, error: expensesError } = await supabase
          .from('expenses')
          .select('*')
          .eq('phone', cleanPhone);

        if (expensesError) {
          console.error('Failed to fetch expenses from Supabase', expensesError);
        }

        const loadedProfile = {
          firstName: profile.first_name,
          lastName: profile.last_name,
          phone: profile.phone,
          avatarSeed: profile.avatar_seed || 'Felix',
          avatarUri: profile.avatar_uri,
          isRegistered: true,
          securityMode: 'none' as const,
          biometricEnabled: false,
          notificationsEnabled: false,
          language: profile.language || language,
          currency: profile.currency || 'GNF',
        };

        const mappedExpenses = (dbExpenses || []).map((exp: any) => ({
          id: isNaN(Number(exp.id)) ? Date.now() + Math.random() : Number(exp.id),
          category: exp.category,
          amount: Number(exp.amount),
          currency: exp.currency || 'GNF',
          description: exp.description,
          icon: exp.icon || 'receipt',
          date: exp.date,
          status: exp.status || 'real',
          type: exp.type || 'expense',
        }));

        dispatch(setFullProfile(loadedProfile));
        dispatch(setExpenses(mappedExpenses));

        // Sauvegarde locale complémentaire
        await AsyncStorage.setItem('@user_profile', JSON.stringify(loadedProfile));
      } else {
        // Nouvel utilisateur ! On le crée sur Supabase
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            phone: cleanPhone,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            avatar_seed: avatarSeed,
            avatar_uri: avatarUri,
            currency: 'GNF',
            language: language,
          });

        if (insertError) {
          throw new Error(insertError.message);
        }

        dispatch(registerUser(userData));
        await AsyncStorage.setItem('@user_profile', JSON.stringify({ ...userData, isRegistered: true }));
      }
    } catch (err: any) {
      console.warn('Supabase sync error, falling back to local mode:', err.message);
      // Mode hors-ligne en cas d'erreur de connexion
      alert(language === 'en'
        ? 'Connection issue. Starting in Offline Mode. Data will be saved locally.'
        : 'Problème de connexion. Démarrage en Mode Hors-ligne. Vos données seront sauvegardées localement.'
      );
      dispatch(registerUser(userData));
      await AsyncStorage.setItem('@user_profile', JSON.stringify({ ...userData, isRegistered: true }));
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flexGrow: 1,
      paddingBottom: 40,
    },

    // Hero header
    hero: {
      backgroundColor: colors.primary,
      paddingTop: 60,
      paddingBottom: 40,
      paddingHorizontal: Spacing.lg,
      alignItems: 'center',
    },
    logoWrap: {
      width: 80,
      height: 80,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    appName: {
      fontSize: Typography.xxl,
      fontWeight: Typography.extraBold,
      color: '#fff',
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    tagline: {
      fontSize: Typography.base,
      color: 'rgba(255,255,255,0.75)',
      textAlign: 'center',
      lineHeight: 22,
    },

    // Features strip
    features: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: colors.surface,
      marginHorizontal: Spacing.lg,
      marginTop: -20,
      borderRadius: Radius.xl,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.sm,
      ...Shadows.md,
    },
    featureItem: {
      alignItems: 'center',
      flex: 1,
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: Radius.sm,
      backgroundColor: `${colors.primary}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    featureLabel: {
      fontSize: Typography.xs,
      color: colors.textMuted,
      textAlign: 'center',
      fontWeight: Typography.medium,
    },

    // Formulaire
    formSection: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
    },
    sectionTitle: {
      fontSize: Typography.lg,
      fontWeight: Typography.bold,
      color: colors.text,
      marginBottom: Spacing.xs,
    },
    sectionSub: {
      fontSize: Typography.sm,
      color: colors.textMuted,
      marginBottom: Spacing.lg,
    },

    // Avatar
    avatarSection: {
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    avatarWrap: {
      position: 'relative',
      marginBottom: Spacing.md,
    },
    avatarRing: {
      width: 100,
      height: 100,
      borderRadius: 50,
      padding: 3,
      backgroundColor: colors.primary,
    },
    avatarImg: {
      width: '100%',
      height: '100%',
      borderRadius: 100,
    },
    cameraBtn: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      backgroundColor: colors.primary,
      width: 30,
      height: 30,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    avatarRow: {
      flexDirection: 'row',
      gap: 10,
    },
    avatarOpt: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2.5,
      borderColor: 'transparent',
      overflow: 'hidden',
    },
    avatarOptSelected: {
      borderColor: colors.primary,
    },

    // Champs
    inputGroup: { marginBottom: Spacing.md },
    label: {
      fontSize: Typography.xs,
      color: colors.textMuted,
      fontWeight: Typography.semiBold,
      textTransform: 'uppercase',
      letterSpacing: Typography.wider_ls,
      marginBottom: Spacing.sm,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      gap: 10,
      ...Shadows.sm,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      color: colors.text,
      fontSize: Typography.base,
    },

    // Bouton CTA
    cta: {
      backgroundColor: colors.primary,
      paddingVertical: 17,
      borderRadius: Radius.lg,
      alignItems: 'center',
      marginTop: Spacing.md,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      ...Shadows.primary(colors.primary),
    },
    ctaText: {
      color: '#fff',
      fontSize: Typography.md,
      fontWeight: Typography.bold,
    },
  });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Hero ─────────────────────────────── */}
        <View style={styles.hero}>
          <View style={[styles.logoWrap, { backgroundColor: 'transparent' }]}>
            <Image source={require('@/assets/images/icon.png')} style={{ width: 80, height: 80, borderRadius: 20 }} />
          </View>
          <Text style={styles.appName}>FinTech Guinée</Text>
          <Text style={styles.tagline}>
            {language === 'en' ? 'Manage your expenses smartly\nand take control of your finances.' : 'Gérez vos dépenses avec intelligence\net prenez le contrôle de vos finances.'}
          </Text>
        </View>

        {/* ── Features ─────────────────────────── */}
        <View style={styles.features}>
          {FEATURES_LOCALIZED.map(f => (
            <View key={f.icon} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <MaterialCommunityIcons name={f.icon as any} size={22} color={colors.primary} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Formulaire ───────────────────────── */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>{language === 'en' ? 'Create your profile' : 'Créez votre profil'}</Text>
          <Text style={styles.sectionSub}>{language === 'en' ? 'Everything stays on your device, no data shared.' : 'Tout reste sur votre appareil, aucune donnée partagée.'}</Text>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Pressable onPress={pickImage} style={styles.avatarWrap}>
              <View style={styles.avatarRing}>
                <Image
                  source={{
                    uri: avatarUri
                      ? avatarUri
                      : `https://api.dicebear.com/7.x/avataaars/png?seed=${avatarSeed}&backgroundColor=b6e3f4`,
                  }}
                  style={styles.avatarImg}
                />
              </View>
              <View style={styles.cameraBtn}>
                <MaterialCommunityIcons name="camera" size={14} color="#fff" />
              </View>
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.avatarRow}>
                {AVATAR_OPTIONS.map(seed => (
                  <Pressable
                    key={seed}
                    onPress={() => { setAvatarSeed(seed); setAvatarUri(null); }}
                    style={[styles.avatarOpt, !avatarUri && avatarSeed === seed && styles.avatarOptSelected]}
                  >
                    <Image
                      source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&backgroundColor=b6e3f4` }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Champs */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{language === 'en' ? 'First Name *' : 'Prénom *'}</Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="account-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={language === 'en' ? "E.g. Ousmane" : "Ex : Ousmane"}
                placeholderTextColor={colors.textSubtle}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{language === 'en' ? 'Last Name *' : 'Nom de famille *'}</Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="card-account-details-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder={language === 'en' ? "E.g. Sylla" : "Ex : Sylla"}
                placeholderTextColor={colors.textSubtle}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{language === 'en' ? 'Phone *' : 'Téléphone *'}</Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="phone-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder={language === 'en' ? "E.g. 622 00 00 00" : "Ex : 622 00 00 00"}
                keyboardType="phone-pad"
                placeholderTextColor={colors.textSubtle}
              />
            </View>
          </View>

          {/* CTA */}
          <Pressable style={styles.cta} onPress={handleStart} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="rocket-launch-outline" size={22} color="#fff" />
                <Text style={styles.ctaText}>{language === 'en' ? 'Start now' : 'Commencer maintenant'}</Text>
              </>
            )}
          </Pressable>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
