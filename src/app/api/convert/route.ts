import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic();

const FORMAT_PROMPTS: Record<string, string> = {
  blog: `당신은 전문 블로그 작가입니다. 제공된 영상 자막을 기반으로 매력적인 블로그 글을 작성하세요.

요구사항:
- 흥미를 끄는 제목과 도입부로 시작
- 소제목을 활용해 섹션을 나누기
- 핵심 내용을 자연스러운 문체로 재구성
- 독자에게 유용한 인사이트를 강조
- 결론에서 핵심 메시지를 정리
- 마크다운 형식으로 작성
- 한국어로 작성`,

  presentation: `당신은 프레젠테이션 전문가입니다. 제공된 영상 자막을 기반으로 발표 대본을 작성하세요.

요구사항:
- 각 슬라이드별로 "## 슬라이드 N: 제목" 형식으로 구분
- 각 슬라이드마다 발표자가 말할 대본을 작성
- 핵심 포인트는 불릿으로 정리
- 오프닝과 클로징 멘트 포함
- 전환 문구를 자연스럽게 배치
- 마크다운 형식으로 작성
- 한국어로 작성`,

  study: `당신은 학습 노트 전문가입니다. 제공된 영상 자막을 기반으로 체계적인 학습 노트를 작성하세요.

요구사항:
- 주제와 학습 목표를 먼저 정리
- 핵심 개념을 번호 매기기로 구조화
- 중요한 용어는 **볼드** 처리
- 각 개념마다 간략한 설명 추가
- "기억할 점" 섹션으로 핵심 요약
- "복습 질문" 섹션 추가
- 마크다운 형식으로 작성
- 한국어로 작성`,
};

export async function POST(request: NextRequest) {
  try {
    const { fullText, format, videoId } = await request.json();

    if (!fullText || typeof fullText !== "string") {
      return Response.json(
        { error: "자막 텍스트가 필요합니다." },
        { status: 400 }
      );
    }

    const systemPrompt = FORMAT_PROMPTS[format];
    if (!systemPrompt) {
      return Response.json(
        { error: "지원하지 않는 형식입니다. (blog, presentation, study)" },
        { status: 400 }
      );
    }

    const truncated =
      fullText.length > 80000 ? fullText.slice(0, 80000) + "..." : fullText;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `다음은 YouTube 영상(${videoId})의 자막입니다. 위 지시에 따라 변환해주세요:\n\n${truncated}`,
        },
      ],
    });

    const result =
      message.content[0].type === "text" ? message.content[0].text : "";

    return Response.json({ result, format, videoId });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "변환 중 오류가 발생했습니다.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
