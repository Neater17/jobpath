import React from "react";
import { Link } from "react-router-dom";
import mongayaImage from "../assests/images/mongaya.jpg";
import velascoImage from "../assests/images/velasco.jpg";
import silvaImage from "../assests/images/silva.jpg";
import tobiasImage from "../assests/images/tobias.jpg";

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
    bio: "Hi! I’m Jeanne Maverick Velasco, short for Mav, a Computer Science student with specialization in Data Science. I love exploring new technologies and applying them to solve real-world problems. When I'm not coding, you can find me playing video games or cycling around town.",
    imageSrc: velascoImage,
  },
];

export default function AboutUsPage() {
  return (
    <div className="space-y-8 py-4">
      <section className="overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg md:p-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100/85">
              About Us
            </p>
            <h1 className="mt-3 text-4xl font-bold text-white md:text-5xl">
              Meet the Researchers Behind JOB-PATH
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-white/85">
              JOB-PATH is built to make career discovery more understandable,
              evidence-based, and practical. This page is ready for your team
              details, researcher photos, and the story behind the system.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-2 self-start rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white/90 shadow-md transition hover:bg-white/25 hover:text-white"
          >
            <span className="text-lg" aria-hidden="true">
              {"<-"}
            </span>
            Back to Home
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
            Project Mission
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            Why We Built JOB-PATH
          </h2>
          <p className="mt-4 leading-8 text-white/80">
            JOB-PATH helps users explore career alignment through guided
            assessment answers and CV-derived signals. It highlights
            recommendation reasoning, surfaces development gaps, and organizes
            alternative roles into a clearer path forward.
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
            Project Vision
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            Where We Want JOB-PATH To Grow
          </h2>
          <p className="mt-4 leading-8 text-white/80">
            Our vision is for JOB-PATH to become a trusted career discovery
            companion that helps users understand where they currently stand,
            what skills they should build next, and what roles may fit them
            best through clearer, evidence-based guidance.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
              Gray Men
            </h2>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {researchers.map((researcher, index) => (
            <article
              key={researcher.id}
              className="group overflow-hidden rounded-[1.75rem] border border-white/15 bg-slate-950/20 shadow-xl transition hover:-translate-y-1 hover:border-cyan-200/35"
            >
              <div className="relative h-72 overflow-hidden bg-gradient-to-br from-cyan-300/30 via-sky-500/25 to-blue-950/55">
                {researcher.imageSrc ? (
                  <img
                    src={researcher.imageSrc}
                    alt={researcher.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/25 bg-white/10 text-3xl font-bold text-white shadow-lg">
                      {index + 1}
                    </div>
                    <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100/85">
                      Image
                    </p>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 to-transparent" />
              </div>

              <div className="space-y-4 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/75">
                    {researcher.role}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-white">
                    {researcher.name}
                  </h3>
                </div>
                <p className="text-sm leading-7 text-white/78">
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
