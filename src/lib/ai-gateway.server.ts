import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export type AiProviderConfig = {
  provider: ReturnType<typeof createOpenAICompatible>;
  modelName: string;
};

export function getAiModel(): AiProviderConfig {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const gatewayKey = process.env.AI_GATEWAY_KEY || process.env.LOVABLE_API_KEY;

  // 1. Google Gemini Native OpenAI compatibility endpoint (Vercel / Google AI Studio)
  if (geminiKey) {
    const key = geminiKey.trim();
    const provider = createOpenAICompatible({
      name: "google-gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
    return {
      provider,
      modelName: "gemini-2.0-flash",
    };
  }

  // 2. OpenAI API
  if (openaiKey) {
    const key = openaiKey.trim();
    const provider = createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
    return {
      provider,
      modelName: "gpt-4o-mini",
    };
  }

  // 3. AI Gateway (Custom or Lovable)
  if (gatewayKey) {
    const key = gatewayKey.trim();
    const baseURL = process.env.AI_GATEWAY_URL || "https://ai.gateway.lovable.dev/v1";
    const provider = createOpenAICompatible({
      name: "aj-studioz-ai-gateway",
      baseURL,
      headers: {
        Authorization: `Bearer ${key}`,
        "Lovable-API-Key": key,
      },
    });
    return {
      provider,
      modelName: "google/gemini-2.5-flash",
    };
  }

  // Default fallback to Google Gemini endpoint with any env key present
  const fallbackKey = process.env.AI_GATEWAY_KEY || process.env.GEMINI_API_KEY || "";
  const provider = createOpenAICompatible({
    name: "google-gemini-fallback",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    headers: {
      Authorization: `Bearer ${fallbackKey}`,
    },
  });
  return {
    provider,
    modelName: "gemini-2.0-flash",
  };
}

export function createAiGatewayProvider(apiKey: string) {
  if (apiKey.startsWith("AIza") || process.env.GEMINI_API_KEY) {
    return createOpenAICompatible({
      name: "google-gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }

  const baseURL = process.env.AI_GATEWAY_URL || "https://ai.gateway.lovable.dev/v1";
  return createOpenAICompatible({
    name: "aj-studioz-ai-gateway",
    baseURL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Lovable-API-Key": apiKey,
    },
  });
}

export const createLovableAiGatewayProvider = createAiGatewayProvider;