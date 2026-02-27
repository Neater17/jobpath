import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { tracks } from '../data/careerData';

export interface CareerStore {
  activeTrack: string;
  selectedPathIdx: number | null;
  selectedCareerPath: string;
  selectedCareerId: string;
  setActiveTrack: (track: string) => void;
  setSelectedPathIdx: (idx: number | null) => void;
  setSelectedCareerPath: (path: string) => void;
  setSelectedCareerId: (careerId: string) => void;
}

export const useCareerStore = create<CareerStore, [["zustand/persist", CareerStore]]>(
  persist(
    (set) => ({
      activeTrack: tracks[0] ?? '',
      selectedPathIdx: 0,
      selectedCareerPath: '',
      selectedCareerId: '',
      setActiveTrack: (track: string) => set({ activeTrack: track }),
      setSelectedPathIdx: (idx: number | null) => set({ selectedPathIdx: idx }),
      setSelectedCareerPath: (path: string) => set({ selectedCareerPath: path }),
      setSelectedCareerId: (careerId: string) => set({ selectedCareerId: careerId }),
    }),
    {
      name: 'career-store',
    }
  )
);
