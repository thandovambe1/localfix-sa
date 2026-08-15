"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function CompletionForm({
  jobId,
  initial,
}: {
  jobId: number;
  initial?: { workCompleted: string; materialsUsed: string; additionalNotes: string; completionPhotos: string[] } | null;
}) {
  const router = useRouter();
  const [workCompleted, setWorkCompleted] = useState(initial?.workCompleted ?? "");
  const [materialsUsed, setMaterialsUsed] = useState(initial?.materialsUsed ?? "");
  const [additionalNotes, setAdditionalNotes] = useState(initial?.additionalNotes ?? "");
  const [photos, setPhotos] = useState<string[]>(initial?.completionPhotos ?? []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    setError("");
    const selected = Array.from(files).slice(0, Math.max(0, 6 - photos.length));
    for (const file of selected) {
      if (!["image/png", "image/jpeg"].includes(file.type)) {
        setError("Completion photos must be PNG or JPG.");
        continue;
      }
      if (file.size > 750 * 1024) {
        setError(`${file.name} is larger than 750 KB. Compress it and try again.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => setPhotos((rows) => [...rows, String(reader.result ?? "")].slice(0, 6));
      reader.readAsDataURL(file);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/job-cards/${jobId}/completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workCompleted, materialsUsed, additionalNotes, completionPhotos: photos }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save completion details.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save completion details.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Provider completion</p>
        <h2 className="mt-1 text-xl font-extrabold text-navy-800">Complete Job</h2>
        <p className="mt-1 text-sm text-slate-600">Record the actual work before reviewing and signing the Job Card.</p>
      </div>
      <div>
        <label className="label" htmlFor="work-completed">Work completed <span className="text-bad">*</span></label>
        <textarea id="work-completed" required minLength={20} className="input min-h-32" value={workCompleted} onChange={(e) => setWorkCompleted(e.target.value)} placeholder="Describe the diagnosis, repairs and tests completed." />
      </div>
      <div>
        <label className="label" htmlFor="materials-used">Materials used</label>
        <textarea id="materials-used" className="input min-h-24" value={materialsUsed} onChange={(e) => setMaterialsUsed(e.target.value)} placeholder="List parts, materials, quantities and product details." />
      </div>
      <div>
        <label className="label" htmlFor="completion-notes">Additional notes</label>
        <textarea id="completion-notes" className="input min-h-24" value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} placeholder="Aftercare, maintenance or warranty notes." />
      </div>
      <div>
        <span className="label">Completion photos (optional, max 6)</span>
        <label className="flex cursor-pointer items-center justify-between rounded-2xl border-2 border-dashed border-slate-200 px-4 py-5 text-sm text-slate-600 transition hover:border-teal-300 hover:bg-teal-50">
          <span><strong className="text-navy-700">Upload photos</strong> · PNG/JPG · max 750 KB each</span>
          <span aria-hidden>📸</span>
          <input type="file" accept="image/png,image/jpeg" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
        </label>
        {photos.length ? (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {photos.map((photo, index) => (
              <div key={`${photo.slice(-20)}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-mist">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={`Completion ${index + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => setPhotos((rows) => rows.filter((_, i) => i !== index))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-xs text-white" aria-label={`Remove photo ${index + 1}`}>×</button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
        The final amount is locked to the accepted quotation. Additional charges require the normal LocalFix quotation/payment process and cannot be inserted here.
      </div>
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-bad">{error}</p> : null}
      <button className="btn btn-accent w-full" disabled={busy}>{busy ? "Saving…" : "Save & Review Job Card"}</button>
    </form>
  );
}

export function SignaturePanel({
  jobId,
  role,
  defaultName,
  confirmationText,
}: {
  jobId: number;
  role: "provider" | "customer";
  defaultName: string;
  confirmationText: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const points = useRef(0);
  const router = useRouter();
  const [signerName, setSignerName] = useState(defaultName);
  const [confirmed, setConfirmed] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0c2f5f";
      points.current = 0;
      setHasInk(false);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = e.currentTarget.getContext("2d");
    const p = pos(e);
    ctx?.beginPath();
    ctx?.moveTo(p.x, p.y);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const p = pos(e);
    const ctx = e.currentTarget.getContext("2d");
    ctx?.lineTo(p.x, p.y);
    ctx?.stroke();
    points.current += 1;
    setHasInk(true);
  }
  function up(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    points.current = 0;
    setHasInk(false);
    setError("");
  }
  async function sign() {
    if (!canvasRef.current || !hasInk || points.current < 4) return setError("Please draw your signature in the pad.");
    if (!confirmed) return setError("Please tick the confirmation before signing.");
    if (signerName.trim().length < 2) return setError("Enter your legal/display name.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/job-cards/${jobId}/sign/${role}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName, confirmed, signatureData: canvasRef.current.toDataURL("image/png") }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Signature could not be saved.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signature could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Electronic Signature</p>
      <h2 className="mt-1 text-xl font-extrabold text-navy-800">Sign Job Card</h2>
      <p className="mt-1 text-sm text-slate-600">Draw naturally with a mouse, trackpad, finger or stylus.</p>
      <div className="mt-5">
        <label className="label" htmlFor={`${role}-signer-name`}>Signer name <span className="text-bad">*</span></label>
        <input id={`${role}-signer-name`} className="input" required value={signerName} onChange={(e) => setSignerName(e.target.value)} />
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          className="block h-56 w-full cursor-crosshair touch-none sm:h-64"
          style={{ touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          aria-label="Signature drawing pad"
        />
        <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">Sign above this line</div>
      </div>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={clear} className="btn btn-ghost !px-4 !py-2 text-xs">Clear signature</button>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-mist px-4 py-3 text-sm leading-relaxed text-slate-700">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-teal-600" />
        <span>{confirmationText}</span>
      </label>
      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-bad">{error}</p> : null}
      <button type="button" onClick={sign} disabled={busy} className="btn btn-accent mt-4 w-full">{busy ? "Saving signature…" : "Sign Job Card"}</button>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Your drawn signature, account ID, role, name, time and limited technical metadata are recorded for document integrity.</p>
    </section>
  );
}

export function JobCardDocumentActions({ jobId, canDownload }: { jobId: number; canDownload: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className="btn btn-ghost !px-4 !py-2 text-sm">🖨 Print</button>
      {canDownload ? (
        <a href={`/api/job-cards/${jobId}/pdf`} className="btn btn-accent !px-4 !py-2 text-sm">⬇ Download PDF</a>
      ) : null}
    </div>
  );
}

export function CorrectionForm({ jobId }: { jobId: number }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/job-cards/${jobId}/corrections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not add correction.");
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add correction.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="card p-5 print:hidden">
      <h3 className="text-sm font-bold text-navy-800">Administrative correction annotation</h3>
      <p className="mt-1 text-xs text-slate-500">This adds an audit note. It never changes the signed or hashed record.</p>
      <textarea required minLength={10} maxLength={2000} className="input mt-3 min-h-24" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain the correction or dispute annotation." />
      {error ? <p className="mt-2 text-xs font-semibold text-bad">{error}</p> : null}
      <button disabled={busy} className="btn btn-primary mt-3 !px-4 !py-2 text-sm">{busy ? "Adding…" : "Add correction note"}</button>
    </form>
  );
}
