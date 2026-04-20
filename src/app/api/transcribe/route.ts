import { NextRequest } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import Groq from "groq-sdk";

const execAsync = promisify(exec);

let groqClient: Groq | null = null;
function getGroq(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY가 설정되지 않았습니다. 서버 환경변수를 확인하세요.");
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

type SourceType = "youtube" | "instagram" | "tiktok" | "file";

interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

function detectSource(url: string): SourceType | null {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/instagram\.com/.test(url)) return "instagram";
  if (/tiktok\.com/.test(url)) return "tiktok";
  return null;
}

let cachedYtDlpPath: string | null = null;

async function findYtDlp(): Promise<string> {
  if (cachedYtDlpPath) return cachedYtDlpPath;

  const candidates = [
    "/usr/local/bin/yt-dlp",
    "/usr/bin/yt-dlp",
    "/opt/homebrew/bin/yt-dlp",
  ];

  for (const p of candidates) {
    try {
      await fs.access(p);
      await execAsync(`${p} --version`);
      cachedYtDlpPath = p;
      return p;
    } catch {
      continue;
    }
  }

  try {
    const { stdout } = await execAsync("command -v yt-dlp || which yt-dlp");
    const resolved = stdout.trim();
    if (resolved) {
      await execAsync(`${resolved} --version`);
      cachedYtDlpPath = resolved;
      return resolved;
    }
  } catch {
    /* fall through */
  }

  throw new Error(
    "yt-dlp를 찾을 수 없습니다. 서버 이미지에 yt-dlp가 설치됐는지 확인하세요 (Dockerfile 빌드 여부 포함)."
  );
}

function extractorArgs(url: string): string {
  // YouTube: android client bypasses JS runtime requirement + some bot checks
  if (/youtube\.com|youtu\.be/.test(url)) {
    return `--extractor-args "youtube:player_client=android,web"`;
  }
  return "";
}

async function downloadAudio(url: string, tmpDir: string): Promise<string> {
  const outputPath = path.join(tmpDir, "audio.mp3");
  const ytdlp = await findYtDlp();
  const extArgs = extractorArgs(url);

  await execAsync(
    `${ytdlp} ${extArgs} --no-warnings --no-playlist -x --audio-format mp3 --audio-quality 5 -o "${path.join(tmpDir, "audio.%(ext)s")}" "${url}"`,
    { timeout: 180000 }
  );

  // yt-dlp might create the file with different name
  const files = await fs.readdir(tmpDir);
  const audioFile = files.find((f) => f.endsWith(".mp3") || f.endsWith(".m4a") || f.endsWith(".wav"));

  if (!audioFile) throw new Error("오디오 추출에 실패했습니다.");

  const actualPath = path.join(tmpDir, audioFile);

  // Convert to mp3 if not already
  if (!audioFile.endsWith(".mp3")) {
    await execAsync(`ffmpeg -i "${actualPath}" -vn -acodec libmp3lame -q:a 5 "${outputPath}" -y`);
    return outputPath;
  }

  return actualPath;
}

async function fetchVideoMeta(url: string): Promise<{ title: string; author: string; thumbnailUrl: string } | null> {
  try {
    const ytdlp = await findYtDlp();
    const extArgs = extractorArgs(url);
    const { stdout } = await execAsync(
      `${ytdlp} ${extArgs} --no-warnings --dump-json --no-download "${url}"`,
      { timeout: 30000 }
    );
    const data = JSON.parse(stdout);
    return {
      title: data.title || data.fulltitle || "",
      author: data.uploader || data.channel || "",
      thumbnailUrl: data.thumbnail || "",
    };
  } catch {
    return null;
  }
}

async function transcribeWithGroq(audioPath: string): Promise<TranscriptSegment[]> {
  const stat = await fs.stat(audioPath);

  // Groq Whisper has 25MB limit — split if larger
  if (stat.size > 24 * 1024 * 1024) {
    return await transcribeLargeFile(audioPath);
  }

  const audioBuffer = await fs.readFile(audioPath);
  const audioFile = new File([audioBuffer], "audio.mp3", { type: "audio/mp3" });

  const response = await getGroq().audio.transcriptions.create({
    file: audioFile,
    model: "whisper-large-v3",
    language: "ko",
    response_format: "verbose_json",
  });

  // Parse segments from verbose_json
  const segments: TranscriptSegment[] = [];
  const responseAny = response as unknown as Record<string, unknown>;

  if (responseAny.segments) {
    for (const seg of responseAny.segments as Array<{ text: string; start: number; end: number }>) {
      segments.push({
        text: seg.text.trim(),
        offset: Math.round(seg.start * 1000),
        duration: Math.round((seg.end - seg.start) * 1000),
      });
    }
  } else if (response.text) {
    // Fallback: single segment
    segments.push({
      text: response.text,
      offset: 0,
      duration: 0,
    });
  }

  return segments;
}

