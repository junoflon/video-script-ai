import { fetchTranscript } from "youtube-transcript";
import { NextRequest } from "next/server";

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

async function fetchVideoMeta(videoId: string) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title || "",
      author: data.author_name || "",
      authorUrl: data.author_url || "",
      thumbnailUrl: data.thumbnail_url || "",
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return Response.json(
        { error: "YouTube URL이 필요합니다." },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      return Response.json(
        { error: "유효한 YouTube URL이 아닙니다." },
        { status: 400 }
      );
    }

    // Fetch transcript and metadata in parallel
    const [transcript, meta] = await Promise.all([
      fetchTranscript(videoId, { lang: "ko" }).catch(() =>
        fetchTranscript(videoId)
      ),
      fetchVideoMeta(videoId),
    ]);

    const fullText = transcript.map((t) => t.text).join(" ");

    // Calculate total duration from last transcript item
    const lastItem = transcript[transcript.length - 1];
    const totalDuration = lastItem ? lastItem.offset + lastItem.duration : 0;

    return Response.json({
      videoId,
      meta: meta || {
        title: "",
        author: "",
        authorUrl: "",
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      },
      totalDuration,
      transcript: transcript.map((t) => ({
        text: t.text,
        offset: t.offset,
        duration: t.duration,
      })),
      fullText,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "자막을 가져올 수 없습니다.";
    return Response.json({ error: message }, { status: 500 });
  }
}
