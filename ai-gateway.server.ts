import { google } from "@ai-sdk/google";

/** Google Gemini provider. Server-only. */
export function createLovableAiGatewayProvider(apiKey: string) {
  return google("gemini-3.5-flash", {
    apiKey: apiKey,
  });
}

export function requireGatewayKey() {
  const key = process.env["GOOGLE_GENERATIVE_AI_API_KEY"];
  if (!key) throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY");
  return key;
}

export const TUTOR_STYLE =
  "ตอบเป็นภาษาไทยที่เป็นกันเองและกระชับ ใช้ศัพท์เทคนิคเป็นภาษาอังกฤษ (เช่น variable, function, loop) ห้ามแปลศัพท์เทคนิค " +
  "โฟกัสเฉพาะสิ่งที่จำเป็นต่อเป้าหมายอาชีพของผู้เรียน ไม่พาออกนอกเส้นทาง";
