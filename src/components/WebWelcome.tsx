import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n/I18nContext';
import { registerUser, setFullProfile } from '../redux/userSlice';
import { setExpenses } from '../redux/expenseSlice';
import { supabase } from '../utils/supabaseClient';
import { normalizePhone } from '../utils/phone';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AVATAR_OPTIONS = ['Felix', 'Aneka', 'Oliver', 'Jasper', 'Chloe', 'Max', 'Luna'];

const FEATURES = [
  {
    icon: 'chart-areaspline',
    title: 'Suivi en temps réel',
    desc: 'Visualisez vos dépenses et revenus avec des graphiques interactifs mis à jour instantanément.',
  },
  {
    icon: 'cloud-sync-outline',
    title: 'Synchronisation cloud',
    desc: 'Vos données sont sauvegardées et synchronisées sur tous vos appareils via Supabase.',
  },
  {
    icon: 'robot-outline',
    title: 'Rapports IA',
    desc: 'Un assistant IA analyse vos habitudes financières et génère des rapports mensuels personnalisés.',
  },
  {
    icon: 'account-group-outline',
    title: 'Gestion de tontine',
    desc: 'Gérez vos cotisations de tontine avec rappels automatiques et suivi des membres.',
  },
  {
    icon: 'bell-ring-outline',
    title: 'Alertes intelligentes',
    desc: 'Recevez des notifications quand vous approchez de vos limites de budget.',
  },
  {
    icon: 'shield-check-outline',
    title: 'Données sécurisées',
    desc: 'Vérification par code SMS à chaque connexion sur un nouvel appareil.',
  },
];

const STATS = [
  { value: '100%', label: 'Données privées' },
  { value: 'GNF', label: 'Devise locale' },
  { value: 'IA', label: 'Conseiller inclus' },
];

