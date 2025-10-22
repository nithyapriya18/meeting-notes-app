import { create } from 'zustand';
import type { Meeting, Action } from '../lib/supabase';

interface MeetingStore {
  currentMeeting: Partial<Meeting> | null;
  actions: Action[];
  setCurrentMeeting: (meeting: Partial<Meeting>) => void;
  updateMeeting: (updates: Partial<Meeting>) => void;
  setActions: (actions: Action[]) => void;
  addAction: (action: Action) => void;
  removeAction: (id: string) => void;
  clearCurrent: () => void;
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  currentMeeting: null,
  actions: [],
  
  setCurrentMeeting: (meeting) => set({ currentMeeting: meeting }),
  
  updateMeeting: (updates) =>
    set((state) => ({
      currentMeeting: state.currentMeeting
        ? { ...state.currentMeeting, ...updates }
        : null,
    })),
  
  setActions: (actions) => set({ actions }),
  
  addAction: (action) =>
    set((state) => ({
      actions: [...state.actions, action],
    })),
  
  removeAction: (id) =>
    set((state) => ({
      actions: state.actions.filter((action) => action.id !== id),
    })),
  
  clearCurrent: () => set({ currentMeeting: null, actions: [] }),
}));