// import type { CareerPathKey } from "../data/careerData";

// export type AssessmentState = {
//   selectedPathKey: CareerPathKey | null;
//   selectedCareerName: string | null;
//   iHave: string[];     // question ids
//   iHaveNot: string[];  // question ids
// };

// const KEY = "jobpath_assessment_v1";

// export function loadAssessment(): AssessmentState {
//   try {
//     const raw = localStorage.getItem(KEY);
//     if (!raw) {
//       return { selectedPathKey: null, selectedCareerName: null, iHave: [], iHaveNot: [] };
//     }
//     const parsed = JSON.parse(raw) as AssessmentState;
//     return {
//       selectedPathKey: parsed.selectedPathKey ?? null,
//       selectedCareerName: parsed.selectedCareerName ?? null,
//       iHave: Array.isArray(parsed.iHave) ? parsed.iHave : [],
//       iHaveNot: Array.isArray(parsed.iHaveNot) ? parsed.iHaveNot : [],
//     };
//   } catch {
//     return { selectedPathKey: null, selectedCareerName: null, iHave: [], iHaveNot: [] };
//   }
// }

// export function saveAssessment(state: AssessmentState) {
//   localStorage.setItem(KEY, JSON.stringify(state));
// }

// export function clearAssessment() {
//   localStorage.removeItem(KEY);
// }