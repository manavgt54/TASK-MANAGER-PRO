# 🚀 Professional Deployment Guide

## 📋 **What Goes Where**

### **Frontend → Vercel**
- **Folder**: `client/`
- **Contains**: React app, UI components, user interface
- **URL**: `https://your-app-name.vercel.app`

### **Backend → Render**
- **Folder**: `server/`
- **Contains**: Node.js API, database, authentication
- **URL**: `https://your-backend-name.onrender.com`

## 🎯 **Step-by-Step Deployment**

### **Step 1: Deploy Backend to Render**

1. **Go to [render.com](https://render.com)** and sign up
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name**: `task-manager-backend`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`

5. **Add Environment Variables:**
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secret-jwt-key-change-this
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

6. **Click "Create Web Service"**
7. **Wait for deployment** (takes 5-10 minutes)
8. **Copy the URL** (e.g., `https://task-manager-backend.onrender.com`)

### **Step 2: Deploy Frontend to Vercel**

1. **Go to [vercel.com](https://vercel.com)** and sign up
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure the project:**
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. **Add Environment Variable:**
   ```
   VITE_API_BASE=https://your-backend-name.onrender.com
   ```
   (Replace with your actual Render URL from Step 1)

6. **Click "Deploy"**
7. **Wait for deployment** (takes 2-3 minutes)
8. **Your app is live!** 🎉

## 🔧 **Quick Commands**

### **For Backend (Render)**
```bash
cd server
# Push to GitHub, then deploy on Render
```

### **For Frontend (Vercel)**
```bash
cd client
# Update .env.production with your Render URL
echo "VITE_API_BASE=https://your-backend-name.onrender.com" > .env.production
# Push to GitHub, then deploy on Vercel
```

## 📱 **Final Result**

- **Frontend**: `https://your-app-name.vercel.app` (Beautiful UI)
- **Backend**: `https://your-backend-name.onrender.com` (API endpoints)
- **Database**: SQLite (stored on Render)

## 🎨 **Why This Setup is Professional**

1. **Separate Domains**: Frontend and backend on different URLs
2. **Scalability**: Each service can scale independently
3. **Performance**: Vercel's global CDN for frontend
4. **Reliability**: Render's uptime for backend
5. **Cost**: Both platforms have free tiers
6. **Custom Domains**: Easy to add later

## 🔄 **Updates**

- **Frontend changes**: Push to GitHub → Vercel auto-deploys
- **Backend changes**: Push to GitHub → Render auto-deploys

## 🆘 **Troubleshooting**

- **CORS errors**: Make sure `VITE_API_BASE` points to your Render URL
- **Build fails**: Check environment variables are set correctly
- **API not working**: Verify Render service is running and healthy
