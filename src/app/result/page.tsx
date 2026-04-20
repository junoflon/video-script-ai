"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/* ───────────────── Types ───────────────── */

interface TranscriptItem {
  text: string;
  offset: number;
  duration: number;
}

interface VideoMeta {
  title: string;
  author: string;
  authorUrl: string;
  thumbnailUrl: string;
}

interface SummarySection {
  timestamp: string;
  title: string;
  summary: string;
  details: string[];
}

interface StructuredSummary {
  oneSentence: string;
  keyPoints: string[];
  sections: SummarySection[];
  keywords: string[];
  fullSummary: string;
}

type AnalysisStep = "idle" | "extracting" | "summarizing" | "done" | "error";
type ConvertFormat = "blog" | "presentation" | "study";
type ActiveTab = "summary" | "transcript" | "convert" | "chat";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/* ───────────────── Icons ───────────────── */

function PlayIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function CopyIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SubtitleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="14" x2="23" y2="14" />
      <line x1="5" y1="18" x2="12" y2="18" />
    </svg>
  );
}

function DownloadIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PenIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.376 3.622a1 1 0 013.002 3.002L7.368 18.635a2 2 0 01-.855.506l-2.872.838a.5.5 0 01-.62-.62l.838-2.872a2 2 0 01.506-.854z" />
    </svg>
  );
}

function ChatIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function ClockIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function TagIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.586 2.586A2 2 0 0011.172 2H4a2 2 0 00-2 2v7.172a2 2 0 00.586 1.414l8.704 8.704a2.426 2.426 0 003.42 0l6.58-6.58a2.426 2.426 0 000-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

