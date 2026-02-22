
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import careersRoutes from "./routes/careers.routes.js";
import enablingSkillsRoutes from "./routes/enablingSkills.routes.js";
import functionalSkillsRoutes from "./routes/functionalSkills.routes.js";

dotenv.config();

async function startServer() {
  await connectDB();

  const app = express();
  
  // CORS configuration - allows frontend to access backend
  const corsOptions = {
    origin: process.env.FRONTEND_URL || "http://localhost:5173/",
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

  const port = Number(process.env.PORT ?? 5000);
  app.listen(port, () =>
    console.log(`Backend running on http://localhost:${port}`)
  );
}

startServer().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
