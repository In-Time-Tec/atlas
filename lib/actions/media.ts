"use server";

import { serverEnv } from "@/env/server";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

const ELEVENLABS_API_KEY = serverEnv.ELEVENLABS_API_KEY;

export async function checkImageModeration(images: any) {
  const LLAMA_GUARD_DOES_NOT_SUPPORT_IMAGES = true;
  if (LLAMA_GUARD_DOES_NOT_SUPPORT_IMAGES) {
    return "safe" as const;
  }

  const { text } = await generateText({
    model: groq("meta-llama/llama-guard-4-12b"),
    messages: [
      {
        role: "user",
        content: images.map((image: any) => ({ type: "image", image })),
      },
    ],
  });
  return text;
}

export async function generateSpeech(text: string) {
  const VOICE_ID = serverEnv.ELEVENLABS_DEFAULT_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
  const base = serverEnv.ELEVENLABS_TTS_BASE_URL || "https://api.elevenlabs.io/v1";
  const url = `${base}/text-to-speech/${VOICE_ID}`;
  const method = "POST";

  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not defined");
  }

  const headers = {
    Accept: "audio/mpeg",
    "xi-api-key": ELEVENLABS_API_KEY,
    "Content-Type": "application/json",
  } as const;

  const data = {
    text,
    model_id: "eleven_turbo_v2_5",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5,
    },
  };

  const response = await fetch(url, { method, headers, body: JSON.stringify(data) });
  const arrayBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString("base64");

  return { audio: `data:audio/mp3;base64,${base64Audio}` } as const;
}


