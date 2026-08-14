type MailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

/**
 * Production mail sender.
 *
 * Configure in Vercel:
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM
 */
export async function sendMail(input: MailInput): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!smtpConfigured()) {
    return {
      ok: false,
      error: "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM in Vercel.",
    };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: String(process.env.SMTP_SECURE ?? "false") === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return { ok: true };
  } catch (err) {
    console.error("[email] send failed", err);
    return { ok: false, error: "Email could not be sent. Please check SMTP configuration." };
  }
}

export function founderEmail() {
  return (process.env.FOUNDER_EMAIL ?? "founder@localfix.co.za").toLowerCase();
}

function baseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "https://localfix.co.za";
}

/** Sent automatically when a provider submits a registration application. */
export async function sendApplicationReceivedEmail(input: {
  to: string;
  businessName: string;
  ownerName: string;
}) {
  return sendMail({
    to: input.to,
    subject: "We received your LocalFix SA application 🎉",
    text: [
      `Hi ${input.ownerName},`,
      ``,
      `Thank you for applying to join LocalFix SA as ${input.businessName}.`,
      `Our Trust & Safety team is now reviewing your business details and compliance documents.`,
      `You'll receive an email as soon as a decision is made — usually within 24–48 hours.`,
      ``,
      `You can track your application status any time by signing in:`,
      `${baseUrl()}/provider/login`,
      ``,
      `Warm regards,`,
      `The LocalFix SA team`,
    ].join("\n"),
    html: `<div style="font-family:Arial,sans-serif;color:#0c2f5f;max-width:560px">
      <h2 style="margin:0 0 8px">We received your application 🎉</h2>
      <p>Hi ${input.ownerName},</p>
      <p>Thank you for applying to join <strong>LocalFix SA</strong> as <strong>${input.businessName}</strong>. Our Trust &amp; Safety team is now reviewing your business details and compliance documents.</p>
      <p>You'll receive an email the moment a decision is made — usually within 24–48 hours.</p>
      <p><a href="${baseUrl()}/provider/login" style="color:#0f9c96;font-weight:bold">Track your application status →</a></p>
      <p style="color:#5b6b85">Warm regards,<br/>The LocalFix SA team</p>
    </div>`,
  });
}

/**
 * Sent to the customer the moment their job request is created and
 * broadcast to nearby verified providers.
 */
