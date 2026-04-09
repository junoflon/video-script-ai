import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// POST: 템플릿 생성
export async function POST(request: NextRequest) {
  try {
    const { workspaceId, name, type, prompt, memberId } = await request.json();

    if (!workspaceId || !name || !prompt || !memberId) {
      return Response.json({ error: "필수 정보가 부족합니다." }, { status: 400 });
    }

    const template = await prisma.template.create({
      data: {
        workspaceId,
        name,
        type: type || "custom",
        prompt,
        createdBy: memberId,
      },
    });

    return Response.json({ template });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "템플릿 생성 실패";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// GET: 워크스페이스의 템플릿 목록
export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
      return Response.json({ error: "워크스페이스 ID가 필요합니다." }, { status: 400 });
    }

    const templates = await prisma.template.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      include: { creator: { select: { nickname: true } } },
    });

    return Response.json({ templates });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "조회 실패";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// PUT: 템플릿 수정
export async function PUT(request: NextRequest) {
  try {
    const { id, name, type, prompt } = await request.json();

    if (!id) {
      return Response.json({ error: "템플릿 ID가 필요합니다." }, { status: 400 });
    }

    const template = await prisma.template.update({
      where: { id },
      data: { name, type, prompt },
    });

    return Response.json({ template });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "수정 실패";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// DELETE: 템플릿 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    await prisma.template.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "삭제 실패";
    return Response.json({ error: msg }, { status: 500 });
  }
}
