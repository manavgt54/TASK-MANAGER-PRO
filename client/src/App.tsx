import React, { useState, useEffect } from 'react';
import './index.css';

// API base URL
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// Types
interface User {
  id: number;
  email: string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  list: string;
  tags: string[];
  subtasks: string[];
  createdAt: string;
  updatedAt?: string;
  priority?: 'low' | 'medium' | 'high';
  reminder?: string;
}

interface List {
  id: number;
  name: string;
  color: string;
  description?: string;
  theme?: 'personal' | 'work' | 'default';
}

interface StickyNote {
  id: number;
  title: string;
  content: string;
  color: string;
  textColor: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

// API functions
const api = {
  async register(email: string, password: string) {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },

  async forgotPassword(email: string) {
    const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return response.json();
  },

  async verifyOTP(email: string, otp: string) {
    const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    return response.json();
  },

  async resetPassword(email: string, newPassword: string, resetToken: string) {
    const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword, resetToken }),
    });
    return response.json();
  },

  async getTasks(token: string) {
    const response = await fetch(`${API_BASE}/api/tasks`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.json();
  },

  async createTask(token: string, task: Partial<Task>) {
    const response = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(task),
    });
    return response.json();
  },

  async updateTask(token: string, id: number, task: Partial<Task>) {
    const response = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(task),
    });
    return response.json();
  },

  async deleteTask(token: string, id: number) {
    const response = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.json();
  },
};

