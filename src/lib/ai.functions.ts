import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  generateGeminiChat,
  generateGeminiVisionAnalysis,
  generateGeminiLandAnalysis,
} from "./gemini.server";

/* ---------------- Plant disease analysis ---------------- */

const PlantInput = z.object({
  imageDataUrl: z.string().min(20),
  language: z.string().default("English"),
});

export const analyzePlant = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PlantInput.parse(d))
  .handler(async ({ data }) => {
    return generateGeminiVisionAnalysis({
      imageDataUrl: data.imageDataUrl,
      language: data.language,
    });
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
    return generateGeminiLandAnalysis({
      centerLat: data.centerLat,
      centerLng: data.centerLng,
      areaHectares: data.areaHectares,
      language: data.language,
    });
  });

/* ---------------- Unified Agri Chatbot & Multilingual Voice AI ---------------- */

const ChatInput = z.object({
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant"]), content: z.string() }),
  ),
  language: z.string().default("English"),
});

export const chatWithAgriAi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const reply = await generateGeminiChat({
      messages: data.messages,
      language: data.language,
    });
    return { reply };
  });

export const chatWithOpenRouter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const reply = await generateGeminiChat({
      messages: data.messages,
      language: data.language,
    });
    return { reply };
  });