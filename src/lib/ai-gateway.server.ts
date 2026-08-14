import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/** Lovable AI Gateway provider. Server-only. */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

export function requireGatewayKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

export const TUTOR_STYLE =
  "ตอบเป็นภาษาไทยที่เป็นกันเองและกระชับ ใช้ศัพท์เทคนิคเป็นภาษาอังกฤษ (เช่น variable, function, loop) ห้ามแปลศัพท์เทคนิค " +
  "โฟกัสเฉพาะสิ่งที่จำเป็นต่อเป้าหมายอาชีพของผู้เรียน ไม่พาออกนอกเส้นทาง";
