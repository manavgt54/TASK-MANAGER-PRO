# Task Manager Pro CLI Chat

A powerful command-line interface for chatting with your AI productivity assistant that has full access to all your tasks, progress, and data.

## Features

- 🤖 **AI Chat with Full Context** - The AI knows about all your tasks, progress, and patterns
- 📊 **Real-time Data Analysis** - Get insights about your productivity and task patterns
- 🎯 **Smart Recommendations** - Receive personalized advice based on your actual data
- 💬 **Interactive Chat** - Natural conversation with your AI productivity buddy
- 📈 **Progress Tracking** - See your completion rates and task statistics

## Installation

1. Navigate to the CLI directory:
```bash
cd cli
```

2. Install dependencies:
```bash
npm install
```

3. Make the CLI executable:
```bash
chmod +x index.js
```

## Usage

### Quick Start
```bash
node index.js
```

### Commands

#### Login
```bash
node index.js login
```

#### Register
```bash
node index.js register
```

#### Start AI Chat
```bash
node index.js chat
```

#### Show Your Data Context
```bash
node index.js context
```

#### Interactive Mode
```bash
node index.js interactive
```

## AI Chat Features

The AI assistant has access to:
- ✅ All your tasks (completed and pending)
- 📅 Task due dates and priorities
- 📋 Task lists (Personal, Work, etc.)
- 📊 Your completion rates and patterns
- 🎯 Task distribution and priorities
- ⏰ Overdue tasks and deadlines

### Example Conversations

**Task Analysis:**
```
You: Analyze my task patterns
AI: Here's your task analysis:
• Total tasks: 15
• Completion rate: 73%
• Task distribution: 8 personal, 7 work
• Priority breakdown: 3 high, 5 medium, 4 low
• Overdue tasks: 2
```

**Motivation:**
```
You: Motivate me
AI: You're doing great! You've completed 11 tasks (73% completion rate). You have 4 tasks remaining - let's tackle them one by one! 💪
```

**Planning:**
```
You: Help me plan my day
AI: Based on your current data:
• 3 high-priority tasks need attention
• 2 tasks are overdue
• You have 8 personal tasks and 7 work tasks

I recommend focusing on overdue tasks first, then high-priority ones.
```

## Chat Commands

- `context` - Show your current data and statistics
- `help` - Show available commands and features
- `exit` - Quit the chat

## Environment Variables

Set your API base URL (optional):
```bash
export API_BASE=https://your-backend-url.com
```

## Features

### Full Context Awareness
The AI knows about:
- Your task completion rates
- Task priorities and deadlines
- Task distribution across lists
- Overdue tasks
- Recent task activity
- Personal vs work task balance

### Smart Responses
The AI provides:
- Personalized motivation based on your progress
- Task prioritization advice
- Productivity tips tailored to your patterns
- Stress management strategies
- Time management recommendations
- Goal setting guidance

### Real-time Data
- Always up-to-date with your latest tasks
- Analyzes your current productivity patterns
- Provides actionable insights
- Tracks your progress over time

## Examples

### Getting Started
```bash
# Start the CLI
node index.js

# Login to your account
node index.js login

# Start chatting with AI
node index.js chat
```

### Sample Chat Session
```
🤖 AI Assistant with Full Context

I have access to all your tasks, progress, and data. Ask me anything!
Type "exit" to quit, "context" to see your data, "help" for commands

You: Hello
AI: Hello! I'm your AI productivity assistant with full access to your data. I can see you have 15 tasks total (11 completed, 4 pending). You're working across 2 lists: Personal, Work. How can I help you today?

You: What should I focus on today?
AI: Based on your current data:
• 3 high-priority tasks need attention
• 2 tasks are overdue
• You have 8 personal tasks and 7 work tasks

I recommend focusing on overdue tasks first, then high-priority ones. Would you like me to suggest a daily schedule?

You: context
📊 Your Stats: 11/15 tasks completed, 4 pending

👤 User Information:
Email: user@example.com
Member since: 1/15/2024

📋 Task Summary:
Total Tasks: 15
Completed: 11
Pending: 4
High Priority: 3
Overdue: 2

📝 Recent Tasks:
  ✓ 🟢 Buy groceries (Personal)
  ⏳ 🔴 Finish project report (Work)
  ✓ 🟡 Call dentist (Personal)
```

## Troubleshooting

### Login Issues
- Make sure you're using the correct email and password
- Check that your backend is running and accessible
- Verify your API_BASE environment variable

### Network Issues
- Check your internet connection
- Verify the backend URL is correct
- Make sure the backend is deployed and running

### AI Response Issues
- Ensure you're logged in first
- Check that you have tasks in your account
- Verify the backend chatbot endpoint is working

## Support

For issues or questions:
1. Check the backend logs
2. Verify your account and tasks
3. Test the web interface first
4. Check network connectivity

---

**Your AI productivity buddy is ready to help! 🚀**
