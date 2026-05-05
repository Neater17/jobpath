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
  RecommendationModelSnapshot,
  RecommendationRequest,
} from "./types.js";

const DEFAULT_FEEDBACK_PATH = "data/recommendation-feedback.jsonl";
const DEFAULT_ML_SERVICE_URL = "http://127.0.0.1:8000/ml";
const RETRY_MAX_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 16000;
const ERROR_BODY_PREVIEW_LENGTH = 180;

export class RecommendationService {
  private modelInfo: ModelInfo | null = null;

  private mlServiceUrl: string | null = null;

  private initError: string | null = null;

  private getConfiguredMlServiceUrl() {
    const configured = process.env.ML_SERVICE_URL;
    if (typeof configured === "string" && configured.trim().length > 0) {
      const normalized = configured.replace(/\/+$/, "");

      try {
        const parsed = new URL(normalized);
        if (parsed.pathname === "/" || parsed.pathname === "") {
          parsed.pathname = "/ml";
          return parsed.toString().replace(/\/+$/, "");
        }
      } catch {
        if (!/\/ml$/i.test(normalized)) {
          return `${normalized}/ml`;
        }
      }

      return normalized;
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getRetryDelay(attempt: number): number {
    // Exponential backoff with jitter: base * 2^attempt + random jitter
    const exponentialDelay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, RETRY_MAX_DELAY_MS);
    const jitter = Math.random() * 0.1 * cappedDelay; // 10% jitter
    return cappedDelay + jitter;
  }

  private getResponsePreview(text: string): string {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length <= ERROR_BODY_PREVIEW_LENGTH) {
      return normalized;
    }
    return `${normalized.slice(0, ERROR_BODY_PREVIEW_LENGTH)}...`;
  }

  private getMlServiceErrorMessage(
    response: Response,
    payload: unknown,
    rawText: string
  ): string {
    if (typeof payload === "object" && payload !== null) {
      if ("detail" in payload && typeof payload.detail === "string") {
        return payload.detail;
      }
      if ("message" in payload && typeof payload.message === "string") {
        return payload.message;
      }
    }

    const preview = this.getResponsePreview(rawText);
    if (preview.length > 0) {
      return preview;
    }

    return `ML service request failed with status ${response.status}`;
  }

  private isRetryableError(status: number, error?: Error): boolean {
    // Retry on rate limit, server errors, and network timeouts
    if (status === 429) return true; // Too Many Requests
    if (status >= 500) return true; // Server errors
    if (status === 408) return true; // Request Timeout
    if (status === 0) return true; // Network error
    
    // Check for network-related error messages
    const message = error?.message?.toLowerCase() || "";
    if (message.includes("timeout") || message.includes("econnrefused") || 
        message.includes("econnreset") || message.includes("network")) {
      return true;
    }
    
    return false;
  }

  private async callMlService<T>(pathname: string, init?: RequestInit): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(`${this.ensureMlServiceUrl()}${pathname}`, {
          headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
          },
          ...init,
        });

        const text = await response.text();
        let payload: T | { detail?: string; message?: string };
        let parseFailed = false;

        try {
          payload =
            text.length > 0
              ? (JSON.parse(text) as T | { detail?: string; message?: string })
              : ({} as T | { detail?: string; message?: string });
        } catch {
          parseFailed = true;
          payload = {} as T | { detail?: string; message?: string };
        }

        if (parseFailed) {
          lastError = new Error(this.getMlServiceErrorMessage(response, payload, text));

          if (!response.ok) {
            const isRetryable = this.isRetryableError(response.status, lastError);
            if (isRetryable && attempt < RETRY_MAX_ATTEMPTS - 1) {
              const delay = this.getRetryDelay(attempt);
              console.warn(
                `ML service request failed (attempt ${attempt + 1}/${RETRY_MAX_ATTEMPTS}), retrying in ${Math.round(delay)}ms...`
              );
              await this.sleep(delay);
              continue;
            }

            throw lastError;
          }

          throw new Error(
            `ML service returned a non-JSON response for ${pathname}: ${this.getResponsePreview(text)}`
          );
        }

        if (!response.ok) {
          const isRetryable = this.isRetryableError(response.status);
          const message = this.getMlServiceErrorMessage(response, payload, text);

          lastError = new Error(message);

          if (isRetryable && attempt < RETRY_MAX_ATTEMPTS - 1) {
            const delay = this.getRetryDelay(attempt);
            console.warn(`ML service request failed with status ${response.status} (attempt ${attempt + 1}/${RETRY_MAX_ATTEMPTS}), retrying in ${Math.round(delay)}ms...`);
            await this.sleep(delay);
            continue;
          }

          throw lastError;
        }

        return payload as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this.isRetryableError(0, lastError) && attempt < RETRY_MAX_ATTEMPTS - 1) {
          const delay = this.getRetryDelay(attempt);
          console.warn(`ML service request failed (attempt ${attempt + 1}/${RETRY_MAX_ATTEMPTS}): ${lastError.message}, retrying in ${Math.round(delay)}ms...`);
          await this.sleep(delay);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error("ML service request failed after maximum retries");
  }

  async openMlEventStream(pathname: string) {
    return fetch(`${this.ensureMlServiceUrl()}${pathname}`, {
      headers: {
        Accept: "text/event-stream",
      },
    });
  }

  async createExplainabilityStreamSession(payload: RecommendationRequest): Promise<{ sessionId: string }> {
    return this.callMlService<{ sessionId: string }>("/explainability/session", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async refreshModelInfo() {
    try {
      const remote = await this.callMlService<{ model: ModelInfo }>("/model-info");
      this.modelInfo = remote.model;
      this.initError = null;
      return this.modelInfo;
    } catch (error) {
      this.initError =
        error instanceof Error
          ? error.message
          : "Recommendation model is unavailable.";
      throw new Error(`Recommendation model is unavailable: ${this.initError}`);
    }
  }

  async init() {
    this.mlServiceUrl = this.getConfiguredMlServiceUrl();
    // Add initial delay to allow ML service to start up during deployment
    await this.sleep(500);
    try {
      await this.refreshModelInfo();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Recommendation service starting in degraded mode: ${message}`);
    }
  }

  async getModelInfo() {
    if (this.modelInfo) {
      return this.modelInfo;
    }

    return this.refreshModelInfo();
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

  async getModelSnapshot(): Promise<RecommendationModelSnapshot> {
    return this.callMlService<RecommendationModelSnapshot>("/snapshot");
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
