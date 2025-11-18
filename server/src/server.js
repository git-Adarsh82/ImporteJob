require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

const importRoutes = require('./routes/importRoutes');
const jobRoutes = require('./routes/jobRoutes');
const queueRoutes = require('./routes/queueRoutes');

const { startWorkers } = require('./workers/jobImportWorker');
const { scheduleJobImports } = require('./services/cronService');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/job-importer', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

app.set('io', io);

app.use('/api/imports', importRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/queue', queueRoutes);

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        mongodb: mongoose.connection.readyState === 1,
        uptime: process.uptime()
    });
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('subscribe:imports', () => {
        socket.join('import-updates');
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start workers
startWorkers(io);

// Schedule cron jobs
scheduleJobImports();

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = { app, io };
