# System Architecture Documentation

## Overview

The Job Importer System follows a microservice-ready architecture with clear separation of concerns, scalable queue processing, and real-time communication capabilities.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Next.js)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │Dashboard │ │  Hooks   │ │   API    │ │  Socket Client   │  │
│  │   UI     │ │  (React  │ │  Client  │ │    (Real-time)   │  │
│  │          │ │  Query)  │ │          │ │                  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ↓
                            HTTP/WebSocket
                                 │
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Express + Socket.io)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Routes  │ │Services  │ │  Models  │ │   Socket.io      │  │
│  │   API    │ │Business  │ │ MongoDB  │ │   Server         │  │
│  │ Handlers │ │  Logic   │ │ Schemas  │ │                  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                    │              │              │
                    ↓              ↓              ↓
         ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
         │   MongoDB    │ │    Redis     │ │  External    │
         │              │ │    Queue     │ │   APIs       │
         │  - Jobs      │ │              │ │              │
         │  - Import    │ │  Bull Queue  │ │ XML Feeds    │
         │    Logs      │ │   Workers    │ │              │
         └──────────────┘ └──────────────┘ └──────────────┘
```

## Component Details

### 1. Frontend Layer (Next.js)

#### Dashboard UI
- **Technology:** React with TypeScript
- **Styling:** Tailwind CSS
- **Purpose:** User interface for monitoring imports and viewing statistics

#### React Query Integration
- **Purpose:** Data fetching and caching
- **Features:** 
  - Automatic refetching
  - Optimistic updates
  - Cache invalidation

#### Socket.io Client
- **Purpose:** Real-time updates
- **Events:** Import progress, queue status, completion notifications

### 2. Backend Layer (Node.js)

#### API Routes
- **Import Routes:** Manage import operations
- **Job Routes:** CRUD operations for jobs
- **Queue Routes:** Monitor and control queue

#### Services Layer
- **Job Fetch Service:** XML parsing and conversion
- **Cron Service:** Scheduled imports
- **Queue Service:** Job processing logic

#### Worker System
- **Technology:** Bull with Redis
- **Concurrency:** Configurable (default: 2)
- **Features:**
  - Batch processing
  - Retry logic with exponential backoff
  - Progress tracking

### 3. Data Layer

#### MongoDB
- **Collections:**
  - `jobs`: Stores job listings
  - `importlogs`: Import history and statistics
- **Indexing Strategy:**
  - Compound index on sourceId + source.name
  - Text search index on title, description, company
  - Date-based indexes for performance

#### Redis
- **Purpose:** Queue management and caching
- **Features:**
  - Job queue persistence
  - Failed job tracking
  - Queue statistics

## Data Flow

### Import Process Flow

```
1. Trigger Import (Manual/Scheduled)
         │
         ↓
2. Create Import Log Entry
         │
         ↓
3. Add Job to Queue
         │
         ↓
4. Worker Picks Up Job
         │
         ↓
5. Fetch XML from Source
         │
         ↓
6. Parse XML to JSON
         │
         ↓
7. Process Jobs in Batches
         │
         ├─→ New Job → Insert to MongoDB
         ├─→ Existing Job → Update in MongoDB
         └─→ Invalid Job → Log Error
         │
         ↓
8. Update Import Log Statistics
         │
         ↓
9. Emit Socket Events
         │
         ↓
10. Update UI in Real-time
```

## Scalability Considerations

### Horizontal Scaling

#### Worker Scaling
- Multiple worker processes can run simultaneously
- Concurrency controlled via `WORKER_CONCURRENCY` env variable
- Queue ensures no duplicate processing

#### API Scaling
- Stateless design allows multiple backend instances
- Load balancer can distribute requests
- Socket.io supports Redis adapter for multi-instance

### Vertical Scaling

#### Database Optimization
- Proper indexing for query performance
- Aggregation pipelines for statistics
- Batch operations for bulk updates

#### Queue Optimization
- Configurable batch sizes
- Priority queue support
- Dead letter queue for failed jobs

## Security Considerations

### API Security
- CORS configuration for frontend access
- Input validation on all endpoints
- Error handling without exposing internals

### Data Security
- MongoDB connection with authentication
- Environment variables for sensitive data
- Secure WebSocket connections

## Monitoring & Logging

### Application Monitoring
- Health check endpoints
- Queue statistics API
- Import success/failure tracking

### Logging Strategy
- Winston logger for structured logging
- Separate error and combined logs
- Import-specific error tracking

## Technology Decisions

### Why Bull + Redis?
- **Reliability:** Persistent job storage
- **Scalability:** Distributed processing support
- **Features:** Built-in retry, progress, priority

### Why MongoDB?
- **Flexibility:** Schema-less for varied job formats
- **Performance:** Efficient for document operations
- **Features:** Text search, aggregation framework

### Why Next.js?
- **Performance:** Server-side rendering
- **Developer Experience:** Built-in TypeScript support
- **Deployment:** Easy Vercel integration

### Why Socket.io?
- **Real-time Updates:** Bi-directional communication
- **Fallbacks:** Automatic fallback mechanisms
- **Reliability:** Reconnection support

## Deployment Architecture

### Development
```
Local MongoDB → Local Redis → Node.js Backend → Next.js Frontend
```

### Production (Recommended)
```
MongoDB Atlas → Redis Cloud → Backend (Railway/Render) → Frontend (Vercel)
       ↑              ↑               ↑                        ↑
    Managed      Managed         Auto-scaling            CDN + Edge
```

### Docker Deployment
```
docker-compose.yml
    ├── mongodb (container)
    ├── redis (container)
    ├── backend (container)
    └── frontend (container)
```

## Future Enhancements

### Planned Features
1. **Rate Limiting:** Prevent API abuse
2. **Caching Layer:** Redis caching for frequently accessed data
3. **GraphQL API:** Alternative to REST endpoints
4. **Webhook Support:** Notify external systems on import completion
5. **Advanced Analytics:** Detailed job market insights

### Microservice Migration Path
1. Extract worker system to separate service
2. Create dedicated parsing service
3. Implement API gateway
4. Add service mesh for communication

## Performance Benchmarks

### Current Capacity
- **Import Speed:** ~1000 jobs/minute
- **Concurrent Imports:** 5-10 sources
- **API Response Time:** <100ms average
- **Real-time Updates:** <50ms latency

### Optimization Opportunities
- Implement database connection pooling
- Add Redis caching for job listings
- Use CDN for static assets
- Implement database read replicas

## Maintenance & Operations

### Daily Operations
- Monitor import success rate
- Check queue health
- Review error logs

### Weekly Tasks
- Analyze import statistics
- Clean up old logs (automated)
- Performance review

### Monthly Tasks
- Database optimization
- Dependency updates
- Security patches

---

This architecture is designed to be production-ready while maintaining simplicity for development and deployment.
