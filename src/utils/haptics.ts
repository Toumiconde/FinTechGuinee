import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isNative = Platform.OS !== 'web';

export const haptic = {
  light:   () => isNative && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium:  () => isNative && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy:   () => isNative && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => isNative && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error:   () => isNative && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  select:  () => isNative && Haptics.selectionAsync(),
};
