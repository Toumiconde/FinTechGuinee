import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView, Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import { deleteRecurring, toggleRecurring, RecurringTransaction } from '../redux/recurringSlice';
import { useTheme } from '../context/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import { formatGNF } from '../utils/currency';
import RecurringForm from './RecurringForm';
import { useTranslation } from '../i18n/I18nContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function RecurringModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const dispatch = useDispatch();
  const items = useSelector((state: RootState) => state.recurring.items);

  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);

  const handleAddNew = () => {
    setEditingItem(null);
    setFormVisible(true);
  };

  const handleEdit = (item: RecurringTransaction) => {
    setEditingItem(item);
    setFormVisible(true);
  };

  const handleDelete = (id: number) => {
    dispatch(deleteRecurring(id));
  };

  const handleToggle = (id: number) => {
    dispatch(toggleRecurring(id));
  };

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
      paddingTop: Spacing.sm, paddingBottom: 40, height: '85%',
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
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    iconWrap: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    cardName: { fontSize: Typography.base, fontWeight: Typography.bold, color: colors.text },
    
    cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    infoCol: { flex: 1 },
    amountText: { fontSize: Typography.lg, fontWeight: Typography.bold },
    metaText: { fontSize: Typography.sm, color: colors.textMuted, marginTop: 4 },
    
    actionsRow: {
      flexDirection: 'row', alignItems: 'center', gap: 16,
      borderTopWidth: 1, borderTopColor: colors.border,
      marginTop: 12, paddingTop: 12,
    },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionText: { fontSize: Typography.sm, fontWeight: Typography.semiBold },
    
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
              <MaterialCommunityIcons name="update" size={24} color={colors.primary} />
              <Text style={s.title}>{t('recurring_label')}</Text>
            </View>
            <Pressable style={s.closeBtn} onPress={onClose} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
            {items.length === 0 ? (
              <View style={s.emptyState}>
                <MaterialCommunityIcons name="calendar-sync" size={64} color={colors.border} />
                <Text style={s.emptyTitle}>{t('recurring_empty')}</Text>
                <Text style={s.emptySub}>{t('recurring_empty_sub')}</Text>
              </View>
            ) : (
              items.map((item: any) => {
                const isIncome = item.type === 'income';
                const mainColor = isIncome ? colors.success : colors.danger;
                
                return (
                  <View key={item.id} style={[s.card, !item.active && { opacity: 0.6 }]}>
                    <View style={s.cardHeader}>
                      <View style={s.cardTitleRow}>
                        <View style={[s.iconWrap, { backgroundColor: `${mainColor}15` }]}>
                          <MaterialCommunityIcons name={item.icon as any} size={16} color={mainColor} />
                        </View>
                        <Text style={s.cardName}>{item.name}</Text>
                      </View>
                      <Switch
                        value={item.active}
                        onValueChange={() => handleToggle(item.id)}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor="#fff"
                      />
                    </View>

                    <View style={s.cardBody}>
                      <View style={s.infoCol}>
                        <Text style={[s.amountText, { color: mainColor }]}>
                          {isIncome ? '+' : '-'}{formatGNF(item.amount)}
                        </Text>
                        <Text style={s.metaText}>
                          {item.frequency === 'monthly' ? (language === 'en' ? `The ${item.dayOfPeriod} of the month` : `Le ${item.dayOfPeriod} du mois`) : (language === 'en' ? 'Every week' : 'Chaque semaine')}
                        </Text>
                      </View>
                    </View>

                    <View style={s.actionsRow}>
                      <Pressable style={s.actionBtn} onPress={() => handleEdit(item)}>
                        <MaterialCommunityIcons name="pencil" size={16} color={colors.primary} />
                        <Text style={[s.actionText, { color: colors.primary }]}>{t('goal_edit_title').replace('l\'', '')}</Text>
                      </Pressable>
                      <Pressable style={s.actionBtn} onPress={() => handleDelete(item.id)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
                        <Text style={[s.actionText, { color: colors.danger }]}>{t('goal_delete')}</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <Pressable style={s.fab} onPress={handleAddNew}>
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
            <Text style={s.fabText}>{t('recurring_new')}</Text>
          </Pressable>
        </View>
      </View>

      <RecurringForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        initialData={editingItem}
      />
    </Modal>
  );
}