function App() {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth form states
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'verify' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Task management state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentView, setCurrentView] = useState<'tasks' | 'calendar' | 'sticky' | 'upcoming'>('tasks');
  const [currentList, setCurrentList] = useState<string>('Personal');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskList, setTaskList] = useState('Personal');
  const [taskTags, setTaskTags] = useState<string[]>([]);
  const [taskSubtasks, setTaskSubtasks] = useState<string[]>([]);
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskReminder, setTaskReminder] = useState('');

  // Lists state
  const [lists] = useState<List[]>([
    { id: 1, name: 'Personal', color: '#8B5CF6', description: 'Personal tasks and goals', theme: 'personal' },
    { id: 2, name: 'Work', color: '#3B82F6', description: 'Work-related tasks and projects', theme: 'work' },
    { id: 3, name: 'Shopping', color: '#10B981', description: 'Shopping lists and errands', theme: 'default' },
    { id: 4, name: 'Health', color: '#F59E0B', description: 'Health and fitness tasks', theme: 'default' },
  ]);

  // Sticky notes state
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [showStickyForm, setShowStickyForm] = useState(false);
  const [stickyTitle, setStickyTitle] = useState('');
  const [stickyContent, setStickyContent] = useState('');
  const [stickyColor, setStickyColor] = useState('#FFD700');
  const [stickyTextColor, setStickyTextColor] = useState('#000000');

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarTasks, setCalendarTasks] = useState<{ [key: string]: Task[] }>({});

  // Load user data on mount
  useEffect(() => {
    if (token) {
      loadUserData();
    }
  }, [token]);

  // Load tasks when user changes
  useEffect(() => {
    if (user && token) {
      loadTasks();
    }
  }, [user, token, currentList]);

  // Load calendar tasks
  useEffect(() => {
    if (tasks.length > 0) {
      const calendarData: { [key: string]: Task[] } = {};
      tasks.forEach(task => {
        if (task.dueDate) {
          const date = new Date(task.dueDate).toISOString().split('T')[0];
          if (!calendarData[date]) {
            calendarData[date] = [];
          }
          calendarData[date].push(task);
        }
      });
      setCalendarTasks(calendarData);
    }
  }, [tasks]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        throw new Error('Invalid token');
      }
    } catch (err) {
      setError('Failed to load user data');
      setToken(null);
      localStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const response = await api.getTasks(token!);
      if (response.success) {
        setTasks(response.tasks || []);
      } else {
        setError(response.message || 'Failed to load tasks');
      }
    } catch (err) {
      setError('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  // Authentication handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.login(email, password);
      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        localStorage.setItem('token', response.token);
        setEmail('');
        setPassword('');
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      setError('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.register(email, password);
      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        localStorage.setItem('token', response.token);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.forgotPassword(email);
      if (response.success) {
        setAuthMode('verify');
        setError(null);
      } else {
        setError(response.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.verifyOTP(email, otp);
      if (response.success) {
        setResetToken(response.resetToken);
        setAuthMode('reset');
        setOtp('');
      } else {
        setError(response.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.resetPassword(email, newPassword, resetToken);
      if (response.success) {
        setAuthMode('login');
        setEmail('');
        setNewPassword('');
        setConfirmPassword('');
        setResetToken('');
        setError(null);
      } else {
        setError(response.message || 'Password reset failed');
      }
    } catch (err) {
      setError('Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setTasks([]);
    setSelectedTask(null);
    localStorage.removeItem('token');
    setAuthMode('login');
  };

  // Task handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setIsLoading(true);
    try {
      const newTask: Partial<Task> = {
        title: taskTitle,
        description: taskDescription,
        dueDate: taskDueDate || undefined,
        list: taskList,
        tags: taskTags,
        subtasks: taskSubtasks,
        priority: taskPriority,
        reminder: taskReminder || undefined,
      };

      const response = await api.createTask(token!, newTask);
      if (response.success) {
        setTasks([...tasks, response.task]);
        resetTaskForm();
        setShowTaskForm(false);
      } else {
        setError(response.message || 'Failed to create task');
      }
    } catch (err) {
      setError('Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !taskTitle.trim()) return;

    setIsLoading(true);
    try {
      const updatedTask: Partial<Task> = {
        title: taskTitle,
        description: taskDescription,
        dueDate: taskDueDate || undefined,
        list: taskList,
        tags: taskTags,
        subtasks: taskSubtasks,
        priority: taskPriority,
        reminder: taskReminder || undefined,
      };

      const response = await api.updateTask(token!, editingTask.id, updatedTask);
      if (response.success) {
        setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...updatedTask } : t));
        resetTaskForm();
        setEditingTask(null);
        setShowTaskForm(false);
      } else {
        setError(response.message || 'Failed to update task');
      }
    } catch (err) {
      setError('Failed to update task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setIsLoading(true);
    try {
      const response = await api.deleteTask(token!, id);
      if (response.success) {
        setTasks(tasks.filter(t => t.id !== id));
        if (selectedTask?.id === id) {
          setSelectedTask(null);
        }
      } else {
        setError(response.message || 'Failed to delete task');
      }
    } catch (err) {
      setError('Failed to delete task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTask = async (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    setIsLoading(true);
    try {
      const response = await api.updateTask(token!, id, { completed: !task.completed });
      if (response.success) {
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
      } else {
        setError(response.message || 'Failed to update task');
      }
    } catch (err) {
      setError('Failed to update task');
    } finally {
      setIsLoading(false);
    }
  };

  const resetTaskForm = () => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskDueDate('');
    setTaskList('Personal');
    setTaskTags([]);
    setTaskSubtasks([]);
    setTaskPriority('medium');
    setTaskReminder('');
  };

  const openTaskForm = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTaskTitle(task.title);
      setTaskDescription(task.description);
      setTaskDueDate(task.dueDate || '');
      setTaskList(task.list);
      setTaskTags(task.tags);
      setTaskSubtasks(task.subtasks);
      setTaskPriority(task.priority || 'medium');
      setTaskReminder(task.reminder || '');
    } else {
      setEditingTask(null);
      resetTaskForm();
    }
    setShowTaskForm(true);
  };

  // Sticky notes handlers
  const handleCreateSticky = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stickyTitle.trim() || !stickyContent.trim()) return;

    const newSticky: StickyNote = {
      id: Date.now(),
      title: stickyTitle,
      content: stickyContent,
      color: stickyColor,
      textColor: stickyTextColor,
      position: { x: Math.random() * 400, y: Math.random() * 300 },
      size: { width: 200, height: 150 },
    };

    setStickyNotes([...stickyNotes, newSticky]);
    setStickyTitle('');
    setStickyContent('');
    setShowStickyForm(false);
  };

  const handleDeleteSticky = (id: number) => {
    setStickyNotes(stickyNotes.filter(note => note.id !== id));
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return calendarTasks[dateStr] || [];
  };

  // Filter tasks by current list
  const filteredTasks = tasks.filter(task => task.list === currentList);

  // Get upcoming tasks (due within next 7 days)
  const upcomingTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7 && !task.completed;
  });


  // If not authenticated, show auth forms
  if (!user || !token) {
  return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Stars background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Task Manager</h1>
            <p className="text-white/80">
              {authMode === 'login' && 'Welcome back! Sign in to continue'}
              {authMode === 'register' && 'Create your account to get started'}
              {authMode === 'forgot' && 'Reset your password'}
              {authMode === 'verify' && 'Verify your email'}
              {authMode === 'reset' && 'Set your new password'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                  className="text-white/80 hover:text-white text-sm underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="text-center">
                <span className="text-white/80 text-sm">Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="text-white hover:text-white/80 text-sm underline"
                >
                  Register
                </button>
              </div>
            </form>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
              <div className="text-center">
                <span className="text-white/80 text-sm">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-white hover:text-white/80 text-sm underline"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send Reset Code'}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-white hover:text-white/80 text-sm underline"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {authMode === 'verify' && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                  className="text-white hover:text-white/80 text-sm underline"
                >
                  Back to Forgot Password
                </button>
              </div>
            </form>
          )}

          {authMode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
      <div>
                <label className="block text-white/90 text-sm font-medium mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-white hover:text-white/80 text-sm underline"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Main app interface
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Task Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'tasks', label: 'Tasks', icon: '📋' },
              { id: 'calendar', label: 'Calendar', icon: '📅' },
              { id: 'sticky', label: 'Sticky Wall', icon: '📝' },
              { id: 'upcoming', label: 'Upcoming', icon: '⏰' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id as any)}
                className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Tasks View */}
        {currentView === 'tasks' && (
          <div className={`grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-screen p-6 relative ${
            currentList === 'Personal' 
              ? 'bg-gradient-to-br from-green-100 via-green-200 to-green-300' 
              : currentList === 'Work' 
              ? 'bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300'
              : 'bg-gray-100'
          }`}>
            {/* Theme decorations */}
            {currentList === 'Personal' && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Football field lines */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white opacity-30"></div>
                <div className="absolute top-1/4 left-0 w-full h-0.5 bg-white opacity-20"></div>
                <div className="absolute top-3/4 left-0 w-full h-0.5 bg-white opacity-20"></div>
                {/* Goal posts */}
                <div className="absolute top-1/2 right-4 w-2 h-16 bg-white opacity-40 transform -translate-y-1/2"></div>
                <div className="absolute top-1/2 right-4 w-8 h-2 bg-white opacity-40 transform -translate-y-1/2"></div>
                <div className="absolute top-1/2 left-4 w-2 h-16 bg-white opacity-40 transform -translate-y-1/2"></div>
                <div className="absolute top-1/2 left-4 w-8 h-2 bg-white opacity-40 transform -translate-y-1/2"></div>
              </div>
            )}
            {currentList === 'Work' && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Office building silhouettes */}
                <div className="absolute bottom-0 left-0 w-32 h-24 bg-blue-400 opacity-20 rounded-t-lg"></div>
                <div className="absolute bottom-0 left-8 w-24 h-32 bg-blue-500 opacity-25 rounded-t-lg"></div>
                <div className="absolute bottom-0 right-0 w-28 h-20 bg-blue-400 opacity-20 rounded-t-lg"></div>
                <div className="absolute bottom-0 right-12 w-20 h-28 bg-blue-500 opacity-25 rounded-t-lg"></div>
                {/* Windows */}
                <div className="absolute bottom-4 left-2 w-2 h-2 bg-white opacity-40 rounded"></div>
                <div className="absolute bottom-4 left-6 w-2 h-2 bg-white opacity-40 rounded"></div>
                <div className="absolute bottom-8 left-2 w-2 h-2 bg-white opacity-40 rounded"></div>
                <div className="absolute bottom-8 left-6 w-2 h-2 bg-white opacity-40 rounded"></div>
              </div>
            )}
            {/* Sidebar - Lists */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Lists</h2>
                  <button
                    onClick={() => openTaskForm()}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                  >
                    + Add Task
                  </button>
                </div>
                <div className="space-y-2">
                  {lists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => setCurrentList(list.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentList === list.name
                          ? 'bg-purple-100 text-purple-900'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        <div
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: list.color }}
                        />
                        <span className="font-semibold">{list.name}</span>
                        <span className="ml-auto text-xs text-gray-500">
                          {tasks.filter(t => t.list === list.name).length}
                        </span>
                      </div>
                      {list.description && (
                        <p className="text-xs text-gray-500 ml-6 leading-relaxed">
                          {list.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content - Task List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currentList} Tasks
                  </h2>
                  <div className="text-sm text-gray-500">
                    {filteredTasks.filter(t => !t.completed).length} remaining
                  </div>
                </div>
                <div className="space-y-3">
                  {filteredTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📝</div>
                      <p>No tasks yet. Create your first task!</p>
                    </div>
                  ) : (
                    filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          task.completed
                            ? 'bg-gray-50 border-gray-200 opacity-60'
                            : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-sm'
                        }`}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className="flex items-start">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTask(task.id);
                            }}
                            className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              task.completed
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 hover:border-green-500'
                            }`}
                          >
                            {task.completed && '✓'}
                          </button>
                          <div className="ml-3 flex-1">
                            <h3 className={`font-medium ${
                              task.completed ? 'line-through text-gray-500' : 'text-gray-900'
                            }`}>
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className={`text-sm mt-1 ${
                                task.completed ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {task.description}
                              </p>
                            )}
                            {task.dueDate && (
                              <p className={`text-xs mt-1 ${
                                task.completed ? 'text-gray-400' : 'text-purple-600'
                              }`}>
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </p>
                            )}
                            {task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {task.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
      </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openTaskForm(task);
                              }}
                              className="text-gray-400 hover:text-gray-600 p-1"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id);
                              }}
                              className="text-gray-400 hover:text-red-600 p-1"
                            >
                              🗑️
        </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Task Details */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Details</h3>
                {selectedTask ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedTask.title}</p>
                    </div>
                    {selectedTask.description && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedTask.description}</p>
                      </div>
                    )}
                    {selectedTask.dueDate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Due Date</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(selectedTask.dueDate).toLocaleDateString()}
        </p>
      </div>
                    )}
                    {selectedTask.tags.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tags</label>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedTask.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedTask.subtasks.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Subtasks</label>
                        <div className="mt-1 space-y-1">
                          {selectedTask.subtasks.map((subtask, index) => (
                            <div key={index} className="flex items-center text-sm text-gray-600">
                              <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                              {subtask}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openTaskForm(selectedTask)}
                          className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Edit Task
                        </button>
                        <button
                          onClick={() => handleDeleteTask(selectedTask.id)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">👆</div>
                    <p>Select a task to view details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Calendar View */}
        {currentView === 'calendar' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ←
                </button>
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  →
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentDate).map((date, index) => {
                if (!date) {
                  return <div key={index} className="h-24"></div>;
                }
                
                const dayTasks = getTasksForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={index}
                    className={`h-24 p-2 border border-gray-200 rounded-lg ${
                      isToday ? 'bg-purple-50 border-purple-300' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${isToday ? 'text-purple-700' : 'text-gray-900'}`}>
                        {date.getDate()}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded-full">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className={`text-xs p-1 rounded truncate ${
                            task.completed ? 'bg-gray-200 text-gray-500' : 'bg-purple-100 text-purple-700'
                          }`}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{dayTasks.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sticky Wall View */}
        {currentView === 'sticky' && (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 min-h-screen p-6 relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Sticky Wall</h2>
              <button
                onClick={() => setShowStickyForm(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                + Add Note
              </button>
            </div>
            
            <div className="relative min-h-96">
              {stickyNotes.map((note) => (
                <div
                  key={note.id}
                  className="absolute p-4 rounded-lg shadow-lg cursor-move"
                  style={{
                    backgroundColor: note.color,
                    color: note.textColor,
                    left: note.position.x,
                    top: note.position.y,
                    width: note.size.width,
                    height: note.size.height,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm truncate">{note.title}</h3>
                    <button
                      onClick={() => handleDeleteSticky(note.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed">{note.content}</p>
                </div>
              ))}
            </div>
            
            {showStickyForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Sticky Note</h3>
                  <form onSubmit={handleCreateSticky} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={stickyTitle}
                        onChange={(e) => setStickyTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Note title"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                      <textarea
                        value={stickyContent}
                        onChange={(e) => setStickyContent(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-24"
                        placeholder="Note content"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                        <input
                          type="color"
                          value={stickyColor}
                          onChange={(e) => setStickyColor(e.target.value)}
                          className="w-full h-10 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                        <input
                          type="color"
                          value={stickyTextColor}
                          onChange={(e) => setStickyTextColor(e.target.value)}
                          className="w-full h-10 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        Create Note
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowStickyForm(false)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Tasks View */}
        {currentView === 'upcoming' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Upcoming Tasks</h2>
              <div className="text-sm text-gray-500">
                {upcomingTasks.length} tasks due in the next 7 days
              </div>
            </div>
            
            <div className="space-y-4">
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🎉</div>
                  <p>No upcoming tasks! You're all caught up.</p>
                </div>
              ) : (
                upcomingTasks.map((task) => {
                  const dueDate = new Date(task.dueDate!);
                  const now = new Date();
                  const diffTime = dueDate.getTime() - now.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        diffDays === 0
                          ? 'border-red-500 bg-red-50'
                          : diffDays <= 2
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center mt-2 space-x-4">
                            <span className="text-sm text-gray-500">
                              Due: {dueDate.toLocaleDateString()}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                diffDays === 0
                                  ? 'bg-red-100 text-red-700'
                                  : diffDays <= 2
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {diffDays === 0 ? 'Due Today' : `${diffDays} days left`}
                            </span>
                            {task.reminder && (
                              <span className="text-xs text-purple-600">🔔 {task.reminder}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleToggleTask(task.id)}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              task.completed
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 hover:border-green-500'
                            }`}
                          >
                            {task.completed && '✓'}
                          </button>
                          <button
                            onClick={() => openTaskForm(task)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Task Form Modal */}
        {showTaskForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h3>
              <form onSubmit={editingTask ? handleUpdateTask : handleCreateTask} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Task title"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-20"
                    placeholder="Task description"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">List</label>
                    <select
                      value={taskList}
                      onChange={(e) => setTaskList(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {lists.map((list) => (
                        <option key={list.id} value={list.name}>
                          {list.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reminder</label>
                  <input
                    type="text"
                    value={taskReminder}
                    onChange={(e) => setTaskReminder(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., 1 hour before, Tomorrow morning"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTaskForm(false);
                      setEditingTask(null);
                      resetTaskForm();
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;