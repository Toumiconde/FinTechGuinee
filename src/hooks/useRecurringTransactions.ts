import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { addExpense } from '../redux/expenseSlice';
import { markGenerated } from '../redux/recurringSlice';
import { getCurrentMonthKey } from '../utils/dateUtils';

export function useRecurringTransactions() {
  const dispatch = useDispatch();
  const recurringItems = useSelector((state: RootState) => state.recurring.items);
  const currentMonthKey = getCurrentMonthKey(); // e.g., '05-2026'

  useEffect(() => {
    const today = new Date();
    const currentDay = today.getDate();

    recurringItems.forEach((item: any) => {
      // Check if it's active and hasn't been generated this month
      if (item.active && item.lastGeneratedMonth !== currentMonthKey) {
        
        // For monthly recurring, check if today is past or equal to the dayOfPeriod
        if (item.frequency === 'monthly') {
          // If dayOfPeriod is greater than the max days in month, generate it on the last day
          const maxDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
          const targetDay = Math.min(item.dayOfPeriod, maxDaysInMonth);

          if (currentDay >= targetDay) {
            generateTransaction(item);
          }
        }
        
        // Note: For 'weekly', logic would be different. For simplicity, if we check and it's due, we generate it.
        // We'll focus mainly on monthly for standard budgeting.
      }
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurringItems, currentMonthKey, dispatch]);

  const generateTransaction = (item: any) => {
    // 1. Add to expenses
    dispatch(addExpense({
      category: item.category,
      amount: item.amount,
      currency: item.currency,
      description: `${item.name} (Automatique)`,
      icon: item.icon,
      date: new Date().toISOString(),
      type: item.type,
    }));

    // 2. Mark as generated for this month
    dispatch(markGenerated({ id: item.id, monthKey: currentMonthKey }));
  };
}
