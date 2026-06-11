// backend/controllers/botChatController.js
import BotChat from '../models/botChatModel.js';
import Task from '../models/taskModel.js';
import OpenAI from 'openai';
import { COMPANY_KNOWLEDGE, queryCompanyDocs } from '../services/grokService.js';

const openai = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

export async function sendChatMessage(req, res) {
  const { message } = req.body;
  const userId = req.user._id;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  try {
    // Find or create bot chat for the user
    let chat = await BotChat.findOne({ userId });
    if (!chat) {
      chat = new BotChat({ userId, messages: [] });
    }

    // Save user message
    chat.messages.push({
      text: message,
      sender: 'user',
      timestamp: new Date(),
    });

    // Fetch user's tasks
    const tasks = await Task.find({ userId }).sort({ createdAt: -1 });

    const taskContext = tasks.map(task => ({
      title: task.title,
      description: task.description || 'No description',
      dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date',
      priority: task.priority || 'Medium',
      completed: task.completed ? 'Completed' : 'Pending'
    })).join('\n\n');

    // System prompt for Grok, focused on tasks with company knowledge
    const systemPrompt = `
You are FundCo TM Bot, a specialized AI assistant for managing and organizing user tasks within FundCo Capital Managers. Your primary role is to help with tasks: create, update, delete, list, prioritize, suggest, set reminders, inquire deadlines, and provide details. Do NOT act as a general AI—stick strictly to task-related queries. If the query is not about tasks, politely redirect to task management.

Use the user's tasks context below to respond accurately. For company info, use the embedded knowledge.

User Tasks:
${taskContext || 'No tasks available.'}

Company Knowledge:
${COMPANY_KNOWLEDGE}

Respond concisely, use markdown for lists/tables. For actions like create/update/delete, confirm the change.
`;

    // Call Grok API
    const response = await openai.chat.completions.create({
      model: 'grok-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    const botResponse = response.choices[0].message.content;

    // Save bot response
    chat.messages.push({
      text: botResponse,
      sender: 'bot',
      timestamp: new Date(),
    });

    await chat.save();

    // If response indicates task change, refresh tasks (optional, since frontend can refetch)
    res.json({ success: true, messages: chat.messages.slice(-2) });

  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

export async function getChatHistory(req, res) {
  const userId = req.user._id;

  try {
    const chat = await BotChat.findOne({ userId });
    if (!chat) {
      return res.json({ success: true, messages: [] });
    }
    res.json({ success: true, messages: chat.messages });
  } catch (err) {
    console.error('Chat history error:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

export async function clearChatHistory(req, res) {
  const userId = req.user._id;

  try {
    await BotChat.deleteOne({ userId });
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (err) {
    console.error('Clear chat history error:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}