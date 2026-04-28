import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const addieSteps = [
    {
        letter: "A",
        label: "Analysis",
    },
    {
        letter: "D",
        label: "Design",
    },
    {
        letter: "D",
        label: "Development",
    },
    {
        letter: "I",
        label: "Implementation",
    },
    {
        letter: "E",
        label: "Evaluation",
    },
];

const stepOneFlow = [
    {
        topLabel: "",
        title: "Establish Targeted Job for Review",
        bottomLabel: "Career Map",
        bottomLabelTo: "/career-map",
    },
    {
        topLabel: "Skills Map",
        topLabelTo: "/skill-map",
        title: "Determine Performance Requirement for Job Role",
        bottomLabel: "",
    },
    {
        topLabel: "Overview of ESCs",
        topLabelTo: "/skills-overview?tab=enabling",
        title: "Identify Abilities and Skills Required to Support Performance Requirement",
        bottomLabel: "FSC Reference",
        bottomLabelTo: "/skills-overview?tab=functional",
    },
];

type ABCDProfile = {
  id: string;
  name: string;
  bio: string[];
};

const ABCD: ABCDProfile[] = [
  {
    id: "A",
    name: "Audience",
    bio: ["Describe the intended learner or end user of the instruction","Often the audience is identified only in the first level of objective because of redundancy","Example: The data scientist..."],
  },
  {
    id: "B",
    name: "Behavior",
    bio: ["Describe learner capability","Must be observable and measurable (you will define the measuerment elsewhere in the goal)", "In the FSC Document, it is the Skills Application Statements","The \"behavior\" can include demonstration of knowledge or skills in any of the domains of learning: cognitive, psychomotor, affective, or interpersonal","Example: ...should be able to identify appropriate statistical algorithm"],

  },
  {
    id: "C",
    name: "Conditions or Context",
    bio: ["Equipment or tools that may (or may not) be utilized in completion of the behavior","Environmental conditions may also be included", "Example: ... using advanced computational methods"],
  },
  {
    id: "D",
    name: "Degree",
    bio: ["States the standard for acceptable performance (time, accuracy, proportion, quality, etc.)","Example: ... within an acceptable accuracy rate"],
  },
];

