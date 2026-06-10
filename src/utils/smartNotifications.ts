import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Expense } from '../redux/expenseSlice';
import { formatGNF } from './currency';
import { getMonthKey } from './dateUtils';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface SmartNotificationConfig {
  budgetAlerts?: boolean;
  tontineReminders?: boolean;
  weeklyTips?: boolean;
  monthlyReports?: boolean;
}

export class SmartNotificationService {
  private config: SmartNotificationConfig = {
    budgetAlerts: true,
    tontineReminders: true,
    weeklyTips: true,
    monthlyReports: false,
  };

  async requestPermissions() {
    if (Platform.OS === 'web') {
      console.log('Web platform: push notifications not fully supported');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  }

  setConfig(config: Partial<SmartNotificationConfig>) {
    this.config = { ...this.config, ...config };
  }

  // Budget alert notifications
  async checkBudgetAlerts(expenses: Expense[], budgets: Record<string, number>) {
    if (!this.config.budgetAlerts) return;

    const currentMonthKey = getMonthKey(new Date().toLocaleDateString('fr-FR'));
    const monthExpenses = expenses.filter(e => getMonthKey(e.date) === currentMonthKey);

    for (const [category, limit] of Object.entries(budgets)) {
      if (limit <= 0) continue;

      const spent = monthExpenses
        .filter(e => (!e.type || e.type === 'expense') && e.category.toLowerCase() === category.toLowerCase())
        .reduce((sum, e) => sum + e.amount, 0);

      // Alert at 80% of budget
      if (spent >= limit * 0.8 && spent < limit) {
        await this.scheduleNotification({
          title: '️ Alerte Budget',
          body: `Vous avez dépensé ${formatGNF(spent)} sur ${formatGNF(limit)} pour ${category}. Il reste ${formatGNF(limit - spent)}.`,
          data: { type: 'budget_alert', category, spent, limit },
        });
      }
      // Alert when budget exceeded
      else if (spent > limit) {
        await this.scheduleNotification({
          title: ' Budget Dépassé',
          body: `Vous avez dépassé votre budget ${category} de ${formatGNF(spent - limit)} !`,
          data: { type: 'budget_exceeded', category, spent, limit },
        });
      }
    }
  }

  // Tontine reminder notifications
  async scheduleTontineReminders(amount: number, frequency: 'weekly' | 'monthly', dayOfWeek?: number, dayOfMonth?: number) {
    if (!this.config.tontineReminders) return;

    const title = ' Rappel Tontine';
    const body = `N'oubliez pas votre cotisation de ${formatGNF(amount)} pour la tontine !`;

    if (frequency === 'weekly' && dayOfWeek !== undefined) {
      const trigger: Notifications.WeeklyTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: dayOfWeek,
        hour: 9,
        minute: 0,
      };
      await this.scheduleNotification({ title, body, trigger, data: { type: 'tontine_reminder', amount } });
    } else if (frequency === 'monthly' && dayOfMonth !== undefined) {
      const trigger: Notifications.MonthlyTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: dayOfMonth,
        hour: 9,
        minute: 0,
      };
      await this.scheduleNotification({ title, body, trigger, data: { type: 'tontine_reminder', amount } });
    }
  }

  // Weekly financial tips
  async scheduleWeeklyTips() {
    if (!this.config.weeklyTips) return;

    const tips = [
      {
        title: ' Conseil de la semaine',
        body: 'Essayez la règle 50/30/20 : 50% pour les besoins, 30% pour les loisirs, 20% pour l\'épargne.',
      },
      {
        title: ' Astuce épargne',
        body: 'Automatisez votre épargne ! Programmez un virement automatique dès réception de votre salaire.',
      },
      {
        title: ' Objectif financier',
        body: 'Fixez-vous un objectif d\'épargne réaliste. Même 50,000 GNF par mois peut faire une grande différence.',
      },
      {
        title: ' Tontine intelligente',
        body: 'Utilisez votre tontine pour financer des actifs productifs, pas des dépenses de consommation.',
      },
      {
        title: ' Suivi des dépenses',
        body: 'Notez chaque dépense, même les petites. C\'est la clé pour prendre conscience de vos habitudes.',
      },
    ];

    // Schedule different tips for each day of the week
    for (let i = 0; i < tips.length; i++) {
      const trigger: Notifications.WeeklyTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: (i + 1) % 7 || 1,
        hour: 10,
        minute: 0,
      };
      await this.scheduleNotification({
        ...tips[i],
        trigger,
        data: { type: 'weekly_tip', tipIndex: i },
      });
    }
  }

  // Monthly report notification
  async scheduleMonthlyReport(dayOfMonth: number = 1) {
    if (!this.config.monthlyReports) return;

    await this.scheduleNotification({
      title: ' Rapport Mensuel Disponible',
      body: 'Votre rapport financier du mois dernier est prêt. Consultez-le dans l\'application !',
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: dayOfMonth,
        hour: 9,
        minute: 0,
      },
      data: { type: 'monthly_report' },
    });
  }

  // Generic notification scheduler
  async scheduleNotification(notification: {
    title: string;
    body: string;
    trigger?: Notifications.NotificationTriggerInput;
    data?: any;
  }) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: notification.trigger || null,
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  // Cancel all notifications
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Cancel specific notification type
  async cancelNotificationByType(type: string) {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.type === type) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }
}

export const smartNotificationService = new SmartNotificationService();