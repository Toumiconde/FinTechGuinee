import { create } from 'zustand';
import { Expense } from '../redux/expenseSlice';

interface ExpenseState {
  expenses: Expense[];
  addExpense: (expense: Expense) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: number) => void;
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  expenses: [],
  addExpense: (expense) => set((state) => ({ expenses: [expense, ...state.expenses] })),
  updateExpense: (expense) => set((state) => ({
    expenses: state.expenses.map((exp) => exp.id === expense.id ? expense : exp)
  })),
  deleteExpense: (id) => set((state) => ({
    expenses: state.expenses.filter((exp) => exp.id !== id)
  })),
}));
