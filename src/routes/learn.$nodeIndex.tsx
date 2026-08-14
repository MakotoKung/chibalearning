import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, Play, RotateCcw, Terminal, Trophy } from "lucide-react";
import { toast } from "sonner";

import { GameHeader } from "@/components/GameHeader";
import { AskAiFab } from "@/components/AskAiFab";
import { PixelMarkdown } from "@/components/PixelMarkdown";
import { buildLesson } from "@/lib/ai.functions";
import { useAuth } from "@/hooks/useAuth";
import {
  completeNode,
  fetchActiveRoadmap,
  fetchCachedLesson,
  saveLesson,
  type LessonContent,
} from "@/lib/game-data";

export const Route = createFileRoute("/learn/$nodeIndex")({
  head: () => ({
    meta: [
      { title: "ห้องเรียน Code Lab | PixelPath" },
      {
        name: "description",
        content:
          "เรียนเนื้อหาด้านซ้าย ลองเขียนโค้ดใน editor ด้านขวา ดูผลลัพธ์ใน terminal และทำ quiz ท้ายบท",
      },
      { property: "og:title", content: "ห้องเรียน Code Lab | PixelPath" },
      {
        property: "og:description",
        content: "เรียนไปลองไปแบบ interactive พร้อมติวเตอร์ AI ข้างตัว",
      },
    ],
  }),
  component: LearnPage,
});

