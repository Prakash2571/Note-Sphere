/**
 * lib/gemini.ts
 * Google Gemini AI utility for summarizing PDF text content.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Summarize a block of text extracted from a PDF using Gemini.
 * @param text - Raw text extracted from the PDF
 * @returns    - A structured summary string
 */
export async function summarizeText(text: string): Promise<string> {
  // Use the latest flash model for fast, cost-effective summarization
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You are an expert note summarizer. Given the following text extracted from a PDF document, 
provide a clear and concise summary in the following format:

**📌 Overview**
A 2-3 sentence overview of what this document is about.

**🔑 Key Points**
- List the 5-7 most important points as bullet items

**💡 Takeaways**
A 1-2 sentence conclusion or action item from this document.

Here is the document text:
---
${text.slice(0, 15000)}
---

Provide only the summary, no additional commentary.
  `.trim();

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}
