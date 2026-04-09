"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* ───────────────── Icons (inline SVG) ───────────────── */

function PlayIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function SparklesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
  );
}

function FileTextIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function DownloadIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function LinkIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

/* ───────────────── Features Data ───────────────── */

const features = [
  {
    icon: <SparklesIcon className="w-5 h-5 text-accent" />,
    title: "AI 요약",
    desc: "영상의 핵심을 놓치지 마세요. AI가 자막을 분석해 구조화된 요약을 생성합니다.",
  },
  {
    icon: <FileTextIcon className="w-5 h-5 text-accent" />,
    title: "스크립트 변환",
    desc: "블로그, 발표 대본, 학습 노트 등 원하는 형태로 콘텐츠를 재구성합니다.",
  },
  {
    icon: <DownloadIcon className="w-5 h-5 text-accent" />,
    title: "PDF 내보내기",
    desc: "완성된 문서를 깔끔한 PDF로 다운로드. 언제 어디서든 활용하세요.",
  },
];

const steps = [
  { num: 1, title: "URL 입력", desc: "분석할 YouTube 영상 링크를 붙여넣기" },
  { num: 2, title: "AI 분석", desc: "자막 추출 후 AI가 내용을 분석·요약" },
  { num: 3, title: "결과 활용", desc: "스크립트 변환, PDF 다운로드까지 한번에" },
];

/* ───────────────── Page Component ───────────────── */

