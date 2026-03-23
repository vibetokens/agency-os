import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import CommentCard from "@/components/CommentCard";

const { comments, posts, socialProfiles, leads } = schema;

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const pending = await db
    .select({
      comment: comments,
      post: posts,
      profile: socialProfiles,
      lead: leads,
    })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .innerJoin(socialProfiles, eq(posts.socialProfileId, socialProfiles.id))
    .innerJoin(leads, eq(socialProfiles.leadId, leads.id))
    .where(eq(comments.status, "pending"))
    .orderBy(comments.createdAt);

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#00ffb2]">Review Queue</h1>
          <p className="text-[#52526b] text-sm mt-1">
            {pending.length} comment{pending.length !== 1 ? "s" : ""} awaiting review
          </p>
        </div>
        <a
          href="/leads"
          className="text-sm text-[#52526b] hover:text-[#00ffb2] transition-colors"
        >
          View Leads →
        </a>
      </div>

      {pending.length === 0 ? (
        <div className="border border-[#282a30] rounded-lg p-12 text-center">
          <p className="text-[#52526b]">Queue is empty.</p>
          <p className="text-[#52526b] text-sm mt-2">
            Run <code className="text-[#00ffb2]">npx tsx scripts/draft.ts</code> to generate new drafts.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.map((row) => (
            <CommentCard key={row.comment.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
