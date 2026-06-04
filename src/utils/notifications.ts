import { Platform } from 'react-native';

// Behavior when a notification is received while the app is foregrounded
// We use a try-catch and dynamic require because expo-notifications 
// throws an error at the top level in Expo Go on Android (SDK 53+).
let Notifications: any = null;

try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (error) {
  console.warn("expo-notifications n'a pas pu être chargé. Les notifications peuvent ne pas fonctionner dans Expo Go.");
}

/**
 * Requests permission for notifications.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web' || !Notifications) return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (e) {
    console.warn("Erreur lors de la demande de permission", e);
    return false;
  }
}

/**
 * Schedules a daily reminder at a specific hour and minute.
 * Default is 20:00 (8:00 PM).
 */
export async function scheduleDailyReminder(hour: number = 20, minute: number = 0) {
  if (Platform.OS === 'web' || !Notifications) return;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  try {
    // Clear existing notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "FinTech Guinée 💰",
        body: "N'oubliez pas d'enregistrer vos dépenses de la journée pour garder votre budget à jour !",
        sound: true,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      } as any,
    });
  } catch (e) {
    console.warn("Erreur lors de la planification", e);
  }
}

/**
 * Cancels all scheduled notifications.
 */
export async function cancelAllNotifications() {
  if (Platform.OS === 'web' || !Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {}
}
