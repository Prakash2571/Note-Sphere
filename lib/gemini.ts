/**
 * lib/gemini.ts
 */

import {
  GoogleGenerativeAI,
} from "@google/generative-ai";

const genAI =
  new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY!
  );

export async function summarizeText(
  text: string
): Promise<string> {
  const model =
    genAI.getGenerativeModel({
      model:
        "gemini-2.0-flash",
    });

  const prompt = `
You are an expert note summarizer.

Given the following text extracted from a PDF document,
provide a clear and concise summary.

TEXT:
${text.slice(0, 15000)}
`;

  const result =
    await model.generateContent(
      prompt
    );

  return result.response.text();
}