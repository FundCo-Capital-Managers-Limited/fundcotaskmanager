import admin from 'firebase-admin';
import User from '../models/userModel.js';

//console.log('FIREBASE_CREDENTIALS:', process.env.FIREBASE_CREDENTIALS); // Debug

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS)),
        });
        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.error('Error initializing Firebase Admin:', error.message, error.stack);
        throw new Error(`Firebase Admin initialization failed: ${error.message}`);
    }
}

const sendPushNotification = async ({ to, title, body }) => {
    if (!to) {
        console.error('No push token provided');
        throw new Error('No push token provided');
    }

    try {
        const message = {
            token: to,
            notification: {
                title,
                body,
            },
            data: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
            android: {
                priority: 'high',
            },
            apns: {
                headers: {
                    'apns-priority': '10',
                },
            },
        };
        const response = await admin.messaging().send(message);
        console.log(`Push notification sent to ${to}: ${response}`);
        return response;
    } catch (error) {
        console.error(`Error sending push to ${to}:`, error.message, error.code, error.stack);
        if (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token') {
            console.log(`Removing invalid push token for ${to}`);
            await User.updateOne({ pushToken: to }, { $unset: { pushToken: 1 } });
        }
        throw new Error(`Failed to send push notification: ${error.message}`);
    }
};

export { sendPushNotification };