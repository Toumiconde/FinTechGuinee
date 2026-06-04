import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal,
  TextInput, ScrollView, Platform, KeyboardAvoidingView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { addRecurring, updateRecurring, RecurringTransaction } from '../redux/recurringSlice';
import { RootState } from '../redux/store';
import { useTheme } from '../context/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import { formatGNF } from '../utils/currency';
import { useTranslation } from '../i18n/I18nContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialData?: RecurringTransaction | null;
}

export default function RecurringForm({ visible, onClose, initialData }: Props) {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const dispatch = useDispatch();

  const [name, setName] = useState(initialData?.name ?? '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() ?? '');
  const [type, setType] = useState<'expense' | 'income'>(initialData?.type ?? 'expense');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly'>(initialData?.frequency ?? 'monthly');
  const [dayOfPeriod, setDayOfPeriod] = useState(initialData?.dayOfPeriod?.toString() ?? '1');
  const [category, setCategory] = useState(initialData?.category ?? 'Abonnement');

  // Reset form when modal opens with new data
  React.useEffect(() => {
    if (visible) {
      setName(initialData?.name ?? '');
      setAmount(initialData?.amount?.toString() ?? '');
      setType(initialData?.type ?? 'expense');
      setFrequency(initialData?.frequency ?? 'monthly');
      setDayOfPeriod(initialData?.dayOfPeriod?.toString() ?? '1');
      setCategory(initialData?.category ?? 'Abonnement');
    }
  }, [visible, initialData]);

  const handleSave = () => {
    const parsedAmount = parseFloat(amount.replace(/,/g, '.'));
    const parsedDay = parseInt(dayOfPeriod, 10);

    if (!name || isNaN(parsedAmount) || parsedAmount <= 0 || isNaN(parsedDay)) {
      return; // Add proper error handling later if needed
    }

    const data = {
      name,
      amount: parsedAmount,
      type,
      frequency,
      dayOfPeriod: parsedDay,
      category,
      currency: 'GNF',
      icon: type === 'income' ? 'cash-plus' : 'cash-minus',
      active: initialData ? initialData.active : true,
      lastGeneratedMonth: initialData ? initialData.lastGeneratedMonth : null,
    };

    if (initialData) {
      dispatch(updateRecurring({ ...initialData, ...data }));
    } else {
      dispatch(addRecurring(data));
    }

    onClose();
  };

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
      paddingTop: Spacing.sm, paddingBottom: 40, maxHeight: '90%',
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
    title: { fontSize: Typography.lg, fontWeight: Typography.bold, color: colors.text },
    closeBtn: {
      width: 36, height: 36, borderRadius: Radius.full,
      backgroundColor: colors.surfaceLight, justifyContent: 'center',
      alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    },
    scroll: { paddingHorizontal: Spacing.lg },

    sectionTitle: {
      fontSize: Typography.sm, fontWeight: Typography.semiBold,
      color: colors.textMuted, marginBottom: Spacing.sm, marginTop: Spacing.md,
      textTransform: 'uppercase', letterSpacing: Typography.wider_ls,
    },
    
    // Type selector
    typeRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
    typeBtn: {
      flex: 1, paddingVertical: 12, borderRadius: Radius.md,
      borderWidth: 1.5, borderColor: colors.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    typeBtnActive: { backgroundColor: `${colors.primary}15`, borderColor: colors.primary },
    typeBtnText: { fontSize: Typography.sm, fontWeight: Typography.semiBold, color: colors.textMuted },
    typeBtnTextActive: { color: colors.primary },

    // Inputs
    inputWrap: {
      backgroundColor: colors.surfaceLight, borderRadius: Radius.md,
      borderWidth: 1, borderColor: colors.border, paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center',
    },
    input: { flex: 1, paddingVertical: 14, color: colors.text, fontSize: Typography.base },
    inputIcon: { marginRight: 10 },

    // Freq selector
    freqRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    freqBtn: {
      paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceLight,
    },
    freqBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    freqBtnText: { fontSize: Typography.sm, color: colors.textMuted },
    freqBtnTextActive: { color: '#fff', fontWeight: Typography.bold },

    saveBtn: {
      backgroundColor: colors.primary, paddingVertical: 16,
      borderRadius: Radius.lg, alignItems: 'center',
      marginTop: Spacing.xl, ...Shadows.primary(colors.primary),
    },
    saveBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.header}>
              <Text style={s.title}>{initialData ? t('goal_edit_title').replace('l\'', '').replace('objectif', 'récurrence') : t('recurring_new')}</Text>
              <Pressable style={s.closeBtn} onPress={onClose}>
                <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
              
              <Text style={s.sectionTitle}>{language === 'en' ? 'Transaction type' : 'Type de transaction'}</Text>
              <View style={s.typeRow}>
                <Pressable
                  style={[s.typeBtn, type === 'expense' && s.typeBtnActive]}
                  onPress={() => setType('expense')}
                >
                  <MaterialCommunityIcons name="arrow-up-circle-outline" size={20} color={type === 'expense' ? colors.primary : colors.textMuted} />
                  <Text style={[s.typeBtnText, type === 'expense' && s.typeBtnTextActive]}>{language === 'en' ? 'Expense' : 'Dépense'}</Text>
                </Pressable>
                <Pressable
                  style={[s.typeBtn, type === 'income' && s.typeBtnActive]}
                  onPress={() => setType('income')}
                >
                  <MaterialCommunityIcons name="arrow-down-circle-outline" size={20} color={type === 'income' ? colors.primary : colors.textMuted} />
                  <Text style={[s.typeBtnText, type === 'income' && s.typeBtnTextActive]}>{language === 'en' ? 'Income' : 'Revenu'}</Text>
                </Pressable>
              </View>

              <Text style={s.sectionTitle}>{language === 'en' ? 'Details' : 'Détails'}</Text>
              <View style={s.inputWrap}>
                <MaterialCommunityIcons name="format-title" size={20} color={colors.textSubtle} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder={language === 'en' ? "Name (e.g. Netflix, Rent, Salary)" : "Nom (ex: Netflix, Loyer, Salaire)"}
                  placeholderTextColor={colors.textSubtle}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={s.inputWrap}>
                <MaterialCommunityIcons name="cash" size={20} color={colors.textSubtle} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder={language === 'en' ? "Amount" : "Montant"}
                  placeholderTextColor={colors.textSubtle}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
                {amount !== '' && (
                  <Text style={{ color: colors.textMuted, fontSize: Typography.sm }}>GNF</Text>
                )}
              </View>

              <Text style={s.sectionTitle}>{language === 'en' ? 'Frequency' : 'Fréquence'}</Text>
              <View style={s.freqRow}>
                <Pressable
                  style={[s.freqBtn, frequency === 'monthly' && s.freqBtnActive]}
                  onPress={() => setFrequency('monthly')}
                >
                  <Text style={[s.freqBtnText, frequency === 'monthly' && s.freqBtnTextActive]}>{language === 'en' ? 'Monthly' : 'Mensuelle'}</Text>
                </Pressable>
                <Pressable
                  style={[s.freqBtn, frequency === 'weekly' && s.freqBtnActive]}
                  onPress={() => setFrequency('weekly')}
                >
                  <Text style={[s.freqBtnText, frequency === 'weekly' && s.freqBtnTextActive]}>{language === 'en' ? 'Weekly' : 'Hebdomadaire'}</Text>
                </Pressable>
              </View>

              <View style={s.inputWrap}>
                <MaterialCommunityIcons name="calendar-refresh" size={20} color={colors.textSubtle} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder={frequency === 'monthly' ? (language === 'en' ? "Day of the month (1-31)" : "Jour du mois (1-31)") : (language === 'en' ? "Day of the week (0=Sun, 1=Mon...)" : "Jour de la semaine (0=Dim, 1=Lun...)")}
                  placeholderTextColor={colors.textSubtle}
                  value={dayOfPeriod}
                  onChangeText={setDayOfPeriod}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>

              <Pressable style={s.saveBtn} onPress={handleSave}>
                <Text style={s.saveBtnText}>{t('goal_save')}</Text>
              </Pressable>

            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
