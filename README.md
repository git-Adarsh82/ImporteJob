# 🚀 Job Importer System

A scalable job import system with queue processing, MongoDB storage, and real-time updates.

## ✨ Features

- **XML to JSON Conversion** - Fetches jobs from XML feeds and converts to JSON
- **Queue Processing** - Redis + Bull for scalable background job processing
- **Import History** - Detailed tracking of all imports with statistics
- **Real-time Updates** - Socket.io for live progress updates
- **Scheduled Imports** - Automatic hourly imports via cron jobs
- **Retry Logic** - Exponential backoff for failed imports
- **Dashboard UI** - Next.js frontend with real-time statistics

## 📋 Requirements

- Node.js 16+ 
- MongoDB 5.0+
- Redis 6.0+
- npm or yarn

## 🚀 Quick Start

### Option 1: Docker (Recommended - One Command!)

```bash
# Start everything with Docker Compose
docker-compose up

# Visit:
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### Option 2: Manual Setup

#### 1. Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

#### 2. Start Services

**Terminal 1 - MongoDB:**
```bash
mongod
```

**Terminal 2 - Redis:**
```bash
redis-server
```

**Terminal 3 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 4 - Frontend:**
```bash
cd client
npm run dev
```

#### 3. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api-docs (if enabled)

## 📁 Project Structure

```
job-importer-complete/
├── client/                    # Next.js Frontend
│   ├── src/
│   │   ├── app/              # App router pages
│   │   ├── hooks/            # React hooks
│   │   ├── lib/              # Utilities
│   │   └── types/            # TypeScript types
│   ├── package.json
│   ├── next.config.js
│   └── Dockerfile
│
├── server/                    # Node.js Backend
│   ├── src/
│   │   ├── server.js         # Main server file
│   │   ├── config/           # Configuration
│   │   ├── models/           # MongoDB models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   └── workers/          # Queue workers
│   ├── package.json
│   ├── .env
│   └── Dockerfile
│
├── docker-compose.yml         # Docker orchestration
└── README.md
```

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/job-importer

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=5000
NODE_ENV=development

# Worker
WORKER_CONCURRENCY=2
BATCH_SIZE=50
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## 📊 API Endpoints

### Import Management
- `GET /api/imports/history` - Get import history
- `POST /api/imports/trigger` - Trigger new import
- `GET /api/imports/statistics` - Get import statistics

### Job Management
- `GET /api/jobs` - List jobs with filters
- `GET /api/jobs/statistics` - Job statistics
- `GET /api/jobs/:id` - Get specific job

### Queue Management  
- `GET /api/queue/stats` - Queue statistics
- `POST /api/queue/pause` - Pause processing
- `POST /api/queue/resume` - Resume processing

## 🧪 Testing

### Test Manual Import
```bash
curl -X POST http://localhost:5000/api/imports/trigger \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Check Import Status
```bash
curl http://localhost:5000/api/imports/history
```

### View Queue Stats
```bash
curl http://localhost:5000/api/queue/stats
```

## 📈 Features in Detail

### Import Sources
The system fetches jobs from these XML feeds:
- General job feed
- Category-specific feeds (SMM, Design, Data Science, etc.)
- Regional feeds
- Higher education jobs

### Import Tracking
Each import tracks:
- Total jobs fetched
- New jobs created
- Jobs updated
- Failed jobs with reasons
- Processing time
- Success rate

### Queue Processing
- Configurable worker concurrency
- Batch processing for large imports
- Automatic retries with exponential backoff
- Dead letter queue for failed jobs

### Real-time Updates
- Live import progress
- Queue status updates
- Job processing notifications

## 🚀 Production Deployment

### Using Docker

1. Update environment variables in `docker-compose.yml`
2. Build and run:
```bash
docker-compose up --build -d
```

### Manual Deployment

1. Set up MongoDB Atlas or self-hosted MongoDB
2. Set up Redis Cloud or self-hosted Redis
3. Deploy backend to Railway/Render/Heroku
4. Deploy frontend to Vercel/Netlify
5. Update environment variables

### Scaling Considerations

- Increase `WORKER_CONCURRENCY` for more parallel processing
- Use MongoDB replica sets for high availability
- Implement Redis Sentinel for failover
- Add load balancer for multiple backend instances

## 📝 Development

### Running Tests
```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test
```

### Code Quality
```bash
# Linting
npm run lint

# Format code
npm run format
```

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Failed:**
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`

**Redis Connection Failed:**
- Ensure Redis is running: `redis-server`
- Check Redis configuration in `.env`

**Import Jobs Failing:**
- Check XML feed URLs are accessible
- Review error logs in import history
- Check worker logs: `docker-compose logs backend`

**Frontend Not Connecting:**
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS settings in backend
- Ensure backend is running

## 📚 Architecture

### Technology Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, React Query
- **Backend:** Node.js, Express, Socket.io
- **Database:** MongoDB with Mongoose ODM
- **Queue:** Redis + Bull
- **Deployment:** Docker, Docker Compose

### Design Patterns
- Repository pattern for data access
- Queue-based architecture for scalability
- Real-time updates via WebSockets
- Microservice-ready architecture

## 📄 License

MIT

## 👥 Support

For issues or questions, please check the documentation or create an issue in the repository.

---

**Built with ❤️ for scalable job importing**
