import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Goal {
  id: number;
  title: string;
  targetAmount: number; // amount target in local currency (GNF)
  currentAmount: number; // amount saved so far
  deadline: string; // ISO date string e.g., '2026-12-31'
  description?: string;
}

interface GoalsState {
  goals: Goal[];
}

const initialState: GoalsState = {
  goals: [],
};

const goalsSlice = createSlice({
  name: 'goals',
  initialState,
  reducers: {
    addGoal: (state, action: PayloadAction<Omit<Goal, 'id'>>) => {
      const newGoal: Goal = {
        ...action.payload,
        id: Date.now(),
        currentAmount: action.payload.currentAmount ?? 0,
      };
      state.goals.push(newGoal);
    },
    updateGoalProgress: (state, action: PayloadAction<{ id: number; amount: number }>) => {
      const goal = state.goals.find(g => g.id === action.payload.id);
      if (goal) {
        goal.currentAmount = Math.min(goal.currentAmount + action.payload.amount, goal.targetAmount);
      }
    },
    deleteGoal: (state, action: PayloadAction<number>) => {
      state.goals = state.goals.filter(g => g.id !== action.payload);
    },
    setGoals: (state, action: PayloadAction<Goal[]>) => {
      state.goals = action.payload;
    },
  },
});

export const { addGoal, updateGoalProgress, deleteGoal, setGoals } = goalsSlice.actions;
export default goalsSlice.reducer;
