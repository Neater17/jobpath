import React from "react";
import { Link } from "react-router-dom";
import mongayaImage from "../assets/images/mongaya.jpg";
import velascoImage from "../assets/images/velasco.jpg";
import silvaImage from "../assets/images/silva.jpg";
import tobiasImage from "../assets/images/tobias.jpg";

type ResearcherProfile = {
  id: string;
  name: string;
  role: string;
  bio: string;
  imageSrc?: string;
};

const researchers: ResearcherProfile[] = [
  {
    id: "researcher-1",
    name: "Aaron Rodge O. Silva",
    role: "Project Manager",
    bio: "I’m Aaron Rodge Silva, a Data Science student passionate about analyzing data and building smart solutions. I enjoy learning new technologies and applying them to real-world problems, and I stay disciplined and focused through boxing.",
    imageSrc: silvaImage,
  },
  {
    id: "researcher-2",
    name: "Dwayne Carmelo M. Mongaya",
    role: "Developer",
    bio: "Hello! I'm Dwayne Carmelo Mongaya (Melo), a third-year Computer Science student specializing in Data Science. I enjoy coding and learning more about data science, as well as staying active through running.",
    imageSrc: mongayaImage,
  },
  {
    id: "researcher-3",
    name: "Fitz Troy R. Tobias",
    role: "Developer",
    bio: "Hi! I’m Fitz Troy Tobias, Fitz for short. I’m a Computer Science major specializing in Data Science. I enjoy playing sports and online games, and I’m into anything related to film, music, and tech.",
    imageSrc: tobiasImage,
  },
  {
    id: "researcher-4",
    name: "Jeanne Maverick V. Velasco",
    role: "Developer",
    bio: "Hi! I’m Mav, short for Jeanne Maverick, a Computer Science student with specialization in Data Science. I love exploring new technologies and applying them to solve real-world problems. When I'm not coding, you can find me playing video games or cycling around town.",
    imageSrc: velascoImage,
  },
];

export default function AboutUsPage() {
  return (
    <div className="space-y-8 py-4">
      <section className="overflow-hidden rounded-[2rem] border border-slate-500 bg-[linear-gradient(50deg,#010C34,#071854)] p-8 shadow-2xl backdrop-blur-lg md:p-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-5xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-light-accent-blue/85">
              About Us
            </p>
            <h1 className="mt-3 text-4xl font-bold text-light-text md:text-5xl">
              Meet the Researchers Behind JOB-PATH
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-light-text/85">
              JOB-PATH is built to make career discovery more understandable,
              evidence-based, and practical. This page is ready for your team
              details, researcher photos, and the story behind the system.
            </p>
          </div>

          <Link
            to="/"
            className="back-button"
          >
            <span className="text-lg" aria-hidden="true">
              <svg className= "w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
            </span>
            Back to Home
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-500 bg-[linear-gradient(135deg,#010C34,#071854)] p-8 shadow-2xl backdrop-blur-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-light-accent-blue/80">
            Project Mission
          </p>
          <h2 className="mt-3 text-3xl font-bold text-light-text">
            Why We Built JOB-PATH
          </h2>
          <p className="mt-4 leading-8 text-light-text/80">
            JOB-PATH helps users explore career alignment through guided
            assessment answers and CV-derived signals. It highlights
            recommendation reasoning, surfaces development gaps, and organizes
            alternative roles into a clearer path forward.
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-500 bg-[linear-gradient(45deg,#071854,#010C34)] p-8 shadow-2xl backdrop-blur-lg md:p-12 transition hover:bg-[#A1A6DB]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-light-accent-blue/80">
            Project Vision
          </p>
          <h2 className="mt-3 text-3xl font-bold text-light-text">
            Where We Want JOB-PATH To Grow
          </h2>
          <p className="mt-4 leading-8 text-light-text/80">
            Our vision is for JOB-PATH to become a trusted career discovery
            companion that helps users understand where they currently stand,
            what skills they should build next, and what roles may fit them
            best through clearer, evidence-based guidance.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-500 bg-[linear-gradient(180deg,#071854,#010C34)] p-8 shadow-2xl backdrop-blur-lg md:p-12 transition hover:bg-[#A1A6DB]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold uppercase tracking-[0.18em] text-light-accent-blue/80">
              Gray Men
            </h2>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {researchers.map((researcher, index) => (
            <article
              key={researcher.id}
              className="group overflow-hidden rounded-[1.75rem] border border-light-text/15 bg-navy-bg/55 shadow-xl transition hover:-translate-y-1 hover:border-light-accent-blue/40"
            >
              <div className="relative h-72 overflow-hidden bg-gradient-to-br from-light-accent-blue/25 via-primary-blue/30 to-deep-bg/80">
                {researcher.imageSrc ? (
                  <img
                    src={researcher.imageSrc}
                    alt={researcher.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border border-light-text/25 bg-card-bg/40 text-3xl font-bold text-light-text shadow-lg">
                      {index + 1}
                    </div>
                    <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-light-accent-blue/85">
                      Image
                    </p>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-deep-bg/85 to-transparent" />
              </div>

              <div className="space-y-4 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-light-accent-blue/75">
                    {researcher.role}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-light-text">
                    {researcher.name}
                  </h3>
                </div>
                <p className="text-sm leading-7 text-light-text/78">
                  {researcher.bio}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
