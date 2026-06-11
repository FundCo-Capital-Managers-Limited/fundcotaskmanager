import mongoose from 'mongoose';

const botChatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    messages: [{
        text: {
            type: String,
            required: true,
        },
        sender: {
            type: String,
            enum: ['user', 'bot'],
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    }],
});

export default mongoose.model('BotChat', botChatSchema);