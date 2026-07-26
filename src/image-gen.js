import { geminiGenerateImage } from "./gemini.js";

/**
 * Generates the background illustration for a story. No headline/logo text
 * is requested here on purpose — AI image models still render text
 * unreliably. Text gets composited precisely in compose.js instead.
 */
export async function generateStoryImage(story) {
  const prompt = `
Editorial illustration for a premium gaming media outlet, square 1:1 format.
Scene: ${story.imagePromptSeed}
Style: modern tech-editorial, cinematic lighting, dramatic red (#F96968) and
deep black (#050505) color grading, high detail, premium magazine quality.
No text, no words, no logos, no watermarks anywhere in the image.
`.trim();

  return geminiGenerateImage(prompt);
}
