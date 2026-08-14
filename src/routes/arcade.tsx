import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bug, Play, Trophy } from "lucide-react";
import { toast } from "sonner";

import { GameHeader } from "@/components/GameHeader";
import { AskAiFab } from "@/components/AskAiFab";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile } from "@/lib/game-data";
import { avatarSrc } from "@/lib/avatars";

export const Route = createFileRoute("/arcade")({
  head: () => ({
    meta: [
      { title: "Arcade: Bug Smash มินิเกมพักสมอง | PixelPath" },
      {
        name: "description",
        content: "เล่นมินิเกม Bug Smash กับตัวละครพิกเซลของคุณ ทุบบั๊กให้ทันเวลาแล้วแลกเป็น XP",
      },
      { property: "og:title", content: "Arcade: Bug Smash | PixelPath" },
      { property: "og:description", content: "มินิเกมพิกเซลสำหรับพักสมองระหว่างเรียน" },
    ],
  }),
  component: ArcadePage,
});

const SIZE = 9;
const GAME_SECONDS = 30;

function ArcadePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(GAME_SECONDS);
  const [score, setScore] = useState(0);
  const [bug, setBug] = useState(-1);
  const [best, setBest] = useState(0);
  const [avatar, setAvatar] = useState<string | null>(null);
  const rewarded = useRef(false);

  useEffect(() => {
    if (!user) return;
    fetchProfile(user.id).then((p) => setAvatar(p?.avatar_key ?? null));
  }, [user]);

  const award = useCallback(
    async (points: number) => {
      if (!user || points <= 0) return;
      const profile = await fetchProfile(user.id);
      await supabase
        .from("profiles")
        .update({ xp: (profile?.xp ?? 0) + points })
        .eq("id", user.id);
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success(`+${points} XP จาก Arcade!`);
    },
    [user, queryClient],
  );

  useEffect(() => {
    if (!playing) return;
    const tick = setInterval(() => setTime((t) => t - 1), 1000);
    const hop = setInterval(() => setBug(Math.floor(Math.random() * SIZE)), 750);
    return () => {
      clearInterval(tick);
      clearInterval(hop);
    };
  }, [playing]);

  useEffect(() => {
    if (playing && time <= 0) {
      setPlaying(false);
      setBug(-1);
      setBest((b) => Math.max(b, score));
      if (!rewarded.current) {
        rewarded.current = true;
        void award(score * 2);
      }
    }
  }, [playing, time, score, award]);

  function start() {
    rewarded.current = false;
    setScore(0);
    setTime(GAME_SECONDS);
    setBug(Math.floor(Math.random() * SIZE));
    setPlaying(true);
  }

  return (
    <>
      <GameHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-primary text-sm">ARCADE · BUG SMASH</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          พักสมองจากบทเรียน! ทุบบั๊กให้ได้มากที่สุดใน {GAME_SECONDS} วินาที แล้วแลกเป็น XP (1 บั๊ก =
          2 XP)
        </p>

        <div className="pixel-panel mt-5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={avatarSrc(avatar)}
                alt="ตัวละครพิกเซลของคุณ"
                width={48}
                height={48}
                loading="lazy"
                className="float-idle h-12 w-12"
              />
              <div>
                <p className="pixel-text text-gold text-[0.55rem]">SCORE {score}</p>
                <p className="pixel-text text-primary text-[0.55rem]">TIME {Math.max(time, 0)}</p>
              </div>
            </div>
            <p className="pixel-text text-muted-foreground flex items-center gap-2 text-[0.55rem]">
              <Trophy className="h-3 w-3" /> BEST {best}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: SIZE }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (playing && bug === i) {
                    setScore((s) => s + 1);
                    setBug(-1);
                  }
                }}
                aria-label={`ช่องที่ ${i + 1}`}
                className="pixel-inset flex aspect-square items-center justify-center"
              >
                {playing && bug === i && <Bug className="text-destructive h-8 w-8" />}
              </button>
            ))}
          </div>

          <button
            onClick={start}
            disabled={playing}
            className="pixel-btn bg-primary text-primary-foreground mt-5 flex w-full items-center justify-center gap-2"
          >
            <Play className="h-4 w-4" /> {playing ? "PLAYING..." : "START GAME"}
          </button>
          {!user && (
            <p className="text-muted-foreground mt-3 text-center text-sm">
              เข้าสู่ระบบเพื่อเก็บ XP จากการเล่น
            </p>
          )}
        </div>
      </main>
      <AskAiFab context="ผู้เรียนอยู่ในหน้า Arcade มินิเกม Bug Smash ของ PixelPath" />
    </>
  );
}
