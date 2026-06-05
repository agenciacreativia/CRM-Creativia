import "server-only";

function b64url(s: string): string {
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64(s: string): string {
  return (Buffer.from(s, "utf8").toString("base64").match(/.{1,76}/g) ?? []).join("\r\n");
}

function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

/** Rough HTML → plain text for the multipart fallback. */
function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type EmailAttachment = { filename: string; mimeType: string; contentBase64: string };

/** Wrap pre-base64 content into 76-char lines. */
function wrap76(b64String: string): string {
  return (b64String.match(/.{1,76}/g) ?? []).join("\r\n");
}

/**
 * Send an HTML email (plain-text fallback) with optional attachments via the
 * Gmail API on behalf of the connected user. Throws on failure.
 */
export async function sendGmail(
  accessToken: string,
  opts: { to: string; subject: string; html: string; replyTo?: string; attachments?: EmailAttachment[] },
): Promise<void> {
  const ts = Date.now().toString(36);
  const altBoundary = `alt_${ts}`;
  const plain = htmlToText(opts.html) || " ";

  // The alternative (plain + html) block — always present.
  const altBlock =
    `--${altBoundary}\r\n` +
    'Content-Type: text/plain; charset="UTF-8"\r\n' +
    "Content-Transfer-Encoding: base64\r\n\r\n" +
    b64(plain) +
    "\r\n" +
    `--${altBoundary}\r\n` +
    'Content-Type: text/html; charset="UTF-8"\r\n' +
    "Content-Transfer-Encoding: base64\r\n\r\n" +
    b64(opts.html) +
    "\r\n" +
    `--${altBoundary}--`;

  const attachments = opts.attachments ?? [];
  let headerCT: string;
  let body: string;

  if (attachments.length === 0) {
    headerCT = `Content-Type: multipart/alternative; boundary="${altBoundary}"`;
    body = altBlock;
  } else {
    const mixedBoundary = `mix_${ts}`;
    headerCT = `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`;
    let b =
      `--${mixedBoundary}\r\n` +
      `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n` +
      altBlock +
      "\r\n";
    for (const att of attachments) {
      const safe = att.filename.replace(/["\r\n]/g, "_");
      b +=
        `--${mixedBoundary}\r\n` +
        `Content-Type: ${att.mimeType || "application/octet-stream"}; name="${safe}"\r\n` +
        `Content-Disposition: attachment; filename="${safe}"\r\n` +
        "Content-Transfer-Encoding: base64\r\n\r\n" +
        wrap76(att.contentBase64) +
        "\r\n";
    }
    b += `--${mixedBoundary}--`;
    body = b;
  }

  const headers = [
    `To: ${opts.to}`,
    opts.replyTo ? `Reply-To: ${opts.replyTo}` : null,
    `Subject: ${encodeSubject(opts.subject)}`,
    "MIME-Version: 1.0",
    headerCT,
  ].filter((l): l is string => l !== null);

  const message = `${headers.join("\r\n")}\r\n\r\n${body}`;

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: b64url(message) }),
  });

  if (!res.ok) throw new Error(`Gmail rechazó el envío: ${await res.text()}`);
}
