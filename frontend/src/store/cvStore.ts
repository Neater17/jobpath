import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CvAnalysisResponse } from "../services/api";

interface CvStore {
  cvText: string;
  uploadedFileName: string | null;
  analysis: CvAnalysisResponse | null;
  setDraft: (cvText: string, uploadedFileName: string | null) => void;
  setAnalysis: (analysis: CvAnalysisResponse | null) => void;
  clearCvSession: () => void;
}

export const useCvStore = create<CvStore, [["zustand/persist", CvStore]]>(
  persist(
    (set) => ({
      cvText: "",
      uploadedFileName: null,
      analysis: null,
      setDraft: (cvText, uploadedFileName) => set({ cvText, uploadedFileName }),
      setAnalysis: (analysis) => set({ analysis }),
      clearCvSession: () =>
        set({
          cvText: "",
          uploadedFileName: null,
          analysis: null,
        }),
    }),
    {
      name: "cv-store",
    }
  )
);
