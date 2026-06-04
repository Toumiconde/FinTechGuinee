import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal,
  TouchableWithoutFeedback, Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import { useTranslation } from '../i18n/I18nContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
  onRecurring: () => void;
  onGoals: () => void;
  /** Position hint from the header button */
  anchorRight?: number;
  anchorTop?: number;
}

export default function DataMenu({ visible, onClose, onExport, onImport, onRecurring, onGoals, anchorRight = 16, anchorTop = 60 }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const options = [
    {
      id: 'goals',
      icon: 'target',
      label: t('goals_label'),
      sub: t('goals_sub'),
      color: colors.warning,
      onPress: () => { onClose(); setTimeout(onGoals, 150); },
    },
    {
      id: 'recurring',
      icon: 'update',
      label: t('recurring_label'),
      sub: t('recurring_sub'),
      color: colors.primary,
      onPress: () => { onClose(); setTimeout(onRecurring, 150); },
    },
    {
      id: 'export',
      icon: 'file-export',
      label: t('export_label'),
      sub: t('export_sub'),
      color: colors.success,
      onPress: () => { onClose(); setTimeout(onExport, 150); },
    },
    {
      id: 'import',
      icon: 'file-import',
      label: t('import_label'),
      sub: t('import_sub'),
      color: colors.primary,
      onPress: () => { onClose(); setTimeout(onImport, 150); },
    },
  ];

  const s = StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    menu: {
      position: 'absolute',
      top: anchorTop,
      right: anchorRight,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.xs,
      minWidth: 230,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.md,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: Spacing.md,
      paddingVertical: 13,
    },
    menuDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: Spacing.md,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    itemLabel: {
      fontSize: Typography.base,
      fontWeight: Typography.semiBold,
      color: colors.text,
    },
    itemSub: {
      fontSize: Typography.xs,
      color: colors.textMuted,
      marginTop: 1,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.backdrop}>
          <View style={s.menu}>
            {options.map((opt, idx) => (
              <React.Fragment key={opt.id}>
                {idx > 0 && <View style={s.menuDivider} />}
                <Pressable
                  style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.6 }]}
                  onPress={opt.onPress}
                >
                  <View style={[s.iconWrap, { backgroundColor: `${opt.color}15` }]}>
                    <MaterialCommunityIcons name={opt.icon as any} size={20} color={opt.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemLabel}>{opt.label}</Text>
                    <Text style={s.itemSub}>{opt.sub}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textSubtle} />
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
