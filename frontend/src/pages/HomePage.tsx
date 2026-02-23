import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="py-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 mb-8">
        <div className="max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Discover Your Career Path
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Navigate your professional journey with personalized career insights and skill assessments. Let us help you map out your future in the data and technology field.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => navigate("/career-select")}
              className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-blue-50 transition shadow-lg"
            >
              Get Started
            </button>
            <button
              type="button"
              className="px-8 py-4 bg-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/30 transition border-2 border-white/50"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Career Map */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:bg-white/15 transition">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-400/30 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white">Career Map</h3>
          </div>
          <p className="text-white/80 mb-6">
            Explore different career paths and progression levels in the data and technology industry.
          </p>
          <Link
            to="/career-map"
            className="block text-center w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg"
          >
            View
          </Link>
        </div>
        
        {/*Skills Map */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:bg-white/15 transition">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-400/30 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white">Skills Map</h3>
          </div>
          <p className="text-white/80 mb-6">
            Discover the essential skills required for each career path and assess your proficiency.
          </p>
          <Link
            to="/skill-map"
            className="block text-center w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg"
          >
            View
          </Link>
        </div>
      </div>

      {/* Careers */}
      <div className="grid md:grid-cols-2 gap-6 pt-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:bg-white/15 transition">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-400/30 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white">Careers</h3>
          </div>
          <p className="text-white/80 mb-6">
            Explore different careers and their definitions in the data and technology industry.
          </p>
          <Link
            to="/careers-list"
            className="block text-center w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg"
          >
            View
          </Link>
        </div>
        
        {/*Skills List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:bg-white/15 transition">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-400/30 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white">Skills List</h3>
          </div>
          <p className="text-white/80 mb-6">
            Discover skills and their levels across various career paths.
          </p>
          <Link
            to="/skills-list"
            className="block text-center w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
