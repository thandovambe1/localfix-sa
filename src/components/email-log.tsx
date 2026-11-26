import { desc } from "drizzle-orm";
import { db } from "@/db";
import { emailOutbox } from "@/db/schema";
import { ready } from "@/lib/queries";
import { shortDate } from "@/lib/format";

export async function EmailLog({ limit = 12 }: { limit?: number }) {
  await ready();
  const rows = await db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(limit);

  if (!rows.length) {
    return <p className="mt-3 text-sm text-slate-500">No emails have been queued yet.</p>;
  }

  return (
    <div className="mt-3 space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="flex flex-wrap items-start gap-3 rounded-2xl border border-slate-100 p-3">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
              row.status === "sent"
                ? "bg-emerald-50 text-good"
                : row.status === "failed"
                  ? "bg-red-50 text-bad"
                  : "bg-amber-50 text-amber-700"
            }`}
          >
            {row.status}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-navy-800">{row.subject}</span>
            <span className="block truncate text-[11px] text-slate-500">
              {row.toEmail} · {row.category} · {shortDate(row.createdAt)} · attempts {row.attempts}
            </span>
            {row.lastError ? <span className="block truncate text-[10px] text-bad">{row.lastError}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
