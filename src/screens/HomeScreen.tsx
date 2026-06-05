import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
    Platform,
    Modal,
    ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Dashboard from '../components/Dashboard';
import ExpenseCard from '../components/ExpenseCard';
import ExpenseForm from '../components/ExpenseForm';
import ForecastModal from '../components/ForecastModal';
import LockScreen from '../components/LockScreen';
import ExportModal from '../components/ExportModal';
import ImportModal from '../components/ImportModal';
import RecurringModal from '../components/RecurringModal';
import GoalsModal from '../components/GoalsModal';
import DataMenu from '../components/DataMenu';
import Onboarding from '../components/Onboarding';
import ProfileModal from '../components/ProfileModal';
import { useTheme } from '../context/ThemeContext';
import { Expense } from '../redux/expenseSlice';
import { RootState, hydrateState } from '../redux/store';
import { setFullProfile } from '../redux/userSlice';
import { formatGNF } from '../utils/currency';
import {
    formatMonthKey,
    generateMonthRange,
    getCurrentMonthKey,
    getMonthKey,
    isPastMonth,
} from '../utils/dateUtils';
import { useRecurringTransactions } from '../hooks/useRecurringTransactions';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import { useTranslation } from '../i18n/I18nContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type ForecastData = {
    month: string;
    budgets: Record<string, number>;
    totalPrevu: number;
    status?: 'planned' | 'confirmed';
};

