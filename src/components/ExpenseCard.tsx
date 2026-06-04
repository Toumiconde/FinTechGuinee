import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { Expense, deleteExpense } from '../redux/expenseSlice';
import { formatGNF } from '../utils/currency';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoryDetails } from '../utils/category';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import { useTranslation } from '../i18n/I18nContext';

interface Props {
  expense: Expense;
  onEdit: (expense: Expense) => void;
}

export default function ExpenseCard({ expense, onEdit }: Props) {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { t, language } = useTranslation();

  const handleDelete = () => {
    Alert.alert(
      t('expense_delete_title'),
      t('expense_delete_prompt').replace('{category}', expense.category),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('goal_delete'),
          style: 'destructive',
          onPress: () => dispatch(deleteExpense(expense.id)),
        },
      ]
    );
  };

  const catDetails = getCategoryDetails(expense.category, colors);
  const iconName   = expense.icon && expense.icon !== 'default'
    ? (expense.icon as keyof typeof MaterialCommunityIcons.glyphMap)
    : catDetails.icon;
  const iconColor  = catDetails.color;

  const styles = StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.sm,
    },

    // Icône
    iconWrap: {
      width: 50,
      height: 50,
      borderRadius: Radius.md,
      backgroundColor: `${iconColor}18`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },

    // Détails textuels
    details: {
      flex: 1,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 3,
    },
    category: {
      fontSize: Typography.base,
      fontWeight: Typography.semiBold,
      color: colors.text,
      textTransform: 'capitalize',
    },
    statusBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.full,
    },
    statusText: {
      fontSize: 9,
      fontWeight: Typography.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    description: {
      fontSize: Typography.sm,
      color: colors.textMuted,
      marginBottom: 2,
    },
    date: {
      fontSize: Typography.xs,
      color: colors.textSubtle,
    },

    // Montant & actions
    right: {
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      alignSelf: 'stretch',
    },
    amount: {
      fontSize: Typography.base,
      fontWeight: Typography.bold,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    actionBtn: {
      width: 32,
      height: 32,
      borderRadius: Radius.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  // Statut badge
  const isPlanned = expense.status === 'planned';
  const badgeBg   = isPlanned ? `${colors.warning}22` : `${colors.success}22`;
  const badgeText = isPlanned ? colors.warning : colors.success;
  const isIncome  = expense.type === 'income';
  const amountColor = isIncome ? colors.success : colors.danger;
  const amountPrefix = isIncome ? '+' : '-';
  const badgeLabel = isPlanned ? t('forecast_planned') : (expense.status === 'confirmed' ? t('forecast_confirmed') : t('expense_real'));

  return (
    <View style={styles.card}>
      {/* Icône catégorie */}
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={iconName as any} size={24} color={iconColor} />
      </View>

      {/* Informations */}
      <View style={styles.details}>
        <View style={styles.categoryRow}>
          <Text style={styles.category}>{expense.category}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.statusText, { color: badgeText }]}>{badgeLabel}</Text>
          </View>
        </View>
        {expense.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {expense.description}
          </Text>
        ) : null}
        <Text style={styles.date}>{expense.date}</Text>
      </View>

      {/* Montant + actions */}
      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {amountPrefix}{formatGNF(expense.amount)}
        </Text>
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: `${colors.primary}15` }]}
            onPress={() => onEdit(expense)}
            hitSlop={6}
          >
            <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.primary} />
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: `${colors.danger}15` }]}
            onPress={handleDelete}
            hitSlop={6}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
