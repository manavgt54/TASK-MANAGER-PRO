require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { getDb, dbGet, dbAll, dbRun } = require('./lib/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// Initialize Gemini AI
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log('✅ Gemini AI initialized');
} else {
  console.log('⚠️  Gemini API key not found, using fallback AI');
}

// Email configuration - SendGrid setup
let transporter = null;
let emailConfigured = false;

// Try to configure SendGrid email, but don't fail if not available
try {
  if (process.env.SENDGRID_API_KEY) {
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
    emailConfigured = true;
    console.log('✅ SendGrid email service configured successfully');
  } else {
    console.log('⚠️  SendGrid not configured - Reminders will be logged to console for development');
  }
} catch (error) {
  console.log('⚠️  SendGrid configuration failed - Reminders will be logged to console for development');
}

// OTP storage (in production, use Redis or database)
const otpStore = new Map();

app.use(cors());
app.use(express.json());

// Initialize in-memory database
const db = getDb();
console.log('✅ In-memory database initialized');

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}


// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email - Universal function
async function sendOTPEmail(email, otp) {
  // Always log OTP to console for development/debugging
  console.log(`\n🔐 OTP for ${email}: ${otp}`);
  console.log(`⏰ OTP expires in 10 minutes`);
  console.log(`📧 Email: ${email}\n`);

  // If email is not configured, just return true (OTP is logged above)
  if (!emailConfigured || !transporter) {
    console.log('📝 Note: Email not configured - OTP displayed above for testing');
    return true;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset OTP - Task Manager',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6b21a8;">Password Reset Request</h2>
        <p>You requested to reset your password for Task Manager.</p>
        <p>Your OTP code is:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #6b21a8; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Task Manager App</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    console.log('📝 Note: OTP is still available in console above');
    return true; // Return true anyway since OTP is logged
  }
}

