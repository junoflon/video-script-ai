import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// POST: 댓글 작성
export async function POST(request: NextRequest) {
  try {
    const { analysisId, memberId, content } = await request.json();

    if (!analysisId || !memberId || !content) {
      return Response.json({ error: "필수 정보가 부족합니다." }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: { analysisId, memberId, content },
      include: { member: { select: { nickname: true } } },
    });

    return Response.json({ comment });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "댓글 작성 실패";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// DELETE: 댓글 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    await prisma.comment.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "삭제 실패";
    return Response.json({ error: msg }, { status: 500 });
  }
}
