# Gemini AI Setup Guide

## 🚀 How to Add Gemini AI to Your Task Manager

### **Step 1: Get Gemini API Key**

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### **Step 2: Add API Key to Render**

1. Go to your [Render Dashboard](https://dashboard.render.com)
2. Select your backend service
3. Go to "Environment" tab
4. Add new environment variable:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: `your_api_key_here`
5. Click "Save Changes"
6. Your service will automatically redeploy

### **Step 3: Test the AI**

1. Go to your web app
2. Click "🤖 AI Assistant" tab
3. Ask any question like:
   - "What tasks do I have?"
   - "Motivate me"
   - "Help me plan my day"
   - "Analyze my productivity"

### **Features:**

✅ **Natural LLM Responses** - Real AI conversations
✅ **Context Window** - AI knows all your task data
✅ **Fallback System** - Works even without API key
✅ **Smart Analysis** - Based on your actual tasks
✅ **Motivational** - Encouraging and helpful

### **Cost:**

- **Gemini Pro**: Free tier available
- **Usage**: Very low cost for task management
- **Fallback**: Free rule-based responses if no API key

### **Example API Key:**
```
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### **Environment Variables Needed:**
```
GEMINI_API_KEY=your_api_key_here
```

---

**Your AI will be much smarter with Gemini! 🤖✨**
