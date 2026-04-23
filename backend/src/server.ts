
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import careersRoutes from "./routes/careers.routes.js";
import enablingSkillsRoutes from "./routes/enablingSkills.routes.js";
import functionalSkillsRoutes from "./routes/functionalSkills.routes.js";
import pqfLevelsRoutes from "./routes/pqfLevels.routes.js";
import proficiencyLevelsRoutes from "./routes/proficiencyLevels.routes.js";
import recommendationsRoutes from "./routes/recommendations.routes.js";
import assessmentResultsRoutes from "./routes/assessmentResults.routes.js";
import usersRoutes from "./routes/users.routes.js";
import { recommendationService } from "./recommendation/service.js";

dotenv.config();

const parseAllowedOrigins = () => {
  const configuredOrigins = process.env.FRONTEND_URL
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins && configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return ["http://localhost:5173"];
};

const isAllowedOrigin = (origin: string, allowedOrigins: string[]) => {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (/^https:\/\/jobpath-[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    return true;
  }

  return false;
};

async function startServer() {
  await connectDB();
  await recommendationService.init();

  const app = express();

  const allowedOrigins = parseAllowedOrigins();

  // CORS configuration - allows frontend to access backend
  const corsOptions = {
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));
  app.use(express.json());

  // Test route
  app.get("/api/test", (req, res) => {
    res.json({ message: "Server is working!" });
  });

  app.use("/api/careers", careersRoutes);
  app.use("/api/enabling-skills", enablingSkillsRoutes);
  app.use("/api/functional-skills", functionalSkillsRoutes);
  app.use("/api/pqf-levels", pqfLevelsRoutes);
  app.use("/api/proficiency-levels", proficiencyLevelsRoutes);
  app.use("/api/recommendations", recommendationsRoutes);
  app.use("/api/assessment-results", assessmentResultsRoutes);
  app.use("/api/users", usersRoutes);

  const port = Number(process.env.PORT ?? 5000);
  app.listen(port, () =>
    console.log(`Backend running on http://localhost:${port}`)
  );
}

startServer().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
