import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Radius, Spacing, Typography } from '../constants/designTokens';

interface Props {
  pin: string;
  onNumberPress: (num: string) => void;
  onDelete: () => void;
  onBiometricPress?: () => void;
  showBiometric?: boolean;
}

export default function PinPad({ pin, onNumberPress, onDelete, onBiometricPress, showBiometric }: Props) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 20,
      marginBottom: 40,
    },
    dot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    dotFilled: {
      backgroundColor: colors.primary,
    },
    padContainer: {
      width: '100%',
      maxWidth: 320,
      alignSelf: 'center',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    key: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: colors.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    keyText: {
      fontSize: 28,
      fontWeight: Typography.bold,
      color: colors.text,
    },
  });

  return (
    <View style={styles.padContainer}>
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View key={i} style={[styles.dot, pin.length > i && styles.dotFilled]} />
        ))}
      </View>

      {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rIdx) => (
        <View key={rIdx} style={styles.row}>
          {row.map(num => (
            <Pressable key={num} style={styles.key} onPress={() => onNumberPress(num)}>
              <Text style={styles.keyText}>{num}</Text>
            </Pressable>
          ))}
        </View>
      ))}

      <View style={styles.row}>
        {showBiometric ? (
          <Pressable style={styles.key} onPress={onBiometricPress}>
            <MaterialCommunityIcons name="fingerprint" size={32} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={[styles.key, { backgroundColor: 'transparent' }]} />
        )}
        <Pressable style={styles.key} onPress={() => onNumberPress('0')}>
          <Text style={styles.keyText}>0</Text>
        </Pressable>
        <Pressable style={styles.key} onPress={onDelete}>
          <MaterialCommunityIcons name="backspace-outline" size={28} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}
