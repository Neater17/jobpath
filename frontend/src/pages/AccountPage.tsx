import React from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { logoutUser } from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function AccountPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const setUser = useAuthStore((state) => state.setUser);

  if (!hydrated) {
    return <div className="py-8 text-center text-white/80">Loading account...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.firstName ||
    "User";

  const handleLogout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      navigate("/login");
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-4">
      <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
        <section className="bg-gradient-to-r from-blue-900 via-blue-700 to-cyan-500 px-8 py-10 text-white md:px-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">
            Account
          </p>
          <h1 className="mt-3 text-4xl font-bold">{displayName}</h1>
          <p className="mt-3 max-w-2xl text-white/85">
            Manage your JOB-PATH account details and review the information
            currently stored for your profile.
          </p>
        </section>

        <section className="grid gap-6 p-8 md:grid-cols-[1.2fr_0.8fr] md:p-12">
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-lg font-bold text-slate-900">Profile Details</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    First name
                  </p>
                  <p className="mt-1 text-base font-medium text-slate-900">
                    {user.firstName || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Last name
                  </p>
                  <p className="mt-1 text-base font-medium text-slate-900">
                    {user.lastName || "Not provided"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Email address
                  </p>
                  <p className="mt-1 text-base font-medium text-slate-900">
                    {user.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Gender
                  </p>
                  <p className="mt-1 text-base font-medium text-slate-900">
                    {user.gender || "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
              <div className="mt-5 space-y-3">
                <Link
                  to="/career-select"
                  className="block rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
                >
                  Continue Assessment
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-600"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
