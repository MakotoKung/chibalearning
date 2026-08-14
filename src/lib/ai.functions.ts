import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  createLovableAiGatewayProvider,
  requireGatewayKey,
  TUTOR_STYLE,
} from "./ai-gateway.server";

const MODEL = "google/gemini-3.5-flash";

const ChatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      }),
    )
    .min(1),
});

const ChatOutput = z.object({
  reply: z.string(),
  readyToBuild: z.boolean(),
  careerGoal: z.string(),
});

/** หน้าแรก: คุยกับ AI เพื่อหาเป้าหมายอาชีพ */
export const advisorChat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const { generateObject } = await import("ai");
    const gateway = createLovableAiGatewayProvider(requireGatewayKey());

    const result = await generateObject({
      model: gateway(MODEL),
      schema: ChatOutput,
      system:
        `คุณคือ "Guide" NPC ในเกม RPG ที่ช่วยผู้เรียนหาเส้นทางอาชีพสาย Coding และ Science. ${TUTOR_STYLE}\n` +
        "หน้าที่: ถามคำถามสั้น ๆ ทีละ 1-2 ข้อ (ความสนใจ, พื้นฐานที่มี, เวลาที่ว่างต่อสัปดาห์, เป้าหมายปลายทาง) " +
        "เมื่อข้อมูลพอที่จะสร้าง roadmap ให้ตั้ง readyToBuild = true และใส่ careerGoal เป็นชื่ออาชีพที่ชัดเจน เช่น 'Frontend Developer (React)' " +
        "ถ้ายังไม่พอ ให้ readyToBuild = false และ careerGoal = ''. reply ต้องไม่เกิน 4 ประโยค",
      messages: data.messages,
    });

    return result.object;
  });

const RoadmapNode = z.object({
  title: z.string(),
  subject: z.enum(["coding", "science", "math", "theory", "project"]),
  description: z.string(),
  skills: z.array(z.string()),
  estimatedHours: z.number(),
});

const RoadmapOutput = z.object({
  title: z.string(),
  summary: z.string(),
  nodes: z.array(RoadmapNode),
});


export const buildRoadmap = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ goal: z.string().min(2) }).parse(input))
  .handler(async ({ data }) => {
    const { generateObject } = await import("ai");
    const gateway = createLovableAiGatewayProvider(requireGatewayKey());

    const result = await generateObject({
      model: gateway(MODEL),
      schema: RoadmapOutput,
      system:
        `สร้างเส้นทางการเรียน (learning roadmap) แบบเรียงลำดับจากง่ายไปยาก. ${TUTOR_STYLE}\n` +
        "ให้ 8-10 node เท่านั้น แต่ละ node คือ 1 ระดับที่เรียนจบได้ใน 1-6 ชั่วโมง " +
        "ตัดทุกอย่างที่ไม่จำเป็นต่ออาชีพนี้ออก (no rabbit hole) title สั้น กระชับ",
      prompt: `เป้าหมายอาชีพ: ${data.goal}`,
    });

    return result.object;
  });

const LessonOutput = z.object({
  intro: z.string(),
  sections: z.array(z.object({ heading: z.string(), body: z.string() })),
  keyPoints: z.array(z.string()),
  hasCodeLab: z.boolean(),
  language: z.enum(["javascript", "none"]),
  starterCode: z.string(),
  challenge: z.string(),
  solutionCode: z.string(),
  quiz: z.array(
    z.object({
      question: z.string(),
      choices: z.array(z.string()),
      answerIndex: z.number(),
      explanation: z.string(),
    }),
  ),
});


export const buildLesson = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        goal: z.string(),
        title: z.string(),
        subject: z.string(),
        description: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { generateObject } = await import("ai");
    const gateway = createLovableAiGatewayProvider(requireGatewayKey());

    const result = await generateObject({
      model: gateway(MODEL),
      schema: LessonOutput,
      system:
        `เขียนบทเรียนหนึ่งระดับสำหรับผู้เรียนที่อยากเป็น ${data.goal}. ${TUTOR_STYLE}\n` +
        "sections ควรมี 3-4 หัวข้อ อธิบายเข้าใจง่าย มีตัวอย่างโค้ดใน markdown code block ได้ " +
        "ถ้าเป็นเนื้อหาสาย coding ให้ hasCodeLab = true, language = 'javascript', starterCode เป็น JavaScript ที่รันได้ใน browser ด้วย console.log " +
        "และ challenge เป็นโจทย์สั้น ๆ ให้ผู้เรียนแก้ในโค้ด. ถ้าไม่ใช่ coding ให้ hasCodeLab = false, language = 'none', starterCode = '' " +
        "quiz ต้องมี 4 ตัวเลือกและ answerIndex เป็น index (0-3) ของคำตอบที่ถูก",
      prompt: `หัวข้อ: ${data.title}\nหมวด: ${data.subject}\nรายละเอียด: ${data.description}`,
    });

    return result.object;
  });

export const askTutor = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().min(1),
        context: z.string().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(requireGatewayKey());

    const result = await generateText({
      model: gateway(MODEL),
      system:
        `คุณคือติวเตอร์ AI ในบทเรียน. ${TUTOR_STYLE} ตอบไม่เกิน 6 ประโยค ` +
        `ถ้ามีโค้ดให้ใส่ใน markdown code block\nบริบทบทเรียน: ${data.context}`,
      prompt: data.question,
    });

    return { answer: result.text };
  });
