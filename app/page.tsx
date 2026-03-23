import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold text-[#00ffb2]">VT Outreach</h1>
      <div className="flex gap-4">
        <Link
          href="/queue"
          className="px-4 py-2 bg-[#00ffb2] text-black font-semibold rounded hover:opacity-90"
        >
          Review Queue
        </Link>
        <Link
          href="/leads"
          className="px-4 py-2 border border-[#282a30] text-[#e2e8f0] rounded hover:border-[#00ffb2]"
        >
          Leads
        </Link>
      </div>
    </main>
  );
}
