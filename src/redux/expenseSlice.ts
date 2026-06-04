import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Expense {
  id: number;
  category: string;
  amount: number;
  currency: string;
  description?: string;
  icon: string;
  date: string;
  status: 'real' | 'planned' | 'confirmed';
  type?: 'expense' | 'income';
}

interface Statistics {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  maxExpense: number;
  averageExpense: number;
  count: number;
}

interface ExpenseState {
  expenses: Expense[];
  statistics: Statistics;
  loading: boolean;
  error: string | null;
}

const initialState: ExpenseState = {
  expenses: [],
  statistics: { totalExpenses: 0, totalIncome: 0, balance: 0, maxExpense: 0, averageExpense: 0, count: 0 },
  loading: false,
  error: null,
};

const recalcStats = (expenses: Expense[]): Statistics => {
  const real = expenses.filter(e => e.status === 'real' || e.status === 'confirmed');
  const expenseAmounts = real.filter(e => !e.type || e.type === 'expense').map(e => e.amount);
  const incomeAmounts = real.filter(e => e.type === 'income').map(e => e.amount);
  
  const totalExpenses = expenseAmounts.reduce((a, b) => a + b, 0);
  const totalIncome = incomeAmounts.reduce((a, b) => a + b, 0);
  const balance = totalIncome - totalExpenses;

  const count = expenseAmounts.length;
  const maxExpense = expenseAmounts.length ? Math.max(...expenseAmounts) : 0;
  const averageExpense = count ? Math.round(totalExpenses / count) : 0;
  
  return { totalExpenses, totalIncome, balance, maxExpense, averageExpense, count };
};

const expenseSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    addExpense: (
      state,
      action: PayloadAction<Omit<Expense, 'id' | 'status'>>
    ) => {
      const newExpense: Expense = {
        ...action.payload,
        id: Date.now(),
        status: 'real',
      };
      state.expenses.unshift(newExpense);
      state.statistics = recalcStats(state.expenses);
    },

    addPlannedExpenses: (
      state,
      action: PayloadAction<Omit<Expense, 'id' | 'status'>[]>
    ) => {
      const planned: Expense[] = action.payload.map((exp, i) => ({
        ...exp,
        id: Date.now() + i,
        status: 'planned',
      }));
      state.expenses.unshift(...planned);
      state.statistics = recalcStats(state.expenses);
    },

    updateExpense: (state, action: PayloadAction<Expense>) => {
      const index = state.expenses.findIndex(e => e.id === action.payload.id);
      if (index !== -1) {
        state.expenses[index] = action.payload;
        state.statistics = recalcStats(state.expenses);
      }
    },

    confirmPlannedExpense: (
      state,
      action: PayloadAction<{ id: number; realAmount: number }>
    ) => {
      const index = state.expenses.findIndex(e => e.id === action.payload.id);
      if (index !== -1) {
        state.expenses[index].status = 'confirmed';
        state.expenses[index].amount = action.payload.realAmount;
        state.statistics = recalcStats(state.expenses);
      }
    },

    deleteExpense: (state, action: PayloadAction<number>) => {
      state.expenses = state.expenses.filter(e => e.id !== action.payload);
      state.statistics = recalcStats(state.expenses);
    },

    confirmAllPlannedForMonth: (state, action: PayloadAction<string>) => {
      state.expenses = state.expenses.map(e => {
        if (e.status === 'planned') {
          const parts = e.date.split('/');
          if (parts.length === 3) {
            const expMonthKey = `${parts[1].padStart(2, '0')}-${parts[2]}`;
            if (expMonthKey === action.payload) {
              return { ...e, status: 'confirmed' };
            }
          }
        }
        return e;
      });
      state.statistics = recalcStats(state.expenses);
    },
  },
});

export const {
  addExpense,
  addPlannedExpenses,
  updateExpense,
  confirmPlannedExpense,
  deleteExpense,
  confirmAllPlannedForMonth,
} = expenseSlice.actions;

export default expenseSlice.reducer;