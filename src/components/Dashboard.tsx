import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n/I18nContext';
import { RootState } from '../redux/store';
import { selectUserExpenses } from '../redux/selectors';
import { getCategoryDetails } from '../utils/category';
import { formatGNF } from '../utils/currency';
import { formatMonthKey, generateMonthRange, getMonthKey } from '../utils/dateUtils';
import MonthlyAiReportModal from './MonthlyAiReportModal';


// ─── Types ────────────────────────────────────────────────────────────────────
interface Expense {
  date: string;
  type?: string;
  amount: number;
  category: string;
  status?: string;
}
interface Props {
  selectedMonthKey?: string | null;
  onForecastPress: () => void;
  nextMonthLabel?: string;
  forecastData?: {
    month: string;
    budgets: Record<string, number>;
    totalPrevu: number;
  } | null;
}

// ─── Stat Box ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, icon, color }: {
  label: string; value: string; icon: string; color: string;
}) {
  return (
    <View style={statBoxStyles.box}>
      <View style={[statBoxStyles.iconWrap, { backgroundColor: `${color}22` }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={color} />
      </View>
      <Text style={statBoxStyles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Text>
      <Text style={statBoxStyles.label}>{label}</Text>
    </View>
  );
}

const statBoxStyles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  value: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  label: {
    fontSize: Typography.xs,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    letterSpacing: Typography.wider_ls,
  },
});

export default function Dashboard({
  selectedMonthKey,
  onForecastPress,
  forecastData,
  nextMonthLabel,
}: Props) {
  const [showBarChart, setShowBarChart] = useState(true);
  const [period, setPeriod] = useState(6);
  const [aiReportVisible, setAiReportVisible] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const expenses = useSelector(selectUserExpenses);
  const user = useSelector((state: RootState) => state.user);

  const filteredExpenses = selectedMonthKey
    ? expenses.filter((exp: any) => getMonthKey(exp.date) === selectedMonthKey)
    : expenses;

  // Use all filtered expenses (including planned) for calculations
  const displayedExpenses = filteredExpenses;
  // Real transactions are those already confirmed or real
  const realTransactions = displayedExpenses.filter((e: any) => e.status === 'real' || e.status === 'confirmed');

  const realExpensesItems = realTransactions.filter((e: any) => !e.type || e.type === 'expense');
  const realIncomesItems  = realTransactions.filter((e: any) => e.type === 'income');

  const totalExpenses = displayedExpenses.filter((e: any) => !e.type || e.type === 'expense').reduce((acc: number, curr: any) => acc + curr.amount, 0);
  const totalIncome   = displayedExpenses.filter((e: any) => e.type === 'income').reduce((acc: number, curr: any) => acc + curr.amount, 0);
  const balance       = totalIncome - totalExpenses;
  const count         = realTransactions.length;

  // ── Idea B: Budget Alerts ──────────────────────────────────────────────────
  const budgetAlerts = React.useMemo(() => {
    if (!forecastData || !forecastData.budgets) return [];
    const alerts: { category: string; spent: number; limit: number }[] = [];
    
    Object.entries(forecastData.budgets).forEach(([catName, limit]) => {
      if (limit <= 0) return;
      const spent = displayedExpenses
        .filter((e: any) => (!e.type || e.type === 'expense') && e.category.toLowerCase() === catName.toLowerCase())
        .reduce((s: number, cur: any) => s + cur.amount, 0);
      
      if (spent > limit) {
        alerts.push({ category: catName, spent, limit });
      }
    });
    return alerts;
  }, [forecastData, displayedExpenses]);

  // ── Idea A: Financial Health Score ──────────────────────────────────────────
  const healthScore = React.useMemo(() => {
    if (totalIncome === 0) {
      if (totalExpenses > 0) return { grade: 'D', label: 'Déficit', color: colors.danger, text: language === 'en' ? 'Try to register an income to stabilize your budget.' : 'Essayez d\'enregistrer un revenu pour stabiliser votre budget.' };
      return { grade: 'N/A', label: 'Aucune donnée', color: colors.textMuted, text: language === 'en' ? 'Add transactions to see your financial health score.' : 'Ajoutez des transactions pour voir votre score de santé financière.' };
    }
    
    const savingsRate = (totalIncome - totalExpenses) / totalIncome;
    
    if (savingsRate >= 0.4) {
      return {
        grade: 'A+',
        label: 'Excellente',
        color: colors.success,
        text: language === 'en' ? 'Excellent! You save a big part of your income. Keep going.' : 'Excellent ! Vous épargnez une grande partie de vos revenus. Continuez ainsi.'
      };
    } else if (savingsRate >= 0.2) {
      return {
        grade: 'A',
        label: 'Très Bonne',
        color: colors.success,
        text: language === 'en' ? 'Great budget management. Your savings rate is very healthy.' : 'Très bonne gestion. Votre taux d\'épargne est très sain.'
      };
    } else if (savingsRate >= 0.05) {
      return {
        grade: 'B',
        label: 'Bonne / Stable',
        color: '#EAB308',
        text: language === 'en' ? 'Stable budget. Try to reduce leisure expenses to save more.' : 'Budget stable. Essayez de réduire les loisirs pour épargner plus.'
      };
    } else if (savingsRate >= 0) {
      return {
        grade: 'C',
        label: 'Moyenne / Limite',
        color: '#F97316',
        text: language === 'en' ? 'Caution! Your expenses are very close to your income.' : 'Attention ! Vos dépenses sont très proches de vos revenus.'
      };
    } else {
      return {
        grade: 'D',
        label: 'Critique',
        color: colors.danger,
        text: language === 'en' ? 'Budget deficit! You spend more than you earn. Review your costs.' : 'Déficit budgétaire ! Vous dépensez plus que vous ne gagnez.'
      };
    }
  }, [totalIncome, totalExpenses, colors, language]);

  const chartData = (() => {
  // existing pie chart data
  const grouped: Record<string, number> = {};
  displayedExpenses.filter((exp: any) => !exp.type || exp.type === 'expense').forEach((exp: any) => {
    const key = exp.category.charAt(0).toUpperCase() + exp.category.slice(1).toLowerCase();
    grouped[key] = (grouped[key] || 0) + exp.amount;
  });
  const pie = Object.entries(grouped)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: key,
      population: value,
      color: getCategoryDetails(key, colors).color,
      legendFontColor: colors.textMuted,
      legendFontSize: 11,
    }));
  // ---- Bar‑Chart data (monthly expenses) ----
  const monthKeys = generateMonthRange(-period + 1, 0); // e.g., period=6 => last 6 months
  const barValues = monthKeys.map((mk) =>
    displayedExpenses
      .filter((e: any) => getMonthKey(e.date) === mk && (!e.type || e.type === 'expense'))
      .reduce((s: number, cur: any) => s + cur.amount, 0)
  );
  const barChartData = {
    labels: monthKeys.map((mk) => formatMonthKey(mk, language)),
    datasets: [{ data: barValues }],
  };
  // expose both datasets
  return { pie, barChartData };
})();
  // Export chart data as CSV and share via Expo Sharing (or download on web)
  const exportChartData = async () => {
    console.log('Export button pressed');
    try {
              // Build detailed CSV with expense, income, and balance per month
        const monthKeys = generateMonthRange(-period + 1, 0);
        const rows = monthKeys.map(mk => {
          const monthLabel = formatMonthKey(mk, language);
          const expense = displayedExpenses
            .filter((e: any) => getMonthKey(e.date) === mk && (!e.type || e.type === 'expense'))
            .reduce((s: number, cur: any) => s + cur.amount, 0);
          const income = displayedExpenses
            .filter((e: any) => getMonthKey(e.date) === mk && e.type === 'income')
            .reduce((s: number, cur: any) => s + cur.amount, 0);
          const balance = income - expense;
          return `${monthLabel},${expense},${income},${balance}`;
        });
        const csv = ['Month,Expense,Income,Balance', ...rows].join('\n');
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'expenses.csv';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Use a reliable directory and unique filename
        const baseDir = (FileSystem as any).documentDirectory ?? (FileSystem as any).cacheDirectory;
        const fileUri = `${baseDir}expenses_${Date.now()}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csv);
        await Sharing.shareAsync(fileUri);

      }
    } catch (e) {
      console.error('Export CSV error:', e);
    }
  };

  // Import CSV function (web & native)
  const importCSV = async () => {
    console.log('Import button pressed');
    try {
      const DocumentPicker = await import('expo-document-picker');
const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: true });
if (result.canceled) return;
const asset = result.assets[0];
let csvContent = '';
if (Platform.OS === 'web') {
  const response = await fetch(asset.uri);
  csvContent = await response.text();
} else {
  csvContent = await FileSystem.readAsStringAsync(asset.uri);
}
      const lines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
      const data = lines.slice(1).map(line => {
        const [month, amount] = line.split(',');
        return { month: month.trim(), amount: parseFloat(amount) };
      });
      console.log('Imported CSV data:', data);
      // TODO: integrate data into state/chart
    } catch (e) {
      console.error('Import CSV error:', e);
    }
  };

  // Prepare monthly data for AI report
  const monthlyData = React.useMemo(() => {
    const currentMonthKey = selectedMonthKey || getMonthKey(new Date().toLocaleDateString('fr-FR'));
    const monthExpenses = expenses.filter((e: Expense) => getMonthKey(e.date) === currentMonthKey);
    
    const totalIncome = monthExpenses.filter((e: Expense) => e.type === 'income').reduce((sum: number, e: Expense) => sum + e.amount, 0);
    const totalExpenses = monthExpenses.filter((e: Expense) => !e.type || e.type === 'expense').reduce((sum: number, e: Expense) => sum + e.amount, 0);
    const balance = totalIncome - totalExpenses;

    // Group expenses by category
    const categoryGroups: Record<string, number> = {};
    monthExpenses.filter((e: Expense) => !e.type || e.type === 'expense').forEach((e: Expense) => {
      categoryGroups[e.category] = (categoryGroups[e.category] || 0) + e.amount;
    });

    // Sort categories by amount
    const topCategories = Object.entries(categoryGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) as [string, number][];

    const userName = user.firstName 
      ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
      : "Utilisateur";

    return {
      totalIncome,
      totalExpenses,
      balance,
      topCategories,
      monthName: selectedMonthKey ? formatMonthKey(selectedMonthKey, language) : (language === 'en' ? 'Current Month' : 'Mois actuel'),
      userName,
    };
  }, [expenses, selectedMonthKey, user, language]);

  const styles = StyleSheet.create({
    container: { marginBottom: Spacing.lg },

    // Carte principale gradient
    card: {
      backgroundColor: colors.primary,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      overflow: 'hidden',
      ...Shadows.lg,
    },

    // Cercles décoratifs
    deco1: {
      position: 'absolute',
      width: 200, height: 200,
      borderRadius: 100,
      backgroundColor: 'rgba(255,255,255,0.07)',
      top: -60, right: -40,
    },
    deco2: {
      position: 'absolute',
      width: 140, height: 140,
      borderRadius: 70,
      backgroundColor: 'rgba(255,255,255,0.05)',
      bottom: -40, left: -20,
    },
    deco3: {
      position: 'absolute',
      width: 80, height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.08)',
      top: 20, left: '45%',
    },

    // En-tête de la carte
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    cardLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    cardLabel: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: Typography.xs,
      fontWeight: Typography.semiBold,
      textTransform: 'uppercase',
      letterSpacing: Typography.wider_ls,
    },

    // Montant principal
    cardBalance: {
      color: '#FFFFFF',
      fontSize: Typography.xxxl,
      fontWeight: Typography.extraBold,
      marginVertical: Spacing.md,
      letterSpacing: Typography.tight_ls,
    },

    // Séparateur
    divider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.15)',
      marginBottom: Spacing.md,
    },

    // Stats en pied de carte
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statDivider: {
      width: 1,
      backgroundColor: 'rgba(255,255,255,0.15)',
      marginVertical: 8,
    },

    // Bouton prévision
    forecastBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      paddingVertical: 14,
      paddingHorizontal: Spacing.lg,
      marginTop: Spacing.md,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.sm,
    },
    forecastBtnText: {
      color: colors.primary,
      fontSize: Typography.base,
      fontWeight: Typography.semiBold,
    },
    // Bouton bascule du BarChart
    toggleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      paddingVertical: 12,
      paddingHorizontal: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.sm,
    },
    toggleBtnText: {
      color: colors.primary,
      fontSize: Typography.base,
      fontWeight: Typography.semiBold,
    },
    // Bouton période
    periodBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      paddingVertical: 12,
      paddingHorizontal: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.sm,
    },
    periodBtnText: {
      color: colors.primary,
      fontSize: Typography.base,
      fontWeight: Typography.semiBold,
    },
    actionRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    // Export button styles
    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      paddingVertical: 10,
      paddingHorizontal: Spacing.lg,
      marginTop: Spacing.md,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.sm,
    },
    exportBtnText: {
      color: colors.primary,
      fontSize: Typography.base,
      fontWeight: Typography.semiBold,
    },
    // Import button styles
    importBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      paddingVertical: 10,
      paddingHorizontal: Spacing.lg,
      marginTop: Spacing.md,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.sm,
    },
    importBtnText: {
      color: colors.primary,
      fontSize: Typography.base,
      fontWeight: Typography.semiBold,
    },


    // Graphique
    chartCard: {
      marginTop: Spacing.md,
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.sm,
    },
    chartHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: Spacing.md,
    },
    chartDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    chartTitle: {
      fontSize: Typography.base,
      fontWeight: Typography.bold,
      color: colors.text,
    },
    noData: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: Typography.sm,
      paddingVertical: Spacing.lg,
    },
    // Health score card
    healthCard: {
      marginTop: Spacing.md,
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.sm,
    },
    healthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    healthTitle: {
      fontSize: Typography.sm,
      fontWeight: Typography.bold,
      color: colors.text,
      flex: 1,
    },
    healthBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.sm,
    },
    healthBadgeText: {
      fontSize: Typography.xs,
      fontWeight: Typography.bold,
    },
    healthText: {
      fontSize: Typography.xs,
      color: colors.textMuted,
      lineHeight: 18,
    },
    // Budget alerts
    alertContainer: {
      marginTop: Spacing.md,
      paddingTop: Spacing.sm,
      borderStyle: 'solid',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    alertHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    alertTitle: {
      fontSize: Typography.xs,
      fontWeight: 'bold',
      color: colors.danger,
    },
    alertText: {
      fontSize: Typography.xs,
      color: colors.textMuted,
      marginTop: 2,
    },
  });

  return (
    <View style={styles.container}>

      {/* ── Carte solde ─────────────────────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.card}>
        {/* Décorations */}
        <View style={styles.deco1} />
        <View style={styles.deco2} />
        <View style={styles.deco3} />

        {/* En-tête */}
        <View style={styles.cardHeader}>
          <View style={styles.cardLabelRow}>
            <MaterialCommunityIcons name="wallet-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.cardLabel}>{t('balance')}</Text>
          </View>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: Radius.full,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}>
            <Text style={{ color: '#fff', fontSize: Typography.xs, fontWeight: Typography.semiBold }}>
              {count} trans.
            </Text>
          </View>
        </View>

        {/* Montant principal */}
        <Text style={styles.cardBalance} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{formatGNF(balance)}</Text>

        {/* Séparateur */}
        <View style={styles.divider} />

        {/* Stats — identiques sur tous les mois */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.statsRow}>
          <StatBox
            label={t('total_income')}
            value={formatGNF(totalIncome)}
            icon="arrow-bottom-left"
            color={colors.success}
          />
          <View style={styles.statDivider} />
          <StatBox
            label={t('total_expenses')}
            value={formatGNF(totalExpenses)}
            icon="arrow-top-right"
            color={colors.danger}
          />
          <View style={styles.statDivider} />
          <StatBox
            label={t('planned')}
            value={forecastData ? formatGNF(forecastData.totalPrevu) : '—'}
            icon="chart-bar"
            color="rgba(255,255,255,0.9)"
          />
        </Animated.View>
      </Animated.View>

      {/* ── Santé Financière & Alertes de Budget ── */}
      {healthScore.grade !== 'N/A' && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <MaterialCommunityIcons name="heart-pulse" size={20} color={healthScore.color} />
            <Text style={styles.healthTitle}>
              {language === 'en' ? 'Financial Health' : 'Santé Financière'}
            </Text>
            <View style={[styles.healthBadge, { backgroundColor: `${healthScore.color}22` }]}>
              <Text style={[styles.healthBadgeText, { color: healthScore.color }]}>
                {healthScore.grade} — {healthScore.label}
              </Text>
            </View>
          </View>
          <Text style={styles.healthText}>{healthScore.text}</Text>
          
          {/* Alertes de budget */}
          {budgetAlerts.length > 0 && (
            <View style={styles.alertContainer}>
              <View style={styles.alertHeader}>
                <MaterialCommunityIcons name="alert-decagram" size={16} color={colors.danger} />
                <Text style={styles.alertTitle}>
                  {language === 'en' ? 'Budget limits exceeded' : 'Budgets dépassés'} ({budgetAlerts.length})
                </Text>
              </View>
              {budgetAlerts.map(alert => (
                <Text key={alert.category} style={styles.alertText}>
                  ️ <Text style={{ fontWeight: 'bold' }}>{alert.category}</Text> : {formatGNF(alert.spent)} / {formatGNF(alert.limit)} max
                </Text>
              ))}
            </View>
          )}
        </Animated.View>
      )}


      {/* ── Bouton prévision ────────────────────────────────────────── */}
      <Pressable style={styles.forecastBtn} onPress={onForecastPress}>
        <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.primary} />
        <Text style={styles.forecastBtnText}>
          {language === 'en' ? 'Plan' : 'Planifier'} {nextMonthLabel ?? (language === 'en' ? 'next month' : 'le mois prochain')}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
      </Pressable>

      {/* ── AI Report Button ────────────────────────────────────────── */}
      <Pressable 
        style={[styles.forecastBtn, { backgroundColor: `${colors.primary}10`, borderWidth: 1, borderColor: colors.primary }]} 
        onPress={() => setAiReportVisible(true)}
      >
        <MaterialCommunityIcons name="robot" size={20} color={colors.primary} />
        <Text style={[styles.forecastBtnText, { color: colors.primary }]}>
          {language === 'en' ? 'AI Monthly Report' : 'Rapport IA Mensuel'}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
      </Pressable>

      {/* ── Actions secondaires (période & affichage graphique) ─────── */}
      <View style={styles.actionRow}>
        <Pressable style={styles.periodBtn} onPress={() => {
          const options = [3, 6, 12];
          setPeriod(prev => {
            const idx = options.indexOf(prev);
            return options[(idx + 1) % options.length];
          });
        }}>
          <Text style={styles.periodBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {language === 'en' ? 'Period' : 'Période'} : {period} {language === 'en' ? 'mo.' : 'mois'}
          </Text>
        </Pressable>

        <Pressable style={styles.toggleBtn} onPress={() => setShowBarChart(prev => !prev)}>
          <Text style={styles.toggleBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {showBarChart 
              ? (language === 'en' ? 'Hide chart' : 'Cacher graph.') 
              : (language === 'en' ? 'Show chart' : 'Afficher graph.')}
          </Text>
        </Pressable>
      </View>

      {/* ── Graphique camembert ──────────────────────────────────────── */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View style={styles.chartDot} />
          <Text style={styles.chartTitle}>
            {language === 'en' ? 'Breakdown by category' : 'Répartition par catégorie'}
          </Text>
        </View>
        {chartData.pie.length > 0 ? (
          <PieChart
            data={chartData.pie}
            width={screenWidth - 80}
            height={180}
            chartConfig={{
              color: (opacity = 1) => `rgba(99,102,241,${opacity})`,
              labelColor: () => colors.textMuted,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="8"
            center={[0, 0]}
            absolute
          />
        ) : (
          <Text style={styles.noData}>
            {language === 'en' ? 'No data for this month.' : 'Aucune donnée pour ce mois-ci.'}
          </Text>
        )}
        {/* Bar‑Chart – dépenses mensuelles */}
        {showBarChart && (
          <Animated.View entering={FadeIn.duration(400)} style={{ marginTop: Spacing.md }}>
            <BarChart
              data={chartData.barChartData}
              width={screenWidth - 80}
              height={180}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: colors.surface,
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                color: (opacity = 1) => `rgba(99,102,241,${opacity})`,
                labelColor: () => colors.textMuted,
              }}
            />
          </Animated.View>
        )}
      </View>

      {/* ── AI Report Modal ────────────────────────────────────────── */}
      <MonthlyAiReportModal
        visible={aiReportVisible}
        onClose={() => setAiReportVisible(false)}
        monthlyData={monthlyData}
      />

    </View>
  );
}