# Task Manager App

A full-stack task management application with authentication, CRUD operations, and beautiful UI.

## Features

- 🔐 **Authentication**: JWT-based login/register with forgot password (OTP)
- 📝 **Task Management**: Create, edit, delete, and toggle task completion
- 📅 **Calendar View**: Visual task scheduling
- 📌 **Sticky Notes**: Quick note-taking
- 🏷️ **Lists & Tags**: Organize tasks by categories
- 📱 **Responsive Design**: Works on all devices
- 🎨 **Modern UI**: Purple glassmorphism theme with Tailwind CSS

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + SQLite
- **Authentication**: JWT + bcrypt
- **Email**: Nodemailer (with fallback to console logging)

## Quick Start

### Option 1: One-Command Deployment (Monorepo)

```bash
# Clone and setup
git clone <your-repo>
cd task-manager

# Install dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Start both services
npm run dev
```

### Option 2: Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or run in production mode with nginx
docker-compose --profile production up --build
```

### Option 3: Separate Deployments (Professional)

#### Frontend (Vercel)
```bash
cd client
vercel --prod
```

#### Backend (Railway)
```bash
cd server
railway login
railway up
```

## Environment Variables

### Backend (.env)
```env
PORT=4000
JWT_SECRET=your-super-secret-jwt-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Frontend (.env)
```env
VITE_API_BASE=http://localhost:4000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/reset-password` - Reset password

### Tasks
- `GET /api/tasks` - Get user tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `PATCH /api/tasks/:id/toggle` - Toggle completion
- `DELETE /api/tasks/:id` - Delete task

## Deployment Options

### 1. Monorepo (Simple)
- Deploy entire project to one platform
- Use Docker Compose for local/production
- Good for development and small projects

### 2. Separate Deployments (Professional)
- **Frontend**: Deploy to Vercel/Netlify
- **Backend**: Deploy to Railway/Heroku/DigitalOcean
- **Database**: Use external database (PostgreSQL)
- More scalable and professional

### 3. Cloud Platforms
- **Vercel**: Frontend hosting
- **Railway**: Backend hosting
- **Supabase**: Database + Auth
- **AWS/GCP**: Full cloud deployment

## Development

```bash
# Backend
cd server
npm run dev

# Frontend
cd client
npm run dev

# Both (from root)
npm run dev
```

## Production Notes

- Change JWT_SECRET in production
- Use environment variables for all secrets
- Set up proper email service for OTP
- Use external database for production
- Enable HTTPS and security headers
- Set up monitoring and logging

## License

MIT
