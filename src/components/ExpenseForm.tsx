import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    Vibration,
    View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n/I18nContext';
import { Expense, addExpense, updateExpense } from '../redux/expenseSlice';
import { RootState } from '../redux/store';
import { getCategoryDetails } from '../utils/category';

const QUICK_CATEGORIES_EXPENSE = [
  { name: 'Alimentation', icon: 'food-apple' },
  { name: 'Transport',    icon: 'car-side' },
  { name: 'Sante',        icon: 'pill' },
  { name: 'Education',    icon: 'school' },
  { name: 'Telecom',      icon: 'wifi' },
  { name: 'Epargne',      icon: 'piggy-bank' },
  { name: 'Loisirs',      icon: 'gamepad-variant' },
];

const QUICK_CATEGORIES_INCOME = [
  { name: 'Salaire',      icon: 'cash-multiple' },
  { name: 'Prime',        icon: 'star-circle' },
  { name: 'Virement',     icon: 'bank-transfer' },
  { name: 'Cadeau',       icon: 'gift' },
  { name: 'Remboursement',icon: 'cash-refund' },
  { name: 'Vente',        icon: 'tag-outline' },
];

interface Props {
  initialExpense?: Expense | null;
  visible: boolean;
  onSubmitComplete: () => void;
  onCancel: () => void;
  selectedMonthKey?: string | null;
}

