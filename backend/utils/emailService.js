import { Resend } from 'resend';
import validator from 'validator';

const RESEND_API_KEY = String(process.env.RESEND_API_KEY || '').trim();
const EMAIL_FROM = process.env.EMAIL_FROM || 'FundCo AI TM <onboarding@resend.dev>';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const sendEmail = async ({ to, subject, text, html }) => {
    if (!to || !validator.isEmail(to)) {
        console.error(`Invalid email address: ${to}`);
        throw new Error('Invalid or missing email address');
    }

    if (!resend) {
        console.warn(`Email sending is disabled (RESEND_API_KEY not set) — skipping email to ${to}.`);
        return false;
    }

    console.log(`Attempting to send email to ${to} | Subject: "${subject}"`);

    try {
        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to,
            subject,
            text,
            html: html || text,
        });

        if (error) {
            throw new Error(error.message || 'Unknown Resend error');
        }

        console.log(`Email sent successfully to ${to} | MessageId: ${data?.id}`);
        return true;
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error.message);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

export { sendEmail };