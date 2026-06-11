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

export async function getAllFeedback(req, res) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Super Admin access required' });
  }

  try {
    const { search = '', category = '' } = req.query;
    const query = {};

    if (category) query.category = category;
    if (search) {
      query.$or = [
        { feedback: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const feedbacks = await Feedback.find(query)
      .populate('userId', 'firstName lastName otherName fullName email position unitSector role')
      .sort({ timestamp: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, feedbacks, total: feedbacks.length });
  } catch (err) {
    console.error('Error fetching feedback:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch feedback' });
  }
}



