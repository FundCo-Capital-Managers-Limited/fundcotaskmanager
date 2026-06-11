// controllers/feedbackController.js
import Feedback from '../models/feedbackModel.js';

export async function submitFeedback(req, res) {
  const { category, feedback } = req.body;

  if (!category || !feedback || feedback.trim().length < 10) {
    return res.status(400).json({ success: false, message: 'All fields are required and feedback must be at least 10 characters' });
  }

  try {
    const newFeedback = new Feedback({
      userId: req.user.id,
      category,
      feedback: feedback.trim(),
    });

    await newFeedback.save();
    res.status(201).json({ success: true, message: 'Feedback submitted successfully' });
  } catch (err) {
    console.error('Error submitting feedback:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}