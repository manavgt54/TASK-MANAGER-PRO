require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { getDb } = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// Email configuration - Universal setup
let transporter = null;
let emailConfigured = false;

// Try to configure email, but don't fail if not available
try {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS && 
      process.env.EMAIL_USER !== 'your-email@gmail.com' && 
      process.env.EMAIL_PASS !== 'your-app-password') {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    emailConfigured = true;
    console.log('✅ Email service configured successfully');
  } else {
    console.log('⚠️  Email not configured - OTP will be logged to console for development');
  }
} catch (error) {
  console.log('⚠️  Email configuration failed - OTP will be logged to console for development');
}

// OTP storage (in production, use Redis or database)
const otpStore = new Map();

app.use(cors());
app.use(express.json());

// Initialize DB and tables
const db = getDb();

// Drop existing tables to recreate with new schema
db.exec(`
  DROP TABLE IF EXISTS tasks;
  DROP TABLE IF EXISTS password_resets;
  DROP TABLE IF EXISTS users;
`);

db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    completed INTEGER DEFAULT 0,
    due_date TEXT,
    list TEXT DEFAULT 'Personal',
    tags TEXT DEFAULT '[]',
    subtasks TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

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
    const passwordHash = await bcrypt.hash(password, 10);
    const insert = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
    const info = insert.run(email, passwordHash);
    const token = signToken({ userId: info.lastInsertRowid, email });
    const user = { id: info.lastInsertRowid, email };
    return res.json({ success: true, token, user });
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  const token = signToken({ userId: user.id, email: user.email });
  return res.json({ success: true, token, user: { id: user.id, email: user.email } });
});

// Forgot Password - Send OTP
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  try {
    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ success: true, message: 'If the email exists, an OTP has been sent' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store OTP in database
    const insertOTP = db.prepare(`
      INSERT INTO password_resets (email, otp, expires_at) 
      VALUES (?, ?, ?)
    `);
    insertOTP.run(email, otp, expiresAt);

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
    const resetRecord = db.prepare(`
      SELECT * FROM password_resets 
      WHERE email = ? AND otp = ? AND used = 0 AND expires_at > datetime('now')
      ORDER BY created_at DESC LIMIT 1
    `).get(email, otp);

    if (!resetRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);

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
    const updateUser = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?');
    const result = updateUser.run(passwordHash, email);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Invalidate all OTPs for this email
    db.prepare('UPDATE password_resets SET used = 1 WHERE email = ?').run(email);

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
app.get('/api/tasks', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC').all(req.user.userId);
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
});

app.post('/api/tasks', authMiddleware, (req, res) => {
  const { title, description, dueDate, list, tags, subtasks } = req.body || {};
  if (!title) return res.status(400).json({ message: 'Title is required' });
  
  const stmt = db.prepare(`
    INSERT INTO tasks (user_id, title, description, completed, due_date, list, tags, subtasks) 
    VALUES (?, ?, ?, 0, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    req.user.userId, 
    title, 
    description || '', 
    dueDate || '', 
    list || 'Personal',
    JSON.stringify(tags || []),
    JSON.stringify(subtasks || [])
  );
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json({
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
  });
});

app.put('/api/tasks/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const { title, description, completed, dueDate, list, tags, subtasks } = req.body || {};
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, req.user.userId);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  
  const stmt = db.prepare(`
    UPDATE tasks SET 
      title = ?, description = ?, completed = ?, due_date = ?, 
      list = ?, tags = ?, subtasks = ?, updated_at = datetime('now') 
    WHERE id = ? AND user_id = ?
  `);
  stmt.run(
    title ?? task.title, 
    description ?? task.description, 
    completed !== undefined ? (completed ? 1 : 0) : task.completed,
    dueDate ?? task.due_date,
    list ?? task.list,
    JSON.stringify(tags ?? JSON.parse(task.tags || '[]')),
    JSON.stringify(subtasks ?? JSON.parse(task.subtasks || '[]')),
    id, 
    req.user.userId
  );
  
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  return res.json({
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
  });
});

app.patch('/api/tasks/:id/toggle', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, req.user.userId);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  const newCompleted = task.completed ? 0 : 1;
  db.prepare('UPDATE tasks SET completed = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
    .run(newCompleted, id, req.user.userId);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  return res.json({
    id: updated.id,
    title: updated.title,
    description: updated.description || '',
    completed: !!updated.completed,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at || null
  });
});

app.delete('/api/tasks/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, req.user.userId);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, req.user.userId);
  return res.status(204).send();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


