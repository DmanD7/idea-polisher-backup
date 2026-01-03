import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

// Professional consultant and project architect service
export const polishNotes = async (notes: string): Promise<string> => {
  if (!notes.trim()) {
    throw new Error("Notes cannot be empty.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: notes,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        topP: 0.95,
      },
    });

    return response.text || "Failed to generate a response. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("The polisher hit a snag. Please check your connection and try again.");
  }
};

/**
 * Accurately transcribe audio input using Gemini.
 */
export const transcribeAudio = async (base64Audio: string, mimeType: string = "audio/webm;codecs=opus"): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-native-audio-preview-09-2025",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
          {
            text: "Listen to this audio carefully and transcribe it exactly as spoken. Return only the transcription text, no preamble or extra commentary. If the audio is silent or unintelligible, return an empty string.",
          },
        ],
      },
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Transcription Error:", error);
    throw new Error("Voice transcription failed. The format might be unsupported or the AI is busy.");
  }
};

// Extract a single-word category from the polished outline
export const extractCategory = async (polishedOutline: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Based on this project outline, provide exactly ONE word that categorizes it (e.g., SaaS, Creative, Non-profit, Hardware, Education). Return ONLY the word.\n\nOutline: ${polishedOutline}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text?.trim().replace(/[^\w]/g, '') || "General";
  } catch (error) {
    return "General";
  }
};

// Generate creative business expansions for the polished project
export const generateExpansions = async (polishedOutline: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Based on this project outline:
  
  ${polishedOutline}
  
  Generate exactly 3 unique, creative, and actionable "Expansion Opportunities". 
  Focus on:
  1. A unique pivot or feature that differentiates it.
  2. A specific monetization or sustainability model.
  3. A strategic partnership or growth tactic.
  
  Format the output as clean Markdown bullets.
  IMPORTANT STYLE RULES:
  - Each bullet MUST start with the sparkle emoji (✨).
  - The text of the suggestion MUST be wrapped in italics (e.g., *Suggestion text*).
  - Do not include a title.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a creative business strategist and startup mentor.",
        temperature: 0.8,
      },
    });

    return response.text || "No expansions generated.";
  } catch (error) {
    console.error("Expansion Error:", error);
    return "Could not generate expansions at this time.";
  }
};