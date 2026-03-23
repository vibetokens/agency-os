"use client";

import { useState, useTransition } from "react";

interface Row {
  comment: {
    id: number;
    draft: string;
    editedDraft: string | null;
    status: string;
    promptVersion: string | null;
    createdAt: string;
  };
  post: {
    postUrl: string;
    postText: string | null;
    postedAt: string | null;
  };
  profile: {
    platform: string;
    profileUrl: string;
    profileName: string | null;
  };
  lead: {
    businessName: string;
    niche: string;
    city: string;
  };
}

export default function CommentCard({ row }: { row: Row }) {
  const [status, setStatus] = useState<"idle" | "done" | "rejected">("idle");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(row.comment.draft);
  const [isPending, startTransition] = useTransition();

  async function act(action: "approve" | "reject" | "edit") {
    const body: Record<string, string> = { action };
    if (action === "edit") body.editedDraft = editText;

    const res = await fetch(`/api/comments/${row.comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setStatus(action === "reject" ? "rejected" : "done");
      setEditing(false);
    }
  }

  if (status === "done") {
    return (
      <div className="border border-[#00ffb2]/20 rounded-lg p-4 opacity-50">
        <p className="text-[#00ffb2] text-sm">✓ Approved — {row.lead.businessName}</p>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="border border-[#282a30] rounded-lg p-4 opacity-40">
        <p className="text-[#52526b] text-sm">✗ Rejected — {row.lead.businessName}</p>
      </div>
    );
  }

  const platformColor = row.profile.platform === "linkedin" ? "text-blue-400" : "text-blue-600";

  return (
    <div className="border border-[#282a30] rounded-lg p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-[#e2e8f0]">{row.lead.businessName}</p>
          <p className="text-[#52526b] text-xs mt-0.5 capitalize">
            {row.lead.niche} · {row.lead.city}
          </p>
        </div>
        <a
          href={row.post.postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs uppercase tracking-widest border rounded px-2 py-0.5 ${platformColor} border-current opacity-70 hover:opacity-100 transition-opacity`}
        >
          {row.profile.platform}
        </a>
      </div>

      {/* Original post */}
      <div className="bg-[#0c0e13] rounded p-3 text-sm text-[#b9cbbe] leading-relaxed border border-[#282a30]/50">
        <p className="text-[10px] uppercase tracking-widest text-[#52526b] mb-2">Original post</p>
        <p className="line-clamp-4">{row.post.postText}</p>
        <a
          href={row.post.postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#52526b] hover:text-[#00ffb2] text-xs mt-2 block transition-colors"
        >
          View post →
        </a>
      </div>

      {/* Draft comment */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[#52526b] mb-2">
          Claude&apos;s draft
        </p>
        {editing ? (
          <textarea
            className="w-full bg-[#0c0e13] border border-[#00ffb2]/40 rounded p-3 text-sm text-[#e2e8f0] resize-none focus:outline-none focus:border-[#00ffb2]"
            rows={4}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
          />
        ) : (
          <p className="text-sm text-[#e2e8f0] leading-relaxed bg-[#0c0e13] border border-[#282a30]/50 rounded p-3">
            {row.comment.draft}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        {editing ? (
          <>
            <button
              onClick={() => startTransition(() => act("edit"))}
              disabled={isPending}
              className="px-4 py-1.5 bg-[#00ffb2] text-black text-sm font-semibold rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending ? "Saving..." : "Approve edit"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-1.5 border border-[#282a30] text-[#52526b] text-sm rounded hover:border-[#52526b] transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => startTransition(() => act("approve"))}
              disabled={isPending}
              className="px-4 py-1.5 bg-[#00ffb2] text-black text-sm font-semibold rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending ? "..." : "Approve"}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-1.5 border border-[#282a30] text-[#b9cbbe] text-sm rounded hover:border-[#52526b] transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => startTransition(() => act("reject"))}
              disabled={isPending}
              className="px-4 py-1.5 text-[#52526b] text-sm hover:text-red-400 transition-colors"
            >
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}
