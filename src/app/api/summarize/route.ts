import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `당신은 YouTube 영상 자막을 분석하여 고품질 구조화 문서를 생성하는 전문 AI입니다.

자막에는 타임스탬프 정보가 포함되어 있습니다. 이를 활용하여 시간 흐름에 따라 정리하세요.

반드시 아래 JSON 형식으로 응답하세요. JSON 외의 텍스트는 포함하지 마세요:

{
  "oneSentence": "영상 전체를 한 문장으로 요약",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "sections": [
    {
      "timestamp": "0:00",
      "title": "섹션 제목",
      "summary": "해당 구간의 내용을 2~4문장으로 요약",
      "details": ["세부 포인트 1", "세부 포인트 2"]
    }
  ],
  "keywords": ["키워드1", "키워드2"],
  "fullSummary": "영상 전체 내용을 마크다운으로 상세 정리 (## 소제목 활용, 3~5 단락)"
}

규칙:
- sections는 영상의 주제 전환에 따라 5~10개로 나누세요
- 각 section의 timestamp는 해당 구간의 시작 시간입니다 (예: "0:00", "3:24", "15:02")
- fullSummary에서는 마크다운 ## 소제목, **볼드**, 불릿 리스트를 적극 활용하세요
- 모든 텍스트는 한국어로 작성하세요
- 반드시 유효한 JSON으로 응답하세요`;

interface TranscriptItem {
  text: string;
  offset: number;
  duration: number;
}

function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function buildTimestampedText(transcript: TranscriptItem[]): string {
  const chunks: string[] = [];
  let currentChunk = "";
  let chunkStart = 0;

  for (const item of transcript) {
    if (currentChunk.length > 500) {
      chunks.push(`[${formatTimestamp(chunkStart)}] ${currentChunk.trim()}`);
      currentChunk = "";
      chunkStart = item.offset;
    }
    currentChunk += " " + item.text;
    if (!currentChunk.length) chunkStart = item.offset;
  }

  if (currentChunk.trim()) {
    chunks.push(`[${formatTimestamp(chunkStart)}] ${currentChunk.trim()}`);
  }

  return chunks.join("\n\n");
}

export async function POST(request: NextRequest) {
  try {
    const { fullText, videoId, transcript, videoTitle } = await request.json();

    if (!fullText || typeof fullText !== "string") {
      return Response.json(
        { error: "자막 텍스트가 필요합니다." },
        { status: 400 }
      );
    }

    // Build timestamped text if transcript array is available
    const contentText = transcript
      ? buildTimestampedText(transcript)
      : fullText;

    const truncated =
      contentText.length > 80000
        ? contentText.slice(0, 80000) + "..."
        : contentText;

    const titleInfo = videoTitle ? `영상 제목: "${videoTitle}"\n` : "";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${titleInfo}다음은 YouTube 영상(${videoId})의 타임스탬프 포함 자막입니다. 분석해주세요:\n\n${truncated}`,
        },
      ],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON response
    let structured;
    try {
      // Extract JSON from possible markdown code block
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      structured = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawText);
    } catch {
      // Fallback: return raw text as fullSummary
      structured = {
        oneSentence: "",
        keyPoints: [],
        sections: [],
        keywords: [],
        fullSummary: rawText,
      };
    }

    return Response.json({ structured, videoId });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "요약 중 오류가 발생했습니다.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
