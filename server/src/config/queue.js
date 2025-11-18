const Bull = require('bull');
const redis = require('redis');

// Redis configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0
};

// Create job import queue
const jobImportQueue = new Bull('job-import', {
    redis: redisConfig,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 100 // Keep last 100 completed jobs
        },
        removeOnFail: {
            age: 7 * 24 * 3600 // Keep failed jobs for 7 days
        }
    }
});



// Queue event listeners
jobImportQueue.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed:`, result);
});

jobImportQueue.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed:`, err.message);
});

jobImportQueue.on('active', (job) => {
    console.log(`🔄 Job ${job.id} started processing`);
});

jobImportQueue.on('stalled', (job) => {
    console.warn(`⚠️ Job ${job.id} stalled and will be retried`);
});



// Queue health check
const checkQueueHealth = async () => {
    try {
        const [
            waitingCount,
            activeCount,
            completedCount,
            failedCount,
            delayedCount
        ] = await Promise.all([
            jobImportQueue.getWaitingCount(),
            jobImportQueue.getActiveCount(),
            jobImportQueue.getCompletedCount(),
            jobImportQueue.getFailedCount(),
            jobImportQueue.getDelayedCount()
        ]);

        return {
            isHealthy: true,
            stats: {
                waiting: waitingCount,
                active: activeCount,
                completed: completedCount,
                failed: failedCount,
                delayed: delayedCount,
                total: waitingCount + activeCount + delayedCount
            }
        };
    } catch (error) {
        return {
            isHealthy: false,
            error: error.message
        };
    }
};



// Get queue statistics
const getQueueStats = async () => {
    const [
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused
    ] = await Promise.all([
        jobImportQueue.getWaitingCount(),
        jobImportQueue.getActiveCount(),
        jobImportQueue.getCompletedCount(),
        jobImportQueue.getFailedCount(),
        jobImportQueue.getDelayedCount(),
        jobImportQueue.isPaused()
    ]);

    return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused,
        total: waiting + active + delayed
    };
};



// Add job to queue
const addImportJob = async (data, options = {}) => {
    const job = await jobImportQueue.add('import-jobs', data, {
        ...options,
        attempts: options.attempts || 3,
        delay: options.delay || 0,
        priority: options.priority || 0
    });

    return job;
};



// Retry failed job
const retryFailedJob = async (jobId) => {
    const job = await jobImportQueue.getJob(jobId);
    if (!job) {
        throw new Error('Job not found');
    }

    if (await job.isFailed()) {
        await job.retry();
        return true;
    }

    throw new Error('Job is not in failed state');
};



// Clear completed jobs
const clearCompletedJobs = async () => {
    const jobs = await jobImportQueue.getCompleted();
    await Promise.all(jobs.map(job => job.remove()));
    return jobs.length;
};



// Clear failed jobs
const clearFailedJobs = async () => {
    const jobs = await jobImportQueue.getFailed();
    await Promise.all(jobs.map(job => job.remove()));
    return jobs.length;
};



// Pause/Resume queue
const pauseQueue = async () => {
    await jobImportQueue.pause();
};

const resumeQueue = async () => {
    await jobImportQueue.resume();
};



// Get jobs by state
const getJobsByState = async (state, limit = 100) => {
    let jobs = [];

    switch (state) {
        case 'waiting':
            jobs = await jobImportQueue.getWaiting(0, limit);
            break;
        case 'active':
            jobs = await jobImportQueue.getActive(0, limit);
            break;
        case 'completed':
            jobs = await jobImportQueue.getCompleted(0, limit);
            break;
        case 'failed':
            jobs = await jobImportQueue.getFailed(0, limit);
            break;
        case 'delayed':
            jobs = await jobImportQueue.getDelayed(0, limit);
            break;
        default:
            throw new Error('Invalid job state');
    }

    return jobs.map(job => ({
        id: job.id,
        data: job.data,
        progress: job.progress(),
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        timestamp: job.timestamp,
        returnvalue: job.returnvalue
    }));
};

module.exports = {
    jobImportQueue,
    checkQueueHealth,
    getQueueStats,
    addImportJob,
    retryFailedJob,
    clearCompletedJobs,
    clearFailedJobs,
    pauseQueue,
    resumeQueue,
    getJobsByState
};