export default function CurriculumDevelopmentPage() {
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const referenceLinkClass =
        "inline-flex items-center justify-center rounded-full border border-white/60 px-4 py-1.5 text-base font-semibold text-white transition hover:border-cyan-100 hover:bg-white/10 hover:text-cyan-100";
    const tableReferenceLinkClass =
        "font-semibold text-cyan-100 underline decoration-cyan-100/60 underline-offset-4 transition hover:text-white hover:decoration-white";

    useEffect(() => {
        if (!toastMessage) return;

        const timeoutId = window.setTimeout(() => {
            setToastMessage(null);
        }, 2500);

        return () => window.clearTimeout(timeoutId);
    }, [toastMessage]);

    return (
        <div className="space-y-8 py-4">
            {toastMessage ? (
                <div className="fixed left-1/2 top-6 z-[100] w-[min(92vw,32rem)] -translate-x-1/2 rounded-3xl border border-cyan-300/40 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 p-[1px] shadow-[0_20px_60px_rgba(37,99,235,0.4)]">
                    <div className="flex items-start gap-3 rounded-[calc(1.5rem-1px)] bg-slate-950/90 px-5 py-4 text-white backdrop-blur-md">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-lg text-cyan-200">
                            !
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                                Notice
                            </div>
                            <div className="mt-1 text-base font-semibold leading-6 text-white">
                                {toastMessage}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setToastMessage(null)}
                            className="ml-auto rounded-full px-2 py-1 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                            aria-label="Dismiss notification"
                        >
                            X
                        </button>
                    </div>
                </div>
            ) : null}
            <section className="overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg md:p-10">
                
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-4xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100/85">
                            Curriculum Development
                        </p>
                        <h1 className="mt-3 text-4xl font-bold text-white md:text-5xl">
                            Develop a Program or Curriculum Outline from Skills Framework
                        </h1>
                        <p className="mt-4 max-w-3xl text-lg leading-8 text-white/85">
                            Use the Philippine Skills Framework to build or realign curricula with
                            industry requirements through a clearer, faster, and more practical
                            development process.
                        </p>
                    </div>

                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 self-start rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white/90 shadow-md transition hover:bg-white/25 hover:text-white"
                    >
                        <span className="text-lg" aria-hidden="true">
                            {"←"}
                        </span>
                        Back to Home
                    </Link>
                </div>
            </section>

            <section className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
                    Overview
                </p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                    Why the PSF is useful for curriculum development
                </h2>
                <p className="mt-4 text-lg leading-8 text-white/80">
                    The Philippine Skills Framework (PSF) is especially useful for the academe to
                    develop curricula and/or realign existing curricula to industry requirements.
                    The current best-practices of academe in developing industry-relevant
                    curricula are tedious. They usually involve a faculty team having to first
                    develop the curricula based on internal academic syllabus and teams, and then
                    convening an industry panel to validate the curricula.
                </p>
                <p className="mt-4 text-lg leading-8 text-white/80">
                    That process can be cumbersome because many faculties do not have strong
                    industry connections. Even if every academic institution were able to reach out
                    to industries, stakeholders may experience engagement fatigue and become
                    hesitant to participate. The PSF helps solve this by providing a shared
                    industry skills language that institutions can use directly to create
                    industry-aligned curricula and reduce development time.
                </p>
            </section>

            <section className="grid gap-6">
                <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
                        ADDIE Model
                    </p>
                    <h2 className="mt-3 text-3xl font-bold text-white">
                        Using ADDIE with PSF On Curriculum Design
                    </h2>

                    <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_3fr]">
                        <div className="space-y-4">
                            {addieSteps.map((step) => (
                                <div key={`${step.letter}-${step.label}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-cyan-200/25 bg-cyan-300/10 text-xl font-bold text-cyan-100 shadow-sm">
                                            {step.letter}
                                        </div>
                                        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white sm:text-base">
                                            {step.label}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div>
                            <p className="text-lg leading-8 text-white/80">
                                ADDIE is a holistic impact-oriented methodology which can be implemented with the PSF. In the ADDIE model, the analysis phase looks at analyzing the learning needs of the learners based on the knowledge and skills required for the task or function to be done, as well as the profile of the learner. This will be followed by design of the curriculum, which will focus on the pedagogy to transmit the contents. Development phase refers to organizing and developing the courseware which can then be implemented or delivered. Evaluation is a post-training phase which serves to gauge the output of the training. ADDIE is an acronym for Analysis, Design, Development, Implementation, and Evaluation.
                            </p>

                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
                    STEP 1
                </p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                    Gather Critical Job or Content Information for Curriculum Development
                </h2>
                <div className="mt-8 px-6 py-8 text-white">
                    <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                        {stepOneFlow.map((item, index) => (
                            <div
                                key={`${item.title}-${index}`}
                                className="flex flex-1 items-center justify-center gap-4"
                            >
                                <div className="flex min-w-0 flex-1 flex-col items-center">
                                    <div className="min-h-7 text-center text-lg font-semibold text-white">
                                        {item.topLabelTo ? (
                                            <Link
                                                to={item.topLabelTo}
                                                className={referenceLinkClass}
                                            >
                                                {item.topLabel}
                                            </Link>
                                        ) : (
                                            item.topLabel || <span aria-hidden="true">&nbsp;</span>
                                        )}
                                    </div>
                                    <div className="mt-3 flex w-full max-w-[18rem] flex-col items-center">
                                        {item.topLabel ? (
                                            <div className="h-8 w-px bg-white/70" aria-hidden="true" />
                                        ) : (
                                            <div className="h-8" aria-hidden="true" />
                                        )}
                                        <div className="flex min-h-[10rem] w-full items-center justify-center rounded-[1.5rem] border-2 border-[#d9ccbf] px-6 py-5 text-center shadow-[inset_0_0_0_2px_rgba(217,204,191,0.35)]">
                                            <p className="text-xl font-semibold leading-tight text-white">
                                                {item.title}
                                            </p>
                                        </div>
                                        <div className="mt-4 min-h-7 text-center text-lg font-semibold text-white">
                                            {item.bottomLabelTo ? (
                                                <Link
                                                    to={item.bottomLabelTo}
                                                    className={referenceLinkClass}
                                                >
                                                    {item.bottomLabel}
                                                </Link>
                                            ) : (
                                                item.bottomLabel || <span aria-hidden="true">&nbsp;</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {index < stepOneFlow.length - 1 ? (
                                    <div
                                        className="hidden shrink-0 items-center lg:flex"
                                        aria-hidden="true"
                                    >
                                        <div className="h-3 w-14 bg-white" />
                                        <div className="h-0 w-0 border-y-[12px] border-l-[20px] border-y-transparent border-l-white" />
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>
                <p className="text-base mt-4 leading-8 text-white/80">
                    A curriculum developer can make use of these documents to gather macro-perspectives of the job requirements and decide how the entry and exit (graduate) requirements would look like. This is known as the Learner Profile and Graduate Profile, respectively. The curriculum is expected to improve or enhance the profile of the learner.
                </p>
                <p className="text-base mt-4 leading-8 text-white/80">
                    Having determined the Graduate Profile of the Learner, the FSC and ESC references can be used to provide the vital link between the industry and the academe. Curricula that meet the industry requirements will equip the graduates with skills that match the needs of industry. The Proficiency Levels indicated in the Skills Map show the Level that the learner is expected to possess after going through the curriculum for a specific FSC, such that he/she can perform the task to expectation.
                </p>
                <p className="text-base mt-4 leading-8 text-white/80">
                    To help the Developer decide what the learner should become or graduate with, the following curriculum structure can be used:</p>
                <table className="mt-6 w-full table-auto border-collapse text-left text-sm">
                    <thead>
                        <tr>
                            <td className="text-base text-white/80 border border-blue-900 px-4 py-2">Features</td>
                            <td className="text-base text-white/80 border border-blue-900 px-4 py-2">Questions to Ask</td>
                            <td className="text-base text-white/80 border border-blue-900 px-4 py-2">PSF Reference</td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="text-base text-white/80 border border-blue-900 px-4 py-2">Graduate Profile/ Curriculum Outcome</td>
                            <td className="text-base text-white/80 border border-blue-900 px-4 py-2">As a result of completing the curriculum, what will the learner become/ be able to perform?</td>
                            <td className="text-base text-white/80 border border-blue-900 px-4 py-2">
                                <Link to="/skill-map" className={tableReferenceLinkClass}>
                                    Skills Map
                                </Link>
                                <br />
                                <Link
                                    to="/skills-overview?tab=enabling"
                                    className={tableReferenceLinkClass}
                                >
                                    ESC Reference
                                </Link>
                                <br />
                                <button
                                    type="button"
                                    onClick={() => setToastMessage("ESC Description does not exist")}
                                    className={tableReferenceLinkClass}
                                >
                                    ESC Description
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td className="text-base text-white/80 border border-blue-900 px-4 py-2">Determine Content and Modules</td>
                            <td className="text-base text-white/80 border border-blue-900 px-4 py-2">What are the contents to be learnt?<br /> What are the modules (units) of learning? </td>
                            <td className="text-base text-white/80 border border-blue-900 px-4 py-2">
                                <Link
                                    to="/skills-overview?tab=functional"
                                    className={tableReferenceLinkClass}
                                >
                                    FSC Reference
                                </Link>
                            </td>
                        </tr>
                        <tr>
                            <td className="text-base text-white/80 border border-blue-900 px-4 py-2">Determine level of proficiency to be attined</td>
                            <td className="text-base text-white/80 border border-blue-900 px-4 py-2">What is the overall proficiency level and which qualification level does it map to?</td>
                            <td className=" text-base text-white/80 border border-blue-900 px-4 py-2">
                                <Link
                                    to="/skills-overview?tab=functional"
                                    className={tableReferenceLinkClass}
                                >
                                    FSC Reference
                                </Link>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
              ABCD
            </h2>
          </div>
        </div>

                <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {ABCD.map((ABCD, index) => (
                    <article
                    key={ABCD.id}
                    className="group overflow-hidden rounded-[1.75rem] border border-white/15  bg-slate-950/20 shadow-xl transition hover:-translate-y-1 hover:border-cyan-200/35"
                    >
                    <div className="relative h-48 overflow-hidden bg-cyan-900/30">
                        {(
                        <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
                            <div className="flex h-34 w-34 items-center justify-center text-6xl font-bold text-white ">
                            {ABCD.id}
                            </div>
                        </div>
                        )}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 to-transparent" />
                    </div>

                    <div className="space-y-4 p-6">
                        <div>
                        <p className="mt-2 text-2xl font-bold text-white">
                        {ABCD.name}
                        </p>
                        </div>
                        <ul className="space-y-2 text-sm text-white/80">
                        {ABCD.bio.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-base text-cyan-100 mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                        </ul>
                    </div>
                    </article>
                ))}
                </div>
                <div className="text-xl mt-6 text-white/80">
                    <p>
                       Here is what a compleded outcome/ purpose statement for a Data Scientist in AAI industry would look like:
                    </p>
                </div>

                <table className="mt-6 w-full table-fixed border-collapse text-left text-sm">
                    <tbody>
                        <tr>
                            <td className="text-base w-1/2 text-white/80 border border-blue-900 px-6 py-4">By the end of the [name of program], [designation of target participants] will be equipped with knowledge and skills to [describe the knowledge and skills required for the desired job performance from Skills Map, FSC and ESC references], in the program, they will foster attributes to become more [choose desirable qualities and attributes from Job Role of Skills Map]</td>
                            <td className="text-base text-white/80 border border-blue-900 px-6 py-4">By the end of this Professional Certificate in Data Science, aspiring [<u>A</u>] <u>Data Scientists</u> will be equipped with knowledge and skills to [<u>B</u>] <u>create</u> [<u>C</u>] <u>advance statistical models</u> [<u>D</u>] <u> tailored for specific business use cases</u>. <br /> In the program they will foster attributes to become more opt in creative thinking, collaboration, and communication</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
                    STEP 2
                </p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                    Determine Module Titles and Contents for Curriculum Development
                </h2>
                <div className="text-xl mt-6 text-white/80">
                    <p>
                    Here is how the Module Titles and Contents can be determined:
                    </p>
                </div>

                <table className="mt-6 w-full table-fixed border-collapse text-left text-sm">
                    <thead>
                        <tr>
                            <th className="text-center text-base w-1/2 text-white/80 border border-blue-900 px-6 py-4">Step A</th>
                            <th className="text-center text-base text-white/80 border border-blue-900 px-6 py-4">Step B</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="text-base w-1/2 text-white/80 border border-blue-900 px-6 py-4">Refer to the relevant FSC reference document and locate the details of the competency reference</td>
                            <td className="text-base text-white/80 border border-blue-900 px-6 py-4">Review the FSC Proficiency Description of the desired competency and use the key words to create a suitable module title</td>
                        </tr>
                    </tbody>
                </table>
                <p className="mt-4 text-lg leading-8 text-white/80">
                    By referring to the relevant FSC reference document, the curriculum developer can locate the details of the competency statements. The competencies are presented as six levels, from basic (1) to advanced (6). The Proficiency Level Descriptors are the same descriptors as that for the Philippine Qualification Framework. This is to allow for subsequent ease of articulation of PSF certifications to PQF qualifications. 
                </p>
                <p className="mt-4 text-lg leading-8 text-white/80">
                    The curriculum developer should reference the Underpinning Knowledge (UK) and Skills Application (SA) statements from the appropriate FSC and ESC proficiency levels. Note that since we are referring to competency-based programs, UKs should always be supported by SAs. The UKs and SAs can be clustered according to the developer’s formulation of the learning outcomes.
                </p>
                <p className="mt-4 text-lg leading-8 text-white/80">
                    Use the keywords to create a suitable module title. For instance, the word “develop” has been used in the proficiency description under Level 4. The proficiency descriptor draws similar parallel to the Blooms Taxonomy descriptors, hence appropriate Verbs (Booms) can be selected to phrase the module title. 
                </p>

                <div className="text-xl mt-6 text-white/80">
                    <p>
                    Here is an example using a module for a Data Scientist: 
                    </p>
                </div>

                <table className="mt-6 w-full table-fixed border-collapse text-left text-sm">
                    <thead>
                        <tr>
                            <th className="text-center text-base w-1/2 text-white/80 border border-blue-900 px-6 py-4">FSC Proficiency Description</th>
                            <th className="text-center text-base text-white/80 border border-blue-900 px-6 py-4">Proposed Module Title</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="text-base w-1/2 text-white/80 border border-blue-900 px-6 py-4"><ul>Computational Modeling</ul><ul>Level 4</ul> <ul>Develop and utilize new algorithms and advance statistical models to enable the production of desired outcomes</ul></td>
                            <td className="text-base text-white/80 border border-blue-900 px-6 py-4">Developing algorithms and Statistical Models</td>
                        </tr>
                        <tr>
                            <td className="text-base w-1/2 text-white/80 border border-blue-900 px-6 py-4"><ul>intelligent Reasoning</ul> <ul>Level 4</ul> <ul>Building knowledge-based intelligent software applications using machine reasoning techniques and computer programming</ul></td>
                            <td className="text-base text-white/80 border border-blue-900 px-6 py-4">Building Intelligent Applications</td>
                        </tr>
                    </tbody>
                </table>
            </section>
                        <section className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
                
                <h2 className="mt-3 text-3xl font-bold text-white">
                    More Considerations  are Required for a Complete Curriculum Development
                </h2>
                <p className="mt-4 text-lg leading-8 text-white/80">
                    To develop a full set of curricula with the associated contents requires much more resources and effort. Subject matter expertise is required to cluster the UKs and SAs into meaningful outcomes with appropriate contents. These will then have to be constructively aligned with the assessment criteria to assess the knowledge and skills transfer. There could also be articulation of modules to other programs to facilitate learning progression and mobility. All these are beyond the scope of this Technical Guide. More training programs will be introduced to equip the various stakeholders with the skills and knowledge to utilize the PSF to develop full sets of curricula and associated contents.
                </p>
            </section>

        </div>
    );
}
