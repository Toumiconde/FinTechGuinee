import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Radius, Spacing, Typography, Shadows } from '../constants/designTokens';
import { useTranslation } from '../i18n/I18nContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (password: string) => void;
  currentPassword?: string | null;
}

export default function PasswordSetupModal({ visible, onClose, onSuccess, currentPassword }: Props) {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const [step, setStep] = useState<'verify' | 'create' | 'confirm'>(currentPassword ? 'verify' : 'create');
  const [oldPass, setOldPass] = useState('');
  const [firstPass, setFirstPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activePass = step === 'verify' ? oldPass : (step === 'create' ? firstPass : confirmPass);
  const setActivePass = step === 'verify' ? setOldPass : (step === 'create' ? setFirstPass : setConfirmPass);

  const handleNext = () => {
    if (step === 'verify') {
      if (oldPass === currentPassword) {
        setError(null);
        setStep('create');
      } else {
        setError(language === 'en' ? 'Incorrect password.' : 'Mot de passe incorrect.');
      }
    } else if (step === 'create') {
      if (firstPass.length < 4) {
        setError(language === 'en' ? "The password must contain at least 4 characters." : "Le mot de passe doit contenir au moins 4 caractères.");
        return;
      }
      setError(null);
      setStep('confirm');
    } else {
      if (confirmPass === firstPass) {
        setError(null);
        onSuccess(confirmPass);
      } else {
        setError(language === 'en' ? "Passwords do not match." : "Les mots de passe ne correspondent pas.");
      }
    }
  };

  const handleReset = () => {
    setStep(currentPassword ? 'verify' : 'create');
    setOldPass('');
    setFirstPass('');
    setConfirmPass('');
    setError(null);
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.background,
    },
    inner: {
      flex: 1,
      paddingTop: 60,
      paddingHorizontal: Spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xxl,
    },
    title: {
      fontSize: Typography.xl,
      fontWeight: Typography.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: Spacing.md,
    },
    subtitle: {
      fontSize: Typography.base,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: Spacing.xl,
    },
    inputWrap: {
      backgroundColor: colors.surfaceLight,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.xl,
    },
    input: {
      paddingVertical: 14,
      color: colors.text,
      fontSize: Typography.base,
    },
    btn: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: Radius.lg,
      alignItems: 'center',
      ...Shadows.sm,
    },
    btnText: {
      color: '#fff',
      fontSize: Typography.base,
      fontWeight: Typography.bold,
    },
    error: {
      color: colors.danger,
      textAlign: 'center',
      marginTop: Spacing.md,
      fontSize: Typography.sm,
    },
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <Pressable onPress={() => { handleReset(); onClose(); }}>
              <MaterialCommunityIcons name="close" size={28} color={colors.text} />
            </Pressable>
          </View>

          <Text style={styles.title}>
            {step === 'verify' ? (language === 'en' ? 'Enter current password' : 'Saisissez l\'ancien mot de passe') : step === 'create' ? (language === 'en' ? 'Create a password' : 'Créer un nouveau mot de passe') : (language === 'en' ? 'Confirm password' : 'Confirmer le mot de passe')}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'verify'
              ? (language === 'en' ? 'Please enter your current password' : 'Veuillez saisir votre mot de passe actuel')
              : step === 'create'
              ? (language === 'en' ? 'Choose a secure password' : 'Choisissez un mot de passe sécurisé')
              : (language === 'en' ? 'Please enter the password again' : 'Veuillez saisir le mot de passe à nouveau')}
          </Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={activePass}
              onChangeText={(text) => {
                setActivePass(text);
                setError(null);
              }}
              placeholder={language === 'en' ? "Your password" : "Votre mot de passe"}
              placeholderTextColor={colors.textSubtle}
              secureTextEntry
              autoFocus
            />
          </View>

          <Pressable style={styles.btn} onPress={handleNext}>
            <Text style={styles.btnText}>
              {step === 'create' ? (language === 'en' ? 'Next' : 'Suivant') : (language === 'en' ? 'Confirm' : 'Valider')}
            </Text>
          </Pressable>

          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
