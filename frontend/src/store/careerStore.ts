import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { tracks } from '../data/careerData';
import { Question } from '../data/assessmentData';

export interface CareerStore {
  activeTrack: string;
  selectedPathIdx: number | null;
  selectedCareerPath: string;
  selectedCareerId: string;
  assessmentResults: {
    iHave: Question[];
    iHaveNot: Question[];
  };
  setActiveTrack: (track: string) => void;
  setSelectedPathIdx: (idx: number | null) => void;
  setSelectedCareerPath: (path: string) => void;
  setSelectedCareerId: (careerId: string) => void;
  setAssessmentResults: (iHave: Question[], iHaveNot: Question[]) => void;
  clearAssessmentResults: () => void;
}

export const useCareerStore = create<CareerStore, [["zustand/persist", CareerStore]]>(
  persist(
    (set) => ({
      activeTrack: tracks[0] ?? '',
      selectedPathIdx: 0,
      selectedCareerPath: '',
      selectedCareerId: '',
      assessmentResults: {
        iHave: [],
        iHaveNot: [],
      },
      setActiveTrack: (track: string) => set({ activeTrack: track }),
      setSelectedPathIdx: (idx: number | null) => set({ selectedPathIdx: idx }),
      setSelectedCareerPath: (path: string) => set({ selectedCareerPath: path }),
      setSelectedCareerId: (careerId: string) => set({ selectedCareerId: careerId }),
      setAssessmentResults: (iHave: Question[], iHaveNot: Question[]) =>
        set({ assessmentResults: { iHave, iHaveNot } }),
      clearAssessmentResults: () =>
        set({ assessmentResults: { iHave: [], iHaveNot: [] } }),
    }),
    {
      name: 'career-store',
    }
  )
);
