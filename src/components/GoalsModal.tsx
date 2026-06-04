import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView, TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import { deleteGoal, updateGoalProgress, Goal } from '../redux/goalsSlice';
import { useTheme } from '../context/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import { formatGNF } from '../utils/currency';
import GoalForm from './GoalForm';
import { useTranslation } from '../i18n/I18nContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function GoalsModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const goals = useSelector((state: RootState) => state.goals.goals);

  const [formVisible, setFormVisible] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState<number | null>(null);
  const [addAmount, setAddAmount] = useState('');

  const handleAddNew = () => {
    setFormVisible(true);
  };

  const handleDelete = (id: number) => {
    dispatch(deleteGoal(id));
  };

  const handleAddProgress = (id: number) => {
    const amount = parseFloat(addAmount.replace(/,/g, '.'));
    if (!isNaN(amount) && amount > 0) {
      dispatch(updateGoalProgress({ id, amount }));
      setActiveGoalId(null);
      setAddAmount('');
    }
  };

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
      paddingTop: Spacing.sm, paddingBottom: 40, height: '88%',
    },
    handle: {
      width: 44, height: 4, backgroundColor: colors.border,
      borderRadius: Radius.full, alignSelf: 'center', marginVertical: Spacing.sm,
    },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: Spacing.sm,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: Typography.lg, fontWeight: Typography.bold, color: colors.text },
    closeBtn: {
      width: 36, height: 36, borderRadius: Radius.full,
      backgroundColor: colors.surfaceLight, justifyContent: 'center',
      alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    },
    
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: colors.text },
    emptySub: { fontSize: Typography.sm, color: colors.textMuted, textAlign: 'center' },
    
    card: {
      backgroundColor: colors.surfaceLight, borderRadius: Radius.lg,
      padding: Spacing.md, borderWidth: 1, borderColor: colors.border,
      marginBottom: Spacing.md,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    cardTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: colors.text },
    cardDeadline: { fontSize: Typography.xs, color: colors.textMuted, marginTop: 2 },
    
    progressSection: { marginBottom: 16 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    progressText: { fontSize: Typography.sm, color: colors.text, fontWeight: Typography.semiBold },
    progressPercent: { fontSize: Typography.sm, color: colors.primary, fontWeight: Typography.bold },
    
    progressBarBg: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
    
    actionsRow: {
      flexDirection: 'row', alignItems: 'center', gap: 16,
      borderTopWidth: 1, borderTopColor: colors.border,
      paddingTop: 12,
    },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
    actionText: { fontSize: Typography.sm, fontWeight: Typography.semiBold },
    
    addFundsRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12,
    },
    addInput: {
      flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, color: colors.text,
    },
    addBtn: {
      backgroundColor: colors.success, paddingHorizontal: 16, paddingVertical: 10,
      borderRadius: Radius.md,
    },
    addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: Typography.sm },
    
    fab: {
      position: 'absolute', bottom: 40, right: Spacing.lg, left: Spacing.lg,
      backgroundColor: colors.primary, borderRadius: Radius.lg,
      paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
      ...Shadows.primary(colors.primary),
    },
    fabText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          
          <View style={s.header}>
            <View style={s.headerLeft}>
              <MaterialCommunityIcons name="target" size={24} color={colors.primary} />
              <Text style={s.title}>{t('goals_title')}</Text>
            </View>
            <Pressable style={s.closeBtn} onPress={onClose} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
            {goals.length === 0 ? (
              <View style={s.emptyState}>
                <MaterialCommunityIcons name="bullseye-arrow" size={64} color={colors.border} />
                <Text style={s.emptyTitle}>{t('goals_empty')}</Text>
                <Text style={s.emptySub}>{t('goals_empty_sub')}</Text>
              </View>
            ) : (
              goals.map((goal: Goal) => {
                const percent = Math.min(100, Math.max(0, (goal.currentAmount / goal.targetAmount) * 100));
                const isCompleted = percent >= 100;
                const isAdding = activeGoalId === goal.id;
                
                return (
                  <View key={goal.id} style={s.card}>
                    <View style={s.cardHeader}>
                      <View>
                        <Text style={s.cardTitle}>{goal.title}</Text>
                        <Text style={s.cardDeadline}>Échéance : {new Date(goal.deadline).toLocaleDateString('fr-GN')}</Text>
                      </View>
                      {isCompleted && <MaterialCommunityIcons name="check-decagram" size={24} color={colors.success} />}
                    </View>

                    <View style={s.progressSection}>
                      <View style={s.progressRow}>
                        <Text style={s.progressText}>{formatGNF(goal.currentAmount)} / {formatGNF(goal.targetAmount)}</Text>
                        <Text style={[s.progressPercent, isCompleted && { color: colors.success }]}>
                          {Math.round(percent)}%
                        </Text>
                      </View>
                      <View style={s.progressBarBg}>
                        <View style={[s.progressBarFill, { width: `${percent}%` }, isCompleted && { backgroundColor: colors.success }]} />
                      </View>
                    </View>

                    {!isAdding ? (
                      <View style={s.actionsRow}>
                        {!isCompleted && (
                          <Pressable style={s.actionBtn} onPress={() => { setActiveGoalId(goal.id); setAddAmount(''); }}>
                            <MaterialCommunityIcons name="plus-circle-outline" size={18} color={colors.success} />
                            <Text style={[s.actionText, { color: colors.success }]}>{t('goal_add_funds')}</Text>
                          </Pressable>
                        )}
                        <Pressable style={s.actionBtn} onPress={() => handleDelete(goal.id)}>
                          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
                          <Text style={[s.actionText, { color: colors.danger }]}>{t('goal_delete')}</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={s.addFundsRow}>
                        <TextInput
                          style={s.addInput}
                          placeholder="Montant à ajouter..."
                          placeholderTextColor={colors.textSubtle}
                          value={addAmount}
                          onChangeText={setAddAmount}
                          keyboardType="numeric"
                          autoFocus
                        />
                        <Pressable style={s.addBtn} onPress={() => handleAddProgress(goal.id)}>
                          <Text style={s.addBtnText}>{t('goal_validate')}</Text>
                        </Pressable>
                        <Pressable style={{ padding: 8 }} onPress={() => setActiveGoalId(null)}>
                          <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

          <Pressable style={s.fab} onPress={handleAddNew}>
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
            <Text style={s.fabText}>{t('goal_new')}</Text>
          </Pressable>
        </View>
      </View>

      <GoalForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
      />
    </Modal>
  );
}
