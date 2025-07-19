# CV Avatar Chatbot Application

## Overview

This is a full-stack web application that creates an AI-powered avatar chatbot for CV analysis. Users can upload PDF CVs, and the system provides personalized feedback through an animated avatar that speaks using text-to-speech technology. The application combines modern web technologies with AI services to deliver an interactive career coaching experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a full-stack TypeScript architecture with a React frontend and Express.js backend, designed as a monorepo with shared type definitions and schemas.

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **File Upload**: Multer middleware for PDF handling (10MB limit)
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Memory-based storage with fallback to database

## Key Components

### File Processing Pipeline
1. **PDF Upload**: Multer handles file validation and memory storage
2. **Text Extraction**: Mock PDF parser service (production would use pdf-parse)
3. **AI Analysis**: OpenAI GPT-4o integration for CV evaluation
4. **Text-to-Speech**: ElevenLabs API for voice generation
5. **Response Delivery**: Structured JSON responses with audio URLs

### Database Schema
- **Users Table**: Basic user authentication (id, username, password)
- **CV Analyses Table**: Stores analysis results, audio URLs, and processing status
- **Analysis Structure**: JSON field containing strengths, improvements, score, and feedback

### UI Components
- **Process Steps**: Visual workflow indicator (Upload → Analysis → Feedback)
- **Upload Section**: Drag-and-drop file upload with validation
- **Avatar Section**: Interactive avatar with audio playback controls
- **Feedback Section**: Detailed analysis results with downloadable reports

### External Service Integration
- **OpenAI API**: CV analysis using GPT-4o model with structured JSON output
- **ElevenLabs API**: Text-to-speech conversion with voice customization
- **Neon Database**: PostgreSQL hosting with connection pooling

## Data Flow

1. **Upload Phase**: User uploads PDF → Server validates file → PDF text extracted → Analysis record created
2. **Processing Phase**: Background processing starts → OpenAI analyzes CV → ElevenLabs generates speech → Database updated
3. **Feedback Phase**: Client polls for completion → Avatar displays with audio playback → User reviews detailed feedback

### State Management
- React Query manages server state with automatic polling during processing
- Local component state handles UI interactions (audio playback, file upload)
- Shared types ensure type safety between frontend and backend

## External Dependencies

### Production APIs
- **OpenAI GPT-4o**: CV analysis and feedback generation
- **ElevenLabs**: Voice synthesis with customizable voice settings
- **Neon Database**: Managed PostgreSQL with serverless scaling

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **Vite**: Fast development server with hot module replacement
- **ESBuild**: Production bundling for server-side code

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library for consistent iconography

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Assets**: Static files served from build output directory

### Environment Configuration
- **Database**: PostgreSQL connection via `DATABASE_URL`
- **AI Services**: API keys for OpenAI and ElevenLabs
- **Development**: Replit-specific tooling and runtime error handling

### Production Considerations
- File upload limits and security validation
- Error handling with graceful fallbacks for AI services
- Database connection pooling and transaction management
- Static asset serving with proper caching headers

The application is designed to be easily deployable on Replit with minimal configuration, using environment variables for service integration and built-in development tooling for rapid iteration.