export default function ExpenseForm({
  initialExpense,
  visible,
  onSubmitComplete,
  onCancel,
  selectedMonthKey,
}: Props) {
  const dispatch   = useDispatch();
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const userCurrency = useSelector((state: RootState) => state.user.currency) || 'GNF';

  const QUICK_CATEGORIES_EXPENSE_LOCALIZED = [
    { name: 'Alimentation', label: t('cat_food'), icon: 'food-apple' },
    { name: 'Transport',    label: t('cat_transport'), icon: 'car-side' },
    { name: 'Sante',        label: t('cat_health'), icon: 'pill' },
    { name: 'Education',    label: t('cat_education'), icon: 'school' },
    { name: 'Telecom',      label: 'Telecom', icon: 'wifi' },
    { name: 'Tontine',      label: 'Tontine', icon: 'piggy-bank' },
    { name: 'Epargne',      label: t('cat_other'), icon: 'piggy-bank' },
    { name: 'Loisirs',      label: t('cat_leisure'), icon: 'gamepad-variant' },
  ];

  const QUICK_CATEGORIES_INCOME_LOCALIZED = [
    { name: 'Salaire',      label: t('inc_salary'), icon: 'cash-multiple' },
    { name: 'Prime',        label: t('inc_bonus'), icon: 'star-circle' },
    { name: 'Virement',     label: t('inc_transfer'), icon: 'bank-transfer' },
    { name: 'Cadeau',       label: t('inc_gift'), icon: 'gift' },
    { name: 'Remboursement',label: t('inc_refund'), icon: 'cash-refund' },
    { name: 'Vente',        label: t('inc_sale'), icon: 'tag-outline' },
  ];

  const [amount,      setAmount]      = useState('');
  const [category,    setCategory]    = useState('');
  const [description, setDescription] = useState('');
  const [txType,      setTxType]      = useState<'expense' | 'income'>('expense');

  useEffect(() => {
    if (visible) {
      if (initialExpense) {
        setAmount(initialExpense.amount.toString());
        setCategory(initialExpense.category);
        setDescription(initialExpense.description || '');
        setTxType(initialExpense.type || 'expense');
      } else {
        setAmount('');
        setCategory('');
        setDescription('');
        setTxType('expense');
      }
    }
  }, [initialExpense, visible]);

  const handleSubmit = () => {
    const numAmount = parseFloat(amount.replace(/\s/g, '').replace(',', '.'));

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(language === 'en' ? 'Error' : 'Erreur', language === 'en' ? 'Please enter a valid amount greater than 0.' : 'Veuillez entrer un montant valide supérieur à 0.');
      return;
    }
    if (!category.trim()) {
      Alert.alert(language === 'en' ? 'Error' : 'Erreur', language === 'en' ? 'Please select or enter a category.' : 'Veuillez sélectionner ou saisir une catégorie.');
      return;
    }

    const catDetails = getCategoryDetails(category, colors);

    if (initialExpense) {
      dispatch(updateExpense({
        ...initialExpense,
        category: category.trim(),
        amount: numAmount,
        description: description.trim(),
        icon: catDetails.icon,
        type: txType,
      }));
    } else {
      let finalDate = new Date().toLocaleDateString('fr-FR'); // par défaut aujourd'hui
      
      // Si on ajoute une transaction dans un autre mois que le mois courant, 
      // on force la date au 1er de ce mois pour qu'elle apparaisse dans la bonne vue.
      if (selectedMonthKey) {
        const [m, y] = selectedMonthKey.split('-');
        const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
        const currentYear = new Date().getFullYear().toString();
        
        if (m !== currentMonth || y !== currentYear) {
          finalDate = `01/${m}/${y}`;
        }
      }

      dispatch(addExpense({
        category: category.trim(),
        amount: numAmount,
        currency: userCurrency,
        description: description.trim(),
        icon: catDetails.icon,
        date: finalDate,
        type: txType,
      }));
    }

    if (Platform.OS !== 'web') {
      Vibration.vibrate(60);
    }

    setAmount('');
    setCategory('');
    setDescription('');
    onSubmitComplete();
  };

  const currentIcon  = getCategoryDetails(category || 'Autre', colors).icon;
  const currentColor = category ? getCategoryDetails(category, colors).color : colors.textMuted;

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      paddingTop: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
      maxHeight: '92%',
    },

    // Indicateur de glissement
    handle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: Radius.full,
      alignSelf: 'center',
      marginBottom: Spacing.md,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    titleIcon: {
      width: 38,
      height: 38,
      borderRadius: Radius.md,
      backgroundColor: `${colors.primary}18`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: Typography.lg,
      fontWeight: Typography.bold,
      color: colors.text,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: Radius.full,
      backgroundColor: colors.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Type switcher
    switcher: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceLight,
      borderRadius: Radius.full,
      padding: 4,
      marginBottom: Spacing.lg,
    },
    switchBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: Radius.full,
    },
    switchBtnActiveExp: {
      backgroundColor: colors.danger,
    },
    switchBtnActiveInc: {
      backgroundColor: colors.success,
    },
    switchText: {
      fontSize: Typography.sm,
      fontWeight: Typography.semiBold,
      color: colors.textMuted,
    },
    switchTextActive: {
      color: '#fff',
    },

    // Champs
    inputGroup: { marginBottom: Spacing.md },
    label: {
      fontSize: Typography.xs,
      color: colors.textMuted,
      fontWeight: Typography.semiBold,
      textTransform: 'uppercase',
      letterSpacing: Typography.wider_ls,
      marginBottom: Spacing.sm,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceLight,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      gap: 10,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      color: colors.text,
      fontSize: Typography.base,
    },

    // Chips catégorie
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: Spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: Radius.full,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: `${colors.primary}18`,
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.textMuted,
      fontSize: Typography.xs,
      fontWeight: Typography.medium,
    },
    chipTextActive: { color: colors.primary, fontWeight: Typography.semiBold },

    // Bouton soumettre
    submitBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: Radius.lg,
      alignItems: 'center',
      marginTop: Spacing.md,
      ...Shadows.primary(colors.primary),
    },
    submitText: {
      color: '#fff',
      fontSize: Typography.base,
      fontWeight: Typography.bold,
      letterSpacing: 0.3,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* En-tête */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleIcon}>
                <MaterialCommunityIcons
                  name={initialExpense ? 'pencil' : 'plus'}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.title}>
                {initialExpense ? t('edit_expense') : t('new_expense')}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onCancel} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Sélecteur de type */}
            <View style={styles.switcher}>
              <Pressable
                style={[styles.switchBtn, txType === 'expense' && styles.switchBtnActiveExp]}
                onPress={() => { setTxType('expense'); setCategory(''); }}
              >
                <Text style={[styles.switchText, txType === 'expense' && styles.switchTextActive]}>{language === 'en' ? 'Expense' : 'Dépense'}</Text>
              </Pressable>
              <Pressable
                style={[styles.switchBtn, txType === 'income' && styles.switchBtnActiveInc]}
                onPress={() => { setTxType('income'); setCategory(''); }}
              >
                <Text style={[styles.switchText, txType === 'income' && styles.switchTextActive]}>{language === 'en' ? 'Income' : 'Revenu'}</Text>
              </Pressable>
            </View>

            {/* Montant */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'en' ? `Amount (${userCurrency})` : `Montant (${userCurrency})`}</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="cash" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder={language === 'en' ? "E.g. 50 000" : "Ex : 50 000"}
                  placeholderTextColor={colors.textSubtle}
                />
              </View>
            </View>

            {/* Catégorie */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'en' ? 'Category' : 'Catégorie'}</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons
                  name={currentIcon as any}
                  size={20}
                  color={currentColor}
                />
                <TextInput
                  style={styles.input}
                  value={category}
                  onChangeText={setCategory}
                  placeholder={language === 'en' ? "Food, Taxi, Rent..." : "Alimentation, Taxi, Loyer…"}
                  placeholderTextColor={colors.textSubtle}
                />
              </View>
              <View style={styles.chips}>
                {(txType === 'expense' ? QUICK_CATEGORIES_EXPENSE_LOCALIZED : QUICK_CATEGORIES_INCOME_LOCALIZED).map(cat => {
                  const isActive = category.toLowerCase() === cat.name.toLowerCase();
                  return (
                    <Pressable
                      key={cat.name}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => setCategory(cat.name)}
                    >
                      <MaterialCommunityIcons
                        name={cat.icon as any}
                        size={13}
                        color={isActive ? colors.primary : colors.textMuted}
                      />
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'en' ? 'Description (optional)' : 'Description (optionnelle)'}</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="text-box-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={language === 'en' ? "E.g. Market" : "Ex : Marché Madina"}
                  placeholderTextColor={colors.textSubtle}
                  maxLength={200}
                />
              </View>
            </View>

            {/* Bouton */}
            <Pressable style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitText}>
                {initialExpense ? (language === 'en' ? 'Update' : 'Mettre à jour') : (language === 'en' ? 'Add transaction' : 'Ajouter la dépense')}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}