// backend/models/meetingModel.js
import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  zoomMeetingId: {
    type: String,
    required: true,
    unique: true,
  },
  topic: {
    type: String,
    required: true,
  },
  agenda: {
    type: String,
  },
  startTime: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  joinUrl: {
    type: String,
    required: true,
  },
  password: {
    type: String,
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  }],
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'ended', 'cancelled'],
    default: 'scheduled',
  },
}, { timestamps: true });

meetingSchema.index({ creator: 1, startTime: -1 });

const Meeting = mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema);

export default Meeting;