// Generic email function for reminders
async function sendReminderEmail(email, subject, text) {
  // Always log to console for development/debugging
  console.log(`\n📧 Reminder Email to ${email}:`);
  console.log(`Subject: ${subject}`);
  console.log(`Content: ${text}\n`);

  // If email is not configured, just return true (email is logged above)
  if (!emailConfigured || !transporter) {
    console.log('📝 Note: SendGrid not configured - Reminder email displayed above for testing');
    return true;
  }

  const mailOptions = {
    from: 'nirmal.gupta6542@gmail.com', // Your verified Gmail address
    to: email,
    subject: subject,
    text: text,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6b21a8; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🔔 Task Manager Pro</h1>
        </div>
        <div style="padding: 20px;">
          <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${text}</pre>
        </div>
        <div style="background: #f3f4f6; padding: 15px; text-align: center; color: #6b7280;">
          <p style="margin: 0;">This reminder was sent from Task Manager Pro</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Reminder email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send reminder email:', error);
    console.log('📝 Note: Reminder email is still available in console above');
    return true; // Return true anyway since email is logged
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
  try {
    console.log('Registering user:', email);
    const passwordHash = await bcrypt.hash(password, 10);
    const info = await dbRun('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, passwordHash]);
    console.log('User created with ID:', info.lastInsertRowid);
    const token = signToken({ userId: info.lastInsertRowid, email });
    const user = { id: info.lastInsertRowid, email };
    console.log('Registration successful for:', email);
    return res.json({ success: true, token, user });
  } catch (err) {
    console.error('Registration error:', err);
    if (String(err.message || '').includes('UNIQUE')) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = signToken({ userId: user.id, email: user.email });
    return res.json({ success: true, token, user: { id: user.id, email: user.email } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Forgot Password - Send OTP
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  try {
    // Check if user exists
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ success: true, message: 'If the email exists, an OTP has been sent' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store OTP in database
    await dbRun(`
      INSERT INTO password_resets (email, otp, expires_at) 
      VALUES (?, ?, ?)
    `, [email, otp, expiresAt]);

    // Send email (always works now - OTP is logged to console)
    await sendOTPEmail(email, otp);

    return res.json({ 
      success: true, 
      message: 'OTP has been sent. Check your email or console for the code.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

  try {
    // Find valid OTP
    const resetRecord = await dbGet(`
      SELECT * FROM password_resets 
      WHERE email = ? AND otp = ? AND used = 0 AND expires_at > datetime('now')
      ORDER BY created_at DESC LIMIT 1
    `, [email, otp]);

    if (!resetRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    await dbRun('UPDATE password_resets SET used = 1 WHERE id = ?', [resetRecord.id]);

    // Generate temporary token for password reset
    const resetToken = jwt.sign(
      { email, purpose: 'password_reset' }, 
      JWT_SECRET, 
      { expiresIn: '15m' }
    );

    return res.json({ 
      success: true,
      message: 'OTP verified successfully', 
      resetToken 
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, newPassword, resetToken } = req.body || {};
  if (!resetToken || !newPassword || !email) {
    return res.status(400).json({ success: false, message: 'Reset token, new password, and email are required' });
  }

  try {
    // Verify reset token
    const decoded = jwt.verify(resetToken, JWT_SECRET);
    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ success: false, message: 'Invalid reset token' });
    }

    if (decoded.email !== email) {
      return res.status(400).json({ success: false, message: 'Email mismatch' });
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    const result = await dbRun('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, email]);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Invalidate all OTPs for this email
    await dbRun('UPDATE password_resets SET used = 1 WHERE email = ?', [email]);

    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Tasks CRUD
app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC', [req.user.userId]);
    return res.json(rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      completed: !!r.completed,
      dueDate: r.due_date || '',
      list: r.list || 'Personal',
      tags: JSON.parse(r.tags || '[]'),
      subtasks: JSON.parse(r.subtasks || '[]'),
      createdAt: r.created_at,
      updatedAt: r.updated_at || null
    })));
  } catch (error) {
    console.error('Get tasks error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  const { title, description, dueDate, list, tags, subtasks } = req.body || {};
  if (!title) return res.status(400).json({ message: 'Title is required' });
  
  try {
    const info = await dbRun(`
      INSERT INTO tasks (user_id, title, description, completed, due_date, list, tags, subtasks) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.userId, 
      title, 
      description || '', 
      0, // completed
      dueDate || '', 
      list || 'Personal',
      JSON.stringify(tags || []),
      JSON.stringify(subtasks || [])
    ]);
    
    const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [info.lastInsertRowid]);
    return res.status(201).json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        description: task.description || '',
        completed: !!task.completed,
        dueDate: task.due_date || '',
        list: task.list || 'Personal',
        tags: JSON.parse(task.tags || '[]'),
        subtasks: JSON.parse(task.subtasks || '[]'),
        createdAt: task.created_at,
        updatedAt: task.updated_at || null
      }
    });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const { title, description, completed, dueDate, list, tags, subtasks } = req.body || {};
  
  try {
    const task = await dbGet('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.userId]);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    await dbRun(`
      UPDATE tasks SET 
        title = ?, description = ?, completed = ?, due_date = ?, 
        list = ?, tags = ?, subtasks = ?, updated_at = datetime('now') 
      WHERE id = ? AND user_id = ?
    `, [
      title ?? task.title, 
      description ?? task.description, 
      completed !== undefined ? (completed ? 1 : 0) : task.completed,
      dueDate ?? task.due_date,
      list ?? task.list,
      JSON.stringify(tags ?? JSON.parse(task.tags || '[]')),
      JSON.stringify(subtasks ?? JSON.parse(task.subtasks || '[]')),
      id, 
      req.user.userId
    ]);
    
    const updated = await dbGet('SELECT * FROM tasks WHERE id = ?', [id]);
    return res.json({
      success: true,
      task: {
        id: updated.id,
        title: updated.title,
        description: updated.description || '',
        completed: !!updated.completed,
        dueDate: updated.due_date || '',
        list: updated.list || 'Personal',
        tags: JSON.parse(updated.tags || '[]'),
        subtasks: JSON.parse(updated.subtasks || '[]'),
        createdAt: updated.created_at,
        updatedAt: updated.updated_at || null
      }
    });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/tasks/:id/toggle', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  
  try {
    const task = await dbGet('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.userId]);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    const newCompleted = task.completed ? 0 : 1;
    await dbRun('UPDATE tasks SET completed = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?', 
      [newCompleted, id, req.user.userId]);
    
    const updated = await dbGet('SELECT * FROM tasks WHERE id = ?', [id]);
    return res.json({
      success: true,
      task: {
        id: updated.id,
        title: updated.title,
        description: updated.description || '',
        completed: !!updated.completed,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at || null
      }
    });
  } catch (error) {
    console.error('Toggle task error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  
  try {
    const task = await dbGet('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.userId]);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    await dbRun('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.userId]);
    return res.status(200).json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get current user info
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    console.log('Getting user for ID:', req.user.userId);
    const user = await dbGet('SELECT id, email, created_at FROM users WHERE id = ?', [req.user.userId]);
    console.log('Found user:', user);
    if (!user) {
      console.log('User not found for ID:', req.user.userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, user: { id: user.id, email: user.email, createdAt: user.created_at } });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Send reminder endpoint
app.post('/api/tasks/:id/remind', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const { reminderType, userTime } = req.body || {};
  
  try {
    const task = await dbGet('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.userId]);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.userId]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // Send reminder email
    const reminderSubject = `🔔 Task Reminder: ${task.title}`;
    const reminderText = `
Hi there!

This is a reminder about your task:

📋 Task: ${task.title}
📝 Description: ${task.description || 'No description'}
📅 Due Date: ${task.due_date || 'No due date set'}
📋 List: ${task.list || 'Personal'}

${reminderType === 'now' ? 'This is an immediate reminder.' : 'This is a scheduled reminder.'}

Best regards,
Task Manager Pro
    `;
    
    try {
      await sendReminderEmail(user.email, reminderSubject, reminderText);
      return res.json({ success: true, message: 'Reminder sent successfully' });
    } catch (emailError) {
      console.log('Reminder email sent to console (SendGrid not configured):', reminderText);
      return res.json({ success: true, message: 'Reminder logged to console (SendGrid not configured)' });
    }
  } catch (error) {
    console.error('Send reminder error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Chatbot endpoint with Gemini AI
app.post('/api/chatbot', authMiddleware, async (req, res) => {
  const { message, userTasks, userEmail, fullContext, contextType } = req.body || {};
  
  if (!message) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  try {
    // Analyze user's tasks for context
    const totalTasks = userTasks.length;
    const completedTasks = userTasks.filter(task => task.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    const highPriorityTasks = userTasks.filter(task => task.priority === 'high' && !task.completed).length;
    const overdueTasks = userTasks.filter(task => task.dueDate && new Date(task.dueDate) < new Date() && !task.completed).length;
    const taskLists = [...new Set(userTasks.map(task => task.list || 'Personal'))];
    const personalTasks = userTasks.filter(task => (task.list || 'Personal') === 'Personal').length;
    const workTasks = userTasks.filter(task => task.list === 'Work').length;
    
    let response = '';
    
    // Use Gemini AI if available, otherwise fallback to rule-based
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        // Create context for the AI
        const contextPrompt = `You are a helpful AI productivity assistant for a task management app. 

USER CONTEXT:
- Email: ${userEmail}
- Total Tasks: ${totalTasks}
- Completed: ${completedTasks}
- Pending: ${pendingTasks}
- High Priority: ${highPriorityTasks}
- Overdue: ${overdueTasks}
- Personal Tasks: ${personalTasks}
- Work Tasks: ${workTasks}
- Task Lists: ${taskLists.join(', ')}

RECENT TASKS:
${userTasks.slice(0, 10).map(task => `- ${task.title} (${task.priority} priority, ${task.list || 'Personal'}, ${task.completed ? 'Completed' : 'Pending'})`).join('\n')}

USER MESSAGE: "${message}"

Please provide a helpful, encouraging, and actionable response based on their task data. Be conversational, motivational, and specific to their situation. Keep responses concise but informative.`;

        const result = await model.generateContent(contextPrompt);
        response = result.response.text();
        
        console.log('🤖 Gemini AI response generated');
      } catch (aiError) {
        console.error('Gemini AI error:', aiError);
        // Fallback to rule-based responses
        response = generateFallbackResponse(message, userTasks, totalTasks, completedTasks, pendingTasks, highPriorityTasks, overdueTasks, taskLists, personalTasks, workTasks);
      }
    } else {
      // Fallback to rule-based responses
      response = generateFallbackResponse(message, userTasks, totalTasks, completedTasks, pendingTasks, highPriorityTasks, overdueTasks, taskLists, personalTasks, workTasks);
    }
    
    return res.json({ 
      success: true, 
      response: response,
      taskStats: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        highPriority: highPriorityTasks,
        overdue: overdueTasks,
        personal: personalTasks,
        work: workTasks,
        lists: taskLists
      }
    });
  } catch (error) {
    console.error('Chatbot error:', error);
    return res.status(500).json({ success: false, message: 'AI assistant is temporarily unavailable' });
  }
});

// Fallback response function
function generateFallbackResponse(message, userTasks, totalTasks, completedTasks, pendingTasks, highPriorityTasks, overdueTasks, taskLists, personalTasks, workTasks) {
  if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
    return `Hello! I'm your AI productivity assistant with full access to your data. I can see you have ${totalTasks} tasks total (${completedTasks} completed, ${pendingTasks} pending). You're working across ${taskLists.length} lists: ${taskLists.join(', ')}. How can I help you today?`;
  } else if (message.toLowerCase().includes('motivation') || message.toLowerCase().includes('motivate')) {
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return `You're doing great! You've completed ${completedTasks} tasks (${completionRate}% completion rate). ${pendingTasks > 0 ? `You have ${pendingTasks} tasks remaining - let's tackle them one by one! 💪` : 'You\'re all caught up! Time to celebrate! 🎉'}`;
  } else if (message.toLowerCase().includes('what tasks') || message.toLowerCase().includes('my tasks')) {
    if (userTasks.length === 0) {
      return `You don't have any tasks yet! Let's create your first task to get started. Click the "+" button to add a new task.`;
    } else {
      const pendingTasks = userTasks.filter(t => !t.completed);
      const completedTasks = userTasks.filter(t => t.completed);
      return `Here's your task overview:\n\n📋 **Pending Tasks (${pendingTasks.length}):**\n${pendingTasks.slice(0, 5).map(task => `• ${task.title} (${task.priority} priority, ${task.list || 'Personal'})`).join('\n')}${pendingTasks.length > 5 ? `\n... and ${pendingTasks.length - 5} more` : ''}\n\n✅ **Completed Tasks (${completedTasks.length}):**\n${completedTasks.slice(0, 3).map(task => `• ${task.title}`).join('\n')}${completedTasks.length > 3 ? `\n... and ${completedTasks.length - 3} more` : ''}\n\nWhat would you like to focus on?`;
    }
  } else {
    return `I can help you with task management, scheduling, motivation, and productivity tips. You currently have ${totalTasks} tasks (${completedTasks} completed, ${pendingTasks} pending) across ${taskLists.length} lists. What would you like to work on?`;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