export default function WebWelcome() {
  const { colors } = useTheme();
  const { language } = useTranslation();
  const dispatch = useDispatch();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('Felix');
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [userEnteredOtp, setUserEnteredOtp] = useState('');
  const [pendingProfile, setPendingProfile] = useState<any>(null);

  const handleVerifyOtp = async () => {
    if (userEnteredOtp === otpCode) {
      setLoading(true);
      setShowOtpModal(false);
      try {
        const profile = pendingProfile;
        const { data: dbExpenses } = await supabase
          .from('expenses')
          .select('*')
          .eq('phone', profile.phone);

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
          id: isNaN(Number(exp.id)) ? exp.id : Number(exp.id),
          category: exp.category,
          amount: Number(exp.amount),
          currency: exp.currency || 'GNF',
          description: exp.description,
          icon: exp.icon || 'receipt',
          date: exp.date,
          status: exp.status || 'real',
          type: exp.type || 'expense',
          phone: exp.phone || profile.phone,
        }));

        dispatch(setFullProfile(loadedProfile));
        dispatch(setExpenses(mappedExpenses));
        await AsyncStorage.setItem('@user_profile', JSON.stringify(loadedProfile));
      } catch (err) {
        console.error('Restoration error:', err);
      } finally {
        setLoading(false);
        setUserEnteredOtp('');
      }
    } else {
      Alert.alert('Code incorrect', 'Veuillez réessayer.');
    }
  };

  const handleStart = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert('Veuillez entrer votre prénom et nom de famille.');
      return;
    }
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      alert('Veuillez entrer votre numéro de téléphone.');
      return;
    }

    setLoading(true);
    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: cleanPhone,
      avatarSeed,
      avatarUri: null,
      securityMode: 'none' as const,
      biometricEnabled: false,
      notificationsEnabled: false,
      language,
    };

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (profileError) throw new Error(profileError.message);

      if (profile) {
        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        setOtpCode(generatedOtp);
        setPendingProfile(profile);
        setLoading(false);
        setTimeout(() => {
          Alert.alert(
            'SMS de sécurité',
            `FinTechGuinée : votre code de vérification est : ${generatedOtp}`,
            [{ text: 'OK' }]
          );
        }, 800);
        setShowOtpModal(true);
        return;
      } else {
        await supabase.from('profiles').insert({
          phone: cleanPhone,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          avatar_seed: avatarSeed,
          avatar_uri: null,
          currency: 'GNF',
          language,
        });
        dispatch(registerUser(userData));
        await AsyncStorage.setItem('@user_profile', JSON.stringify({ ...userData, isRegistered: true }));
      }
    } catch (err: any) {
      console.warn('Supabase error, local mode:', err.message);
      dispatch(registerUser(userData));
      await AsyncStorage.setItem('@user_profile', JSON.stringify({ ...userData, isRegistered: true }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>

      {/* ══ GAUCHE — Hero + Avantages ══════════════════════════════════════ */}
      <View style={[s.left, { backgroundColor: colors.primary }]}>
        <ScrollView contentContainerStyle={s.leftScroll} showsVerticalScrollIndicator={false}>

          {/* Branding */}
          <View style={s.brand}>
            <View style={s.brandLogo}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={{ width: 52, height: 52, borderRadius: 14 }}
              />
            </View>
            <View>
              <Text style={s.brandName}>FinTech Guinée</Text>
              <Text style={s.brandSub}>Gestion financière intelligente</Text>
            </View>
          </View>

          {/* Headline */}
          <View style={s.headline}>
            <Text style={s.headlineTitle}>
              Prenez le contrôle{'\n'}de vos finances
            </Text>
            <Text style={s.headlineSub}>
              L'application guinéenne de gestion financière personnelle — simple, sécurisée et intelligente.
            </Text>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            {STATS.map(stat => (
              <View key={stat.label} style={s.statBox}>
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Features */}
          <View style={s.featuresGrid}>
            {FEATURES.map(f => (
              <View key={f.icon} style={s.featureCard}>
                <View style={s.featureIconBox}>
                  <MaterialCommunityIcons name={f.icon as any} size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.featureTitle}>{f.title}</Text>
                  <Text style={s.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Footer */}
          <Text style={s.leftFooter}>FinTech Guinée © 2025 • v1.0.0</Text>

        </ScrollView>
      </View>

      {/* ══ DROITE — Formulaire ════════════════════════════════════════════ */}
      <View style={[s.right, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={s.rightScroll} showsVerticalScrollIndicator={false}>

          {/* En-tête formulaire */}
          <View style={s.formHeader}>
            <Text style={[s.formTitle, { color: colors.text }]}>Créer votre compte</Text>
            <Text style={[s.formSub, { color: colors.textMuted }]}>
              Déjà inscrit ? Entrez votre numéro pour retrouver vos données.
            </Text>
          </View>

          {/* Avatar */}
          <View style={s.avatarSection}>
            <View style={[s.avatarRing, { borderColor: colors.primary }]}>
              <Image
                source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${avatarSeed}&backgroundColor=b6e3f4` }}
                style={s.avatarImg}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.avatarRow}>
                {AVATAR_OPTIONS.map(seed => (
                  <Pressable
                    key={seed}
                    onPress={() => setAvatarSeed(seed)}
                    style={[s.avatarOpt, { borderColor: avatarSeed === seed ? colors.primary : 'transparent' }]}
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
          {[
            { label: 'Prénom *', icon: 'account-outline', value: firstName, setter: setFirstName, placeholder: 'Ex : Ousmane', keyboard: 'default' },
            { label: 'Nom *', icon: 'card-account-details-outline', value: lastName, setter: setLastName, placeholder: 'Ex : Sylla', keyboard: 'default' },
            { label: 'Téléphone *', icon: 'phone-outline', value: phone, setter: setPhone, placeholder: 'Ex : 622 00 00 00', keyboard: 'phone-pad' },
          ].map(field => (
            <View key={field.label} style={s.inputGroup}>
              <Text style={[s.inputLabel, { color: colors.textMuted }]}>{field.label}</Text>
              <View style={[s.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialCommunityIcons name={field.icon as any} size={18} color={colors.textMuted} />
                <TextInput
                  style={[s.input, { color: colors.text }]}
                  value={field.value}
                  onChangeText={field.setter}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textMuted + '80'}
                  keyboardType={field.keyboard as any}
                />
              </View>
            </View>
          ))}

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [s.cta, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
            onPress={handleStart}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <MaterialCommunityIcons name="rocket-launch-outline" size={20} color="#fff" />
                  <Text style={s.ctaText}>Commencer maintenant</Text>
                </>
            }
          </Pressable>

          <Text style={[s.formDisclaimer, { color: colors.textMuted }]}>
            Vos données restent sur votre appareil. Aucune information n'est partagée avec des tiers.
          </Text>

        </ScrollView>
      </View>

      {/* ══ Modal OTP ══════════════════════════════════════════════════════ */}
      <Modal visible={showOtpModal} transparent animationType="fade">
        <View style={s.otpOverlay}>
          <View style={[s.otpCard, { backgroundColor: colors.surface }]}>
            <View style={[s.otpIconWrap, { backgroundColor: colors.primary + '15' }]}>
              <MaterialCommunityIcons name="shield-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[s.otpTitle, { color: colors.text }]}>Code de sécurité</Text>
            <Text style={[s.otpSub, { color: colors.textMuted }]}>
              Saisissez le code à 4 chiffres envoyé par SMS pour autoriser cet appareil.
            </Text>
            <Text style={[s.otpDemoCode, { color: colors.primary, backgroundColor: colors.primary + '12' }]}>
              CODE DÉMO : {otpCode}
            </Text>
            <TextInput
              style={[s.otpInput, { color: colors.text, borderColor: colors.border }]}
              value={userEnteredOtp}
              onChangeText={setUserEnteredOtp}
              placeholder="0 0 0 0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={4}
            />
            <View style={s.otpBtnRow}>
              <Pressable
                style={[s.otpCancel, { borderColor: colors.border }]}
                onPress={() => { setShowOtpModal(false); setUserEnteredOtp(''); }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Annuler</Text>
              </Pressable>
              <Pressable style={[s.otpConfirm, { backgroundColor: colors.primary }]} onPress={handleVerifyOtp}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Confirmer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', minHeight: '100vh' as any },

  // Gauche
  left: { width: '55%' as any, minWidth: 360 },
  leftScroll: { padding: 48, paddingBottom: 32 },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 48 },
  brandLogo: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  brandName: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  brandSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  headline: { marginBottom: 36 },
  headlineTitle: {
    fontSize: 42, fontWeight: '900', color: '#fff',
    letterSpacing: -1.5, lineHeight: 50, marginBottom: 16,
  },
  headlineSub: {
    fontSize: 16, color: 'rgba(255,255,255,0.75)',
    lineHeight: 26, maxWidth: 440,
  },

  statsRow: { flexDirection: 'row', gap: 24, marginBottom: 40 },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.8 },

  featuresGrid: { gap: 20, marginBottom: 40 },
  featureCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, padding: 16,
  },
  featureIconBox: {
    width: 40, height: 40, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  featureTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  featureDesc: { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 18 },

  leftFooter: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 8 },

  // Droite
  right: { flex: 1 },
  rightScroll: {
    flexGrow: 1, justifyContent: 'center',
    padding: 48, maxWidth: 480, alignSelf: 'center', width: '100%',
  },

  formHeader: { marginBottom: 28 },
  formTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  formSub: { fontSize: 14, lineHeight: 22 },

  avatarSection: { alignItems: 'center', marginBottom: 24, gap: 12 },
  avatarRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarRow: { flexDirection: 'row', gap: 8 },
  avatarOpt: { width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, overflow: 'hidden' },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, ...Shadows.sm,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15 },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 14, marginTop: 8,
    ...Shadows.primary('#6366F1'),
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  formDisclaimer: { fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 },

  // OTP
  otpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  otpCard: {
    width: 360, borderRadius: 20, padding: 32,
    alignItems: 'center', ...Shadows.lg,
  },
  otpIconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  otpTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  otpSub: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  otpDemoCode: { fontSize: 13, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 16, overflow: 'hidden' },
  otpInput: { width: '100%', borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: 8, marginBottom: 20 },
  otpBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  otpCancel: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  otpConfirm: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
});
