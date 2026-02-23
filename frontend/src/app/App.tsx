import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/Layout";
import HomePage from "../pages/HomePage";
import CareerMapPage from "../pages/CareerMapPage";
import SkillMapPage from "../pages/SkillMapPage";
import SkillsList from "../pages/SkillsList";
import CareerSelectPage from "../pages/CareerSelectPage";
import ReviewResultsPage from "../pages/ReviewResultsPage";
import CareersPage from "../pages/CareersPage";
import FunctionalSkillsPage from "../pages/FunctionalSkillsPage";
import EnablingSkillPage from "../pages/EnablingSkillsPage";
import CareersList from "../pages/CareersList";

export default function App() {
  return (
    <div className="bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 min-h-screen">
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/career-map" element={<CareerMapPage />} />
          <Route path="/skill-map" element={<SkillMapPage />} />
          <Route path="/career-select" element={<CareerSelectPage />} />
          <Route path="/review-results" element={<ReviewResultsPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/skills-list" element={<SkillsList />} />
          <Route path="/functional-skills-page" element={<FunctionalSkillsPage/>} />
          <Route path="/enabling-skills-page" element={<EnablingSkillPage />} />
          <Route path="/careers/:careerId" element={<CareersPage />} />
          <Route path="/careers-list" element={<CareersList />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </div>
  );
}
