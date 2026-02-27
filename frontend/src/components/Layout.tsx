import React from "react";
import { Link, NavLink } from "react-router-dom";

type Props = { children: React.ReactNode };

export default function Layout({ children }: Props) {
  return (
    <>
      <header className="bg-white/10 backdrop-blur-md shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xl">JP</span>
              </div>
              <h1 className="text-2xl font-bold text-white">JOB-PATH</h1>
            </Link>

            <nav className="hidden md:flex space-x-6 justify-center flex-1">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive
                    ? "px-4 py-2 bg-white/20 text-white rounded-lg font-semibold"
                    : "px-4 py-2 text-white hover:bg-white/10 rounded-lg transition"
                }
              >
                HOME
              </NavLink>
              <a
                href="#"
                className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition"
              >
                How It Works
              </a>
              <a
                href="#"
                className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition"
              >
                About Us
              </a>
            </nav>

            <div className="flex items-center">
              <button
                type="button"
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-blue-100 transition"
                aria-label="Profile"
              >
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">{children}</main>

      <footer className="bg-white/10 backdrop-blur-md mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-white font-bold text-lg mb-4">About JOB-PATH</h4>
              <p className="text-white/70 text-sm">
                Empowering professionals to discover and navigate their ideal career paths in data and technology.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-white/70 hover:text-white text-sm transition">Home</Link></li>
                <li><a href="#" className="text-white/70 hover:text-white text-sm transition">How It Works</a></li>
                <li><Link to="/career-map" className="text-white/70 hover:text-white text-sm transition">Career Map</Link></li>
                <li><Link to="/skill-map" className="text-white/70 hover:text-white text-sm transition">Skills Map</Link></li>
                <li><Link to="/career-select" className="text-white/70 hover:text-white text-sm transition">Skill Assessment</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-white/70 hover:text-white text-sm transition">Career Guides</a></li>
                <li><a href="#" className="text-white/70 hover:text-white text-sm transition">Skill Development</a></li>
                <li><a href="#" className="text-white/70 hover:text-white text-sm transition">FAQ</a></li>
                <li><a href="#" className="text-white/70 hover:text-white text-sm transition">Support</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-4">Contact Us</h4>
              <ul className="space-y-2">
                <li className="text-white/70 text-sm">📧 info@jobpath.com</li>
                <li className="text-white/70 text-sm">📱 +1 234 567 8900</li>
                <li className="text-white/70 text-sm">📍 Tech Hub, Innovation St.</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 mt-8 pt-6 text-center">
            <p className="text-white/60 text-sm">© 2026 JOB-PATH. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
