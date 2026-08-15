import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Check, Lock, Loader2, Play } from "lucide-react";

import { GameHeader } from "@/components/GameHeader";
import { AskAiFab } from "@/components/AskAiFab";
import { useAuth } from "@/hooks/useAuth";
import { fetchActiveRoadmap, fetchProgress } from "@/lib/game-data";

export const Route = createFileRoute("/path")({
  head: () => ({
    meta: [
      { title: "เส้นทางการเรียน (Learning Path) | PixelPath" },
      {
        name: "description",
        content: "ไล่เรียนทีละ node จากง่ายไปยาก ปลดล็อกระดับถัดไปเมื่อผ่าน quiz ของบทก่อนหน้า",
      },
      { property: "og:title", content: "เส้นทางการเรียนของคุณ | PixelPath" },
      { property: "og:description", content: "แผนที่การเรียนแบบเกม ไล่ระดับทีละ node" },
    ],
  }),
  component: PathPage,
});

const SUBJECT_COLOR: Record<string, string> = {
  coding: "bg-primary text-primary-foreground",
  science: "bg-accent text-accent-foreground",
  math: "bg-magic text-primary-foreground",
  theory: "bg-surface-2 text-foreground",
  project: "bg-gold text-gold-foreground",
};

function PathPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: roadmap, isLoading } = useQuery({
    queryKey: ["roadmap", user?.id],
    queryFn: fetchActiveRoadmap,
    enabled: !!user,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress", roadmap?.id],
    queryFn: () => fetchProgress(roadmap!.id),
    enabled: !!roadmap,
  });

  const done = new Set(progress.map((p) => p.node_index));
  const total = roadmap?.nodes.length ?? 0;
  const allDone = total > 0 && done.size >= total;

  return (
    <>
      <GameHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {isLoading && (
          <p className="text-primary flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดแผนที่...
          </p>
        )}

        {!isLoading && !roadmap && (
          <div className="pixel-panel p-6 text-center">
            <h1 className="text-primary text-sm">ยังไม่มีเส้นทาง</h1>
            <p className="text-muted-foreground mt-3 text-sm">
              คุยกับ ChiChi ก่อน เพื่อให้สร้าง roadmap ให้คุณ
            </p>
            <Link to="/" className="pixel-btn bg-primary text-primary-foreground mt-4 inline-block">
              ไปคุยกับ CHICHI
            </Link>
          </div>
        )}

        {roadmap && (
          <>
            <div className="pixel-panel mb-6 p-5">
              <h1 className="text-primary text-sm">{roadmap.title}</h1>
              <p className="text-muted-foreground mt-3 text-sm">{roadmap.summary}</p>
              <div className="pixel-inset mt-4 h-5 w-full p-1">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${total ? (done.size / total) * 100 : 0}%` }}
                />
              </div>
              <p className="pixel-text text-gold mt-2 text-[0.55rem]">
                {done.size}/{total} NODES CLEARED
              </p>
              {allDone && (
                <Link
                  to="/certificate"
                  className="pixel-btn bg-gold text-gold-foreground mt-4 inline-block"
                >
                  รับ CERTIFICATE
                </Link>
              )}
            </div>

            <ol className="space-y-3">
              {roadmap.nodes.map((node, i) => {
                const cleared = done.has(i);
                const unlocked = i === 0 || done.has(i - 1);
                return (
                  <li key={i} className={i % 2 === 0 ? "sm:pr-16" : "sm:pl-16"}>
                    <div className="pixel-panel flex items-center gap-4 p-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center border-3 border-background ${
                          cleared
                            ? "bg-terminal text-background"
                            : unlocked
                              ? SUBJECT_COLOR[node.subject] ?? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {cleared ? (
                          <Check className="h-5 w-5" />
                        ) : unlocked ? (
                          <span className="pixel-text text-[0.6rem]">{i + 1}</span>
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-foreground text-[0.6rem]">{node.title}</h2>
                        <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                          {node.description}
                        </p>
                        <p className="pixel-text text-muted-foreground mt-2 text-[0.5rem]">
                          {node.subject.toUpperCase()} · ~{node.estimatedHours}H
                        </p>
                      </div>
                      {unlocked ? (
                        <Link
                          to="/learn/$nodeIndex"
                          params={{ nodeIndex: String(i) }}
                          className="pixel-btn bg-primary text-primary-foreground flex items-center gap-2"
                        >
                          <Play className="h-3 w-3" />
                          {cleared ? "REPLAY" : "START"}
                        </Link>
                      ) : (
                        <span className="pixel-text text-muted-foreground text-[0.5rem]">
                          LOCKED
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </main>
      <AskAiFab
        context={`ผู้เรียนกำลังดูเส้นทางการเรียนเพื่อเป็น ${roadmap?.goal ?? "อาชีพสายเทค"}`}
      />
    </>
  );
}
