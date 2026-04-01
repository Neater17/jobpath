import fs from "node:fs/promises";
import path from "node:path";
import { analyzeCvText } from "./cvAnalyzer.js";
import type {
  CareerGapRequest,
  CareerGapResponse,
  CvAnalysisRequest,
  CvRecommendationResponse,
  ModelInfo,
  RecommendationApiResponse,
  RecommendationExplainabilityResponse,
  RecommendationFeedbackRequest,
  RecommendationRequest,
} from "./types.js";

const DEFAULT_FEEDBACK_PATH = "data/recommendation-feedback.jsonl";
const DEFAULT_ML_SERVICE_URL = "http://127.0.0.1:8000/ml";

export class RecommendationService {
  private modelInfo: ModelInfo | null = null;

  private mlServiceUrl: string | null = null;

  private initError: string | null = null;

  private getConfiguredMlServiceUrl() {
    const configured = process.env.ML_SERVICE_URL;
    if (typeof configured === "string" && configured.trim().length > 0) {
      return configured.replace(/\/+$/, "");
    }
    return DEFAULT_ML_SERVICE_URL;
  }

  private ensureMlServiceUrl() {
    if (!this.mlServiceUrl) {
      this.mlServiceUrl = this.getConfiguredMlServiceUrl();
    }
    return this.mlServiceUrl;
  }

  private getFeedbackPath() {
    const configured = process.env.RECOMMENDER_FEEDBACK_PATH;
    if (typeof configured === "string" && configured.trim().length > 0) {
      return path.resolve(configured);
    }
    return path.resolve(process.cwd(), DEFAULT_FEEDBACK_PATH);
  }

  private async callMlService<T>(pathname: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.ensureMlServiceUrl()}${pathname}`, {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      ...init,
    });

    const text = await response.text();
    const payload =
      text.length > 0
        ? (JSON.parse(text) as T | { detail?: string; message?: string })
        : ({} as T | { detail?: string; message?: string });

    if (!response.ok) {
      const message =
        typeof payload === "object" && payload !== null
          ? "detail" in payload && typeof payload.detail === "string"
            ? payload.detail
            : "message" in payload && typeof payload.message === "string"
              ? payload.message
              : `ML service request failed with status ${response.status}`
          : `ML service request failed with status ${response.status}`;
      throw new Error(message);
    }

    return payload as T;
  }

  async openMlEventStream(pathname: string) {
    return fetch(`${this.ensureMlServiceUrl()}${pathname}`, {
      headers: {
        Accept: "text/event-stream",
      },
    });
  }

  async init() {
    this.mlServiceUrl = this.getConfiguredMlServiceUrl();
    try {
      const remote = await this.callMlService<{ model: ModelInfo }>("/model-info");
      this.modelInfo = remote.model;
      this.initError = null;
    } catch (error) {
      this.initError =
        error instanceof Error
          ? error.message
          : "Recommendation model is unavailable.";
    }
  }

  getModelInfo() {
    if (!this.modelInfo) {
      throw new Error(
        this.initError
          ? `Recommendation model is unavailable: ${this.initError}`
          : "Recommendation model is not initialized"
      );
    }
    return this.modelInfo;
  }

  async recordFeedback(payload: RecommendationFeedbackRequest) {
    const feedbackPath = this.getFeedbackPath();
    await fs.mkdir(path.dirname(feedbackPath), { recursive: true });

    const row = {
      ...payload,
      createdAt: new Date().toISOString(),
      modelVersion: this.modelInfo?.modelVersion ?? null,
      trainedAt: this.modelInfo?.trainedAt ?? null,
      dataSource: this.modelInfo?.dataSource ?? null,
    };

    await fs.appendFile(feedbackPath, `${JSON.stringify(row)}\n`, "utf8");

    return {
      saved: true,
      filePath: feedbackPath,
      createdAt: row.createdAt,
    };
  }

  async recommend(payload: RecommendationRequest): Promise<RecommendationApiResponse> {
    const response = await this.callMlService<RecommendationApiResponse>("/recommend", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    this.modelInfo = response.model;
    return response;
  }

  async getExplainability(
    payload: RecommendationRequest
  ): Promise<RecommendationExplainabilityResponse> {
    return this.callMlService<RecommendationExplainabilityResponse>("/explainability", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getCareerGaps(payload: CareerGapRequest): Promise<CareerGapResponse> {
    return this.callMlService<CareerGapResponse>("/career-gaps", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async recommendFromCv(payload: CvAnalysisRequest): Promise<CvRecommendationResponse> {
    const cvText = typeof payload.cvText === "string" ? payload.cvText.trim() : "";
    if (cvText.length < 40) {
      throw new Error("CV text is too short to analyze");
    }

    const { cvAnalysis, featureVector, certificationSignals } = analyzeCvText(
      cvText,
      typeof payload.fileName === "string" && payload.fileName.trim().length > 0
        ? payload.fileName.trim()
        : null
    );

    const answeredCount = featureVector.filter((score) => score >= 0.12).length;
    const totalQuestions = featureVector.length;
    const completionRate = totalQuestions > 0 ? answeredCount / totalQuestions : 0;
    const haveRate =
      answeredCount > 0
        ? featureVector.filter((score) => score >= 0.12).reduce((sum, score) => sum + score, 0) /
          answeredCount
        : 0;

    const response = await this.callMlService<RecommendationApiResponse>("/score", {
      method: "POST",
      body: JSON.stringify({
        featureVector,
        certificationSignals,
        selectedPathKey: payload.selectedPathKey ?? null,
        selectedCareerName: payload.selectedCareerName ?? null,
        explainabilityMethod: "auto",
        summary: {
          completionRate,
          haveRate,
          answeredCount,
          totalQuestions,
          source: "backend",
        },
      }),
    });

    this.modelInfo = response.model;

    return {
      ...response,
      cvAnalysis,
    };
  }
}

export const recommendationService = new RecommendationService();
