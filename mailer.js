const nodemailer = require('nodemailer');

// Escape user-supplied text before interpolating it into the HTML email body so a
// username like `<img onerror=...>` can't inject markup into the message.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Check if email is configured
function isEmailConfigured() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.EMAIL_FROM
  );
}

// Create transporter if email is configured
let transporter = null;
if (isEmailConfigured()) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // Verify connection configuration
  transporter.verify(function (error, success) {
    if (error) {
      console.error('SMTP Configuration Error:', error);
      console.log('Email functionality will be disabled');
      transporter = null;
    } else {
      console.log('SMTP Server is ready to send emails');
    }
  });
} else {
  console.log('Email not configured - password reset functionality will be disabled');
  console.log('To enable email, configure SMTP settings in .env file');
}

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} username - Username
 * @param {string} resetToken - Password reset token
 * @param {string} resetUrl - Full reset URL
 * @returns {Promise<boolean>} - True if sent successfully, false otherwise
 */
async function sendPasswordResetEmail(email, username, resetToken, resetUrl) {
  if (!transporter) {
    console.log('Cannot send email - SMTP not configured');
    return false;
  }

  try {
    const safeUsername = escapeHtml(username);
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Keep Clone - Återställ ditt lösenord',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #1a73e8; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0;">Keep Clone</h1>
            <p style="margin: 10px 0 0 0;">Återställning av lösenord</p>
          </div>

          <div style="background-color: #f5f5f5; padding: 30px; border-radius: 0 0 5px 5px;">
            <p>Hej <strong>${safeUsername}</strong>,</p>

            <p>Vi har fått en förfrågan om att återställa lösenordet för ditt Keep Clone-konto.</p>

            <p>Klicka på knappen nedan för att återställa ditt lösenord:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="display: inline-block; background-color: #1a73e8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Återställ lösenord
              </a>
            </div>

            <p>Eller kopiera och klistra in denna länk i din webbläsare:</p>
            <p style="background-color: white; padding: 10px; border-radius: 3px; word-break: break-all; font-size: 12px;">
              ${resetUrl}
            </p>

            <p><strong>Denna länk är giltig i 1 timme.</strong></p>

            <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              Om du inte begärt att återställa ditt lösenord kan du ignorera detta mail. Ditt lösenord kommer inte att ändras.
            </p>

            <p style="color: #666; font-size: 14px;">
              Av säkerhetsskäl, dela aldrig denna länk med någon annan.
            </p>
          </div>

          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Detta är ett automatiskt mail från Keep Clone. Svara inte på detta meddelande.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Hej ${username},

Vi har fått en förfrågan om att återställa lösenordet för ditt Keep Clone-konto.

Återställ ditt lösenord genom att besöka denna länk:
${resetUrl}

Denna länk är giltig i 1 timme.

Om du inte begärt att återställa ditt lösenord kan du ignorera detta mail.
Ditt lösenord kommer inte att ändras.

Av säkerhetsskäl, dela aldrig denna länk med någon annan.

---
Detta är ett automatiskt mail från Keep Clone.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

module.exports = {
  isEmailConfigured,
  sendPasswordResetEmail
};
