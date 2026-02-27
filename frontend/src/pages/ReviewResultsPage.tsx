import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { defaultQuestions } from "../data/assessmentData";
import { useCareerStore } from "../store/careerStore";
import { roles, tracks } from "../data/careerData";


export default function ReviewResultsPage() {
  const navigate = useNavigate();
  const { selectedCareerId, activeTrack } = useCareerStore();

  const selectedCareer = useMemo(() => {
    return roles.find(role => role.Id === selectedCareerId);
  }, [selectedCareerId]);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-white mb-2">Your Career Assessment Results</h2>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        {/* Selected Career Performance */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6">Selected Career Performance</h3>
          
          <div className="mb-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-2xl font-bold text-white">{selectedCareer?.title || "Career Path"}</h4>
                <p className="text-gray-300 text-sm">{selectedCareer ? tracks[selectedCareer.trackStart - 1] : "Select a Career"}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-white">00%</p>
                <p className="text-gray-300 text-xs">Selected Match</p>
              </div>
            </div>

          {/* Nearest Alternatives */}
          <div>
            <p className="text-gray-300 text-sm font-semibold mb-3">Nearest Alternatives</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-blue-500/20 rounded-xl p-3">
                <div>
                  <p className="text-white font-semibold">SHOULD DISPLAY NEAREST ALTERNATIVES CAREER </p>
                  <p className="text-gray-400 text-xs">TRACK OF THE ALTERNATIVE CAREER</p>
                  <p className="text-gray-400 text-xs">NOTE: SHOULD ONLY BE ONE ABOVE OR IN THE SAME LEVEL</p>
                </div>
                <p className="text-white font-bold">83%</p>
              </div>
              <div className="flex justify-between items-center bg-blue-500/20 rounded-xl p-3">
                <div>
                  <p className="text-white font-semibold">SHOULD DISPLAY NEAREST ALTERNATIVES CAREER </p>
                  <p className="text-gray-400 text-xs">TRACK OF THE ALTERNATIVE CAREER</p>
                  <p className="text-gray-400 text-xs">NOTE: SHOULD ONLY BE ONE ABOVE OR IN THE SAME LEVEL</p>
                </div>
                <p className="text-white font-bold">83%</p>
              </div>
              <div className="flex justify-between items-center bg-blue-500/20 rounded-xl p-3">
                <div>
                  <p className="text-white font-semibold">SHOULD DISPLAY NEAREST ALTERNATIVES CAREER </p>
                  <p className="text-gray-400 text-xs">TRACK OF THE ALTERNATIVE CAREER</p>
                  <p className="text-gray-400 text-xs">NOTE: SHOULD ONLY BE ONE ABOVE OR IN THE SAME LEVEL</p>
                </div>
                <p className="text-white font-bold">83%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Development Gaps */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8">
        <h3 className="text-2xl font-bold text-white mb-6">Priority Development Gaps</h3>
        
        <div className="space-y-4">
          {/* Gap Item 1 */}
          <div className="bg-blue-500/20 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-lg font-semibold text-white">Collaboration and Delivery</h4>
              <p className="text-3xl font-bold text-white">47%</p>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <p className="text-gray-300">Current readiness: 46%</p>
              <p className="text-gray-300">Importance: 86%</p>
            </div>
            <p className="text-gray-200 text-sm mb-3">Improve cross-team coordination and delivery management.</p>
            <div className="space-y-2 pl-3 border-l-2 border-blue-400">
              <div className="text-sm">
                <p className="text-blue-300 font-medium">• Agile Project Management Fundamentals</p>
                <p className="text-gray-400 text-xs">6-week course | LinkedIn Learning</p>
              </div>
              <div className="text-sm">
                <p className="text-blue-300 font-medium">• Cross-functional Team Leadership</p>
                <p className="text-gray-400 text-xs">Self-paced | Coursera</p>
              </div>
            </div>
          </div>

          {/* Gap Item 2 */}
          <div className="bg-blue-500/20 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-lg font-semibold text-white">Role Mastery</h4>
              <p className="text-3xl font-bold text-white">46%</p>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <p className="text-gray-300">Current readiness: 57%</p>
              <p className="text-gray-300">Importance: 106%</p>
            </div>
            <p className="text-gray-200 text-sm mb-3">Build practical depth in core responsibilities of the target role.</p>
            <div className="space-y-2 pl-3 border-l-2 border-blue-400">
              <div className="text-sm">
                <p className="text-blue-300 font-medium">• Role-Specific Competency Training</p>
                <p className="text-gray-400 text-xs">4-week program | Internal Learning Portal</p>
              </div>
              <div className="text-sm">
                <p className="text-blue-300 font-medium">• Mentorship with Senior Team Members</p>
                <p className="text-gray-400 text-xs">Ongoing | 1-on-1 sessions</p>
              </div>
            </div>
          </div>

          {/* Gap Item 3 */}
          <div className="bg-blue-500/20 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-lg font-semibold text-white">SQL and Data Access</h4>
              <p className="text-3xl font-bold text-white">43%</p>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <p className="text-gray-300">Current readiness: 28%</p>
              <p className="text-gray-300">Importance: 60%</p>
            </div>
            <p className="text-gray-200 text-sm mb-3">Strengthen SQL querying and data extraction workflows.</p>
            <div className="space-y-2 pl-3 border-l-2 border-blue-400">
              <div className="text-sm">
                <p className="text-blue-300 font-medium">• Advanced SQL for Data Analysis</p>
                <p className="text-gray-400 text-xs">8-week course | DataCamp</p>
              </div>
              <div className="text-sm">
                <p className="text-blue-300 font-medium">• Database Design & Optimization</p>
                <p className="text-gray-400 text-xs">Self-paced | Udemy</p>
              </div>
            </div>
          </div>

          {/* Gap Item 4 */}
          <div className="bg-blue-500/20 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-lg font-semibold text-white">Responsible AI</h4>
              <p className="text-3xl font-bold text-white">36%</p>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <p className="text-gray-300">Current readiness: 64%</p>
              <p className="text-gray-300">Importance: 101%</p>
            </div>
            <p className="text-gray-200 text-sm mb-3">Apply fairness, safety, and governance checks in data/AI workflows.</p>
            <div className="space-y-2 pl-3 border-l-2 border-blue-400">
              <div className="text-sm">
                <p className="text-blue-300 font-medium">• AI Ethics and Responsible AI</p>
                <p className="text-gray-400 text-xs">6-week course | Fast.ai</p>
              </div>
              <div className="text-sm">
                <p className="text-blue-300 font-medium">• Data Governance Best Practices</p>
                <p className="text-gray-400 text-xs">Self-paced | CompTIA</p>
              </div>
            </div>
          </div>

          {/* Gap Item 5 */}
          <div className="bg-blue-500/20 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-lg font-semibold text-white">Leadership and Execution</h4>
              <p className="text-3xl font-bold text-white">32%</p>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <p className="text-gray-300">Current readiness: 57%</p>
              <p className="text-gray-300">Importance: 73%</p>
            </div>
            <p className="text-gray-200 text-sm mb-3">Lead priorities, resource decisions, and strategic execution.</p>
            <div className="space-y-2 pl-3 border-l-2 border-blue-400">
              <div className="text-sm">
                <p className="text-blue-300 font-medium">• Strategic Leadership for Managers</p>
                <p className="text-gray-400 text-xs">10-week program | Harvard ManageMentor</p>
              </div>
              <div className="text-sm">
                <p className="text-blue-300 font-medium">• Executive Decision Making</p>
                <p className="text-gray-400 text-xs">Self-paced | LinkedIn Learning</p>
              </div>
            </div>
          </div>

          {/* Gap Item 6 */}
          <div className="bg-blue-500/20 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-lg font-semibold text-white">Machine Learning</h4>
              <p className="text-3xl font-bold text-white">32%</p>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <p className="text-gray-300">Current readiness: 68%</p>
              <p className="text-gray-300">Importance: 100%</p>
            </div>
            <p className="text-gray-200 text-sm mb-3">Advance model development, evaluation, and validation capability.</p>
            <div className="space-y-2 pl-3 border-l-2 border-blue-400">
              <div className="text-sm">
                <p className="text-blue-300 font-medium">• Deep Learning Specialization</p>
                <p className="text-gray-400 text-xs">5-month program | Coursera</p>
              </div>
              <div className="text-sm">
                <p className="text-blue-300 font-medium">• Machine Learning Engineering</p>
                <p className="text-gray-400 text-xs">Self-paced | fast.ai</p>
              </div>
            </div>
          </div>
        </div>
      </div>

        
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-8 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition"
        >
          Back
        </button>
        <button
          type="button"
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition"
        >
          Submit
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="px-8 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition"
        >
          Start New
        </button>
      </div>
    </div>

  );
}