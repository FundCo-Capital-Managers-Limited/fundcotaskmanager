import nodemailer from 'nodemailer';
import validator from 'validator';

const SMTP_HOST = String(process.env.SMTP_HOST || '').trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = String(process.env.SMTP_USER || '').trim();
const SMTP_PASS = String(process.env.SMTP_PASS || '').trim();
const EMAIL_FROM = process.env.EMAIL_FROM || `FundCo AI TM <${SMTP_USER}>`;

const transporter = (SMTP_HOST && SMTP_USER && SMTP_PASS)
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
    : null;

const sendEmail = async ({ to, subject, text, html }) => {
    if (!to || !validator.isEmail(to)) {
        console.error(`Invalid email address: ${to}`);
        throw new Error('Invalid or missing email address');
    }

    if (!transporter) {
        console.warn(`Email sending is disabled (SMTP_HOST/SMTP_USER/SMTP_PASS not set) — skipping email to ${to}.`);
        return false;
    }

    console.log(`Attempting to send email to ${to} | Subject: "${subject}"`);

    try {
        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to,
            subject,
            text,
            html: html || text,
        });

        console.log(`Email sent successfully to ${to} | MessageId: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error.message);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

export { sendEmail };