// ─── Composant ────────────────────────────────────────────────────────────────
export default function HomeScreen() {
    const { theme, toggleTheme, colors } = useTheme();
    const { t, language } = useTranslation();
    const dispatch = useDispatch();

    const allExpenses = useSelector((state: RootState) => state.expenses.expenses);
    const user        = useSelector((state: RootState) => state.user);

    const [isLoading,           setIsLoading]           = useState(true);
    const [searchQuery,         setSearchQuery]         = useState('');
    const [selectedCategory,    setSelectedCategory]    = useState<string | null>(null);
    const [selectedMonthKey,    setSelectedMonthKey]    = useState<string | null>(null);
    const [editingExpense,      setEditingExpense]      = useState<Expense | null>(null);
    const [showExpenseForm,     setShowExpenseForm]     = useState(false);
    const [forecastModalVisible,setForecastModalVisible]= useState(false);
    const [forecastMonthKey,    setForecastMonthKey]    = useState<string | null>(null);
    const [showProfileModal,    setShowProfileModal]    = useState(false);
    const [forecastData,        setForecastData]        = useState<ForecastData | null>(null);
    const [autoModalShownFor,   setAutoModalShownFor]   = useState<string | null>(null);
    const [isUnlocked,          setIsUnlocked]          = useState(false);
    const [monthPickerVisible,  setMonthPickerVisible]  = useState(false);
    const [showExportModal,     setShowExportModal]     = useState(false);
    const [showImportModal,     setShowImportModal]     = useState(false);
    const [showRecurringModal,  setShowRecurringModal]  = useState(false);
    const [showGoalsModal,      setShowGoalsModal]      = useState(false);
    const [showDataMenu,        setShowDataMenu]        = useState(false);

    // ── Hooks ───────────────────────────────────────────────────────────────
    useRecurringTransactions();

    const currentMonthKey = getCurrentMonthKey();

    const nextMonthKey = useMemo(() => {
        const baseDate = selectedMonthKey 
            ? new Date(Number(selectedMonthKey.split('-')[1]), Number(selectedMonthKey.split('-')[0]) - 1, 1)
            : new Date();
        const next = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
        const m    = (next.getMonth() + 1).toString().padStart(2, '0');
        return `${m}-${next.getFullYear()}`;
    }, [selectedMonthKey]);

    // Charger l'état global (profil, dépenses, objectifs, etc.)
    useEffect(() => {
        const loadApp = async () => {
            try {
                await dispatch(hydrateState() as any);
            } catch (e) {
                console.error('Failed to load state', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadApp();
    }, [dispatch]);

    useEffect(() => {
        setSelectedMonthKey(currentMonthKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!selectedMonthKey) { setForecastData(null); return; }
        AsyncStorage.getItem(`@forecast_${selectedMonthKey}`)
            .then(raw => setForecastData(raw ? JSON.parse(raw) : null))
            .catch(() => setForecastData(null));
    }, [selectedMonthKey]);

    useEffect(() => {
        if (!selectedMonthKey || isLoading || autoModalShownFor === selectedMonthKey) return;

        AsyncStorage.getItem(`@forecast_${selectedMonthKey}`).then(raw => {
            // N'affiche automatiquement le modal QUE si aucun forecast n'existe encore
            // Si un forecast existe (même non confirmé), l'utilisateur l'a déjà vu → ne pas re-ouvrir
            if (!raw && !isPastMonth(selectedMonthKey)) {
                setAutoModalShownFor(selectedMonthKey);
                setForecastMonthKey(selectedMonthKey);
                setForecastModalVisible(true);
            } else {
                // Marquer comme "déjà traité" pour ce mois même si on n'ouvre pas le modal
                setAutoModalShownFor(selectedMonthKey);
            }
        });
    }, [selectedMonthKey, isLoading, autoModalShownFor]);

    const categories = [
        { name: 'Toutes',            label: t('overview'),     icon: 'apps' as const },
        { name: 'Alimentation',      label: t('cat_food'),     icon: 'food-apple' as const },
        { name: 'Transport',         label: t('cat_transport'),icon: 'car-side' as const },
        { name: 'Sante',             label: t('cat_health'),   icon: 'pill' as const },
        { name: 'Education',         label: t('cat_education'),icon: 'school' as const },
        { name: 'Telecommunication', label: 'Telecom',         icon: 'wifi' as const },
        { name: 'Epargne',           label: t('cat_other'),    icon: 'piggy-bank' as const },
        { name: 'Loisirs',           label: t('cat_leisure'),  icon: 'gamepad-variant' as const },
    ];

    const monthOptions = useMemo(() => {
        const expenseMonths = new Set<string>();
        allExpenses.forEach((exp: Expense) => {
            const key = getMonthKey(exp.date);
            if (key) expenseMonths.add(key);
        });
        const combined = new Set([...expenseMonths, ...generateMonthRange(12, 12)]);
        return Array.from(combined).sort((a, b) => {
            const [ma, ya] = a.split('-').map(Number);
            const [mb, yb] = b.split('-').map(Number);
            return ya !== yb ? ya - yb : ma - mb;
        });
    }, [allExpenses]);

    const filteredExpenses = useMemo(() => {
        return allExpenses.filter((exp: Expense) => {
            const matchesSearch =
                (exp.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                exp.category.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory =
                selectedCategory && selectedCategory !== 'Toutes'
                    ? exp.category === selectedCategory
                    : true;
            const matchesMonth = selectedMonthKey
                ? getMonthKey(exp.date) === selectedMonthKey
                : true;
            return matchesSearch && matchesCategory && matchesMonth;
        });
    }, [allExpenses, searchQuery, selectedCategory, selectedMonthKey]);

    const handleForecast = useCallback(async () => {
        setForecastMonthKey(nextMonthKey);
        setForecastModalVisible(true);
    }, [nextMonthKey]);

    const handleAddExpense = useCallback(() => {
        if (selectedMonthKey && isPastMonth(selectedMonthKey)) {
            Alert.alert(t('this_month'), t('no_transactions_sub'));
            return;
        }
        setEditingExpense(null);
        setShowExpenseForm(true);
    }, [selectedMonthKey, t]);

    const handleForecastClose = useCallback(() => {
        setForecastModalVisible(false);
        if (selectedMonthKey) {
            AsyncStorage.getItem(`@forecast_${selectedMonthKey}`)
                .then(raw => setForecastData(raw ? JSON.parse(raw) : null))
                .catch(() => {});
        }
    }, [selectedMonthKey]);

    const styles = useMemo(() => StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: colors.background,
        },

        // ── Header ──────────────────────────────────────────────────────
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: Spacing.lg,
            paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 32) : Spacing.lg,
            paddingBottom: Spacing.lg,
            backgroundColor: colors.background,
        },
        headerLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        avatarRing: {
            width: 50,
            height: 50,
            borderRadius: 25,
            padding: 2,
            backgroundColor: colors.primary,
        },
        avatar: {
            width: '100%',
            height: '100%',
            borderRadius: 100,
        },
        greeting: {
            fontSize: Typography.xs,
            color: colors.textMuted,
            fontWeight: Typography.medium,
            textTransform: 'uppercase',
            letterSpacing: Typography.wide_ls,
        },
        userName: {
            fontSize: Typography.md,
            fontWeight: Typography.bold,
            color: colors.text,
        },
        headerRight: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        iconBtn: {
            width: 42,
            height: 42,
            borderRadius: Radius.md,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            ...Shadows.sm,
        },

        // ── Contenu principal ────────────────────────────────────────────
        contentContainer: {
            paddingHorizontal: Spacing.lg,
            paddingBottom: 100,
        },

        // ── Filters ──────────────────────────────────────────────────────
        filtersSection: { marginBottom: Spacing.lg },

        searchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: Radius.md,
            paddingHorizontal: Spacing.md,
            marginBottom: Spacing.sm,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 10,
            ...Shadows.sm,
        },
        searchInput: {
            flex: 1,
            paddingVertical: 13,
            color: colors.text,
            fontSize: Typography.base,
        },

        pickerWrapper: {
            backgroundColor: colors.surface,
            borderRadius: Radius.md,
            marginBottom: Spacing.sm,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
        },
        customPickerBtn: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: Spacing.md,
            paddingVertical: 14,
        },
        customPickerText: {
            color: colors.text,
            fontSize: Typography.base,
            fontWeight: Typography.medium,
        },

        categoriesScroll: {
            flexDirection: 'row',
            marginTop: Spacing.xs,
        },
        categoryChip: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: Radius.full,
            backgroundColor: colors.surface,
            marginRight: Spacing.sm,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 5,
        },
        categoryChipActive: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
        },
        categoryText: {
            color: colors.textMuted,
            fontSize: Typography.sm,
            fontWeight: Typography.medium,
        },
        categoryTextActive: {
            color: '#fff',
            fontWeight: Typography.semiBold,
        },

        // ── Section header ────────────────────────────────────────────────
        sectionHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: Spacing.sm,
            marginTop: Spacing.xs,
        },
        sectionTitle: {
            fontSize: Typography.md,
            fontWeight: Typography.bold,
            color: colors.text,
        },
        sectionBadge: {
            backgroundColor: `${colors.primary}18`,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: Radius.full,
        },
        sectionBadgeText: {
            fontSize: Typography.xs,
            color: colors.primary,
            fontWeight: Typography.semiBold,
        },
        subTitle: {
            fontSize: Typography.sm,
            color: colors.textMuted,
            marginBottom: Spacing.md,
        },

        // ── État vide ─────────────────────────────────────────────────────
        emptyContainer: {
            alignItems: 'center',
            paddingTop: 60,
            paddingBottom: 40,
        },
        emptyIconWrap: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: `${colors.primary}12`,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: Spacing.md,
        },
        emptyTitle: {
            fontSize: Typography.md,
            fontWeight: Typography.semiBold,
            color: colors.text,
            marginBottom: 6,
        },
        emptyText: {
            textAlign: 'center',
            color: colors.textMuted,
            fontSize: Typography.sm,
            lineHeight: 20,
        },

        // ── FAB ───────────────────────────────────────────────────────────
        fab: {
            position: 'absolute',
            bottom: 32,
            right: Spacing.lg,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            ...Shadows.primary(colors.primary),
        },

        // Custom Month Modal
        modalOverlay: {
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: 'center',
            alignItems: 'center',
            padding: Spacing.xl,
        },
        monthModalContent: {
            backgroundColor: colors.surface,
            width: '100%',
            borderRadius: Radius.xl,
            padding: Spacing.lg,
            maxHeight: '80%',
            ...Shadows.lg,
        },
        monthModalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: Spacing.md,
            paddingBottom: Spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        monthModalTitle: {
            fontSize: Typography.lg,
            fontWeight: Typography.bold,
            color: colors.text,
        },
        monthOption: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: Spacing.md,
            paddingHorizontal: Spacing.sm,
            borderRadius: Radius.md,
        },
        monthOptionActive: {
            backgroundColor: `${colors.primary}15`,
        },
        monthOptionText: {
            fontSize: Typography.base,
            color: colors.text,
        },
        monthOptionTextActive: {
            color: colors.primary,
            fontWeight: Typography.bold,
        },
    }), [colors]);

    // ── Header de la liste ─────────────────────────────────────────────────────
    const ListHeader = useCallback(() => (
        <View>
            <Dashboard
                onForecastPress={handleForecast}
                selectedMonthKey={selectedMonthKey}
                forecastData={forecastData}
                nextMonthLabel={formatMonthKey(nextMonthKey)}
            />

            {/* Filtres */}
            <View style={styles.filtersSection}>
                {/* Recherche */}
                <View style={styles.searchContainer}>
                    <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={language === 'en' ? 'Search a transaction...' : 'Rechercher une dépense…'}
                        placeholderTextColor={colors.textSubtle}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                            <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
                        </Pressable>
                    )}
                </View>

                {/* Mois */}
                <View style={styles.pickerWrapper}>
                    <Pressable
                        style={styles.customPickerBtn}
                        onPress={() => setMonthPickerVisible(true)}
                    >
                        <Text style={styles.customPickerText}>
                            {selectedMonthKey ? formatMonthKey(selectedMonthKey, language) : (language === 'en' ? 'All months' : 'Tous les mois')}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
                    </Pressable>
                </View>

                {/* Catégories */}
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={categories}
                    keyExtractor={(item) => item.name}
                    style={styles.categoriesScroll}
                    renderItem={({ item }) => {
                        const isActive =
                            selectedCategory === item.name ||
                            (item.name === 'Toutes' && !selectedCategory);
                        return (
                            <Pressable
                                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                                onPress={() => setSelectedCategory(item.name === 'Toutes' ? null : item.name)}
                            >
                                <MaterialCommunityIcons
                                    name={item.icon}
                                    size={14}
                                    color={isActive ? '#fff' : colors.primary}
                                />
                                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                                    {item.label}
                                </Text>
                            </Pressable>
                        );
                    }}
                />
            </View>

            {/* En-tête de section transactions */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('transactions')}</Text>
                <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>
                        {filteredExpenses.length} {language === 'en' ? (filteredExpenses.length !== 1 ? 'operations' : 'operation') : `opération${filteredExpenses.length !== 1 ? 's' : ''}`}
                    </Text>
                </View>
            </View>

            {selectedMonthKey && (
                <Text style={styles.subTitle}>
                    {formatMonthKey(selectedMonthKey, language)} — {language === 'en' ? 'Balance' : 'Solde'} : {formatGNF(filteredExpenses.reduce((s: number, e: Expense) => s + (e.type === 'income' ? e.amount : -e.amount), 0))}
                </Text>
            )}
        </View>
    ), [
        handleForecast, forecastData, selectedMonthKey, searchQuery,
        selectedCategory, filteredExpenses, monthOptions, colors, styles, nextMonthKey, language
    ]);

    // ── Chargement ─────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: Typography.sm }}>{language === 'en' ? 'Loading...' : 'Chargement…'}</Text>
            </View>
        );
    }

    if (!user.isRegistered) return <Onboarding />;

    if (user.securityMode !== 'none' && !isUnlocked) {
        return <LockScreen onUnlock={() => setIsUnlocked(true)} user={user} />;
    }

    // ── Rendu principal ────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar
                barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
                backgroundColor={colors.background}
            />

            {/* ── Header ──────────────────────────────── */}
            <View style={styles.header}>
                <Pressable style={styles.headerLeft} onPress={() => setShowProfileModal(true)}>
                    <View style={styles.avatarRing}>
                        <Image
                            source={{
                                uri: user.avatarUri
                                    ? user.avatarUri
                                    : `https://api.dicebear.com/7.x/avataaars/png?seed=${user.avatarSeed}&backgroundColor=b6e3f4`,
                            }}
                            style={styles.avatar}
                        />
                    </View>
                    <View>
                        <Text style={styles.greeting}>{t('good_morning')}</Text>
                        <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                    </View>
                </Pressable>

                <View style={styles.headerRight}>
                    <Pressable style={styles.iconBtn} onPress={() => setShowDataMenu(true)}>
                        <MaterialCommunityIcons
                            name="swap-vertical"
                            size={20}
                            color={colors.text}
                        />
                    </Pressable>
                    <Pressable style={styles.iconBtn} onPress={toggleTheme}>
                        <MaterialCommunityIcons
                            name={theme === 'dark' ? 'weather-sunny' : 'weather-night'}
                            size={20}
                            color={colors.text}
                        />
                    </Pressable>
                </View>
            </View>

            {/* ── Liste dépenses ───────────────────────── */}
            <FlatList
                data={filteredExpenses}
                keyExtractor={(item: Expense) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
                removeClippedSubviews={true}
                initialNumToRender={8}
                maxToRenderPerBatch={5}
                windowSize={10}
                extraData={{ theme, language, searchQuery, selectedCategory, selectedMonthKey }}
                ListHeaderComponent={ListHeader}
                renderItem={({ item }: { item: Expense }) => (
                    <ExpenseCard
                        expense={item}
                        onEdit={exp => {
                            setEditingExpense(exp);
                            setShowExpenseForm(true);
                        }}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconWrap}>
                            <MaterialCommunityIcons name="receipt-text-outline" size={36} color={colors.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>{t('no_transactions')}</Text>
                        <Text style={styles.emptyText}>{t('no_transactions_sub')}</Text>
                    </View>
                }
            />

            {/* ── Modales ──────────────────────────────── */}
            <ForecastModal
                visible={forecastModalVisible}
                monthKey={forecastMonthKey ?? ''}
                categories={categories}
                onClose={handleForecastClose}
            />
            <ExpenseForm
                visible={showExpenseForm}
                initialExpense={editingExpense}
                onSubmitComplete={() => { setShowExpenseForm(false); setEditingExpense(null); }}
                onCancel={() => { setShowExpenseForm(false); setEditingExpense(null); }}
                selectedMonthKey={selectedMonthKey}
            />
            <ProfileModal
                visible={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                onLockApp={() => {
                    setShowProfileModal(false);
                    setIsUnlocked(false);
                }}
            />
            <ExportModal
                visible={showExportModal}
                onClose={() => setShowExportModal(false)}
            />
            <ImportModal
                visible={showImportModal}
                onClose={() => setShowImportModal(false)}
            />
            <RecurringModal
                visible={showRecurringModal}
                onClose={() => setShowRecurringModal(false)}
            />
            <GoalsModal
                visible={showGoalsModal}
                onClose={() => setShowGoalsModal(false)}
            />
            <DataMenu
                visible={showDataMenu}
                onClose={() => setShowDataMenu(false)}
                onExport={() => setShowExportModal(true)}
                onImport={() => setShowImportModal(true)}
                onRecurring={() => setShowRecurringModal(true)}
                onGoals={() => setShowGoalsModal(true)}
                anchorRight={16}
                anchorTop={70}
            />

            {/* ── FAB ──────────────────────────────────── */}
            <Pressable style={styles.fab} onPress={handleAddExpense}>
                <MaterialCommunityIcons name="plus" size={30} color="#FFF" />
            </Pressable>

            {/* Modal de sélection de mois personnalisé */}
            <Modal visible={monthPickerVisible} transparent animationType="fade" onRequestClose={() => setMonthPickerVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setMonthPickerVisible(false)}>
                    <View style={styles.monthModalContent}>
                        <View style={styles.monthModalHeader}>
                            <Text style={styles.monthModalTitle}>{language === 'en' ? 'Period' : 'Période'}</Text>
                            <Pressable onPress={() => setMonthPickerVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
                            </Pressable>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Pressable
                                style={[styles.monthOption, !selectedMonthKey && styles.monthOptionActive]}
                                onPress={() => { setSelectedMonthKey(null); setMonthPickerVisible(false); }}
                            >
                                <Text style={[styles.monthOptionText, !selectedMonthKey && styles.monthOptionTextActive]}>
                                    {language === 'en' ? 'All months' : 'Tous les mois'}
                                </Text>
                                {!selectedMonthKey && <MaterialCommunityIcons name="check" size={20} color={colors.primary} />}
                            </Pressable>
                            {monthOptions.map((m: string) => {
                                const isActive = selectedMonthKey === m;
                                return (
                                    <Pressable
                                        key={m}
                                        style={[styles.monthOption, isActive && styles.monthOptionActive]}
                                        onPress={() => { setSelectedMonthKey(m); setMonthPickerVisible(false); }}
                                    >
                                        <Text style={[styles.monthOptionText, isActive && styles.monthOptionTextActive]}>
                                            {formatMonthKey(m, language)}
                                        </Text>
                                        {isActive && <MaterialCommunityIcons name="check" size={20} color={colors.primary} />}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

        </SafeAreaView>
    );
}