export default function Home() {
  const [url, setUrl] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [inputMode, setInputMode] = useState<"url" | "file">("url");
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleAnalyze = () => {
    if (!url.trim()) return;
    router.push(`/result?url=${encodeURIComponent(url.trim())}`);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Store transcribe result in sessionStorage and navigate
      sessionStorage.setItem("sf_transcribe", JSON.stringify(data));
      router.push("/result?source=file");
    } catch (err) {
      alert(err instanceof Error ? err.message : "파일 업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="flex-1">
      {/* ─── Header ─── */}
      <header className="animate-fade-in delay-1">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-warm flex items-center justify-center">
              <PlayIcon className="w-4 h-4 text-[#0b0b0f]" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Script<span className="gradient-text">Flow</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
            <a
              href="#features"
              className="hover:text-foreground transition-colors"
            >
              기능
            </a>
            <a
              href="#how-it-works"
              className="hover:text-foreground transition-colors"
            >
              사용법
            </a>
            <button onClick={() => router.push("/workspace/new")} className="px-4 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover transition-all text-foreground text-sm">
              워크스페이스
            </button>
          </nav>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        {/* Badge */}
        <div className="animate-fade-up delay-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface border border-border text-sm text-muted mb-8">
          <SparklesIcon className="w-3.5 h-3.5 text-accent" />
          <span>AI 기반 영상 분석</span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up delay-2 text-5xl md:text-7xl font-light leading-[1.1] tracking-tight mb-6">
          영상을{" "}
          <span
            className="italic gradient-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            글
          </span>
          로,
          <br />
          <span className="text-muted">순식간에</span>
        </h1>

        {/* Subheading */}
        <p className="animate-fade-up delay-3 text-lg md:text-xl text-muted max-w-2xl mx-auto mb-12 leading-relaxed">
          YouTube 링크 하나면 충분합니다.
          <br className="hidden md:block" />
          AI가 영상을 분석하고, 핵심을 정리하고, 원하는 형태로 변환합니다.
        </p>

        {/* Input Tabs */}
        <div className="animate-fade-up delay-4 max-w-2xl mx-auto">
          {/* Source toggle */}
          <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border mb-4 w-fit mx-auto">
            <button
              onClick={() => setInputMode("url")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                inputMode === "url"
                  ? "bg-gradient-to-r from-accent to-accent-warm text-[#0b0b0f]"
                  : "text-muted hover:text-foreground"
              }`}
            >
              URL 입력
            </button>
            <button
              onClick={() => setInputMode("file")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                inputMode === "file"
                  ? "bg-gradient-to-r from-accent to-accent-warm text-[#0b0b0f]"
                  : "text-muted hover:text-foreground"
              }`}
            >
              파일 첨부
            </button>
          </div>

          {inputMode === "url" ? (
            <>
              <div
                className={`input-glow rounded-2xl ${isFocused ? "focused" : ""}`}
              >
                <div className="relative flex items-center bg-surface border border-border rounded-2xl px-5 py-4 gap-3 transition-all">
                  <LinkIcon className="w-5 h-5 text-muted flex-shrink-0" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    placeholder="YouTube, Instagram, TikTok URL을 붙여넣으세요"
                    className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted/50 text-base"
                  />
                  <button
                    className="shimmer-btn flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-accent-warm text-[#0b0b0f] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                    disabled={!url.trim()}
                    onClick={handleAnalyze}
                  >
                    분석하기
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted/50">
                <span>YouTube</span>
                <span>·</span>
                <span>Instagram</span>
                <span>·</span>
                <span>TikTok</span>
              </div>
            </>
          ) : (
            <label
              className={`block cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-accent/40 bg-surface/50 transition-all p-10 text-center ${
                uploading ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <input
                type="file"
                accept="video/*,audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              {uploading ? (
                <div>
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted">영상을 분석하고 있습니다...</p>
                </div>
              ) : (
                <div>
                  <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                    <ArrowRightIcon className="w-5 h-5 text-accent rotate-90" />
                  </div>
                  <p className="text-sm text-foreground mb-1">영상/오디오 파일을 드래그하거나 클릭하세요</p>
                  <p className="text-xs text-muted/50">MP4, MP3, WAV, M4A 등</p>
                </div>
              )}
            </label>
          )}
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className="gradient-divider max-w-4xl mx-auto" />

      {/* ─── Features Section ─── */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="animate-fade-up delay-1 text-3xl md:text-4xl font-light tracking-tight mb-4">
            <span
              className="italic gradient-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              세 가지
            </span>{" "}
            핵심 기능
          </h2>
          <p className="animate-fade-up delay-2 text-muted text-lg">
            복잡한 건 AI에게, 결과만 가져가세요
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`glass-card p-7 animate-fade-up delay-${i + 3}`}
            >
              <div className="feature-icon mb-5">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="animate-fade-up delay-1 text-3xl md:text-4xl font-light tracking-tight mb-4">
            이렇게{" "}
            <span
              className="italic gradient-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              간단
            </span>
            합니다
          </h2>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-4 items-start">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className="flex-1 flex flex-col items-center text-center"
            >
              <div className={`animate-fade-up delay-${i + 2}`}>
                <div className="step-number mb-4">{s.num}</div>
              </div>
              <h3
                className={`animate-fade-up delay-${i + 3} text-base font-semibold mb-2`}
              >
                {s.title}
              </h3>
              <p className={`animate-fade-up delay-${i + 3} text-muted text-sm`}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="max-w-4xl mx-auto px-6 pb-32">
        <div className="glass-card p-12 text-center animate-fade-up delay-2">
          <h2 className="text-2xl md:text-3xl font-light tracking-tight mb-4">
            지금 바로{" "}
            <span
              className="italic gradient-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              시작
            </span>
            하세요
          </h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            YouTube 링크만 있으면 됩니다. 회원가입도, 복잡한 설정도 필요 없어요.
          </p>
          <button
            className="shimmer-btn inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-accent to-accent-warm text-[#0b0b0f] font-semibold hover:opacity-90 transition-opacity"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            영상 분석하기
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-accent to-accent-warm flex items-center justify-center">
              <PlayIcon className="w-3 h-3 text-[#0b0b0f]" />
            </div>
            <span>ScriptFlow</span>
          </div>
          <p className="text-muted/50">
            AI 기반 영상 분석 · 요약 · 스크립트 변환
          </p>
        </div>
      </footer>
    </main>
  );
}
