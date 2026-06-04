import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal,
  TextInput, ScrollView, Platform, KeyboardAvoidingView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { addGoal, Goal } from '../redux/goalsSlice';
import { useTheme } from '../context/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from '../i18n/I18nContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  // Currently only supports adding, but can be extended for editing
  initialData?: Goal | null; 
}

export default function GoalForm({ visible, onClose, initialData }: Props) {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const dispatch = useDispatch();

  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState(new Date(new Date().setFullYear(new Date().getFullYear() + 1)));
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setTitle(initialData.title);
        setTargetAmount(initialData.targetAmount.toString());
        setCurrentAmount(initialData.currentAmount.toString());
        setDeadline(new Date(initialData.deadline));
      } else {
        setTitle('');
        setTargetAmount('');
        setCurrentAmount('');
        setDeadline(new Date(new Date().setFullYear(new Date().getFullYear() + 1)));
      }
    }
  }, [visible, initialData]);

  const handleSave = () => {
    const parsedTarget = parseFloat(targetAmount.replace(/,/g, '.'));
    const parsedCurrent = parseFloat(currentAmount.replace(/,/g, '.')) || 0;

    if (!title.trim() || isNaN(parsedTarget) || parsedTarget <= 0) {
      alert(language === 'en' ? "Please fill in the title and target amount correctly." : "Veuillez remplir correctement le titre et le montant cible.");
      return;
    }

    const data = {
      title: title.trim(),
      targetAmount: parsedTarget,
      currentAmount: parsedCurrent,
      deadline: deadline.toISOString().split('T')[0],
      description: '',
    };

    if (!initialData) {
      dispatch(addGoal(data));
    }
    // Update logic would go here if editing was supported

    onClose();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDeadline(selectedDate);
    }
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
    
    inputWrap: {
      backgroundColor: colors.surfaceLight, borderRadius: Radius.md,
      borderWidth: 1, borderColor: colors.border, paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center',
    },
    input: { flex: 1, paddingVertical: 14, color: colors.text, fontSize: Typography.base },
    inputIcon: { marginRight: 10 },

    dateBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.surfaceLight, borderRadius: Radius.md,
      borderWidth: 1, borderColor: colors.border, paddingHorizontal: Spacing.md,
      paddingVertical: 14, marginBottom: Spacing.md,
    },
    dateText: { fontSize: Typography.base, color: colors.text },

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
              <Text style={s.title}>{initialData ? t('goal_edit_title') : t('goal_new_title')}</Text>
              <Pressable style={s.closeBtn} onPress={onClose}>
                <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
              
              <Text style={s.sectionTitle}>{t('goal_what')}</Text>
              <View style={s.inputWrap}>
                <MaterialCommunityIcons name="target" size={20} color={colors.textSubtle} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder={language === 'en' ? "E.g. New MacBook, Car, Holidays" : "Ex: Nouveau MacBook, Voiture, Vacances"}
                  placeholderTextColor={colors.textSubtle}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <Text style={s.sectionTitle}>{t('goal_target')}</Text>
              <View style={s.inputWrap}>
                <MaterialCommunityIcons name="cash-multiple" size={20} color={colors.textSubtle} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder={language === 'en' ? "Total amount to reach" : "Montant total à atteindre"}
                  placeholderTextColor={colors.textSubtle}
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  keyboardType="numeric"
                />
              </View>

              <Text style={s.sectionTitle}>{t('goal_current')}</Text>
              <View style={s.inputWrap}>
                <MaterialCommunityIcons name="piggy-bank-outline" size={20} color={colors.textSubtle} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder={language === 'en' ? "Amount already saved (Optional)" : "Montant déjà mis de côté (Optionnel)"}
                  placeholderTextColor={colors.textSubtle}
                  value={currentAmount}
                  onChangeText={setCurrentAmount}
                  keyboardType="numeric"
                />
              </View>

              <Text style={s.sectionTitle}>{t('goal_deadline')}</Text>
              <Pressable style={s.dateBtn} onPress={() => setShowDatePicker(true)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="calendar-range" size={20} color={colors.textSubtle} style={s.inputIcon} />
                  <Text style={s.dateText}>{deadline.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-GN')}</Text>
                </View>
                {Platform.OS === 'ios' && showDatePicker && (
                   <DateTimePicker
                     value={deadline}
                     mode="date"
                     display="default"
                     onChange={handleDateChange}
                     style={{ width: 100 }}
                   />
                )}
              </Pressable>

              {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                  value={deadline}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                />
              )}

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
