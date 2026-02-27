import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SkillsStore {
  activeTab: 'functional' | 'enabling';
  sortKey: 'code' | 'skill' | 'category' | 'relatedCategory';
  sortDir: 'asc' | 'desc';
  setActiveTab: (tab: 'functional' | 'enabling') => void;
  setSortKey: (key: 'code' | 'skill' | 'category' | 'relatedCategory') => void;
  setSortDir: (dir: 'asc' | 'desc') => void;
  handleSort: (nextKey: 'code' | 'skill' | 'category' | 'relatedCategory') => void;
}

export const useSkillsStore = create<SkillsStore, [["zustand/persist", SkillsStore]]>(
  persist(
    (set) => ({
      activeTab: 'functional',
      sortKey: 'skill',
      sortDir: 'asc',
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSortKey: (key) => set({ sortKey: key }),
      setSortDir: (dir) => set({ sortDir: dir }),
      handleSort: (nextKey) =>
        set((state) => {
          if (state.sortKey === nextKey) {
            return { sortDir: state.sortDir === 'asc' ? 'desc' : 'asc' };
          }
          return { sortKey: nextKey, sortDir: 'asc' };
        }),
    }),
    {
      name: 'skills-store',
    }
  )
);