export async function sendJobConfirmationEmail(input: {
  to: string;
  customerName: string;
  reference: string;
  jobId: number;
  title: string;
  categoryName: string;
  urgencyLabel: string;
  city: string;
  suburb?: string;
  budget?: string;
  matched: number;
  fairRange?: string;
}) {
  const firstName = input.customerName.split(/\s+/)[0] || "there";
  const where = `${input.suburb ? input.suburb + ", " : ""}${input.city}`;
  const matchedLine =
    input.matched > 0
      ? `Your request has been broadcast to ${input.matched} verified professional${input.matched === 1 ? "" : "s"} near ${where}.`
      : `We're matching your request to verified professionals near ${where} and will notify them the moment one is available.`;

  return sendMail({
    to: input.to,
    subject: `✅ Job request confirmed — ${input.reference}`,
    text: [
      `Hi ${firstName},`,
      ``,
      `Your job request has been received and broadcast on LocalFix SA. 🎉`,
      ``,
      `Reference: ${input.reference}`,
      `Service: ${input.categoryName}`,
      `Job: ${input.title}`,
      `Urgency: ${input.urgencyLabel}`,
      `Location: ${where}`,
      input.budget ? `Budget: ${input.budget}` : ``,
      input.fairRange ? `Typical fair range: ${input.fairRange}` : ``,
      ``,
      matchedLine,
      ``,
      `What happens next:`,
      `1. Verified professionals review your request.`,
      `2. Their quotes arrive in your LocalFix inbox — usually within the hour.`,
      `3. You compare quotes and accept the one you like. Provider details are revealed once you accept and pay.`,
      ``,
      `Track your request: ${baseUrl()}/jobs/${input.jobId}`,
      ``,
      `Thanks for using LocalFix SA — your home, our network.`,
      `The LocalFix SA team`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `<div style="font-family:Arial,sans-serif;color:#0c2f5f;max-width:560px">
      <h2 style="margin:0 0 8px;color:#2e9e6b">✅ Your job request is confirmed</h2>
      <p>Hi ${firstName},</p>
      <p>Your job request has been received and <strong>broadcast to nearby verified professionals</strong> on LocalFix SA. 🎉</p>
      <table style="width:100%;border-collapse:collapse;background:#f6f9fd;border-radius:12px;overflow:hidden;margin:12px 0">
        <tbody>
          <tr><td style="padding:8px 14px;color:#5b6b85">Reference</td><td style="padding:8px 14px;font-weight:700">${input.reference}</td></tr>
          <tr><td style="padding:8px 14px;color:#5b6b85">Service</td><td style="padding:8px 14px;font-weight:700">${input.categoryName}</td></tr>
          <tr><td style="padding:8px 14px;color:#5b6b85">Job</td><td style="padding:8px 14px;font-weight:700">${input.title}</td></tr>
          <tr><td style="padding:8px 14px;color:#5b6b85">Urgency</td><td style="padding:8px 14px;font-weight:700">${input.urgencyLabel}</td></tr>
          <tr><td style="padding:8px 14px;color:#5b6b85">Location</td><td style="padding:8px 14px;font-weight:700">${where}</td></tr>
          ${input.budget ? `<tr><td style="padding:8px 14px;color:#5b6b85">Budget</td><td style="padding:8px 14px;font-weight:700">${input.budget}</td></tr>` : ""}
          ${input.fairRange ? `<tr><td style="padding:8px 14px;color:#5b6b85">Typical fair range</td><td style="padding:8px 14px;font-weight:700">${input.fairRange}</td></tr>` : ""}
        </tbody>
      </table>
      <p style="font-weight:600">${matchedLine}</p>
      <ol style="color:#33415c;line-height:1.6">
        <li>Verified professionals review your request.</li>
        <li>Their quotes arrive in your LocalFix inbox — usually within the hour.</li>
        <li>You compare quotes and accept one. Provider details are revealed once you accept and pay.</li>
      </ol>
      <p><a href="${baseUrl()}/jobs/${input.jobId}" style="color:#0f9c96;font-weight:bold">Track your request →</a></p>
      <p style="color:#5b6b85">Thanks for using LocalFix SA — your home, our network.<br/>The LocalFix SA team</p>
    </div>`,
  });
}

export type ProviderDecision = "approve" | "pending_docs" | "decline";

/** Sent to the applicant whenever Founder/Admin records a decision. */
export async function sendProviderDecisionEmail(input: {
  to: string;
  businessName: string;
  ownerName: string;
  decision: ProviderDecision;
  note: string;
  decidedBy: string;
}) {
  const meta: Record<ProviderDecision, { subject: string; emoji: string; headline: string; body: string; color: string }> = {
    approve: {
      subject: `🎉 Approved — welcome to LocalFix SA, ${input.businessName}!`,
      emoji: "🎉",
      headline: "Your application is approved!",
      body: `Great news, ${input.ownerName}. ${input.businessName} is now a verified LocalFix SA provider. Your profile is live and you'll start receiving job broadcasts in your service area right away. Sign in to view leads, submit quotes and manage payouts.`,
      color: "#2e9e6b",
    },
    pending_docs: {
      subject: `📋 Action needed on your LocalFix SA application`,
      emoji: "📋",
      headline: "We need a little more from you",
      body: `Hi ${input.ownerName}. Your application for ${input.businessName} is still being processed, but our team needs additional information before it can be approved.${
        input.note ? `\n\nWhat we need: ${input.note}` : ""
      }\n\nPlease sign in and upload the requested documents. We'll continue the review as soon as they arrive.`,
      color: "#f0a202",
    },
    decline: {
      subject: `Update on your LocalFix SA application`,
      emoji: "💙",
      headline: "Update on your application",
      body: `Hi ${input.ownerName}. After careful review, we're unable to approve ${input.businessName} for the LocalFix SA network at this time.${
        input.note ? `\n\nReason: ${input.note}` : ""
      }\n\nIf you believe this is a mistake, or once the issue is resolved, you're welcome to re-apply or reply to this email and our team will help.`,
      color: "#e05252",
    },
  };
  const m = meta[input.decision];

  return sendMail({
    to: input.to,
    subject: m.subject,
    text: [
      `${m.emoji} ${m.headline}`,
      ``,
      m.body,
      ``,
      `Decision recorded by: ${input.decidedBy}`,
      `Sign in any time: ${baseUrl()}/provider/login`,
      ``,
      `Warm regards,`,
      `The LocalFix SA Trust & Safety team`,
    ].join("\n"),
    html: `<div style="font-family:Arial,sans-serif;color:#0c2f5f;max-width:560px">
      <h2 style="margin:0 0 8px;color:${m.color}">${m.emoji} ${m.headline}</h2>
      <p style="white-space:pre-line">${m.body}</p>
      <p style="color:#5b6b85;font-size:13px">Decision recorded by: ${input.decidedBy}</p>
      <p><a href="${baseUrl()}/provider/login" style="color:#0f9c96;font-weight:bold">Sign in to your provider dashboard →</a></p>
      <p style="color:#5b6b85">Warm regards,<br/>The LocalFix SA Trust &amp; Safety team</p>
    </div>`,
  });
}
