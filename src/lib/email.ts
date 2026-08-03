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
