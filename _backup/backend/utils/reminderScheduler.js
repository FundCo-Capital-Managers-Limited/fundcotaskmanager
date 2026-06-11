// reminderScheduler.js
import cron from 'node-cron';
import Reminder from '../models/reminderModel.js';
import User from '../models/userModel.js';
import Task from '../models/taskModel.js';
import { sendEmail } from './emailService.js';
import { sendPushNotification } from './pushService.js';
import OpenAI from 'openai';
import { createNotification } from './notificationService.js';

const openai = new OpenAI({
    apiKey: process.env.GROK_API_KEY,
    baseURL: 'https://api.x.ai/v1',
});

// Generate short, natural, contextual AI reminder
const generateSmartReminderMessage = async (task, remindAt) => {
    if (!task) return null;

    const dueTime = new Date(remindAt).toLocaleString('en-US', {
        timeZone: 'Africa/Lagos',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    const checklistSummary = task.checklist && task.checklist.length
        ? `Checklist has ${task.checklist.filter(c => !c.completed).length} items remaining.`
        : '';

    const prompt = `You are a helpful assistant sending a very short reminder.
Task title: "${task.title}"
Description: "${task.description || 'No description'}"
${checklistSummary}
Due: ${dueTime}

Write ONE short, natural, friendly reminder message (max 160 characters).
Mention the task title and due time.
Give one practical, actionable suggestion based on the description and checklist.
Speak directly to the user. Be warm and encouraging. No emojis, no dashes, no titles.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'grok-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 120,
        });
        return response.choices[0].message.content.trim();
    } catch (err) {
        console.error('AI reminder generation failed:', err.message);
        return null;
    }
};

const sendReminder = async (reminder) => {
    console.log(`🔄 Processing reminder ${reminder._id} for user ${reminder.user}`);

    const user = await User.findById(reminder.user);
    if (!user) {
        console.error(`❌ User ${reminder.user} not found`);
        return false;
    }

    let finalMessage = reminder.message;

    // Generate smart AI message for task reminders
    if (reminder.type === 'task_due' && reminder.targetId && reminder.targetModel === 'Task') {
        const task = await Task.findById(reminder.targetId).select('title description checklist').lean();
        if (task) {
            const aiMessage = await generateSmartReminderMessage(task, reminder.remindAt);
            if (aiMessage) finalMessage = aiMessage;
        }
    }

    let emailSent = false;
    let pushSent = false;
    let inAppSent = false;

    try {
        if (reminder.deliveryChannels.inApp) {
            global.io.to(`user:${user._id}`).emit('reminderTriggered', { ...reminder.toObject(), message: finalMessage });
            await createNotification({
                userId: user._id,
                type: 'reminder',
                title: 'Reminder',
                body: finalMessage,
                entityId: reminder._id,
                entityType: 'Reminder',
                data: { reminderId: String(reminder._id), type: reminder.type },
                io: global.io,
                allowSelf: true,
            });
            inAppSent = true;
        }

        if (reminder.deliveryChannels.email) {
            const emailTo = reminder.emailOverride || user.email;
            if (emailTo) {
                await sendEmail({
                    to: emailTo,
                    subject: `Reminder: ${finalMessage.substring(0, 60)}...`,
                    text: finalMessage,
                });
                emailSent = true;
            }
        }

        if (reminder.deliveryChannels.push && user.pushToken) {
            await sendPushNotification({
                to: user.pushToken,
                title: 'Reminder',
                body: finalMessage,
            });
            pushSent = true;
        }

        reminder.status = (emailSent || pushSent || inAppSent) ? 'sent' : 'pending';

        if (reminder.repeatInterval && reminder.isActive) {
            reminder.remindAt = new Date(reminder.remindAt.getTime() + reminder.repeatInterval * 60 * 1000);
            reminder.status = 'pending';
        } else if (!reminder.repeatInterval) {
            // Keep one-off reminders visible in the reminders page until the user dismisses them.
            reminder.status = 'sent';
        }

        await reminder.save();
        global.io.to(`user:${user._id}`).emit('reminderUpdated', reminder);
        return true;
    } catch (error) {
        console.error(`❌ Error processing reminder ${reminder._id}:`, error.message);
        reminder.status = 'pending';
        await reminder.save();
        return false;
    }
};

const startReminderScheduler = () => {
    console.log('🚀 Reminder scheduler started (runs every 30 seconds)');
    cron.schedule('*/30 * * * * *', async () => {
        console.log(`⏰ Scheduler tick at ${new Date().toISOString()}`);
        try {
            const now = new Date();
            const reminders = await Reminder.find({
                status: { $in: ['pending', 'snoozed'] },
                remindAt: { $lte: now },
                isActive: true,
            }).limit(100);

            console.log(`📋 Found ${reminders.length} reminders to process`);
            await Promise.all(reminders.map(reminder => sendReminder(reminder)));
        } catch (error) {
            console.error('Scheduler error:', error.message);
        }
    });
};

export { startReminderScheduler, sendReminder };
