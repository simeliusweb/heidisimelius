import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as Brevo from "@getbrevo/brevo";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Email configuration
const RECIPIENT_EMAIL = "suorantacoding@gmail.com";
const SENDER_EMAIL = "simelius.heidi@gmail.com";
const SENDER_NAME = "HeidiSimelius.fi";

interface EmailRequest {
  formType: "contact" | "booking";
  name: string;
  email: string;
  message: string;
  phone: string;
  // Booking form specific fields
  date?: string;
  location?: string;
  eventType?: string;
}

// Design system colors from index.css
const COLORS = {
  primary: "#E52545",
  secondary: "#FEFEDF",
  background: "#10111A",
  foreground: "#F5F5F7",
  card: "#1A1B26",
  border: "#2A2B3A",
  muted: "#888899",
};

// Define a clear return type (a discriminated union) for our validation result
type ValidationResult =
  | { valid: true; data: EmailRequest }
  | { valid: false; error: string };

function validateRequest(body: unknown): ValidationResult {
  // 1. First, ensure the body is a non-null object.
  if (typeof body !== "object" || body === null) {
    return { valid: false, error: "Invalid request body: must be an object." };
  }

  // 2. Cast the body to a record of unknown values to safely access properties.
  const data = body as Record<string, unknown>;

  // 3. Validate each property's type and value.
  if (typeof data.name !== "string" || data.name.trim().length === 0) {
    return { valid: false, error: "Name is required and must be a string." };
  }
  if (typeof data.email !== "string" || !data.email.includes("@")) {
    return { valid: false, error: "A valid email is required." };
  }
  if (typeof data.message !== "string" || data.message.trim().length === 0) {
    return { valid: false, error: "Message is required and must be a string." };
  }
  if (data.formType !== "contact" && data.formType !== "booking") {
    return { valid: false, error: "Valid form type is required." };
  }

  // 4. Conditional validation based on formType.
  if (data.formType === "booking") {
    if (typeof data.phone !== "string" || data.phone.trim().length === 0) {
      return { valid: false, error: "Phone number is required for booking." };
    }
  }

  // 5. If all checks pass, construct a new, clean, and fully-typed data object.
  const validatedData: EmailRequest = {
    formType: data.formType,
    name: data.name.trim(),
    email: data.email.trim(),
    message: data.message.trim(),
    phone: typeof data.phone === "string" ? data.phone.trim() : "",
    date: typeof data.date === "string" ? data.date.trim() : undefined,
    location:
      typeof data.location === "string" ? data.location.trim() : undefined,
    eventType:
      typeof data.eventType === "string" ? data.eventType.trim() : undefined,
  };

  // 6. Perform final length checks on the clean data.
  if (validatedData.name.length > 100) {
    return { valid: false, error: "Name must be less than 100 characters." };
  }
  if (validatedData.email.length > 255) {
    return { valid: false, error: "Email must be less than 255 characters." };
  }
  if (validatedData.message.length > 2000) {
    return {
      valid: false,
      error: "Message must be less than 2000 characters.",
    };
  }

  // 7. Return the successful result with the typed data.
  return { valid: true, data: validatedData };
}

function generateEmailContent(data: EmailRequest): {
  subject: string;
  html: string;
} {
  const subject =
    data.formType === "contact"
      ? `HeidiSimelius.fi - yhteydenotto: ${data.name}`
      : `Heidi & The Hot Stuff -yhteydenotto: ${data.name}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background-color: ${COLORS.background};
            color: ${COLORS.foreground};
            padding: 0;
            margin: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: ${COLORS.card};
            border: 1px solid ${COLORS.border};
          }
          .header {
            background: linear-gradient(135deg, ${
              COLORS.primary
            } 0%, #c91d3a 100%);
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            color: ${COLORS.foreground};
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          }
          .content {
            padding: 30px;
          }
          .field {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid ${COLORS.border};
          }
          .field:last-child {
            border-bottom: none;
          }
          .label {
            color: ${COLORS.muted};
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .value {
            color: ${COLORS.foreground};
            font-size: 16px;
            line-height: 1.6;
            word-wrap: break-word;
          }
          .highlight {
            color: ${COLORS.secondary};
            font-weight: 600;
          }
          .footer {
            padding: 20px 30px;
            background-color: ${COLORS.background};
            border-top: 1px solid ${COLORS.border};
            text-align: center;
            color: ${COLORS.muted};
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${
              data.formType === "contact"
                ? "📧 Uusi Yhteydenotto"
                : "🎤 Uusi Varaus"
            }</h1>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Nimi</div>
              <div class="value highlight">${escapeHtml(data.name)}</div>
            </div>
            <div class="field">
              <div class="label">Sähköposti</div>
              <div class="value"><a href="mailto:${escapeHtml(
                data.email
              )}" style="color: ${
    COLORS.secondary
  }; text-decoration: none;">${escapeHtml(data.email)}</a></div>
            </div>
            ${
              data.phone && data.phone.length > 0
                ? `
            <div class="field">
              <div class="label">Puhelinnumero</div>
              <div class="value"><a href="tel:${escapeHtml(
                data.phone
              )}" style="color: ${
                    COLORS.secondary
                  }; text-decoration: none;">${escapeHtml(data.phone)}</a></div>
            </div>
            `
                : ""
            }
            ${
              data.date
                ? `
            <div class="field">
              <div class="label">Tapahtumapäivä</div>
              <div class="value">${escapeHtml(data.date)}</div>
            </div>
            `
                : ""
            }
            ${
              data.location
                ? `
            <div class="field">
              <div class="label">Tapahtumapaikka</div>
              <div class="value">${escapeHtml(data.location)}</div>
            </div>
            `
                : ""
            }
            ${
              data.eventType
                ? `
            <div class="field">
              <div class="label">Tapahtuman Tyyppi</div>
              <div class="value">${escapeHtml(data.eventType)}</div>
            </div>
            `
                : ""
            }
            <div class="field">
              <div class="label">Viesti</div>
              <div class="value">${escapeHtml(data.message).replace(
                /\n/g,
                "<br>"
              )}</div>
            </div>
          </div>
          <div class="footer">
            Lähetetty HeidiSimelius.fi -sivustolta<br>
            ${new Date().toLocaleString("fi-FI", {
              timeZone: "Europe/Helsinki",
            })}
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, html };
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).json({ ok: true });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
      ...corsHeaders,
    });
  }

  // 🍯 Honeypot Check
  // If the 'website' field (our honeypot) is filled, it's a bot.
  if (req.body.website) {
    console.log("Honeypot triggered. Silently ignoring submission.");
    // We send a success response to trick the bot into thinking it worked.
    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
      ...corsHeaders,
    });
  }

  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error("BREVO_API_KEY environment variable is not set");
      return res.status(500).json({
        success: false,
        error: "Email service is not configured",
        ...corsHeaders,
      });
    }

    const validation = validateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        ...corsHeaders,
      });
    }

    const emailData = validation.data!;

    // NEW: Configure Brevo API with the new package
    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);

    const { subject, html } = generateEmailContent(emailData);

    // Create email instance (uses 'Brevo' instead of 'SibApiV3Sdk')
    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    sendSmtpEmail.sender = { name: SENDER_NAME, email: SENDER_EMAIL };
    sendSmtpEmail.to = [{ email: RECIPIENT_EMAIL }];
    sendSmtpEmail.replyTo = { email: emailData.email, name: emailData.name };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;

    console.log(`Sending email: ${subject}`);
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("Email sent successfully:", result); // result object structure might be different

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
      ...corsHeaders,
    });
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      ...corsHeaders,
    });
  }
}
