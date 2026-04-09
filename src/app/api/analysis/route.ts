import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// POST: 분석 결과 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId, memberId, videoUrl, videoId,
      videoTitle, videoAuthor, thumbnailUrl,
      transcript, fullText, structuredSummary,
    } = body;

    if (!projectId || !memberId || !videoUrl || !videoId) {
      return Response.json({ error: "필수 정보가 부족합니다." }, { status: 400 });
    }

    const analysis = await prisma.analysis.create({
      data: {
        projectId, memberId, videoUrl, videoId,
        videoTitle, videoAuthor, thumbnailUrl,
        transcript, fullText, structuredSummary,
      },
    });

    return Response.json({ analysis });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "저장 실패";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// GET: 분석 결과 상세 조회
export async function GET(request: NextRequest) {
  try {
    const analysisId = request.nextUrl.searchParams.get("id");

    if (!analysisId) {
      return Response.json({ error: "분석 ID가 필요합니다." }, { status: 400 });
    }

    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      include: {
        member: { select: { nickname: true } },
        project: { select: { name: true, workspaceId: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { member: { select: { nickname: true } } },
        },
      },
    });

    if (!analysis) {
      return Response.json({ error: "분석 결과를 찾을 수 없습니다." }, { status: 404 });
    }

    return Response.json({ analysis });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "조회 실패";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// DELETE: 분석 결과 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    await prisma.analysis.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "삭제 실패";
    return Response.json({ error: msg }, { status: 500 });
  }
}
