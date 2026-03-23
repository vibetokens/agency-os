import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const { comments } = schema;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const commentId = parseInt(id, 10);

  if (isNaN(commentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const { action, editedDraft } = body as {
    action: "approve" | "reject" | "edit";
    editedDraft?: string;
  };

  if (!["approve", "reject", "edit"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (action === "approve") {
    await db
      .update(comments)
      .set({ status: "approved", updatedAt: now })
      .where(eq(comments.id, commentId));
  } else if (action === "reject") {
    await db
      .update(comments)
      .set({ status: "rejected", updatedAt: now })
      .where(eq(comments.id, commentId));
  } else if (action === "edit") {
    if (!editedDraft) {
      return NextResponse.json({ error: "editedDraft required" }, { status: 400 });
    }
    await db
      .update(comments)
      .set({ editedDraft, status: "approved", updatedAt: now })
      .where(eq(comments.id, commentId));
  }

  return NextResponse.json({ ok: true });
}
