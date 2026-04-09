import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// POST: 프로젝트 생성
export async function POST(request: NextRequest) {
  try {
    const { workspaceId, name, description, memberId } = await request.json();

    if (!workspaceId || !name || !memberId) {
      return Response.json({ error: "필수 정보가 부족합니다." }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: { workspaceId, name, description, createdBy: memberId },
    });

    return Response.json({ project });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "프로젝트 생성 실패";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// GET: 프로젝트 상세 (분석 결과 포함)
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("id");

    if (!projectId) {
      return Response.json({ error: "프로젝트 ID가 필요합니다." }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          include: {
            member: { select: { nickname: true } },
            _count: { select: { comments: true } },
          },
        },
      },
    });

    if (!project) {
      return Response.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    return Response.json({ project });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "조회 실패";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// DELETE: 프로젝트 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    await prisma.project.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "삭제 실패";
    return Response.json({ error: msg }, { status: 500 });
  }
}