function runJs(code: string): string[] {
  const logs: string[] = [];
  const push = (...args: unknown[]) =>
    logs.push(
      args
        .map((a) => {
          if (typeof a === "string") return a;
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(" "),
    );
  try {
    const fn = new Function(
      "console",
      `"use strict";\n${code}`,
    ) as (c: { log: typeof push; error: typeof push; warn: typeof push }) => void;
    fn({ log: push, error: push, warn: push });
    if (logs.length === 0) logs.push("(รันสำเร็จ แต่ไม่มี output — ลองใช้ console.log)");
  } catch (err) {
    logs.push(`✖ ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`);
  }
  return logs;
}

function LearnPage() {
  const { nodeIndex } = Route.useParams();
  const index = Number(nodeIndex);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const makeLesson = useServerFn(buildLesson);

  const [code, setCode] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: roadmap } = useQuery({
    queryKey: ["roadmap", user?.id],
    queryFn: fetchActiveRoadmap,
    enabled: !!user,
  });

  const node = roadmap?.nodes[index];

  const { data: lesson, isLoading: lessonLoading } = useQuery<LessonContent>({
    queryKey: ["lesson", roadmap?.id, index],
    enabled: !!roadmap && !!node && !!user,
    staleTime: Infinity,
    queryFn: async () => {
      const cached = await fetchCachedLesson(roadmap!.id, index);
      if (cached) return cached;
      const generated = (await makeLesson({
        data: {
          goal: roadmap!.goal,
          title: node!.title,
          subject: node!.subject,
          description: node!.description,
        },
      })) as LessonContent;
      await saveLesson(user!.id, roadmap!.id, index, generated);
      return generated;
    },
  });

  useEffect(() => {
    if (lesson?.starterCode) setCode(lesson.starterCode);
  }, [lesson?.starterCode]);

  const quiz = lesson?.quiz ?? [];
  const score = quiz.reduce((acc, q, i) => acc + (answers[i] === q.answerIndex ? 1 : 0), 0);
  const passed = quiz.length > 0 && score >= Math.ceil(quiz.length * 0.6);

  async function finish() {
    if (!user || !roadmap) return;
    setSaving(true);
    try {
      await completeNode({
        userId: user.id,
        roadmapId: roadmap.id,
        nodeIndex: index,
        score,
        total: quiz.length,
        xpGain: 50 + score * 10,
      });
      await queryClient.invalidateQueries({ queryKey: ["progress", roadmap.id] });
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success(`ผ่านระดับ ${index + 1}! +${50 + score * 10} XP`);
      navigate({ to: "/path" });
    } catch {
      toast.error("บันทึกความคืบหน้าไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <GameHeader />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link to="/path" className="text-muted-foreground hover:text-primary flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> กลับแผนที่
          </Link>
          <h1 className="text-primary text-[0.65rem] sm:text-xs">
            LV.{index + 1} {node?.title ?? ""}
          </h1>
        </div>

        {lessonLoading && (
          <div className="pixel-panel flex items-center gap-3 p-6">
            <Loader2 className="text-primary h-5 w-5 animate-spin" />
            <p className="text-sm">AI กำลังเตรียมบทเรียนของระดับนี้...</p>
          </div>
        )}

        {lesson && (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* ซ้าย: เนื้อหา + quiz */}
            <section className="pixel-panel max-h-[80vh] space-y-5 overflow-y-auto p-5">
              <PixelMarkdown source={lesson.intro} />
              {lesson.sections.map((s, i) => (
                <div key={i} className="space-y-2">
                  <h2 className="text-gold text-[0.6rem]">{s.heading}</h2>
                  <PixelMarkdown source={s.body} />
                </div>
              ))}

              {lesson.keyPoints.length > 0 && (
                <div className="pixel-inset p-3">
                  <h3 className="pixel-text text-primary mb-2 text-[0.55rem]">KEY POINTS</h3>
                  {lesson.keyPoints.map((k, i) => (
                    <p key={i} className="text-sm">
                      ▸ {k}
                    </p>
                  ))}
                </div>
              )}

              <div className="border-border space-y-4 border-t-3 pt-4">
                <h2 className="text-accent flex items-center gap-2 text-[0.6rem]">
                  <Trophy className="h-4 w-4" /> QUIZ ท้ายบท
                </h2>
                {quiz.map((q, qi) => (
                  <div key={qi} className="space-y-2">
                    <p className="text-sm">
                      {qi + 1}. {q.question}
                    </p>
                    <div className="grid gap-2">
                      {q.choices.map((c, ci) => {
                        const selected = answers[qi] === ci;
                        const correct = checked && ci === q.answerIndex;
                        const wrong = checked && selected && ci !== q.answerIndex;
                        return (
                          <button
                            key={ci}
                            onClick={() => !checked && setAnswers((a) => ({ ...a, [qi]: ci }))}
                            className={`border-border border-3 px-3 py-2 text-left text-sm ${
                              correct
                                ? "bg-terminal text-background"
                                : wrong
                                  ? "bg-destructive text-destructive-foreground"
                                  : selected
                                    ? "bg-surface-2 text-primary"
                                    : "bg-background"
                            }`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                    {checked && (
                      <p className="text-muted-foreground text-sm">💡 {q.explanation}</p>
                    )}
                  </div>
                ))}

                {!checked ? (
                  <button
                    onClick={() => setChecked(true)}
                    disabled={Object.keys(answers).length < quiz.length}
                    className="pixel-btn bg-accent text-accent-foreground w-full"
                  >
                    ตรวจคำตอบ
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="pixel-text text-gold text-[0.55rem]">
                      SCORE {score}/{quiz.length}
                    </p>
                    {passed ? (
                      <button
                        onClick={finish}
                        disabled={saving}
                        className="pixel-btn bg-terminal text-background flex w-full items-center justify-center gap-2"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        ผ่านระดับนี้
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setChecked(false);
                          setAnswers({});
                        }}
                        className="pixel-btn bg-surface-2 text-foreground flex w-full items-center justify-center gap-2"
                      >
                        <RotateCcw className="h-4 w-4" /> ลองอีกครั้ง (ต้องได้ 60%)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* ขวา: editor บน / terminal ล่าง */}
            <section className="flex max-h-[80vh] flex-col gap-4">
              <div className="pixel-panel flex min-h-0 flex-1 flex-col">
                <div className="border-border bg-surface-2 flex items-center justify-between border-b-3 px-3 py-2">
                  <span className="pixel-text text-primary text-[0.55rem]">
                    {lesson.hasCodeLab ? "EDITOR · main.js" : "SCRATCHPAD"}
                  </span>
                  <button
                    onClick={() => setOutput(runJs(code))}
                    className="pixel-text bg-primary text-primary-foreground flex items-center gap-1 px-2 py-1 text-[0.5rem]"
                  >
                    <Play className="h-3 w-3" /> RUN
                  </button>
                </div>
                {lesson.challenge && (
                  <p className="border-border text-gold border-b-3 px-3 py-2 text-sm">
                    🎯 {lesson.challenge}
                  </p>
                )}
                <textarea
                  spellCheck={false}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="terminal-text text-foreground min-h-48 flex-1 resize-none bg-background p-3 outline-none"
                  placeholder="// เขียนโค้ด JavaScript แล้วกด RUN"
                />
              </div>

              <div className="pixel-panel scanlines flex h-56 flex-col">
                <div className="border-border bg-surface-2 flex items-center gap-2 border-b-3 px-3 py-2">
                  <Terminal className="text-terminal h-3 w-3" />
                  <span className="pixel-text text-terminal text-[0.55rem]">TERMINAL</span>
                </div>
                <div className="terminal-text text-terminal flex-1 overflow-y-auto bg-background p-3">
                  {output.length === 0 ? (
                    <p className="opacity-60">$ กด RUN เพื่อรันโค้ด...</p>
                  ) : (
                    output.map((line, i) => (
                      <p key={i} className="whitespace-pre-wrap">
                        {"> "}
                        {line}
                      </p>
                    ))
                  )}
                  <span className="blink-cursor">▮</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      <AskAiFab
        context={`บทเรียน "${node?.title ?? ""}" (${node?.subject ?? ""}) สำหรับผู้ที่อยากเป็น ${
          roadmap?.goal ?? ""
        }. เนื้อหา: ${lesson?.intro ?? ""}`}
      />
    </>
  );
}