/* ───────────────── Helpers ───────────────── */

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분 ${s}초`;
}

function parseStructured(data: unknown): StructuredSummary {
  let obj = data;
  // If it's a string, parse it
  if (typeof obj === "string") {
    try {
      const jsonMatch = (obj as string).match(/\{[\s\S]*\}/);
      obj = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(obj as string);
    } catch {
      return { oneSentence: "", keyPoints: [], sections: [], keywords: [], fullSummary: obj as string };
    }
  }
  const o = obj as Record<string, unknown>;
  return {
    oneSentence: (o.oneSentence as string) || "",
    keyPoints: Array.isArray(o.keyPoints) ? o.keyPoints : [],
    sections: Array.isArray(o.sections) ? o.sections : [],
    keywords: Array.isArray(o.keywords) ? o.keywords : [],
    fullSummary: (o.fullSummary as string) || "",
  };
}

const stepMessages: Record<AnalysisStep, { title: string; desc: string }> = {
  idle: { title: "대기 중", desc: "" },
  extracting: { title: "자막을 추출하고 있습니다", desc: "YouTube에서 자막 데이터를 가져오는 중..." },
  summarizing: { title: "AI가 분석하고 있습니다", desc: "영상 내용을 구조화하여 요약하는 중..." },
  done: { title: "분석 완료", desc: "" },
  error: { title: "오류 발생", desc: "" },
};

const formatLabels: Record<ConvertFormat, { label: string; desc: string; icon: string }> = {
  blog: { label: "블로그 포스트", desc: "SEO 친화적인 블로그 글로 변환", icon: "B" },
  presentation: { label: "발표 대본", desc: "슬라이드별 발표 스크립트 생성", icon: "P" },
  study: { label: "학습 노트", desc: "구조화된 학습 정리 노트 생성", icon: "S" },
};

/* ───────────────── Component ───────────────── */

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center min-h-screen">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <ResultContent />
    </Suspense>
  );
}

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoUrl = searchParams.get("url") || "";
  const analysisId = searchParams.get("id") || "";
  const workspaceCode = searchParams.get("workspace") || "";
  const contentRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<AnalysisStep>("idle");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [fullText, setFullText] = useState("");
  const [videoId, setVideoId] = useState("");
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [totalDuration, setTotalDuration] = useState(0);
  const [structured, setStructured] = useState<StructuredSummary | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("summary");
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  // Convert state
  const [convertFormat, setConvertFormat] = useState<ConvertFormat>("blog");
  const [convertResult, setConvertResult] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState("");
  const [convertLabel, setConvertLabel] = useState<string>("블로그 포스트");

  // Custom templates (workspace mode)
  const [templates, setTemplates] = useState<{ id: string; name: string; prompt: string }[]>([]);

  // PDF state
  const [isExporting, setIsExporting] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Comments state
  const [comments, setComments] = useState<{ id: string; content: string; createdAt: string; member: { nickname: string } }[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Load saved analysis from DB
  const loadSavedAnalysis = useCallback(async () => {
    if (!analysisId) return false;
    try {
      const res = await fetch(`/api/analysis?id=${analysisId}`);
      const data = await res.json();
      if (!res.ok) return false;

      const a = data.analysis;
      setVideoId(a.videoId);
      setTranscript(a.transcript || []);
      setFullText(a.fullText || "");
      setStructured(parseStructured(a.structuredSummary));
      setMeta({
        title: a.videoTitle || "",
        author: a.videoAuthor || "",
        authorUrl: "",
        thumbnailUrl: a.thumbnailUrl || "",
      });
      setComments(a.comments || []);

      const lastItem = a.transcript?.[a.transcript.length - 1];
      setTotalDuration(lastItem ? lastItem.offset + lastItem.duration : 0);
      setStep("done");
      return true;
    } catch {
      return false;
    }
  }, [analysisId]);

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const question = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: question }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          fullText,
          videoTitle: meta?.title || "",
          history: chatMessages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `오류: ${err instanceof Error ? err.message : "답변 생성 실패"}` },
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !analysisId) return;
    const stored = localStorage.getItem("sf_session");
    if (!stored) return;
    const sess = JSON.parse(stored);

    setSendingComment(true);
    try {
      const res = await fetch("/api/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          memberId: sess.memberId,
          content: newComment.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((prev) => [...prev, data.comment]);
        setNewComment("");
      }
    } finally {
      setSendingComment(false);
    }
  };

  const analyze = useCallback(async () => {
    // If loading from DB, skip fetch
    if (analysisId) {
      const loaded = await loadSavedAnalysis();
      if (loaded) return;
    }

    const source = searchParams.get("source");

    // Check if file upload result is in sessionStorage
    if (source === "file") {
      const stored = sessionStorage.getItem("sf_transcribe");
      if (stored) {
        sessionStorage.removeItem("sf_transcribe");
        const data = JSON.parse(stored);
        setTranscript(data.transcript || []);
        setFullText(data.fullText || "");
        setVideoId(data.videoId || "");
        setMeta(data.meta || null);
        const lastItem = data.transcript?.[data.transcript.length - 1];
        setTotalDuration(lastItem ? lastItem.offset + lastItem.duration : 0);

        // Go straight to summarize
        setStep("summarizing");
        try {
          const summaryRes = await fetch("/api/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullText: data.fullText,
              videoId: data.videoId || "file",
              transcript: data.transcript,
              videoTitle: data.meta?.title || "업로드 파일",
            }),
          });
          const summaryData = await summaryRes.json();
          if (!summaryRes.ok) throw new Error(summaryData.error);
          setStructured(parseStructured(summaryData.structured));
          setStep("done");
        } catch (err) {
          setError(err instanceof Error ? err.message : "요약 실패");
          setStep("error");
        }
        return;
      }
    }

    if (!videoUrl) return;

    setStep("extracting");
    setError("");

    try {
      let transcriptData;

      // Try YouTube subtitle API first, fall back to Whisper
      const isYouTube = /youtube\.com|youtu\.be/.test(videoUrl);

      if (isYouTube) {
        const ytRes = await fetch("/api/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: videoUrl }),
        });

        if (ytRes.ok) {
          transcriptData = await ytRes.json();
        } else {
          // YouTube subtitle failed → fallback to Whisper
          setStep("extracting");
          const whisperRes = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: videoUrl }),
          });
          transcriptData = await whisperRes.json();
          if (!whisperRes.ok) throw new Error(transcriptData.error);
        }
      } else {
        // Instagram/TikTok → use transcribe API directly
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: videoUrl }),
        });
        transcriptData = await res.json();
        if (!res.ok) throw new Error(transcriptData.error);
      }

      setTranscript(transcriptData.transcript);
      setVideoId(transcriptData.videoId || "");
      setFullText(transcriptData.fullText);
      setMeta(transcriptData.meta || null);
      const lastItem = transcriptData.transcript?.[transcriptData.transcript.length - 1];
      setTotalDuration(transcriptData.totalDuration || (lastItem ? lastItem.offset + lastItem.duration : 0));

      setStep("summarizing");
      const summaryRes = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullText: transcriptData.fullText,
          videoId: transcriptData.videoId,
          transcript: transcriptData.transcript,
          videoTitle: transcriptData.meta?.title || "",
        }),
      });

      const summaryData = await summaryRes.json();
      if (!summaryRes.ok) throw new Error(summaryData.error);

      setStructured(parseStructured(summaryData.structured));
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
      setStep("error");
    }
  }, [videoUrl]);

  useEffect(() => {
    analyze();
  }, [analyze]);

  // Load workspace templates when in workspace mode
  useEffect(() => {
    if (!workspaceCode) return;
    const stored = localStorage.getItem("sf_session");
    if (!stored) return;
    try {
      const sess = JSON.parse(stored);
      if (sess.accessCode !== workspaceCode) return;
      fetch(`/api/template?workspaceId=${sess.workspaceId}`)
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.templates)) setTemplates(d.templates);
        })
        .catch(() => {});
    } catch {}
  }, [workspaceCode]);

  const backPath = workspaceCode ? `/workspace/${workspaceCode}` : "/";

  const handleCopy = async () => {
    let text = "";
    if (activeTab === "summary" && structured) {
      text = structured.fullSummary || structured.oneSentence;
    } else if (activeTab === "transcript") {
      text = transcript.map((t) => `[${formatTime(t.offset)}] ${t.text}`).join("\n");
    } else if (activeTab === "convert") {
      text = convertResult;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConvert = async (format: ConvertFormat) => {
    setConvertFormat(format);
    setConvertLabel(formatLabels[format].label);
    setIsConverting(true);
    setConvertError("");
    setConvertResult("");

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullText, format, videoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConvertResult(data.result);
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : "변환 중 오류가 발생했습니다.");
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvertWithTemplate = async (tpl: { id: string; name: string; prompt: string }) => {
    setConvertLabel(tpl.name);
    setIsConverting(true);
    setConvertError("");
    setConvertResult("");

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullText, videoId, customPrompt: tpl.prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConvertResult(data.result);
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : "변환 중 오류가 발생했습니다.");
    } finally {
      setIsConverting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!contentRef.current) return;
    setIsExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const content = contentRef.current.cloneNode(true) as HTMLElement;
      content.style.background = "#ffffff";
      content.style.color = "#1a1a1a";
      content.style.padding = "40px";
      content.querySelectorAll("*").forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.color = "#1a1a1a";
      });
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `scriptflow-${videoId || "export"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(content)
        .save();
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="flex-1">
      {/* Header */}
      <header className="animate-fade-in delay-1 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.push(backPath)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-warm flex items-center justify-center">
              <PlayIcon className="w-4 h-4 text-[#0b0b0f]" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Script<span className="gradient-text">Flow</span>
            </span>
          </button>
          <div className="flex items-center gap-3">
            {step === "done" && (
              <>
                <button
                  onClick={handleExportPdf}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover transition-all text-sm text-muted hover:text-foreground disabled:opacity-40"
                >
                  {isExporting ? (
                    <div className="w-3.5 h-3.5 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <DownloadIcon className="w-3.5 h-3.5" />
                  )}
                  PDF
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover transition-all text-sm text-muted hover:text-foreground"
                >
                  {copied ? <CheckIcon className="w-3.5 h-3.5 text-green-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  {copied ? "복사됨" : "복사"}
                </button>
              </>
            )}
            <button
              onClick={() => router.push(backPath)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover transition-all text-sm text-muted hover:text-foreground"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              새 분석
            </button>
          </div>
        </div>
      </header>

      {/* Loading state */}
      {(step === "extracting" || step === "summarizing") && (
        <div className="max-w-2xl mx-auto px-6 pt-32 text-center animate-fade-up delay-1">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/15 to-accent-warm/15 border border-accent/20 mb-6">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-2xl font-semibold mb-3">{stepMessages[step].title}</h2>
          <p className="text-muted mb-8">{stepMessages[step].desc}</p>
          <div className="flex items-center justify-center gap-4">
            {["자막 추출", "AI 분석"].map((label, i) => {
              const isActive = (i === 0 && step === "extracting") || (i === 1 && step === "summarizing");
              const isDone = (i === 0 && step === "summarizing");
              return (
                <div key={label} className="flex items-center gap-3">
                  {i > 0 && <div className="w-12 h-px bg-border" />}
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full transition-all ${isDone ? "bg-green-400" : isActive ? "bg-accent animate-pulse" : "bg-muted/20"}`} />
                    <span className={`text-sm ${isDone ? "text-green-400" : isActive ? "text-accent" : "text-muted/40"}`}>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {step === "error" && (
        <div className="max-w-lg mx-auto px-6 pt-32 text-center animate-fade-up delay-1">
          <div className="glass-card p-10">
            <div className="text-red-400 text-xl font-semibold mb-3">오류가 발생했습니다</div>
            <p className="text-muted text-sm mb-6 leading-relaxed">{error}</p>
            <button
              onClick={() => router.push(backPath)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-surface border border-border hover:bg-surface-hover transition-all text-sm"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {step === "done" && structured && (
        <div className="animate-fade-up delay-1">
          {/* Video Hero */}
          <div className="border-b border-border">
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-full md:w-80 aspect-video rounded-xl overflow-hidden bg-surface">
                  <img
                    src={meta?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt={meta?.title || "Video"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                    }}
                  />
                  {totalDuration > 0 && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-xs font-mono">
                      {formatDuration(totalDuration)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl md:text-2xl font-semibold leading-snug mb-3">
                    {meta?.title || "영상 분석 결과"}
                  </h1>
                  {meta?.author && (
                    <p className="text-sm text-muted mb-4">{meta.author}</p>
                  )}
                  {/* One-sentence summary */}
                  <div className="p-4 rounded-xl bg-surface border border-border">
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {structured.oneSentence}
                    </p>
                  </div>
                  {/* Keywords */}
                  {structured.keywords.length > 0 && (
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <TagIcon className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                      {structured.keywords.map((kw) => (
                        <span key={kw} className="px-2.5 py-1 rounded-full text-xs bg-accent/10 text-accent border border-accent/15">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-border sticky top-0 z-20 bg-[#0b0b0f]/95 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex gap-0">
                {([
                  { key: "summary" as ActiveTab, label: "AI 요약", icon: null },
                  { key: "transcript" as ActiveTab, label: "자막", icon: <SubtitleIcon className="w-3.5 h-3.5" /> },
                  { key: "convert" as ActiveTab, label: "변환", icon: <PenIcon className="w-3.5 h-3.5" /> },
                  { key: "chat" as ActiveTab, label: "Q&A", icon: <ChatIcon className="w-3.5 h-3.5" /> },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all ${
                      activeTab === tab.key
                        ? "border-accent text-accent"
                        : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* ─── Summary Tab ─── */}
            {activeTab === "summary" && (
              <div className="flex gap-8">
                {/* Left: Table of Contents */}
                <aside className="hidden lg:block w-64 flex-shrink-0">
                  <div className="sticky top-20">
                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">목차</h3>
                    <nav className="space-y-1">
                      <button
                        onClick={() => {
                          setActiveSection(-1);
                          contentRef.current?.querySelector("#key-points")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                          activeSection === -1 ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground hover:bg-surface"
                        }`}
                      >
                        핵심 포인트
                      </button>
                      {structured.sections.map((sec, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setActiveSection(i);
                            contentRef.current?.querySelector(`#section-${i}`)?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                            activeSection === i ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground hover:bg-surface"
                          }`}
                        >
                          <span className="text-accent/50 font-mono text-xs mr-2">{sec.timestamp}</span>
                          {sec.title}
                        </button>
                      ))}
                    </nav>
                  </div>
                </aside>

                {/* Right: Content */}
                <div className="flex-1 min-w-0" ref={contentRef}>
                  {/* Key Points */}
                  {structured.keyPoints.length > 0 && (
                    <section id="key-points" className="mb-10">
                      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span className="gradient-text">핵심 포인트</span>
                      </h2>
                      <div className="grid gap-3">
                        {structured.keyPoints.map((point, i) => (
                          <div key={i} className="flex gap-3 p-4 rounded-xl bg-surface border border-border">
                            <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-semibold text-accent">{i + 1}</span>
                            </div>
                            <p className="text-sm text-foreground/90 leading-relaxed">{point}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Divider */}
                  <div className="gradient-divider mb-10" />

                  {/* Sections */}
                  <div className="space-y-8">
                    {structured.sections.map((sec, i) => (
                      <section key={i} id={`section-${i}`} className="scroll-mt-20">
                        <div className="flex items-start gap-4 mb-4">
                          <button
                            onClick={() => {
                              window.open(`https://youtube.com/watch?v=${videoId}&t=${parseTimestamp(sec.timestamp)}`, "_blank");
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-mono hover:bg-accent/20 transition-colors flex-shrink-0 mt-0.5"
                          >
                            <ClockIcon className="w-3 h-3" />
                            {sec.timestamp}
                          </button>
                          <h3 className="text-base font-semibold text-foreground leading-snug">{sec.title}</h3>
                        </div>
                        <div className="ml-0 md:ml-[76px]">
                          <p className="text-sm text-foreground/80 leading-relaxed mb-3">{sec.summary}</p>
                          {sec.details.length > 0 && (
                            <ul className="space-y-2">
                              {sec.details.map((d, j) => (
                                <li key={j} className="flex gap-2 text-sm text-foreground/70">
                                  <span className="text-accent/40 mt-1.5">•</span>
                                  <span className="leading-relaxed">{d}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </section>
                    ))}
                  </div>

                  {/* Full summary (expanded markdown) */}
                  {structured.fullSummary && (
                    <>
                      <div className="gradient-divider my-10" />
                      <section>
                        <h2 className="text-lg font-semibold mb-6">
                          <span className="gradient-text">상세 정리</span>
                        </h2>
                        <div
                          className="prose-custom"
                          dangerouslySetInnerHTML={{ __html: markdownToHtml(structured.fullSummary) }}
                        />
                      </section>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ─── Transcript Tab ─── */}
            {activeTab === "transcript" && (
              <div className="max-w-3xl">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-muted">
                    총 {transcript.length}개 세그먼트 · {totalDuration > 0 ? formatDuration(totalDuration) : ""}
                  </p>
                </div>
                <div className="space-y-1">
                  {transcript.map((t, i) => (
                    <div key={i} className="flex gap-4 py-2 px-3 rounded-lg hover:bg-surface transition-colors group">
                      <button
                        onClick={() => {
                          window.open(`https://youtube.com/watch?v=${videoId}&t=${Math.floor(t.offset / 1000)}`, "_blank");
                        }}
                        className="text-accent/50 group-hover:text-accent font-mono text-xs w-14 flex-shrink-0 pt-0.5 text-right transition-colors"
                      >
                        {formatTime(t.offset)}
                      </button>
                      <span className="text-sm text-foreground/80 leading-relaxed">
                        {t.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Convert Tab ─── */}
            {activeTab === "convert" && (
              <div className="max-w-3xl">
                {!convertResult && !isConverting && !convertError && (
                  <div>
                    <h2 className="text-lg font-semibold mb-2">스크립트 변환</h2>
                    <p className="text-sm text-muted mb-6">영상 자막을 원하는 형태의 문서로 변환합니다.</p>
                    <div className="grid gap-3">
                      {(Object.keys(formatLabels) as ConvertFormat[]).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => handleConvert(fmt)}
                          className="flex items-center gap-4 p-5 rounded-xl bg-surface border border-border hover:bg-surface-hover hover:border-accent/30 transition-all text-left group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/15 to-accent-warm/15 border border-accent/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-accent font-semibold">{formatLabels[fmt].icon}</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                              {formatLabels[fmt].label}
                            </h4>
                            <p className="text-xs text-muted mt-1">{formatLabels[fmt].desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    {workspaceCode && templates.length > 0 && (
                      <>
                        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mt-8 mb-3">
                          워크스페이스 커스텀 템플릿
                        </h3>
                        <div className="grid gap-3">
                          {templates.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => handleConvertWithTemplate(t)}
                              className="flex items-center gap-4 p-5 rounded-xl bg-surface border border-border hover:bg-surface-hover hover:border-accent/30 transition-all text-left group"
                            >
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-warm/15 to-accent/15 border border-accent/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-accent font-semibold">★</span>
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                                  {t.name}
                                </h4>
                                <p className="text-xs text-muted mt-1 line-clamp-2 whitespace-pre-wrap">{t.prompt}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {workspaceCode && templates.length === 0 && (
                      <p className="text-xs text-muted/50 mt-6">
                        팁: 워크스페이스 대시보드에서 커스텀 템플릿을 만들면 여기서 바로 사용할 수 있어요.
                      </p>
                    )}
                  </div>
                )}

                {isConverting && (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-accent/15 to-accent-warm/15 border border-accent/20 mb-4">
                      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-muted">
                      {convertLabel}(으)로 변환 중...
                    </p>
                  </div>
                )}

                {convertError && (
                  <div className="text-center py-12">
                    <p className="text-red-400 text-sm mb-4">{convertError}</p>
                    <button onClick={() => { setConvertError(""); setConvertResult(""); }} className="text-sm text-accent hover:underline">
                      다시 시도
                    </button>
                  </div>
                )}

                {convertResult && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xs text-accent px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 font-medium">
                        {convertLabel}
                      </span>
                      <button
                        onClick={() => { setConvertResult(""); setConvertError(""); }}
                        className="text-xs text-muted hover:text-foreground transition-colors"
                      >
                        다른 형식으로 변환
                      </button>
                    </div>
                    <div
                      ref={activeTab === "convert" ? contentRef : undefined}
                      className="prose-custom"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(convertResult) }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ─── Chat Tab ─── */}
            {activeTab === "chat" && (
              <div className="max-w-3xl">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold mb-1">영상 Q&A</h2>
                  <p className="text-sm text-muted">영상 내용에 대해 자유롭게 질문하세요. AI가 자막을 기반으로 답변합니다.</p>
                </div>

                {/* Chat messages */}
                <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto pr-2">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-12">
                      <ChatIcon className="w-8 h-8 text-muted/30 mx-auto mb-3" />
                      <p className="text-muted/50 text-sm">질문을 입력하면 AI가 영상 내용을 기반으로 답변합니다.</p>
                      <div className="flex flex-wrap gap-2 justify-center mt-4">
                        {["이 영상의 핵심 메시지는?", "가장 중요한 3가지 포인트는?", "실무에 어떻게 적용할 수 있을까?"].map((q) => (
                          <button
                            key={q}
                            onClick={() => { setChatInput(q); }}
                            className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted hover:text-foreground hover:border-accent/30 transition-all"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <ChatIcon className="w-3.5 h-3.5 text-accent" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                          msg.role === "user"
                            ? "bg-accent/15 text-foreground"
                            : "bg-surface border border-border"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <div className="prose-custom" dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} />
                        ) : (
                          <p>{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      </div>
                      <div className="bg-surface border border-border rounded-2xl px-4 py-3">
                        <p className="text-sm text-muted">답변을 생성하고 있습니다...</p>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat input */}
                <div className="flex gap-3 sticky bottom-4">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleChat()}
                    placeholder="영상에 대해 질문하세요..."
                    disabled={chatLoading}
                    className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted/50 outline-none focus:border-accent/50 transition-colors text-sm disabled:opacity-50"
                  />
                  <button
                    onClick={handleChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-warm text-[#0b0b0f] font-semibold text-sm disabled:opacity-40"
                  >
                    전송
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Comments section (only for saved analyses) */}
          {analysisId && (
            <div className="max-w-7xl mx-auto px-6 pb-16 mt-8">
              <div className="gradient-divider mb-8" />
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
                댓글 ({comments.length})
              </h2>

              {comments.length > 0 && (
                <div className="space-y-3 mb-6">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-3 p-4 rounded-xl bg-surface border border-border">
                      <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs text-accent font-semibold flex-shrink-0">
                        {c.member.nickname[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{c.member.nickname}</span>
                          <span className="text-xs text-muted/50">{new Date(c.createdAt).toLocaleString("ko-KR")}</span>
                        </div>
                        <p className="text-sm text-foreground/80">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  placeholder="댓글을 입력하세요..."
                  className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted/50 outline-none focus:border-accent/50 transition-colors text-sm"
                />
                <button
                  onClick={handleAddComment}
                  disabled={sendingComment || !newComment.trim()}
                  className="px-5 py-3 rounded-xl bg-accent text-[#0b0b0f] font-semibold text-sm disabled:opacity-40"
                >
                  {sendingComment ? "..." : "작성"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

/* ───────────────── Helpers ───────────────── */

function parseTimestamp(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-foreground mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-foreground mt-8 mb-3 gradient-text-inline">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-semibold text-foreground mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="text-foreground/80 text-sm leading-relaxed ml-4 mb-1.5 list-decimal">$1</li>')
    .replace(/^- (.+)$/gm, '<li class="text-foreground/80 text-sm leading-relaxed ml-4 mb-1.5">$1</li>')
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="mb-4 pl-4">$1</ul>')
    .replace(/^(?!<[hul])((?!<).+)$/gm, '<p class="text-foreground/80 text-sm leading-relaxed mb-3">$1</p>');
}
