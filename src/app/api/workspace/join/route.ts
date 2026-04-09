import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// POST: 접근 코드로 워크스페이스 참여
export async function POST(request: NextRequest) {
  try {
    const { accessCode, nickname } = await request.json();

    if (!accessCode || !nickname) {
      return Response.json(
        { error: "접근 코드와 닉네임이 필요합니다." },
        { status: 400 }
      );
    }

    const workspace = await prisma.workspace.findUnique({
      where: { accessCode: accessCode.toUpperCase() },
    });

    if (!workspace) {
      return Response.json(
        { error: "유효하지 않은 접근 코드입니다." },
        { status: 404 }
      );
    }

    // Check if nickname already exists in workspace
    const existing = await prisma.member.findFirst({
      where: { workspaceId: workspace.id, nickname },
    });

    if (existing) {
      // Return existing member (re-join)
      return Response.json({
        workspace: {
          id: workspace.id,
          name: workspace.name,
          accessCode: workspace.accessCode,
        },
        member: existing,
      });
    }

    const member = await prisma.member.create({
      data: {
        workspaceId: workspace.id,
        nickname,
        role: "member",
      },
    });

    return Response.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        accessCode: workspace.accessCode,
      },
      member,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "참여 실패";
    return Response.json({ error: msg }, { status: 500 });
  }
}
