import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { defaultQuestions } from "../data/assessmentData";


export default function ReviewResultsPage() {
  const navigate = useNavigate();


  return (
    <div>
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-white mb-2">Review Results</h2>
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
        <div className="mb-8 p-6 bg-blue-500/30 rounded-xl">

        </div>

        <div className="text-center mb-8">

          <p className="text-xl font-semibold text-white mt-2">Match Score</p>
        </div>

        <div className="flex justify-center gap-4">
          <button
            type="button"

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
            className="px-8 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition"
          >
            Start New
          </button>
        </div>
      </div>
    </div>
  );
}