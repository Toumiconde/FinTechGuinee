import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Radius, Spacing, Typography, Shadows } from '../constants/designTokens';
import PinPad from './PinPad';
import { UserProfile } from '../redux/userSlice';
import { useTranslation } from '../i18n/I18nContext';

interface Props { onUnlock: () => void; user: UserProfile; }

export default function LockScreen({ onUnlock, user }: Props) {
  const { colors } = useTheme();
  const { t, language } = useTranslation();

  const [error,      setError]      = useState<string | null>(null);
  const [typedPin,   setTypedPin]   = useState('');
  const [typedPass,  setTypedPass]  = useState('');
  const [bioReady,   setBioReady]   = useState(false);
  const [bioLoading, setBioLoading] = useState(true);
  const [showForgot, setShowForgot] = useState(false);

  const isBiometricPrimary = user.securityMode === 'fingerprint' || user.securityMode === 'face';
  const hasBioFallback     = (user.securityMode === 'pin' || user.securityMode === 'password') && user.biometricEnabled;

  const triggerBiometric = async () => {
    if (!bioReady) return;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: user.securityMode === 'face'
          ? (language === 'en' ? 'Look at your screen to unlock' : 'Regardez votre écran pour déverrouiller')
          : (language === 'en' ? 'Place your finger on the sensor' : 'Placez votre doigt sur le capteur'),
        fallbackLabel: isBiometricPrimary ? '' : user.securityMode === 'pin' ? (language === 'en' ? 'Use PIN' : 'Utiliser le PIN') : (language === 'en' ? 'Use password' : 'Utiliser le mot de passe'),
        cancelLabel: t('cancel'),
        disableDeviceFallback: true,
      });
      if (result.success) onUnlock();
      else if (!isBiometricPrimary) setError(language === 'en' ? 'Biometric authentication failed.' : 'Authentification biométrique échouée.');
    } catch (_) {
      if (!isBiometricPrimary) setError(language === 'en' ? 'Biometric error.' : 'Erreur biométrique.');
    }
  };

  useEffect(() => {
    (async () => {
      const hw  = await LocalAuthentication.hasHardwareAsync();
      const enr = await LocalAuthentication.isEnrolledAsync();
      setBioReady(hw && enr);
      setBioLoading(false);
    })();
  }, []);

  // Auto-trigger for biometric-primary modes
  useEffect(() => {
    if (!bioLoading && isBiometricPrimary && bioReady) {
      triggerBiometric();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bioLoading, bioReady]);

  const handlePinNumber = (num: string) => {
    if (typedPin.length >= 6) return;
    setError(null);
    const next = typedPin + num;
    setTypedPin(next);
    if (next.length === 6) {
      if (next === user.customPin) { setTimeout(onUnlock, 150); }
      else { setError(language === 'en' ? 'Incorrect PIN code. Try again.' : 'Code PIN incorrect. Réessayez.'); setTypedPin(''); }
    }
  };

  const handlePasswordSubmit = () => {
    if (typedPass === user.customPassword) onUnlock();
    else { setError(language === 'en' ? 'Incorrect password.' : 'Mot de passe incorrect.'); setTypedPass(''); }
  };

  const s = StyleSheet.create({
    container: {
      flex: 1, backgroundColor: colors.background,
      justifyContent: 'center', alignItems: 'center',
      padding: Spacing.xl,
    },
    iconWrap: {
      width: 88, height: 88, borderRadius: 44,
      backgroundColor: `${colors.primary}18`,
      justifyContent: 'center', alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    title: { fontSize: Typography.xl, fontWeight: Typography.bold, color: colors.text, marginBottom: 6 },
    subtitle: { fontSize: Typography.base, color: colors.textMuted, textAlign: 'center', marginBottom: Spacing.xxl },
    bioBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.primary, paddingVertical: 16,
      paddingHorizontal: Spacing.xl, borderRadius: Radius.lg,
      ...Shadows.primary(colors.primary),
    },
    bioBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
    retryBtn: {
      marginTop: Spacing.lg, flexDirection: 'row', alignItems: 'center',
      gap: 6, padding: Spacing.md,
    },
    retryText: { color: colors.primary, fontSize: Typography.sm },
    inputWrap: {
      width: '100%', backgroundColor: colors.surfaceLight,
      borderRadius: Radius.md, borderWidth: 1,
      borderColor: colors.border, paddingHorizontal: Spacing.md, marginBottom: Spacing.md,
    },
    input: { paddingVertical: 14, color: colors.text, fontSize: Typography.base },
    submitBtn: {
      width: '100%', backgroundColor: colors.primary, paddingVertical: 16,
      borderRadius: Radius.lg, alignItems: 'center',
      ...Shadows.primary(colors.primary),
    },
    submitBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
    orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', marginVertical: Spacing.lg },
    orLine: { flex: 1, height: 1, backgroundColor: colors.border },
    orText: { fontSize: Typography.xs, color: colors.textMuted },
    error: { color: colors.danger, fontSize: Typography.sm, textAlign: 'center', marginTop: Spacing.sm, height: 20 },
  });

  if (bioLoading) {
    return (
      <View style={s.container}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // ── FINGERPRINT / FACE primary mode ───────────────────────────────────────
  if (isBiometricPrimary) {
    const isFace = user.securityMode === 'face';
    return (
      <View style={s.container}>
        <View style={s.iconWrap}>
          <MaterialCommunityIcons
            name={isFace ? 'face-recognition' : 'fingerprint'}
            size={48}
            color={colors.primary}
          />
        </View>
        <Text style={s.title}>{isFace ? (language === 'en' ? 'Face Recognition' : 'Reconnaissance faciale') : (language === 'en' ? 'Fingerprint' : 'Empreinte digitale')}</Text>
        <Text style={s.subtitle}>
          {isFace
            ? (language === 'en' ? 'Look at your screen to unlock the application.' : 'Regardez votre écran pour déverrouiller l\'application.')
            : (language === 'en' ? 'Place your finger on the sensor to unlock.' : 'Placez votre doigt sur le capteur pour déverrouiller.')}
        </Text>

        <Pressable style={s.bioBtn} onPress={triggerBiometric}>
          <MaterialCommunityIcons name={isFace ? 'face-recognition' : 'fingerprint'} size={24} color="#fff" />
          <Text style={s.bioBtnText}>
            {isFace ? (language === 'en' ? 'Scan Face' : 'Scanner le visage') : (language === 'en' ? 'Scan Fingerprint' : 'Scanner l\'empreinte')}
          </Text>
        </Pressable>

        <Pressable style={s.retryBtn} onPress={triggerBiometric}>
          <MaterialCommunityIcons name="refresh" size={16} color={colors.primary} />
          <Text style={s.retryText}>{language === 'en' ? 'Try again' : 'Réessayer'}</Text>
        </Pressable>

        <Text style={s.error}>{error || ' '}</Text>
        <Pressable onPress={() => setShowForgot(true)}>
          <Text style={{ color: colors.primary, fontSize: Typography.sm, marginTop: Spacing.md }}>
            {language === 'en' ? 'Forgot password?' : 'Mot de passe oublié ?'}
          </Text>
        </Pressable>
        <ForgotPasswordModal visible={showForgot} onClose={() => setShowForgot(false)} user={user} onUnlock={onUnlock} colors={colors} />
      </View>
    );
  }

  // ── PASSWORD mode ─────────────────────────────────────────────────────────
  if (user.securityMode === 'password') {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.container}>
          <View style={s.iconWrap}>
            <MaterialCommunityIcons name="lock-outline" size={44} color={colors.primary} />
          </View>
          <Text style={s.title}>{t('lock_title')}</Text>
          <Text style={s.subtitle}>{language === 'en' ? 'Enter your password to continue.' : 'Saisissez votre mot de passe pour continuer.'}</Text>

          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              value={typedPass}
              onChangeText={(t) => { setTypedPass(t); setError(null); }}
              placeholder={language === 'en' ? 'Password' : 'Mot de passe'}
              placeholderTextColor={colors.textSubtle}
              secureTextEntry
              autoFocus={!hasBioFallback}
              onSubmitEditing={handlePasswordSubmit}
            />
          </View>

          <Pressable style={s.submitBtn} onPress={handlePasswordSubmit}>
            <Text style={s.submitBtnText}>{language === 'en' ? 'Unlock' : 'Déverrouiller'}</Text>
          </Pressable>

          {hasBioFallback && bioReady && (
            <>
              <View style={s.orRow}>
                <View style={s.orLine} />
                <Text style={s.orText}>{language === 'en' ? 'OR' : 'OU'}</Text>
                <View style={s.orLine} />
              </View>
              <Pressable style={s.bioBtn} onPress={triggerBiometric}>
                <MaterialCommunityIcons name="fingerprint" size={24} color="#fff" />
                <Text style={s.bioBtnText}>{language === 'en' ? 'Fingerprint / FaceID' : 'Empreinte / FaceID'}</Text>
              </Pressable>
            </>
          )}

          <Text style={s.error}>{error || ' '}</Text>
          <Pressable onPress={() => setShowForgot(true)} style={{ marginTop: Spacing.md, alignSelf: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: Typography.sm }}>
              {language === 'en' ? 'Forgot password?' : 'Mot de passe oublié ?'}
            </Text>
          </Pressable>
          <ForgotPasswordModal visible={showForgot} onClose={() => setShowForgot(false)} user={user} onUnlock={onUnlock} colors={colors} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── PIN mode (default) ────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <View style={s.iconWrap}>
        <MaterialCommunityIcons name="dialpad" size={44} color={colors.primary} />
      </View>
      <Text style={s.title}>{t('lock_title')}</Text>
      <Text style={s.subtitle}>{language === 'en' ? 'Enter your 6-digit PIN code.' : 'Saisissez votre code PIN à 6 chiffres.'}</Text>

      <PinPad
        pin={typedPin}
        onNumberPress={handlePinNumber}
        onDelete={() => { setTypedPin(p => p.slice(0, -1)); }}
        showBiometric={hasBioFallback && bioReady}
        onBiometricPress={triggerBiometric}
      />

      <Text style={s.error}>{error || ' '}</Text>
      <Pressable onPress={() => setShowForgot(true)} style={{ marginTop: Spacing.md }}>
        <Text style={{ color: colors.primary, fontSize: Typography.sm }}>
          {language === 'en' ? 'Forgot PIN code?' : 'Code PIN oublié ?'}
        </Text>
      </Pressable>
      <ForgotPasswordModal visible={showForgot} onClose={() => setShowForgot(false)} user={user} onUnlock={onUnlock} colors={colors} />
    </View>
  );
}

// ── FORGOT PASSWORD MODAL ──────────────────────────────────────────────────
function ForgotPasswordModal({ visible, onClose, user, onUnlock, colors }: { visible: boolean, onClose: () => void, user: UserProfile, onUnlock: () => void, colors: any }) {
  const { language } = useTranslation();
  const [step, setStep] = useState<'phone'|'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string|null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let interval: any;
    if (cooldown > 0) interval = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Reset state when opened
  useEffect(() => {
    if (visible) {
      setStep('phone'); setPhone(''); setCode(''); setCooldown(0); setGeneratedCode(null);
    }
  }, [visible]);

  const tMsg = (en: string, fr: string) => language === 'en' ? en : fr;

  const handleSendCode = () => {
    if (!user.phone) {
      if (Platform.OS === 'web') window.alert(tMsg("No phone number registered on this profile.", "Aucun numéro de téléphone enregistré sur ce profil."));
      else Alert.alert(tMsg("Error", "Erreur"), tMsg("No phone number registered on this profile.", "Aucun numéro de téléphone enregistré sur ce profil."));
      return;
    }
    if (phone.replace(/\s+/g, '') !== user.phone.replace(/\s+/g, '')) {
      if (Platform.OS === 'web') window.alert(tMsg("Sorry, this phone number does not match the one in your profile.", "Désolé, ce numéro ne correspond pas à celui enregistré dans votre profil."));
      else Alert.alert(tMsg("Error", "Erreur"), tMsg("Sorry, this phone number does not match the one in your profile.", "Désolé, ce numéro ne correspond pas à celui enregistré dans votre profil."));
      return;
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(newCode);
    setStep('code');
    setCooldown(60);

    const msg = tMsg(`Your recovery code is: ${newCode}`, `Votre code de récupération est : ${newCode}`);
    if (Platform.OS === 'web') window.alert(`[MOCK SMS]\n${msg}`);
    else Alert.alert("[MOCK SMS]", msg);
  };

  const handleVerify = () => {
    if (code === generatedCode) {
      const msg = tMsg(
        "Authentication successful. Please change your password/PIN in settings.", 
        "Authentification réussie. Pensez à modifier votre mot de passe/PIN dans les paramètres."
      );
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(tMsg("Success", "Succès"), msg);
      
      onClose();
      onUnlock();
    } else {
      if (Platform.OS === 'web') window.alert(tMsg("Incorrect code.", "Code incorrect."));
      else Alert.alert(tMsg("Error", "Erreur"), tMsg("Incorrect code.", "Code incorrect."));
    }
  };

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    box: { width: '100%', backgroundColor: colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, ...Shadows.lg },
    title: { fontSize: Typography.lg, fontWeight: 'bold', color: colors.text, marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: Typography.sm, color: colors.textMuted, marginBottom: 20, textAlign: 'center' },
    inputWrap: { backgroundColor: colors.surfaceLight, borderRadius: Radius.md, paddingHorizontal: Spacing.md, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
    input: { paddingVertical: 14, fontSize: Typography.base, color: colors.text },
    btn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: Radius.lg, alignItems: 'center', marginBottom: 10 },
    btnDisabled: { backgroundColor: colors.border },
    btnText: { color: '#fff', fontSize: Typography.base, fontWeight: 'bold' },
    cancelText: { color: colors.textMuted, textAlign: 'center', paddingVertical: 10, fontSize: Typography.sm },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={s.overlay}>
          <View style={s.box}>
            <Text style={s.title}>{tMsg("Password recovery", "Récupération")}</Text>
            
            {step === 'phone' ? (
              <>
                <Text style={s.subtitle}>{tMsg("Please enter the phone number associated with your profile.", "Veuillez saisir le numéro de téléphone associé à votre profil.")}</Text>
                <View style={s.inputWrap}>
                  <TextInput 
                    style={s.input} placeholder={tMsg("Phone number", "Numéro de téléphone")}
                    keyboardType="phone-pad" value={phone} onChangeText={setPhone} autoFocus
                    placeholderTextColor={colors.textSubtle}
                  />
                </View>
                <Pressable style={s.btn} onPress={handleSendCode}>
                  <Text style={s.btnText}>{tMsg("Send code", "Envoyer le code")}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={s.subtitle}>{tMsg("Enter the 6-digit code sent to your phone.", "Saisissez le code à 6 chiffres envoyé sur votre téléphone.")}</Text>
                <View style={s.inputWrap}>
                  <TextInput 
                    style={s.input} placeholder="XXXXXX" keyboardType="number-pad" 
                    value={code} onChangeText={setCode} maxLength={6} autoFocus
                    placeholderTextColor={colors.textSubtle}
                  />
                </View>
                <Pressable style={s.btn} onPress={handleVerify}>
                  <Text style={s.btnText}>{tMsg("Verify code", "Vérifier le code")}</Text>
                </Pressable>
                
                <Pressable 
                  style={[s.btn, cooldown > 0 && s.btnDisabled, { marginTop: 10, backgroundColor: cooldown > 0 ? colors.border : colors.surfaceLight, borderWidth: 1, borderColor: colors.border }]} 
                  onPress={cooldown === 0 ? handleSendCode : undefined}
                >
                  <Text style={[s.btnText, { color: cooldown > 0 ? colors.textMuted : colors.primary }]}>
                    {cooldown > 0 ? tMsg(`Resend in ${cooldown}s`, `Renvoyer dans ${cooldown}s`) : tMsg("Resend code", "Renvoyer le code")}
                  </Text>
                </Pressable>
              </>
            )}

            <Pressable onPress={onClose}>
              <Text style={s.cancelText}>{tMsg("Cancel", "Annuler")}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
