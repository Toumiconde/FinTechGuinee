import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { useTheme } from '../context/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import { exportToCSV } from '../utils/exportCSV';
import { formatGNF } from '../utils/currency';
import { formatMonthKey, getMonthKey } from '../utils/dateUtils';
import { useTranslation } from '../i18n/I18nContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type FilterOption = 'all' | 'income' | 'expense';
type PeriodOption = { label: string; monthKey: string | null };

export default function ExportModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const allExpenses = useSelector((state: RootState) => state.expenses.expenses);
  const exportDirectoryUri = useSelector((state: RootState) => state.user.exportDirectoryUri);

  const [typeFilter,   setTypeFilter]   = useState<FilterOption>('all');
  const [periodFilter, setPeriodFilter] = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [message,      setMessage]      = useState<{ text: string; ok: boolean } | null>(null);

  // Build unique months from expenses
  const monthOptions: PeriodOption[] = [
    { label: language === 'en' ? 'All periods' : 'Toutes les périodes', monthKey: null },
    ...Array.from(
      new Set(allExpenses.map((e: any) => getMonthKey(e.date)).filter(Boolean))
    )
      .sort((a: any, b: any) => {
        const [ma, ya] = a.split('-').map(Number);
        const [mb, yb] = b.split('-').map(Number);
        return ya !== yb ? yb - ya : mb - ma;
      })
      .map((mk: any) => ({ label: formatMonthKey(mk as string, language), monthKey: mk as string })),
  ];

  // Filtered expenses for preview
  const filtered = allExpenses.filter((exp: any) => {
    const matchType   = typeFilter === 'all' ? true : exp.type === typeFilter;
    const matchPeriod = periodFilter ? getMonthKey(exp.date) === periodFilter : true;
    return matchType && matchPeriod;
  });

  const totalIncome  = filtered.filter((e: any) => e.type === 'income').reduce((s: number, e: any) => s + e.amount, 0);
  const totalExpense = filtered.filter((e: any) => e.type !== 'income').reduce((s: number, e: any) => s + e.amount, 0);
  const balance      = totalIncome - totalExpense;

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);

    const periodLabel = periodFilter ? `_${periodFilter}` : '';
    const typeLabel   = typeFilter !== 'all' ? `_${typeFilter === 'income' ? 'revenus' : 'depenses'}` : '';
    const fileName    = `FinTech_Guinee${periodLabel}${typeLabel}.csv`;

    const result = await exportToCSV(filtered, fileName, exportDirectoryUri);
    setLoading(false);

    if (result.success) {
      setMessage({ text: language === 'en' ? '✅ File exported successfully!' : '✅ Fichier exporté avec succès !', ok: true });
    } else {
      setMessage({ text: result.error ?? (language === 'en' ? 'Unknown error.' : 'Erreur inconnue.'), ok: false });
    }
  };

  const s = StyleSheet.create({
    overlay: {
      flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
      paddingTop: Spacing.sm, paddingBottom: 40, maxHeight: '88%',
    },
    handle: {
      width: 44, height: 4, backgroundColor: colors.border,
      borderRadius: Radius.full, alignSelf: 'center',
      marginVertical: Spacing.sm,
    },
    header: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md, borderBottomWidth: 1,
      borderBottomColor: colors.border, marginBottom: Spacing.md,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: Typography.lg, fontWeight: Typography.bold, color: colors.text },
    closeBtn: {
      width: 36, height: 36, borderRadius: Radius.full,
      backgroundColor: colors.surfaceLight, justifyContent: 'center',
      alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    },
    scroll: { paddingHorizontal: Spacing.lg },
    sectionLabel: {
      fontSize: Typography.xs, fontWeight: Typography.bold,
      color: colors.textMuted, textTransform: 'uppercase',
      letterSpacing: Typography.wider_ls, marginBottom: Spacing.sm,
      marginTop: Spacing.md,
    },
    chipRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginBottom: Spacing.sm },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: Radius.full, borderWidth: 1.5,
      borderColor: colors.border, backgroundColor: colors.surfaceLight,
    },
    chipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}12` },
    chipText: { fontSize: Typography.sm, color: colors.textMuted, fontWeight: Typography.medium },
    chipTextActive: { color: colors.primary, fontWeight: Typography.bold },

    // Period pills (scrollable)
    periodScroll: { marginBottom: Spacing.sm },
    periodPill: {
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: Radius.full, borderWidth: 1.5,
      borderColor: colors.border, backgroundColor: colors.surfaceLight,
      marginRight: Spacing.sm,
    },
    periodPillActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}12` },
    periodPillText: { fontSize: Typography.sm, color: colors.textMuted, fontWeight: Typography.medium },
    periodPillTextActive: { color: colors.primary, fontWeight: Typography.bold },

    // Preview card
    previewCard: {
      backgroundColor: colors.surfaceLight, borderRadius: Radius.lg,
      padding: Spacing.md, borderWidth: 1, borderColor: colors.border,
      marginTop: Spacing.sm, marginBottom: Spacing.md,
    },
    previewRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: 6,
    },
    previewLabel: { fontSize: Typography.sm, color: colors.textMuted },
    previewValue: { fontSize: Typography.sm, fontWeight: Typography.semiBold, color: colors.text },
    previewIncome: { color: colors.success },
    previewExpense: { color: colors.danger },
    previewBalance: { color: balance >= 0 ? colors.success : colors.danger },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: Spacing.sm },

    // Export button
    exportBtn: {
      backgroundColor: colors.primary, paddingVertical: 17,
      borderRadius: Radius.lg, alignItems: 'center',
      flexDirection: 'row', justifyContent: 'center', gap: 10,
      marginTop: Spacing.sm,
      ...Shadows.primary(colors.primary),
    },
    exportBtnDisabled: { opacity: 0.5 },
    exportBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
    message: {
      textAlign: 'center', marginTop: Spacing.md, fontSize: Typography.sm,
      fontWeight: Typography.medium,
    },
  });

  const typeOptions: { key: FilterOption; label: string; icon: string; color: string }[] = [
    { key: 'all',     label: language === 'en' ? 'All' : 'Toutes',   icon: 'swap-horizontal', color: colors.primary },
    { key: 'income',  label: language === 'en' ? 'Incomes' : 'Revenus',  icon: 'arrow-down-circle-outline', color: colors.success },
    { key: 'expense', label: language === 'en' ? 'Expenses' : 'Dépenses', icon: 'arrow-up-circle-outline', color: colors.danger },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <MaterialCommunityIcons name="microsoft-excel" size={24} color={colors.success} />
              <Text style={s.title}>{t('export_label')}</Text>
            </View>
            <Pressable style={s.closeBtn} onPress={onClose} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

            {/* Type filter */}
            <Text style={s.sectionLabel}>{language === 'en' ? 'Transaction type' : 'Type de transaction'}</Text>
            <View style={s.chipRow}>
              {typeOptions.map(opt => {
                const active = typeFilter === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={[s.chip, active && { ...s.chipActive, borderColor: opt.color, backgroundColor: `${opt.color}15` }]}
                    onPress={() => { setTypeFilter(opt.key); setMessage(null); }}
                  >
                    <MaterialCommunityIcons name={opt.icon as any} size={16} color={active ? opt.color : colors.textMuted} />
                    <Text style={[s.chipText, active && { ...s.chipTextActive, color: opt.color }]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Period filter */}
            <Text style={s.sectionLabel}>{language === 'en' ? 'Period' : 'Période'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.periodScroll}>
              {monthOptions.map(opt => {
                const active = periodFilter === opt.monthKey;
                return (
                  <Pressable
                    key={opt.monthKey ?? 'all'}
                    style={[s.periodPill, active && s.periodPillActive]}
                    onPress={() => { setPeriodFilter(opt.monthKey); setMessage(null); }}
                  >
                    <Text style={[s.periodPillText, active && s.periodPillTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Preview */}
            <Text style={s.sectionLabel}>{language === 'en' ? 'Export preview' : "Aperçu de l'export"}</Text>
            <View style={s.previewCard}>
              <View style={s.previewRow}>
                <Text style={s.previewLabel}>📄 {language === 'en' ? 'Number of rows' : 'Nombre de lignes'}</Text>
                <Text style={s.previewValue}>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.previewRow}>
                <Text style={s.previewLabel}>💚 {t('total_income')}</Text>
                <Text style={[s.previewValue, s.previewIncome]}>{formatGNF(totalIncome)}</Text>
              </View>
              <View style={s.previewRow}>
                <Text style={s.previewLabel}>🔴 {t('total_expenses')}</Text>
                <Text style={[s.previewValue, s.previewExpense]}>{formatGNF(totalExpense)}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.previewRow}>
                <Text style={s.previewLabel}>⚖️ {t('balance')}</Text>
                <Text style={[s.previewValue, s.previewBalance]}>{formatGNF(balance)}</Text>
              </View>
            </View>

            {/* Export button */}
            <Pressable
              style={[s.exportBtn, (loading || filtered.length === 0) && s.exportBtnDisabled]}
              onPress={handleExport}
              disabled={loading || filtered.length === 0}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="download" size={22} color="#fff" />
                  <Text style={s.exportBtnText}>
                    {language === 'en' ? 'Export' : 'Exporter'} {filtered.length > 0 ? `(${filtered.length} ${language === 'en' ? 'rows' : 'lignes'})` : ''}
                  </Text>
                </>
              )}
            </Pressable>

            {message && (
              <Text style={[s.message, { color: message.ok ? colors.success : colors.danger }]}>
                {message.text}
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
