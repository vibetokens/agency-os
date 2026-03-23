import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";

const { leads } = schema;

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  discovered: "text-[#52526b] border-[#282a30]",
  matched: "text-blue-400 border-blue-400/30",
  monitoring: "text-yellow-400 border-yellow-400/30",
  draft_ready: "text-purple-400 border-purple-400/30",
  engaged: "text-[#00ffb2] border-[#00ffb2]/30",
  rejected: "text-red-400 border-red-400/30",
};

export default async function LeadsPage() {
  const allLeads = await db
    .select()
    .from(leads)
    .orderBy(desc(leads.createdAt))
    .limit(200);

  const byStatus = allLeads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#00ffb2]">Leads</h1>
          <p className="text-[#52526b] text-sm mt-1">{allLeads.length} total</p>
        </div>
        <a
          href="/queue"
          className="text-sm text-[#52526b] hover:text-[#00ffb2] transition-colors"
        >
          Review Queue →
        </a>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
        {Object.entries(byStatus).map(([status, count]) => (
          <div
            key={status}
            className={`border rounded p-3 text-center ${STATUS_COLORS[status] ?? "text-[#52526b] border-[#282a30]"}`}
          >
            <p className="text-lg font-bold">{count}</p>
            <p className="text-[10px] uppercase tracking-widest opacity-70">{status}</p>
          </div>
        ))}
      </div>

      {/* Leads table */}
      <div className="border border-[#282a30] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#282a30] text-[#52526b] text-[10px] uppercase tracking-widest">
              <th className="text-left p-3 font-normal">Business</th>
              <th className="text-left p-3 font-normal">Niche</th>
              <th className="text-left p-3 font-normal">City</th>
              <th className="text-left p-3 font-normal">Status</th>
              <th className="text-left p-3 font-normal">Website</th>
            </tr>
          </thead>
          <tbody>
            {allLeads.map((lead, i) => (
              <tr
                key={lead.id}
                className={`border-b border-[#282a30]/50 hover:bg-[#0c0e13] transition-colors ${
                  i === allLeads.length - 1 ? "border-b-0" : ""
                }`}
              >
                <td className="p-3 font-medium text-[#e2e8f0]">{lead.businessName}</td>
                <td className="p-3 text-[#52526b] capitalize">{lead.niche}</td>
                <td className="p-3 text-[#52526b]">{lead.city}</td>
                <td className="p-3">
                  <span
                    className={`text-[10px] uppercase tracking-widest border rounded px-2 py-0.5 ${
                      STATUS_COLORS[lead.status] ?? "text-[#52526b] border-[#282a30]"
                    }`}
                  >
                    {lead.status}
                  </span>
                </td>
                <td className="p-3">
                  {lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#52526b] hover:text-[#00ffb2] truncate max-w-[180px] block transition-colors"
                    >
                      {lead.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <span className="text-[#282a30]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
