import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { authorizeJobCard, getJobCardBundle } from "@/lib/job-cards";
import { ready } from "@/lib/queries";
import { categoryName } from "@/lib/services";

export const dynamic = "force-dynamic";

const NAVY = rgb(12 / 255, 47 / 255, 95 / 255);
const TEAL = rgb(15 / 255, 156 / 255, 150 / 255);
const GREY = rgb(0.38, 0.43, 0.52);
const LIGHT = rgb(0.965, 0.975, 0.99);

function money(cents: number) {
  return `R ${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function date(value: Date | null | undefined) {
  return value
    ? value.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" })
    : "Not signed";
}
function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) line = next;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
function paragraph(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  size = 9,
  color = GREY,
) {
  const lines = wrap(text || "-", font, size, width);
  lines.forEach((line, i) => page.drawText(line, { x, y: y - i * (size + 3), size, font, color }));
  return y - lines.length * (size + 3);
}
function heading(page: PDFPage, text: string, y: number, bold: PDFFont) {
  page.drawRectangle({ x: 36, y: y - 5, width: 523, height: 24, color: LIGHT });
  page.drawText(text, { x: 46, y: y + 2, size: 10, font: bold, color: NAVY });
  return y - 22;
}
function label(page: PDFPage, title: string, value: string, x: number, y: number, width: number, regular: PDFFont, bold: PDFFont) {
  page.drawText(title.toUpperCase(), { x, y, size: 7, font: bold, color: GREY });
  return paragraph(page, value, x, y - 13, width, regular, 9, NAVY);
}

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  await ready();
  const { jobId: raw } = await params;
  const jobId = Number(raw);
  const bundle = await getJobCardBundle(jobId);
  if (!bundle?.card) return Response.json({ error: "Job Card not found." }, { status: 404 });
  const actor = await authorizeJobCard(bundle.job, bundle.card);
  if (!actor) return Response.json({ error: "You are not authorized to download this Job Card." }, { status: 403 });
  if (!bundle.card.locked || !bundle.providerSignature || !bundle.customerSignature) {
    return Response.json({ error: "The final PDF is available after both electronic signatures are complete." }, { status: 409 });
  }

  try {
    const pdf = await PDFDocument.create();
    pdf.setTitle(`LocalFix SA Digital Job Card ${bundle.card.documentReference}`);
    pdf.setAuthor("LocalFix SA");
    pdf.setSubject(`Signed Job Card for ${bundle.job.reference}`);
    pdf.setCreator("LocalFix SA Digital Job Card System");
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const hasPhotos = bundle.card.completionPhotos.length > 0;
    const pageCount = hasPhotos ? 3 : 2;

    const page1 = pdf.addPage([595.28, 841.89]);
    page1.drawRectangle({ x: 0, y: 825, width: 595.28, height: 17, color: TEAL });
    page1.drawText("LOCALFIX SA", { x: 36, y: 785, size: 18, font: bold, color: NAVY });
    page1.drawText("DIGITAL JOB CARD", { x: 36, y: 762, size: 13, font: bold, color: TEAL });
    page1.drawText(`Document: ${bundle.card.documentReference}`, { x: 340, y: 785, size: 8, font: bold, color: NAVY });
    page1.drawText(`Job: ${bundle.job.reference}`, { x: 340, y: 770, size: 8, font: regular, color: GREY });
    page1.drawText("Electronic Signature Record", { x: 340, y: 755, size: 8, font: regular, color: GREY });

    let y = 720;
    y = heading(page1, "CUSTOMER DETAILS", y, bold);
    const cy = label(page1, "Customer", bundle.job.customerName, 46, y, 235, regular, bold);
    label(page1, "Contact", `${bundle.job.customerEmail} | ${bundle.job.customerPhone}`, 305, y, 245, regular, bold);
    y = Math.min(cy, y - 35) - 8;
    y = label(
      page1,
      "Service address",
      `${bundle.job.address}, ${bundle.job.suburb}, ${bundle.job.city}, ${bundle.job.province}`,
      46,
      y,
      500,
      regular,
      bold,
    ) - 10;

    y = heading(page1, "SERVICE DETAILS", y, bold);
    const sy = label(page1, "Service category", categoryName(bundle.job.categorySlug), 46, y, 235, regular, bold);
    label(page1, "Provider", bundle.provider?.businessName ?? "-", 305, y, 245, regular, bold);
    y = Math.min(sy, y - 35) - 8;
    y = label(page1, "Original job description", bundle.job.description, 46, y, 500, regular, bold) - 10;

    y = heading(page1, "WORK COMPLETED", y, bold);
    y = paragraph(page1, bundle.card.workCompleted, 46, y, 500, regular, 9, NAVY) - 12;
    y = heading(page1, "MATERIALS / NOTES", y, bold);
    y = label(page1, "Materials used", bundle.card.materialsUsed || "None recorded", 46, y, 500, regular, bold) - 8;
    y = label(page1, "Additional notes", bundle.card.additionalNotes || "None", 46, y, 500, regular, bold) - 10;

    y = heading(page1, "PAYMENT", y, bold);
    label(page1, "Accepted quote", money(bundle.quote?.amount ? bundle.quote.amount * 100 : bundle.card.finalAmountCents), 46, y, 150, regular, bold);
    label(page1, "Final agreed amount", money(bundle.card.finalAmountCents), 220, y, 160, regular, bold);
    label(page1, "Payment status", bundle.payment?.status ?? "Not recorded", 405, y, 145, regular, bold);

    page1.drawText(`Page 1 of ${pageCount}`, { x: 515, y: 20, size: 7, font: regular, color: GREY });

    const page2 = pdf.addPage([595.28, 841.89]);
    page2.drawRectangle({ x: 0, y: 825, width: 595.28, height: 17, color: TEAL });
    page2.drawText("SIGNATURES & DOCUMENT INTEGRITY", { x: 36, y: 790, size: 14, font: bold, color: NAVY });
    let y2 = 750;

    for (const [roleLabel, signature] of [
      ["SERVICE PROVIDER", bundle.providerSignature],
      ["CUSTOMER", bundle.customerSignature],
    ] as const) {
      y2 = heading(page2, roleLabel, y2, bold);
      label(page2, "Name", signature.signerName, 46, y2, 220, regular, bold);
      label(page2, "Signed", date(signature.signedAt), 305, y2, 245, regular, bold);
      y2 -= 42;
      const image = await pdf.embedPng(signature.signatureData);
      const dims = image.scaleToFit(220, 78);
      page2.drawRectangle({ x: 46, y: y2 - 82, width: 240, height: 88, borderColor: rgb(0.82, 0.85, 0.9), borderWidth: 1 });
      page2.drawImage(image, { x: 56, y: y2 - 76, width: dims.width, height: dims.height });
      paragraph(page2, signature.confirmationText, 305, y2 - 8, 245, regular, 8, GREY);
      y2 -= 112;
    }

    y2 = heading(page2, "FINAL STATUS", y2, bold);
    page2.drawText("PROVIDER SIGNED", { x: 46, y: y2, size: 10, font: bold, color: TEAL });
    page2.drawText("CUSTOMER SIGNED", { x: 210, y: y2, size: 10, font: bold, color: TEAL });
    page2.drawText("JOB COMPLETED", { x: 390, y: y2, size: 10, font: bold, color: TEAL });
    y2 -= 34;
    y2 = label(page2, "Completed", date(bundle.card.completedAt), 46, y2, 250, regular, bold) - 8;
    y2 = label(page2, "Integrity identifier (SHA-256)", bundle.card.integrityHash ?? "-", 46, y2, 500, regular, bold) - 8;
    y2 = label(page2, "Document reference", bundle.card.documentReference, 46, y2, 500, regular, bold) - 12;

    if (bundle.corrections.length) {
      y2 = heading(page2, "ADMINISTRATIVE CORRECTION NOTES (SIGNED RECORD UNCHANGED)", y2, bold);
      for (const correction of bundle.corrections) {
        y2 = paragraph(
          page2,
          `${date(correction.createdAt)} - ${correction.createdBy}: ${correction.note}`,
          46,
          y2,
          500,
          regular,
          8,
          GREY,
        ) - 6;
      }
    }

    page2.drawText(
      "This document records electronic signatures captured by LocalFix SA. It does not itself claim a regulated advanced electronic signature.",
      { x: 36, y: 35, size: 6.8, font: regular, color: GREY, maxWidth: 500 },
    );
    page2.drawText(`Page 2 of ${pageCount}`, { x: 515, y: 20, size: 7, font: regular, color: GREY });

    if (hasPhotos) {
      const photoPage = pdf.addPage([595.28, 841.89]);
      photoPage.drawRectangle({ x: 0, y: 825, width: 595.28, height: 17, color: TEAL });
      photoPage.drawText("COMPLETION PHOTOS", { x: 36, y: 790, size: 14, font: bold, color: NAVY });
      photoPage.drawText(bundle.card.documentReference, { x: 390, y: 792, size: 7, font: regular, color: GREY });
      const positions = [
        { x: 36, y: 520 },
        { x: 306, y: 520 },
        { x: 36, y: 280 },
        { x: 306, y: 280 },
        { x: 36, y: 40 },
        { x: 306, y: 40 },
      ];
      for (let i = 0; i < Math.min(6, bundle.card.completionPhotos.length); i += 1) {
        const data = bundle.card.completionPhotos[i];
        const image = data.startsWith("data:image/png") ? await pdf.embedPng(data) : await pdf.embedJpg(data);
        const dims = image.scaleToFit(245, 210);
        const pos = positions[i];
        photoPage.drawRectangle({ x: pos.x, y: pos.y, width: 245, height: 210, color: LIGHT });
        photoPage.drawImage(image, {
          x: pos.x + (245 - dims.width) / 2,
          y: pos.y + (210 - dims.height) / 2,
          width: dims.width,
          height: dims.height,
        });
        photoPage.drawText(`Completion photo ${i + 1}`, { x: pos.x, y: pos.y - 12, size: 7, font: regular, color: GREY });
      }
      photoPage.drawText(`Page 3 of ${pageCount}`, { x: 515, y: 20, size: 7, font: regular, color: GREY });
    }

    const bytes = await pdf.save();
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="LocalFix-Job-Card-${bundle.job.reference}.pdf"`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[job-card] PDF generation failed", error);
    return Response.json({ error: "The Job Card PDF could not be generated. Please try again." }, { status: 500 });
  }
}
