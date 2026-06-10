import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { Radius, Spacing, Typography } from '../constants/designTokens';
import { useTheme } from '../context/ThemeContext';
import { Expense } from '../redux/expenseSlice';
import { selectUserExpenses } from '../redux/selectors';
import { RootState } from '../redux/store';
import { formatGNF } from '../utils/currency';
import Dashboard from '../components/Dashboard';

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const expenses = useSelector(selectUserExpenses);
  const user = useSelector((state: RootState) => state.user);

  // ── Calculs ─────────────────────────────────────────────────────────────────
  const totalIncome = expenses
    .filter((e: Expense) => e.type === 'income')
    .reduce((sum: number, e: Expense) => sum + e.amount, 0);

  const totalExpenses = expenses
    .filter((e: Expense) => !e.type || e.type === 'expense')
    .reduce((sum: number, e: Expense) => sum + e.amount, 0);

  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

  const categoryBreakdown = expenses.reduce((acc: Record<string, number>, expense: Expense) => {
    if (expense.type === 'income') return acc;
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 6);

  const maxCatAmount = sortedCategories[0]?.[1] as number ?? 1;

  // ── Cartes résumé ───────────────────────────────────────────────────────────
  const CARDS = [
    {
      icon: 'cash-multiple' as const,
      label: 'Revenus',
      value: formatGNF(totalIncome),
      color: '#10B981',
      bg: '#10B98115',
    },
    {
      icon: 'cash-minus' as const,
      label: 'Dépenses',
      value: formatGNF(totalExpenses),
      color: '#EF4444',
      bg: '#EF444415',
    },
    {
      icon: 'scale-balance' as const,
      label: 'Solde Net',
      value: formatGNF(balance),
      color: balance >= 0 ? '#10B981' : '#EF4444',
      bg: balance >= 0 ? '#10B98115' : '#EF444415',
    },
    {
      icon: 'piggy-bank-outline' as const,
      label: "Taux d'épargne",
      value: `${savingsRate}%`,
      color: '#7C3AED',
      bg: '#7C3AED15',
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header page (mobile uniquement — web a la sidebar) ── */}
      {Platform.OS !== 'web' && (
        <View style={[styles.mobileHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <MaterialCommunityIcons name="chart-bar" size={22} color={colors.primary} />
          <Text style={[styles.pageTitle, { color: colors.text }]}>Statistiques</Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS === 'web' && styles.scrollContentWeb,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Titre web (dans le contenu) ── */}
        {Platform.OS === 'web' && (
          <View style={styles.webPageHeader}>
            <View>
              <Text style={[styles.webPageTitle, { color: colors.text }]}>Statistiques</Text>
              <Text style={[styles.webPageSub, { color: colors.textMuted }]}>
                Vue d'ensemble de{' '}
                {user.firstName ? user.firstName : 'votre'} activité financière
              </Text>
            </View>
          </View>
        )}

        {/* ── Cartes KPI ── */}
        <View style={[styles.cards, Platform.OS === 'web' && styles.cardsWeb]}>
          {CARDS.map(card => (
            <View
              key={card.label}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
                Platform.OS === 'web' && styles.cardWeb,
              ]}
            >
              <View style={[styles.cardIcon, { backgroundColor: card.bg }]}>
                <MaterialCommunityIcons name={card.icon} size={22} color={card.color} />
              </View>
              <Text style={[styles.cardLabel, { color: colors.textMuted }]}>{card.label}</Text>
              <Text style={[styles.cardValue, { color: card.color }]}>{card.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Dashboard ── */}
        <Dashboard onForecastPress={() => {}} />

        {/* ── Top catégories ── */}
        {sortedCategories.length > 0 && (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.surface, borderColor: colors.border },
              Platform.OS === 'web' && styles.sectionWeb,
            ]}
          >
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="podium" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Catégories</Text>
            </View>

            {sortedCategories.map(([category, amount], index) => {
              const pct = Math.round(((amount as number) / maxCatAmount) * 100);
              const rankColors = ['#F59E0B', '#94A3B8', '#CD7C2E', colors.textMuted, colors.textMuted, colors.textMuted];
              return (
                <View key={category} style={styles.catRow}>
                  {/* Rang */}
                  <View style={[styles.rankBadge, { backgroundColor: rankColors[index] + '25' }]}>
                    <Text style={[styles.rankText, { color: rankColors[index] }]}>#{index + 1}</Text>
                  </View>

                  {/* Barre + label */}
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.catLabelRow}>
                      <Text style={[styles.catName, { color: colors.text }]}>{category}</Text>
                      <Text style={[styles.catAmount, { color: colors.text }]}>
                        {formatGNF(amount as number)}
                      </Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${pct}%` as any, backgroundColor: colors.primary },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Espace bas */}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header mobile
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pageTitle: {
    fontSize: Typography.xl,
    fontWeight: '700',
  },

  // Scroll
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  scrollContentWeb: {
    padding: Spacing.xl,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center' as any,
  },

  // Web header
  webPageHeader: {
    marginBottom: Spacing.xl,
  },
  webPageTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  webPageSub: {
    fontSize: Typography.base,
    marginTop: 6,
  },

  // Cards KPI
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cardsWeb: {
    flexWrap: 'nowrap',
    gap: Spacing.md,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 6,
  },
  cardWeb: {
    minWidth: 0,
    padding: Spacing.lg,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: Typography.xs,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: Typography.lg,
    fontWeight: '800',
  },

  // Section générique
  section: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  sectionWeb: {
    padding: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
  },

  // Catégories
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
  },
  catLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catName: {
    fontSize: Typography.sm,
    fontWeight: '500',
    flex: 1,
  },
  catAmount: {
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
});
