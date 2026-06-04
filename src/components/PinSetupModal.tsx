import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Radius, Spacing, Typography } from '../constants/designTokens';
import PinPad from './PinPad';
import { useTranslation } from '../i18n/I18nContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
  currentPin?: string | null;
}

export default function PinSetupModal({ visible, onClose, onSuccess, currentPin }: Props) {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const [step, setStep] = useState<'verify' | 'create' | 'confirm'>(currentPin ? 'verify' : 'create');
  const [oldPin, setOldPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activePin = step === 'verify' ? oldPin : (step === 'create' ? firstPin : confirmPin);

  const handleNumberPress = (num: string) => {
    if (activePin.length < 6) {
      setError(null);
      const newPin = activePin + num;
      if (step === 'verify') {
        setOldPin(newPin);
        if (newPin.length === 6) {
          if (newPin === currentPin) {
            setTimeout(() => setStep('create'), 300);
          } else {
            setError(language === 'en' ? 'Incorrect PIN. Try again.' : 'Code incorrect. Réessayez.');
            setOldPin('');
          }
        }
      } else if (step === 'create') {
        setFirstPin(newPin);
        if (newPin.length === 6) {
          setTimeout(() => setStep('confirm'), 300);
        }
      } else {
        setConfirmPin(newPin);
        if (newPin.length === 6) {
          if (newPin === firstPin) {
            setTimeout(() => onSuccess(newPin), 300);
          } else {
            setError(language === 'en' ? 'Codes do not match. Try again.' : 'Les codes ne correspondent pas. Réessayez.');
            setConfirmPin('');
          }
        }
      }
    }
  };

  const handleDelete = () => {
      if (step === 'verify') setOldPin(prev => prev.slice(0, -1));
      else if (step === 'create') setFirstPin(prev => prev.slice(0, -1));
      else setConfirmPin(prev => prev.slice(0, -1));
  };

  const handleReset = () => {
    setStep(currentPin ? 'verify' : 'create');
    setOldPin('');
    setFirstPin('');
    setConfirmPin('');
    setError(null);
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.background,
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
    },
    subtitle: {
      fontSize: Typography.base,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: Spacing.xl,
    },
    error: {
      color: colors.danger,
      textAlign: 'center',
      marginTop: Spacing.lg,
      fontSize: Typography.sm,
    },
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.header}>
          <Pressable onPress={() => { handleReset(); onClose(); }}>
            <MaterialCommunityIcons name="close" size={28} color={colors.text} />
          </Pressable>
        </View>

        <Text style={styles.title}>
          {step === 'verify' ? (language === 'en' ? 'Enter current PIN' : 'Saisissez l\'ancien code PIN') : step === 'create' ? (language === 'en' ? 'Create a 6-digit PIN' : 'Créer un nouveau code PIN à 6 chiffres') : (language === 'en' ? 'Confirm the 6-digit code' : 'Confirmer le nouveau code à 6 chiffres')}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'verify'
            ? (language === 'en' ? 'Please enter your current code' : 'Veuillez saisir votre code actuel')
            : step === 'create'
            ? (language === 'en' ? 'This code will protect access to your data' : 'Ce code protègera l\'accès à vos données')
            : (language === 'en' ? 'Please enter the code again' : 'Veuillez saisir le code à nouveau')}
        </Text>

        <PinPad
          pin={activePin}
          onNumberPress={handleNumberPress}
          onDelete={handleDelete}
        />

        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </Modal>
  );
}
