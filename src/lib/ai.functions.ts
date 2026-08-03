import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";

function getGateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

/* ---------------- Plant disease analysis ---------------- */

const PlantInput = z.object({
  imageDataUrl: z.string().min(20),
  language: z.string().default("English"),
});

export const analyzePlant = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PlantInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const { text } = await generateText({
      model: gateway(MODEL),
      messages: [
        {
          role: "system",
          content:
            "You are an expert plant pathologist. Analyze the uploaded plant image and respond ONLY with strict JSON matching: {\"plant\":string,\"disease\":string,\"confidence\":number,\"severity\":\"Low\"|\"Moderate\"|\"High\",\"symptoms\":string[],\"treatment\":string[],\"prevention\":string[]}. Use real disease names (e.g. Powdery Mildew, Leaf Blight, Rust). If healthy, set disease to 'Healthy'. No markdown, no prose.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Analyze this plant. Respond in ${data.language}.` },
            { type: "image", image: data.imageDataUrl },
          ],
        },
      ],
    });
    return parseJson(text);
  });

/* ---------------- Land / soil analysis ---------------- */

const LandInput = z.object({
  centerLat: z.number(),
  centerLng: z.number(),
  areaHectares: z.number(),
  language: z.string().default("English"),
});

export const analyzeLand = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LandInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const { text } = await generateText({
      model: gateway(MODEL),
      messages: [
        {
          role: "system",
          content:
            "You are an agronomist. Given a land parcel's coordinates and area, infer realistic agricultural analysis. Respond ONLY with strict JSON: {\"soilType\":string,\"climate\":string,\"recommendedCrops\":string[],\"waterNeeds\":string,\"riskFactors\":string[],\"yieldPotential\":string}. Use real soil names (Black Cotton Soil, Red Loamy, Alluvial, Laterite, Sandy Loam). No markdown.",
        },
        {
          role: "user",
          content: `Parcel center: ${data.centerLat.toFixed(4)}, ${data.centerLng.toFixed(4)}. Area: ${data.areaHectares.toFixed(2)} hectares. Respond in ${data.language}.`,
        },
      ],
    });
    return parseJson(text);
  });

/* ---------------- Chatbot ---------------- */

const ChatInput = z.object({
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant"]), content: z.string() }),
  ),
  language: z.string().default("English"),
});

export const chatWithAgriAi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const { text } = await generateText({
      model: gateway(MODEL),
      messages: [
        {
          role: "system",
          content: `You are Agri AI, a friendly expert agricultural advisor for farmers. Give concise, practical advice on crops, pests, soil, irrigation, and weather. Use real crop names and farming practices. Always respond in ${data.language}. Keep replies under 120 words.`,
        },
        ...data.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
    return { reply: text };
  });

/* ---------------- Floating Chatbot via OpenRouter ---------------- */

const GOOGLE_API_KEY = "AQ.Ab8RN6INkrdRf8-Coh8Wi7X5gkGH49esMAFEBIwcI1kr4TkDEg";
const GEMINI_MODEL = "gemini-2.5-flash-lite";

export const chatWithOpenRouter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
    const google = createOpenAICompatible({
      name: "google-gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      headers: {
        Authorization: `Bearer ${GOOGLE_API_KEY}`,
      },
    });
    const { text } = await generateText({
      model: google(GEMINI_MODEL),
      system: `You are Agri AI, a friendly expert agricultural advisor for farmers. Give concise, practical advice on crops, pests, soil, irrigation, and weather. Use real crop names and farming practices. Always respond in ${data.language}. Keep replies under 150 words.`,
      messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    return { reply: text };
  });

function parseJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  try {
    return JSON.parse(slice);
  } catch {
    return { raw: text };
  }
}