import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal,
  ActivityIndicator, ScrollView, Alert, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useDispatch } from 'react-redux';
import { addExpense, addPlannedExpenses } from '../redux/expenseSlice';
import { useTheme } from '../context/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import { parseCSV } from '../utils/importCSV';
import { formatGNF } from '../utils/currency';
import { useTranslation } from '../i18n/I18nContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Step = 'pick' | 'preview' | 'done';

export default function ImportModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const dispatch   = useDispatch();

  const [step,     setStep]     = useState<Step>('pick');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [parsed,   setParsed]   = useState<ReturnType<typeof parseCSV> | null>(null);
  const [fileName, setFileName] = useState('');

  const handleClose = () => {
    setStep('pick');
    setLoading(false);
    setError(null);
    setParsed(null);
    setFileName('');
    onClose();
  };

  const handlePickFile = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        setLoading(false);
        return;
      }

      const asset = result.assets[0];
      setFileName(asset.name ?? 'fichier.csv');

      // Read file content
      let content = '';
      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        content = await response.text();
      } else {
        content = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      const parseResult = parseCSV(content);
      setParsed(parseResult);

      if (!parseResult.success || parseResult.expenses.length === 0) {
        setError(parseResult.error ?? (language === 'en' ? 'No transactions found in this file.' : 'Aucune transaction trouvée dans ce fichier.'));
      } else {
        setStep('preview');
      }
    } catch (err: any) {
      setError(err?.message ?? (language === 'en' ? 'Error reading the file.' : 'Erreur lors de la lecture du fichier.'));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!parsed?.expenses.length) return;

    const realExpenses = parsed.expenses.filter(exp => exp.status !== 'planned');
    const plannedExpenses = parsed.expenses.filter(exp => exp.status === 'planned');

    // Add real/confirmed transactions one by one
    realExpenses.forEach(exp => {
      dispatch(addExpense({
        category:    exp.category    ?? 'Autre',
        amount:      exp.amount      ?? 0,
        currency:    exp.currency    ?? 'GNF',
        icon:        exp.icon        ?? 'cash',
        date:        exp.date        ?? new Date().toISOString(),
        description: exp.description ?? '',
        type:        exp.type        ?? 'expense',
      }));
    });

    // Add planned transactions in bulk
    if (plannedExpenses.length > 0) {
      dispatch(addPlannedExpenses(
        plannedExpenses.map(exp => ({
          category:    exp.category    ?? 'Autre',
          amount:      exp.amount      ?? 0,
          currency:    exp.currency    ?? 'GNF',
          icon:        exp.icon        ?? 'cash',
          date:        exp.date        ?? new Date().toISOString(),
          description: exp.description ?? '',
          type:        exp.type        ?? 'expense',
        }))
      ));
    }

    setStep('done');
  };

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
      paddingTop: Spacing.sm, paddingBottom: 40, maxHeight: '88%',
    },
    handle: {
      width: 44, height: 4, backgroundColor: colors.border,
      borderRadius: Radius.full, alignSelf: 'center', marginVertical: Spacing.sm,
    },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: Spacing.md,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: Typography.lg, fontWeight: Typography.bold, color: colors.text },
    closeBtn: {
      width: 36, height: 36, borderRadius: Radius.full,
      backgroundColor: colors.surfaceLight, justifyContent: 'center',
      alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    },
    scroll: { paddingHorizontal: Spacing.lg },

    // Pick step
    pickArea: {
      borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary,
      borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center',
      paddingVertical: 40, marginVertical: Spacing.lg, gap: 12,
      backgroundColor: `${colors.primary}08`,
    },
    pickTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: colors.text },
    pickSub: { fontSize: Typography.sm, color: colors.textMuted, textAlign: 'center' },

    pickBtn: {
      backgroundColor: colors.primary, paddingVertical: 14,
      paddingHorizontal: Spacing.xl, borderRadius: Radius.lg,
      flexDirection: 'row', alignItems: 'center', gap: 8,
      ...Shadows.primary(colors.primary),
    },
    pickBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },

    errorBox: {
      backgroundColor: `${colors.danger}15`, borderRadius: Radius.md,
      padding: Spacing.md, borderWidth: 1, borderColor: `${colors.danger}40`,
      flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: Spacing.sm,
    },
    errorText: { color: colors.danger, fontSize: Typography.sm, flex: 1 },

    // Preview step
    summaryCard: {
      backgroundColor: colors.surfaceLight, borderRadius: Radius.lg,
      padding: Spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: Spacing.md,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    summaryLabel: { fontSize: Typography.sm, color: colors.textMuted },
    summaryValue: { fontSize: Typography.sm, fontWeight: Typography.bold, color: colors.text },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: Spacing.sm },

    previewList: { gap: Spacing.sm, marginBottom: Spacing.md },
    previewItem: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.surfaceLight, borderRadius: Radius.md, padding: Spacing.sm,
    },
    previewDot: { width: 8, height: 8, borderRadius: 4 },
    previewInfo: { flex: 1 },
    previewCat: { fontSize: Typography.sm, color: colors.text, fontWeight: Typography.medium },
    previewDate: { fontSize: Typography.xs, color: colors.textMuted },
    previewAmount: { fontSize: Typography.sm, fontWeight: Typography.bold },

    moreText: { textAlign: 'center', color: colors.textMuted, fontSize: Typography.sm, marginBottom: Spacing.md },

    importBtn: {
      backgroundColor: colors.primary, paddingVertical: 17,
      borderRadius: Radius.lg, alignItems: 'center',
      flexDirection: 'row', justifyContent: 'center', gap: 10,
      ...Shadows.primary(colors.primary),
    },
    importBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },

    cancelBtn: {
      paddingVertical: 14, borderRadius: Radius.lg, alignItems: 'center',
      marginTop: Spacing.sm,
    },
    cancelBtnText: { color: colors.textMuted, fontSize: Typography.base },

    // Done step
    doneArea: { alignItems: 'center', paddingVertical: 40, gap: 16 },
    doneIcon: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: `${colors.success}15`,
      justifyContent: 'center', alignItems: 'center',
    },
    doneTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: colors.text },
    doneSub: { fontSize: Typography.base, color: colors.textMuted, textAlign: 'center' },
    doneBtn: {
      backgroundColor: colors.success, paddingVertical: 16,
      paddingHorizontal: 40, borderRadius: Radius.lg,
      flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    doneBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
  });

  const PREVIEW_LIMIT = 5;
  const preview = parsed?.expenses.slice(0, PREVIEW_LIMIT) ?? [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.header}>
            <View style={s.headerLeft}>
              <MaterialCommunityIcons name="file-import" size={24} color={colors.primary} />
              <Text style={s.title}>{t('import_label')}</Text>
            </View>
            <Pressable style={s.closeBtn} onPress={handleClose} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

            {/* ── ÉTAPE 1 : Sélection du fichier ── */}
            {step === 'pick' && (
              <>
                <Pressable style={s.pickArea} onPress={handlePickFile} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color={colors.primary} size="large" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="file-upload-outline" size={52} color={colors.primary} />
                      <Text style={s.pickTitle}>{language === 'en' ? 'Select a CSV file' : 'Sélectionner un fichier CSV'}</Text>
                      <Text style={s.pickSub}>
                        {language === 'en' ? 'Files exported from FinTech Guinee\nor any standard CSV file' : 'Fichiers exportés depuis FinTech Guinée\nou tout fichier CSV standard'}
                      </Text>
                    </>
                  )}
                </Pressable>

                {!loading && (
                  <Pressable style={s.pickBtn} onPress={handlePickFile}>
                    <MaterialCommunityIcons name="folder-open" size={20} color="#fff" />
                    <Text style={s.pickBtnText}>{language === 'en' ? 'Browse files' : 'Parcourir les fichiers'}</Text>
                  </Pressable>
                )}

                {error && (
                  <View style={s.errorBox}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
                    <Text style={s.errorText}>{error}</Text>
                  </View>
                )}
              </>
            )}

            {/* ── ÉTAPE 2 : Aperçu avant import ── */}
            {step === 'preview' && parsed && (
              <>
                <View style={s.summaryCard}>
                  <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>📄 {language === 'en' ? 'File' : 'Fichier'}</Text>
                    <Text style={s.summaryValue} numberOfLines={1}>{fileName}</Text>
                  </View>
                  <View style={s.divider} />
                  <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>✅ {language === 'en' ? 'Transactions found' : 'Transactions trouvées'}</Text>
                    <Text style={[s.summaryValue, { color: colors.success }]}>{parsed.expenses.length}</Text>
                  </View>
                  {parsed.skipped > 0 && (
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>⚠️ {language === 'en' ? 'Skipped rows' : 'Lignes ignorées'}</Text>
                      <Text style={[s.summaryValue, { color: colors.warning }]}>{parsed.skipped}</Text>
                    </View>
                  )}
                </View>

                <Text style={{ color: colors.textMuted, fontSize: Typography.xs, marginBottom: Spacing.sm, fontWeight: Typography.bold, textTransform: 'uppercase' }}>
                  {language === 'en' ? `Preview of the first ${Math.min(PREVIEW_LIMIT, parsed.expenses.length)} rows` : `Aperçu des ${Math.min(PREVIEW_LIMIT, parsed.expenses.length)} premières lignes`}
                </Text>
                <View style={s.previewList}>
                  {preview.map((exp, i) => (
                    <View key={i} style={s.previewItem}>
                      <View style={[s.previewDot, { backgroundColor: exp.type === 'income' ? colors.success : colors.danger }]} />
                      <View style={s.previewInfo}>
                        <Text style={s.previewCat}>{exp.category ?? (language === 'en' ? 'Other' : 'Autre')}</Text>
                        <Text style={s.previewDate}>{exp.date ? new Date(exp.date).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-GN') : '—'}</Text>
                      </View>
                      <Text style={[s.previewAmount, { color: exp.type === 'income' ? colors.success : colors.danger }]}>
                        {exp.type === 'income' ? '+' : '-'}{formatGNF(exp.amount ?? 0)}
                      </Text>
                    </View>
                  ))}
                </View>
                {parsed.expenses.length > PREVIEW_LIMIT && (
                  <Text style={s.moreText}>{language === 'en' ? `... and ${parsed.expenses.length - PREVIEW_LIMIT} more transaction(s)` : `... et ${parsed.expenses.length - PREVIEW_LIMIT} transaction(s) de plus`}</Text>
                )}

                <Pressable style={s.importBtn} onPress={handleImport}>
                  <MaterialCommunityIcons name="database-import" size={22} color="#fff" />
                  <Text style={s.importBtnText}>{language === 'en' ? 'Import' : 'Importer'} {parsed.expenses.length} transactions</Text>
                </Pressable>
                <Pressable style={s.cancelBtn} onPress={() => setStep('pick')}>
                  <Text style={s.cancelBtnText}>← {language === 'en' ? 'Choose another file' : 'Choisir un autre fichier'}</Text>
                </Pressable>
              </>
            )}

            {step === 'done' && (
              <View style={s.doneArea}>
                <View style={s.doneIcon}>
                  <MaterialCommunityIcons name="check-circle" size={44} color={colors.success} />
                </View>
                <Text style={s.doneTitle}>{language === 'en' ? 'Import successful!' : 'Import réussi !'}</Text>
                <Text style={s.doneSub}>
                  {parsed?.expenses.length} transaction(s) {language === 'en' ? 'successfully\nadded to your history.' : 'ajoutée(s)\navec succès à votre historique.'}
                </Text>
                <Pressable style={s.doneBtn} onPress={handleClose}>
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  <Text style={s.doneBtnText}>{language === 'en' ? 'Finish' : 'Terminer'}</Text>
                </Pressable>
              </View>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
