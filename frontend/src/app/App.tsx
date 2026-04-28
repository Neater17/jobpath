import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/Layout";
import HomePage from "../pages/HomePage";
import CareerMapPage from "../pages/CareerMapPage";
import SkillMapPage from "../pages/SkillMapPage";
import SkillsOverview from "../pages/SkillsOverview";
import CareerSelectPage from "../pages/CareerSelectPage";
import ReviewResultsPage from "../pages/ReviewResultsPage";
import CareersPage from "../pages/CareersPage";
import FunctionalSkillsPage from "../pages/FunctionalSkillsPage";
import EnablingSkillPage from "../pages/EnablingSkillsPage";
import CareerOverview from "../pages/CareerOverview";
import SkillAssessmentPage from "../pages/SkillAssessmentPage";
import ReviewAssessmentPage from "../pages/ReviewAssessmentPage";
import FSCProficiencyLevelDescriptions from "../pages/FSCProficiencyLevelDescriptions";
import PQFLevelDescription from "../pages/PQFLevelDescription";
import CvUploadPage from "../pages/CvUploadPage";
import CvUploadResultsPage from "../pages/CvUploadResultsPage";
import HowItWorksPage from "../pages/HowItWorksPage";
import LoginPage from "../pages/LoginPage";
import CreateAccountPage from "../pages/CreateAccountPage";
import AccountPage from "../pages/AccountPage";
import RecoverPasswordPage from "../pages/RecoverPasswordPage";
import AboutUsPage from "../pages/AboutUsPage";
import CurriculumDevelopmentPage from "../pages/CurriculumDevelopmentPage";

export default function App() {
  return (
    <div className="bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 min-h-screen">
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/career-map" element={<CareerMapPage />} />
          <Route path="/skill-map" element={<SkillMapPage />} />
          <Route path="/career-select" element={<CareerSelectPage />} />
          <Route path="/cv-upload" element={<CvUploadPage />} />
          <Route path="/cv-upload/results" element={<CvUploadResultsPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/review-results" element={<ReviewResultsPage />} />
          <Route path="/careers/skills-assessment" element={<SkillAssessmentPage />} />
          <Route path="/careers/review-assessment" element={<ReviewAssessmentPage />} />
          <Route path="/careers/:careerId" element={<CareersPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/skills-overview" element={<SkillsOverview />} />
          <Route path="/functional-skills" element={<FunctionalSkillsPage/>} />
          <Route path="/enabling-skills" element={<EnablingSkillPage />} />
          <Route path="/careers-overview" element={<CareerOverview />} />
          <Route path="/FSCProficiencyLevelDescriptions" element={<FSCProficiencyLevelDescriptions />} />
          <Route path="/PQFLevelDescription" element={<PQFLevelDescription />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/create-account" element={<CreateAccountPage />} />
          <Route path="/recover-password" element={<RecoverPasswordPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/about-us" element={<AboutUsPage />} />
          <Route path="/curriculum-development" element={<CurriculumDevelopmentPage/>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </div>
  );
}
