# AI Agent Instructions for Writing Test Platform

## Project Overview
This is a writing test platform built with React (frontend) and Express.js (backend) that allows students to take writing tests with time limits and teachers to review submissions.

## Architecture

### Frontend (`/frontend`)
- React-based SPA with key components:
  - `WritingTest.jsx`: Main test interface with split-screen layout (adaptive for mobile)
  - Student and teacher interfaces
- Uses local storage for test state persistence
- Environment variables via `.env` for API configuration

### Backend (`/backend`)
- Express.js server with RESTful API
- Key routes:
  - `/api/auth`: User authentication
  - `/api/writing-tests`: Test management
  - `/api/writing`: Submission handling
- Static file serving for uploads (`/uploads`)

## Key Patterns & Conventions

### State Management
- Local storage for test progress: `writing_task1`, `writing_task2`, `writing_timeLeft`, `writing_started`
- User session stored in localStorage as 'user'

### Responsive Design
- Mobile-first approach using `isMobile` state (breakpoint: 768px)
- Split-pane layout adapts between horizontal (desktop) and vertical (mobile)

### API Integration
- All API endpoints prefixed with `/api`
- Environment variable `REACT_APP_API_URL` for API base URL

## Development Workflow

### Setup
```bash
# Backend
cd backend
npm install
npm start  # Runs on port 5000

# Frontend
cd frontend
npm install
npm start  # Runs on port 3000
```

### File Structure Conventions
- Frontend components in `frontend/src/pages` and `frontend/src/components`
- Backend routes in `backend/routes`
- Models in `backend/models`
- Static assets in `frontend/public`

## Important Integration Points
1. Authentication flow through `/api/auth`
2. Real-time test progress saving to localStorage
3. File uploads handling through `/uploads` directory
4. Teacher feedback system via submissions API

## Common Tasks
- Adding new test types: Extend models and create corresponding API routes
- UI modifications: Check for mobile compatibility in `WritingTest.jsx`
- Database changes: Update models and run sync in `backend/models/index.js`
