import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as SibApiV3Sdk from "sib-api-v3-sdk";

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

function validateRequest(body: any): { valid: boolean; error?: string; data?: EmailRequest } {
  // Check required common fields
  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return { valid: false, error: "Name is required" };
  }
  if (!body.email || typeof body.email !== "string" || !body.email.includes("@")) {
    return { valid: false, error: "Valid email is required" };
  }
  if (!body.message || typeof body.message !== "string" || body.message.trim().length === 0) {
    return { valid: false, error: "Message is required" };
  }
  if (!body.phone || typeof body.phone !== "string" || body.phone.trim().length === 0) {
    return { valid: false, error: "Phone number is required" };
  }
  if (!body.formType || !["contact", "booking"].includes(body.formType)) {
    return { valid: false, error: "Valid form type is required" };
  }

  // Length limits
  if (body.name.length > 100) {
    return { valid: false, error: "Name must be less than 100 characters" };
  }
  if (body.email.length > 255) {
    return { valid: false, error: "Email must be less than 255 characters" };
  }
  if (body.message.length > 2000) {
    return { valid: false, error: "Message must be less than 2000 characters" };
  }

  return {
    valid: true,
    data: {
      formType: body.formType,
      name: body.name.trim(),
      email: body.email.trim(),
      message: body.message.trim(),
      phone: body.phone.trim(),
      date: body.date ? String(body.date).trim() : undefined,
      location: body.location ? String(body.location).trim() : undefined,
      eventType: body.eventType ? String(body.eventType).trim() : undefined,
    },
  };
}

function generateEmailContent(data: EmailRequest): { subject: string; html: string } {
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
            background: linear-gradient(135deg, ${COLORS.primary} 0%, #c91d3a 100%);
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
            <h1>${data.formType === "contact" ? "📧 Uusi Yhteydenotto" : "🎤 Uusi Varaus"}</h1>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Nimi</div>
              <div class="value highlight">${escapeHtml(data.name)}</div>
            </div>
            <div class="field">
              <div class="label">Sähköposti</div>
              <div class="value"><a href="mailto:${escapeHtml(data.email)}" style="color: ${COLORS.secondary}; text-decoration: none;">${escapeHtml(data.email)}</a></div>
            </div>
            <div class="field">
              <div class="label">Puhelinnumero</div>
              <div class="value"><a href="tel:${escapeHtml(data.phone)}" style="color: ${COLORS.secondary}; text-decoration: none;">${escapeHtml(data.phone)}</a></div>
            </div>
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
              <div class="value">${escapeHtml(data.message).replace(/\n/g, "<br>")}</div>
            </div>
          </div>
          <div class="footer">
            Lähetetty HeidiSimelius.fi -sivustolta<br>
            ${new Date().toLocaleString("fi-FI", { timeZone: "Europe/Helsinki" })}
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
    // Check for API key
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error("BREVO_API_KEY environment variable is not set");
      return res.status(500).json({
        success: false,
        error: "Email service is not configured",
        ...corsHeaders,
      });
    }

    // Validate request body
    const validation = validateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        ...corsHeaders,
      });
    }

    const emailData = validation.data!;

    // Configure Brevo API
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKeyAuth = defaultClient.authentications["api-key"];
    apiKeyAuth.apiKey = apiKey;

    // Generate email content
    const { subject, html } = generateEmailContent(emailData);

    // Create email instance
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.sender = { name: SENDER_NAME, email: SENDER_EMAIL };
    sendSmtpEmail.to = [{ email: RECIPIENT_EMAIL }];
    sendSmtpEmail.replyTo = { email: emailData.email, name: emailData.name };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;

    // Send email
    console.log(`Sending email: ${subject}`);
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("Email sent successfully:", result.messageId);

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
      messageId: result.messageId,
      ...corsHeaders,
    });
  } catch (error: any) {
    console.error("Error sending email:", error);

    // Handle Brevo API errors
    if (error.response) {
      console.error("Brevo API error:", error.response.text);
      return res.status(error.response.status || 500).json({
        success: false,
        error: "Failed to send email. Please try again later.",
        ...corsHeaders,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      ...corsHeaders,
    });
  }
}