async function transcribeLargeFile(audioPath: string): Promise<TranscriptSegment[]> {
  const tmpDir = path.dirname(audioPath);
  const segments: TranscriptSegment[] = [];

  // Split into 10-minute chunks
  await execAsync(
    `ffmpeg -i "${audioPath}" -f segment -segment_time 600 -c copy "${path.join(tmpDir, "chunk_%03d.mp3")}" -y`
  );

  const files = await fs.readdir(tmpDir);
  const chunks = files.filter((f) => f.startsWith("chunk_")).sort();

  let offsetMs = 0;

  for (const chunk of chunks) {
    const chunkPath = path.join(tmpDir, chunk);
    const chunkBuffer = await fs.readFile(chunkPath);
    const audioFile = new File([chunkBuffer], chunk, { type: "audio/mp3" });

    const response = await getGroq().audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3",
      language: "ko",
      response_format: "verbose_json",
    });

    const chunkAny = response as unknown as Record<string, unknown>;
    if (chunkAny.segments) {
      for (const seg of chunkAny.segments as Array<{ text: string; start: number; end: number }>) {
        segments.push({
          text: seg.text.trim(),
          offset: offsetMs + Math.round(seg.start * 1000),
          duration: Math.round((seg.end - seg.start) * 1000),
        });
      }
      const segs = chunkAny.segments as Array<{ end: number }>;
      const lastSeg = segs[segs.length - 1];
      if (lastSeg) offsetMs += Math.round(lastSeg.end * 1000);
    }
  }

  return segments;
}

// POST: URL → 오디오 다운로드 → Groq Whisper → 자막
export async function POST(request: NextRequest) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sf-transcribe-"));

  try {
    const contentType = request.headers.get("content-type") || "";

    let sourceType: SourceType;
    let url = "";
    let audioPath = "";
    let meta: { title: string; author: string; thumbnailUrl: string } | null = null;

    if (contentType.includes("multipart/form-data")) {
      // File upload
      sourceType = "file";
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return Response.json({ error: "파일이 필요합니다." }, { status: 400 });
      }

      // Save uploaded file
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadPath = path.join(tmpDir, file.name);
      await fs.writeFile(uploadPath, buffer);

      // Convert to mp3
      audioPath = path.join(tmpDir, "audio.mp3");
      await execAsync(`ffmpeg -i "${uploadPath}" -vn -acodec libmp3lame -q:a 5 "${audioPath}" -y`);

      meta = { title: file.name.replace(/\.[^.]+$/, ""), author: "", thumbnailUrl: "" };
    } else {
      // URL-based
      const body = await request.json();
      url = body.url;

      if (!url || typeof url !== "string") {
        return Response.json({ error: "URL이 필요합니다." }, { status: 400 });
      }

      const detected = detectSource(url);
      if (!detected) {
        return Response.json(
          { error: "지원하지 않는 URL입니다. (YouTube, Instagram, TikTok)" },
          { status: 400 }
        );
      }
      sourceType = detected;

      // For YouTube, try built-in subtitles first
      if (sourceType === "youtube") {
        try {
          const { fetchTranscript } = await import("youtube-transcript");
          const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          const videoId = videoIdMatch?.[1];

          if (videoId) {
            const transcript = await fetchTranscript(videoId, { lang: "ko" }).catch(
              () => fetchTranscript(videoId)
            );

            const fullText = transcript.map((t) => t.text).join(" ");

            // Fetch meta via oembed
            let ytMeta = null;
            try {
              const metaRes = await fetch(
                `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
              );
              if (metaRes.ok) {
                const m = await metaRes.json();
                ytMeta = {
                  title: m.title || "",
                  author: m.author_name || "",
                  thumbnailUrl: m.thumbnail_url || "",
                };
              }
            } catch {}

            return Response.json({
              sourceType,
              videoId,
              meta: ytMeta || { title: "", author: "", thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` },
              transcript: transcript.map((t) => ({
                text: t.text,
                offset: t.offset,
                duration: t.duration,
              })),
              fullText,
            });
          }
        } catch {
          // Fall through to Whisper
        }
      }

      // Download audio
      [meta, audioPath] = await Promise.all([
        fetchVideoMeta(url),
        downloadAudio(url, tmpDir),
      ]) as [typeof meta, string];
    }

    // Transcribe with Groq Whisper
    const transcript = await transcribeWithGroq(audioPath);
    const fullText = transcript.map((t) => t.text).join(" ");

    return Response.json({
      sourceType,
      videoId: null,
      meta: meta || { title: "", author: "", thumbnailUrl: "" },
      transcript,
      fullText,
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "변환에 실패했습니다.";
    const friendly = translateError(raw);
    return Response.json({ error: friendly, raw }, { status: 500 });
  } finally {
    // Cleanup temp directory
    fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function translateError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("sign in to confirm") || lower.includes("not a bot")) {
    return "YouTube가 이 영상을 봇 차단으로 막았어요. 다른 영상으로 시도하거나, 자막이 있는 영상을 사용해 주세요.";
  }
  if (lower.includes("video unavailable") || lower.includes("private video")) {
    return "비공개이거나 삭제된 영상이에요. URL을 확인해 주세요.";
  }
  if (lower.includes("age") && lower.includes("restricted")) {
    return "연령 제한 영상이라 추출할 수 없어요.";
  }
  if (lower.includes("geo") || lower.includes("not available in your country")) {
    return "지역 제한으로 이 서버에서는 접근할 수 없는 영상이에요.";
  }
  if (lower.includes("no supported javascript runtime")) {
    return "서버 구성 문제입니다(JS 런타임 미설치). 관리자에게 문의해 주세요.";
  }
  if (lower.includes("yt-dlp") && lower.includes("not found")) {
    return "서버에 yt-dlp가 설치돼있지 않습니다. 관리자에게 문의해 주세요.";
  }
  if (lower.includes("timed out") || lower.includes("timeout")) {
    return "영상 처리 시간이 초과됐어요. 더 짧은 영상으로 시도해 주세요.";
  }
  if (lower.includes("groq_api_key") || lower.includes("anthropic_api_key")) {
    return "서버 API 키 설정 문제입니다. 관리자에게 문의해 주세요.";
  }
  return "영상 처리 중 문제가 발생했어요. 다른 URL로 시도해 보세요.";
}
