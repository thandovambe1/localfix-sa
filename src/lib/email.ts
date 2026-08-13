type MailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type ProviderDecision = "approve" | "pending_docs" | "decline";

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD,
  );
}

/**
 * Production mail sender.
 *
 * Configure in Vercel:
 * SMTP_HOST
 * SMTP_PORT
 * SMTP_USER
 * SMTP_PASSWORD
 * SMTP_FROM
 */
export async function sendMail(
  input: MailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!smtpConfigured()) {
    return {
      ok: false,
      error:
        "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM in Vercel.",
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

    return {
      ok: false,
      error: "Email could not be sent. Please check SMTP configuration.",
    };
  }
}

/**
 * Sent when a provider successfully submits an application.
 */
export async function sendApplicationReceivedEmail(input: {
  to: string;
  businessName: string;
  ownerName: string;
}) {
  const subject = "LocalFix SA — Application Received";

  const text = `Hi ${input.ownerName},

Thank you for registering ${input.businessName} with LocalFix SA.

We have received your provider application and it has been placed in our review queue.

Our team will review your business information and compliance documents. You will receive another email once a decision has been made.

Thank you for choosing LocalFix SA.

LocalFix SA
Your Home. Our Network.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
      <h2>LocalFix SA — Application Received</h2>

      <p>Hi ${input.ownerName},</p>

      <p>
        Thank you for registering <strong>${input.businessName}</strong>
        with LocalFix SA.
      </p>

      <p>
        We have received your provider application and it has been placed
        in our review queue.
      </p>

      <p>
        Our team will review your business information and compliance
        documents. You will receive another email once a decision has been made.
      </p>

      <p>Thank you for choosing LocalFix SA.</p>

      <p>
        <strong>LocalFix SA</strong><br />
        Your Home. Our Network.
      </p>
    </div>
  `;

  return sendMail({
    to: input.to,
    subject,
    text,
    html,
  });
}

/**
 * Sent when an admin/founder makes a decision on a provider application.
 */
export async function sendProviderDecisionEmail(input: {
  to: string;
  businessName: string;
  ownerName: string;
  decision: ProviderDecision;
  note?: string;
  decidedBy?: string;
}) {
  const note = input.note?.trim() || "";

  let subject: string;
  let heading: string;
  let message: string;

  switch (input.decision) {
    case "approve":
      subject = "LocalFix SA — Provider Application Approved";
      heading = "Your LocalFix SA application has been approved";
      message = `
        Congratulations. Your provider application for
        <strong>${input.businessName}</strong> has been approved.
        Your provider account is now active.
      `;
      break;

    case "pending_docs":
      subject = "LocalFix SA — Additional Documents Required";
      heading = "Additional information is required";
      message = `
        Your provider application for
        <strong>${input.businessName}</strong> is still under review.
        Additional compliance information or documents are required before
        your application can be finalised.
      `;
      break;

    case "decline":
      subject = "LocalFix SA — Provider Application Update";
      heading = "Your provider application was not approved";
      message = `
        Unfortunately, your provider application for
        <strong>${input.businessName}</strong> was not approved at this time.
      `;
      break;
  }

  const text = `Hi ${input.ownerName},

${heading}.

${message
  .replace(/<strong>/g, "")
  .replace(/<\/strong>/g, "")
  .replace(/\s+/g, " ")
  .trim()}

${note ? `\nNote from LocalFix SA:\n${note}\n` : ""}

${input.decidedBy ? `Decision recorded by: ${input.decidedBy}\n` : ""}

If you have questions regarding your application, please contact LocalFix SA.

LocalFix SA
Your Home. Our Network.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
      <h2>${heading}</h2>

      <p>Hi ${input.ownerName},</p>

      <p>${message}</p>

      ${
        note
          ? `
            <p>
              <strong>Note from LocalFix SA:</strong><br />
              ${note}
            </p>
          `
          : ""
      }

      ${
        input.decidedBy
          ? `
            <p>
              <strong>Decision recorded by:</strong><br />
              ${input.decidedBy}
            </p>
          `
          : ""
      }

      <p>
        If you have questions regarding your application, please contact
        LocalFix SA.
      </p>

      <p>
        <strong>LocalFix SA</strong><br />
        Your Home. Our Network.
      </p>
    </div>
  `;

  return sendMail({
    to: input.to,
    subject,
    text,
    html,
  });
}

export function founderEmail() {
  return (process.env.FOUNDER_EMAIL ?? "founder@localfix.co.za").toLowerCase();
}
