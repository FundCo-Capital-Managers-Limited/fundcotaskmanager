// emailService.js
import nodemailer from 'nodemailer';
import validator from 'validator';

console.log('🔥 EMAIL SERVICE LOADED WITH USER:', process.env.EMAIL_USER);   // ← Debug line
console.log('🔥 Using port 587 (STARTTLS)');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,                    // ← This must be 587
    secure: false,                // ← false for port 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
    debug: true,
    logger: true,
});

const sendEmail = async ({ to, subject, text, html }) => {
    if (!to || !validator.isEmail(to)) {
        console.error(`❌ Invalid email address: ${to}`);
        throw new Error('Invalid or missing email address');
    }

    console.log(`📧 Attempting to send email to ${to} | Subject: "${subject}"`);

    try {
        await transporter.verify();
        const info = await transporter.sendMail({
            from: `"FundCo AI TM" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html: html || text,
        });

        console.log(`✅ Email SENT successfully to ${to} | MessageId: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error.message);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

export { sendEmail };