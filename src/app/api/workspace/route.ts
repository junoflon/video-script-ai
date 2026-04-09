import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import crypto from "crypto";

function generateAccessCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase(); // e.g. "A1B2C3"
}

// POST: 워크스페이스 생성
export async function POST(request: NextRequest) {
  try {
    const { name, nickname } = await request.json();

    if (!name || !nickname) {
      return Response.json(
        { error: "워크스페이스 이름과 닉네임이 필요합니다." },
        { status: 400 }
      );
    }

    const accessCode = generateAccessCode();

    const workspace = await prisma.workspace.create({
      data: {
        name,
        accessCode,
        members: {
          create: {
            nickname,
            role: "admin",
          },
        },
      },
      include: { members: true },
    });

    return Response.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        accessCode: workspace.accessCode,
      },
      member: workspace.members[0],
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "워크스페이스 생성 실패";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// GET: 워크스페이스 정보 조회
export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("id");

    if (!workspaceId) {
      return Response.json({ error: "워크스페이스 ID가 필요합니다." }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: { orderBy: { createdAt: "asc" } },
        projects: { orderBy: { updatedAt: "desc" } },
        templates: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!workspace) {
      return Response.json({ error: "워크스페이스를 찾을 수 없습니다." }, { status: 404 });
    }

    return Response.json({ workspace });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "조회 실패";
    return Response.json({ error: msg }, { status: 500 });
  }
}
