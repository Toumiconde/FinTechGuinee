import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatGNF } from '../utils/currency';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Radius, Spacing, Typography } from '../constants/designTokens';
import { useTranslation } from '../i18n/I18nContext';

interface Props {
  total: number;
  count: number;
}

export default function ExpenseSummary({ total, count }: Props) {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const average = count ? total / count : 0;

  const rows = [
    { icon: 'cash-multiple',   label: language === 'en' ? 'Total expenses' : 'Total des dépenses',       value: formatGNF(total),              color: colors.danger },
    { icon: 'chart-bar',       label: language === 'en' ? 'Average per transaction' : 'Moyenne par transaction',   value: formatGNF(Math.round(average)),color: colors.primary },
    { icon: 'counter',         label: language === 'en' ? 'Number of transactions' : 'Nombre de transactions',    value: count.toString(),              color: colors.secondary },
  ];

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: Radius.sm,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    label: {
      flex: 1,
      color: colors.textMuted,
      fontSize: Typography.sm,
    },
    value: {
      color: colors.text,
      fontSize: Typography.sm,
      fontWeight: Typography.semiBold,
    },
  });

  return (
    <View style={styles.container}>
      {rows.map((row, idx) => (
        <View
          key={row.label}
          style={[styles.row, idx < rows.length - 1 && styles.rowBorder]}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${row.color}18` }]}>
            <MaterialCommunityIcons name={row.icon as any} size={18} color={row.color} />
          </View>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}
