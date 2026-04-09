"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim() || !nickname.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), nickname: nickname.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Save session to localStorage
      localStorage.setItem(
        "sf_session",
        JSON.stringify({
          workspaceId: data.workspace.id,
          accessCode: data.workspace.accessCode,
          memberId: data.member.id,
          nickname: data.member.nickname,
        })
      );

      router.push(`/workspace/${data.workspace.accessCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-md animate-fade-up delay-1">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-2">워크스페이스 만들기</h1>
          <p className="text-muted text-sm">팀과 함께 영상을 분석하고 콘텐츠를 만들어보세요.</p>
        </div>

        <div className="glass-card p-8 space-y-5">
          <div>
            <label className="block text-sm text-muted mb-2">워크스페이스 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 마케팅팀"
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted/50 outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-2">닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="팀에서 표시될 이름"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted/50 outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={loading || !name.trim() || !nickname.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-accent-warm text-[#0b0b0f] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? "생성 중..." : "워크스페이스 만들기"}
          </button>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          이미 초대 코드가 있나요?{" "}
          <button onClick={() => router.push("/workspace/join")} className="text-accent hover:underline">
            참여하기
          </button>
        </p>
      </div>
    </main>
  );
}
