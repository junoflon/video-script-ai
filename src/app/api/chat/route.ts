import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `당신은 YouTube 영상의 내용에 대해 답변하는 AI 어시스턴트입니다.

사용자가 제공한 영상 자막을 기반으로 질문에 답변하세요.

규칙:
- 자막에 나온 내용만을 기반으로 답변하세요
- 자막에 없는 내용이면 "영상에서 해당 내용을 찾을 수 없습니다"라고 답변하세요
- 답변은 간결하고 명확하게 작성하세요
- 관련 타임스탬프가 있으면 함께 언급하세요
- 한국어로 답변하세요
- 마크다운 형식을 사용하세요`;

export async function POST(request: NextRequest) {
  try {
    const { question, fullText, videoTitle, history } = await request.json();

    if (!question || !fullText) {
      return Response.json(
        { error: "질문과 영상 내용이 필요합니다." },
        { status: 400 }
      );
    }

    const truncated =
      fullText.length > 60000 ? fullText.slice(0, 60000) + "..." : fullText;

    const contextMessage = `영상 제목: "${videoTitle || "알 수 없음"}"\n\n영상 자막:\n${truncated}`;

    // Build conversation history
    const messages: { role: "user" | "assistant"; content: string }[] = [];

    // Add context as first user message
    messages.push({
      role: "user",
      content: `다음은 분석할 영상의 자막입니다:\n\n${contextMessage}\n\n이 영상 내용을 바탕으로 질문에 답변해주세요.`,
    });

    messages.push({
      role: "assistant",
      content: "네, 영상 내용을 확인했습니다. 질문해주세요!",
    });

    // Add previous conversation history
    if (Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }

    // Add current question
    messages.push({ role: "user", content: question });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
    });

    const answer =
      response.content[0].type === "text" ? response.content[0].text : "";

    return Response.json({ answer });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "답변 생성에 실패했습니다.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
