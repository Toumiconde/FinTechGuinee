import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n/I18nContext';
import { addPlannedExpenses, deleteExpense } from '../redux/expenseSlice';
import { RootState } from '../redux/store';
import { formatGNF } from '../utils/currency';
import { getCategoryDetails } from '../utils/category';
import { formatMonthKey, getCurrentMonthKey, getMonthKey } from '../utils/dateUtils';

interface ForecastEntry {
  id: string;
  category: string;
  amount: number;
  description: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  monthKey: string;
  categories: { name: string; icon: string }[];
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ForecastModal({ visible, onClose, monthKey, categories }: Props) {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const dispatch = useDispatch();
  const allExpenses = useSelector((state: RootState) => state.expenses.expenses);
  const currency = useSelector((state: RootState) => state.user.profile?.currency ?? 'GNF');

  const filteredCats = categories.filter(c => c.name !== 'Toutes');

  const [entries, setEntries] = useState<ForecastEntry[]>([]);

  // ── Charger les données existantes ──────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(`@forecast_${monthKey}`).then(raw => {
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.entries) && data.entries.length > 0) {
          setEntries(data.entries);
        } else if (data.budgets) {
          // Migration depuis l'ancien format (budgets par catégorie)
          const migrated: ForecastEntry[] = Object.entries(data.budgets)
            .filter(([, v]) => (v as number) > 0)
            .map(([cat, amount]) => ({
              id: generateId(),
              category: cat,
              amount: amount as number,
              description: '',
            }));
          setEntries(migrated.length > 0 ? migrated : [newEntry()]);
        } else {
          setEntries([newEntry()]);
        }
      } else {
        setEntries([newEntry()]);
      }
    }).catch(() => setEntries([newEntry()]));
  }, [visible, monthKey]);

  function newEntry(cat?: string): ForecastEntry {
    return {
      id: generateId(),
      category: cat ?? filteredCats[0]?.name ?? '',
      amount: 0,
      description: '',
    };
  }

  const addEntry = () => setEntries(prev => [...prev, newEntry()]);

  const removeEntry = (id: string) => {
    setEntries(prev => {
      const next = prev.filter(e => e.id !== id);
      return next.length > 0 ? next : [newEntry()];
    });
  };

  const updateEntry = (id: string, field: keyof ForecastEntry, value: string | number) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const totalPrevu = entries.reduce((sum, e) => sum + (isNaN(e.amount) ? 0 : e.amount), 0);

  // ── Enregistrer ─────────────────────────────────────────────────────
  const handleSave = async () => {
    const validEntries = entries.filter(e => e.amount > 0 && e.category);
    if (validEntries.length === 0) {
      Alert.alert(
        language === 'en' ? 'Empty forecast' : 'Prévision vide',
        language === 'en'
          ? 'Please add at least one entry with an amount.'
          : 'Veuillez ajouter au moins une ligne avec un montant.',
      );
      return;
    }

    // Recalculer les budgets par catégorie (pour compatibilité Dashboard)
    const budgets: Record<string, number> = {};
    validEntries.forEach(e => {
      budgets[e.category] = (budgets[e.category] || 0) + e.amount;
    });

    // Dès que l'utilisateur enregistre explicitement, on confirme — le modal ne se rouvrira plus
    const status = 'confirmed';

    await AsyncStorage.setItem(
      `@forecast_${monthKey}`,
      JSON.stringify({ month: monthKey, entries: validEntries, budgets, totalPrevu, status })
    );

    // 1. Supprimer les anciennes transactions planifiées pour ce mois
    const [monthNum, yearNum] = monthKey.split('-').map(Number);
    const oldPlanned = allExpenses.filter((exp: any) => {
      if (exp.status !== 'planned') return false;
      const mk = getMonthKey(exp.date);
      return mk === monthKey;
    });
    oldPlanned.forEach((exp: any) => dispatch(deleteExpense(exp.id)));

    // 2. Créer les nouvelles transactions planifiées depuis les entrées
    // Date = 1er jour du mois prévu (format DD/MM/YYYY)
    const day = '01';
    const mm = String(monthNum).padStart(2, '0');
    const yyyy = String(yearNum);
    const dateStr = `${day}/${mm}/${yyyy}`;

    const plannedTransactions = validEntries.map(e => ({
      category: e.category,
      amount: e.amount,
      currency,
      description: e.description || e.category,
      icon: getCategoryDetails(e.category, colors).icon,
      date: dateStr,
      type: 'expense' as const,
    }));

    dispatch(addPlannedExpenses(plannedTransactions));

    Alert.alert(
      language === 'en' ? 'Saved!' : 'Enregistré !',
      language === 'en'
        ? `Forecast for ${formatMonthKey(monthKey, language)} has been saved and added to your transactions.`
        : `Le prévisionnel pour ${formatMonthKey(monthKey, language)} a été enregistré et ajouté à vos transactions.`,
    );

    onClose();
  };

  // ── Styles ───────────────────────────────────────────────────────────
  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.overlay,
    },
    container: {
      width: '92%',
      maxHeight: '88%',
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      overflow: 'hidden',
      ...Shadows.lg,
    },
    // Header
    headerBanner: {
      backgroundColor: colors.primary,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerLabel: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: Typography.xs,
      fontWeight: Typography.semiBold,
      textTransform: 'uppercase',
      letterSpacing: Typography.wider_ls,
    },
    headerTitle: {
      color: '#fff',
      fontSize: Typography.xl,
      fontWeight: Typography.bold,
      marginTop: 2,
    },
    closeBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    totalBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
      marginTop: Spacing.sm,
    },
    totalBannerLabel: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: Typography.sm,
    },
    totalBannerValue: {
      color: '#fff',
      fontSize: Typography.lg,
      fontWeight: Typography.bold,
    },
    // Body
    body: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
    },
    // Entry card
    entryCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    entryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    label: {
      fontSize: Typography.xs,
      color: colors.textMuted,
      fontWeight: Typography.semiBold,
      textTransform: 'uppercase',
      letterSpacing: Typography.wider_ls,
      marginBottom: 4,
    },
    amountInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 10,
      fontSize: Typography.base,
      color: colors.text,
      backgroundColor: colors.surface,
      fontWeight: Typography.semiBold,
    },
    descInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
      fontSize: Typography.sm,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    deleteBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${colors.danger}18`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Category selector
    catScroll: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: Radius.full,
      borderWidth: 1,
      marginRight: 6,
    },
    catChipText: {
      fontSize: Typography.xs,
      fontWeight: Typography.medium,
    },
    // Add button
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      marginBottom: Spacing.md,
    },
    addBtnText: {
      color: colors.primary,
      fontSize: Typography.sm,
      fontWeight: Typography.semiBold,
    },
    // Save button
    saveBtn: {
      margin: Spacing.lg,
      marginTop: Spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: Radius.lg,
      paddingVertical: 14,
      alignItems: 'center',
      ...Shadows.sm,
    },
    saveBtnText: {
      color: '#fff',
      fontSize: Typography.base,
      fontWeight: Typography.bold,
    },
  });

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>

          {/* Header */}
          <View style={styles.headerBanner}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerLabel}>
                  {monthKey === getCurrentMonthKey()
                    ? (language === 'en' ? 'VALIDATE FORECAST' : 'VALIDER LES PRÉVISIONS')
                    : (language === 'en' ? 'BUDGET FORECAST' : 'PRÉVISION BUDGET')}
                </Text>
                <Text style={styles.headerTitle}>{formatMonthKey(monthKey, language)}</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={18} color="#fff" />
              </Pressable>
            </View>

            {/* Total */}
            <View style={styles.totalBanner}>
              <Text style={styles.totalBannerLabel}>
                {language === 'en' ? 'Total planned' : 'Total prévu'}
              </Text>
              <Text style={styles.totalBannerValue}>{formatGNF(totalPrevu)}</Text>
            </View>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

            {entries.map((entry) => {
              const catDet = getCategoryDetails(entry.category, colors);
              return (
                <View key={entry.id} style={styles.entryCard}>

                  {/* Row: category chips + delete */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                      {filteredCats.map(cat => {
                        const det = getCategoryDetails(cat.name, colors);
                        const isSelected = entry.category === cat.name;
                        return (
                          <Pressable
                            key={cat.name}
                            style={[
                              styles.catChip,
                              {
                                backgroundColor: isSelected ? `${det.color}22` : colors.surface,
                                borderColor: isSelected ? det.color : colors.border,
                              },
                            ]}
                            onPress={() => updateEntry(entry.id, 'category', cat.name)}
                          >
                            <MaterialCommunityIcons name={det.icon as any} size={13} color={isSelected ? det.color : colors.textMuted} />
                            <Text style={[styles.catChipText, { color: isSelected ? det.color : colors.textMuted }]}>
                              {cat.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <Pressable style={styles.deleteBtn} onPress={() => removeEntry(entry.id)}>
                      <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
                    </Pressable>
                  </View>

                  {/* Montant */}
                  <Text style={styles.label}>{language === 'en' ? 'Amount' : 'Montant'}</Text>
                  <View style={styles.entryRow}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${catDet.color}22`, justifyContent: 'center', alignItems: 'center' }}>
                      <MaterialCommunityIcons name={catDet.icon as any} size={16} color={catDet.color} />
                    </View>
                    <TextInput
                      style={styles.amountInput}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textSubtle}
                      value={entry.amount ? entry.amount.toString() : ''}
                      onChangeText={v => updateEntry(entry.id, 'amount', Number(v.replace(/[^0-9]/g, '')))}
                    />
                  </View>

                  {/* Description */}
                  <Text style={styles.label}>{language === 'en' ? 'Description (optional)' : 'Description (optionnelle)'}</Text>
                  <TextInput
                    style={styles.descInput}
                    placeholder={language === 'en' ? 'e.g. Groceries for the month' : 'ex: Courses du mois'}
                    placeholderTextColor={colors.textSubtle}
                    value={entry.description}
                    onChangeText={v => updateEntry(entry.id, 'description', v)}
                  />
                </View>
              );
            })}

            {/* Add entry */}
            <Pressable style={styles.addBtn} onPress={addEntry}>
              <MaterialCommunityIcons name="plus-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.addBtnText}>
                {language === 'en' ? 'Add a budget line' : 'Ajouter une ligne de budget'}
              </Text>
            </Pressable>

            <View style={{ height: Spacing.sm }} />
          </ScrollView>

          {/* Save */}
          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>
              {language === 'en' ? 'Save forecast' : 'Enregistrer le prévisionnel'}
            </Text>
          </Pressable>

        </View>
      </View>
    </Modal>
  );
}