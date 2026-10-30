import { anthropic } from "@ai-sdk/anthropic";
import { deepseek } from "@ai-sdk/deepseek";
import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createProviderRegistry } from "ai";

// Each provider reads its own key: ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, CUSTOM_LLM_API_KEY.
// "custom" covers any OpenAI-compatible endpoint (OpenRouter, Groq, Together, Ollama, ...).
const registry = createProviderRegistry({
  anthropic,
  openai,
  deepseek,
  custom: createOpenAICompatible({
    name: "custom",
    baseURL: process.env.CUSTOM_LLM_BASE_URL || "http://localhost:11434/v1",
    apiKey: process.env.CUSTOM_LLM_API_KEY,
    supportsStructuredOutputs: true,
  }),
});

export const MODEL_ID = process.env.LLM_MODEL || "anthropic:claude-opus-5";

// Other providers (DeepSeek, most OpenAI-compatible hosts) accept images only, so PDFs are sent as extracted text.
export const READS_PDF = ["anthropic", "openai"].includes(MODEL_ID.split(":")[0]);

export const model = () => registry.languageModel(MODEL_ID as Parameters<typeof registry.languageModel>[0]);
