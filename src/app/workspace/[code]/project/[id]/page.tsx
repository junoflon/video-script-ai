"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface AnalysisItem {
  id: string;
  videoTitle: string | null;
  videoAuthor: string | null;
  videoId: string;
  thumbnailUrl: string | null;
  createdAt: string;
  member: { nickname: string };
  _count: { comments: number };
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  analyses: AnalysisItem[];
}

interface Session {
  workspaceId: string;
  accessCode: string;
  memberId: string;
  nickname: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState("");

  const loadProject = useCallback(async () => {
    const res = await fetch(`/api/project?id=${projectId}`);
    const data = await res.json();
    if (res.ok) setProject(data.project);
  }, [projectId]);

  useEffect(() => {
    const stored = localStorage.getItem("sf_session");
    if (!stored) { router.push("/workspace/join"); return; }
    const sess: Session = JSON.parse(stored);
    setSession(sess);
    loadProject().finally(() => setLoading(false));
  }, [router, loadProject]);

  const handleAnalyze = async () => {
    if (!url.trim() || !session) return;
    setAnalyzing(true);

    try {
      // Step 1: transcript
      setAnalyzeStep("자막 추출 중...");
      const tRes = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const tData = await tRes.json();
      if (!tRes.ok) throw new Error(tData.error);

      // Step 2: summarize
      setAnalyzeStep("AI 요약 중...");
      const sRes = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullText: tData.fullText,
          videoId: tData.videoId,
          transcript: tData.transcript,
          videoTitle: tData.meta?.title || "",
        }),
      });
      const sData = await sRes.json();
      if (!sRes.ok) throw new Error(sData.error);

      // Step 3: save to DB
      setAnalyzeStep("저장 중...");
      const aRes = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          memberId: session.memberId,
          videoUrl: url.trim(),
          videoId: tData.videoId,
          videoTitle: tData.meta?.title || null,
          videoAuthor: tData.meta?.author || null,
          thumbnailUrl: tData.meta?.thumbnailUrl || null,
          transcript: tData.transcript,
          fullText: tData.fullText,
          structuredSummary: sData.structured,
        }),
      });
      if (!aRes.ok) {
        const aData = await aRes.json();
        throw new Error(aData.error);
      }

      setUrl("");
      loadProject();
    } catch (err) {
      alert(err instanceof Error ? err.message : "분석 실패");
    } finally {
      setAnalyzing(false);
      setAnalyzeStep("");
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!project || !session) return null;

  return (
    <main className="flex-1">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/workspace/${code}`)}
              className="text-muted hover:text-foreground transition-colors text-sm"
            >
              ← 대시보드
            </button>
            <span className="text-border">/</span>
            <h1 className="text-lg font-semibold">{project.name}</h1>
          </div>
          <span className="text-sm text-muted">{project.analyses.length}개 분석</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* URL input for new analysis */}
        <div className="glass-card p-5 mb-8">
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="YouTube URL을 입력하세요"
              disabled={analyzing}
              className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted/50 outline-none focus:border-accent/50 transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !url.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-warm text-[#0b0b0f] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 whitespace-nowrap"
            >
              {analyzing ? analyzeStep : "분석하기"}
            </button>
          </div>
        </div>

        {/* Analysis list */}
        {project.analyses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted mb-2">아직 분석 결과가 없습니다</p>
            <p className="text-muted/50 text-sm">위에서 YouTube URL을 입력해 분석을 시작하세요.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {project.analyses.map((a) => (
              <button
                key={a.id}
                onClick={() => router.push(`/result?id=${a.id}&workspace=${code}`)}
                className="glass-card p-4 flex items-center gap-4 text-left hover:border-accent/30 transition-all"
              >
                <img
                  src={a.thumbnailUrl || `https://img.youtube.com/vi/${a.videoId}/mqdefault.jpg`}
                  alt=""
                  className="w-28 h-16 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {a.videoTitle || a.videoId}
                  </h3>
                  {a.videoAuthor && (
                    <p className="text-xs text-muted mt-0.5">{a.videoAuthor}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted/60">
                    <span>{a.member.nickname}</span>
                    <span>·</span>
                    <span>{new Date(a.createdAt).toLocaleDateString("ko-KR")}</span>
                    {a._count.comments > 0 && (
                      <>
                        <span>·</span>
                        <span>댓글 {a._count.comments}</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
