const express = require('express');
const router = express.Router();
const {
    checkQueueHealth,
    getQueueStats,
    getJobsByState,
    retryFailedJob,
    clearCompletedJobs,
    clearFailedJobs,
    pauseQueue,
    resumeQueue
} = require('../config/queue');

router.get('/stats', async (req, res) => {
    try {
        const stats = await getQueueStats();

        res.json({
            success: true,
            data: {
                total: stats.waiting + stats.active + stats.delayed,
                active: stats.active,
                waiting: stats.waiting,
                failed: stats.failed,
                completed: stats.completed,
                delayed: stats.delayed,
                paused: stats.paused
            }
        });
    } catch (error) {
        console.error('Error fetching queue stats:', error);
        res.status(500).json({ error: 'Failed to fetch queue stats' });
    }
});

router.get('/health', async (req, res) => {
    try {
        const health = await checkQueueHealth();

        res.json({
            success: true,
            data: health
        });
    } catch (error) {
        console.error('Error checking queue health:', error);
        res.status(500).json({ error: 'Failed to check queue health' });
    }
});

router.get('/jobs/active', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const jobs = await getJobsByState('active', limit);

        res.json({
            success: true,
            data: jobs
        });
    } catch (error) {
        console.error('Error fetching active jobs:', error);
        res.status(500).json({ error: 'Failed to fetch active jobs' });
    }
});

router.get('/jobs/waiting', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const jobs = await getJobsByState('waiting', limit);

        res.json({
            success: true,
            data: jobs
        });
    } catch (error) {
        console.error('Error fetching waiting jobs:', error);
        res.status(500).json({ error: 'Failed to fetch waiting jobs' });
    }
});

router.get('/jobs/failed', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const jobs = await getJobsByState('failed', limit);

        res.json({
            success: true,
            data: jobs
        });
    } catch (error) {
        console.error('Error fetching failed jobs:', error);
        res.status(500).json({ error: 'Failed to fetch failed jobs' });
    }
});

router.get('/jobs/completed', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const jobs = await getJobsByState('completed', limit);

        res.json({
            success: true,
            data: jobs
        });
    } catch (error) {
        console.error('Error fetching completed jobs:', error);
        res.status(500).json({ error: 'Failed to fetch completed jobs' });
    }
});

router.get('/jobs/delayed', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const jobs = await getJobsByState('delayed', limit);

        res.json({
            success: true,
            data: jobs
        });
    } catch (error) {
        console.error('Error fetching delayed jobs:', error);
        res.status(500).json({ error: 'Failed to fetch delayed jobs' });
    }
});

router.post('/jobs/:jobId/retry', async (req, res) => {
    try {
        const { jobId } = req.params;
        await retryFailedJob(jobId);

        res.json({
            success: true,
            message: `Job ${jobId} has been retried`
        });
    } catch (error) {
        console.error('Error retrying job:', error);
        res.status(500).json({
            error: error.message || 'Failed to retry job'
        });
    }
});

router.delete('/jobs/completed', async (req, res) => {
    try {
        const count = await clearCompletedJobs();

        res.json({
            success: true,
            message: `Cleared ${count} completed jobs`
        });
    } catch (error) {
        console.error('Error clearing completed jobs:', error);
        res.status(500).json({ error: 'Failed to clear completed jobs' });
    }
});

router.delete('/jobs/failed', async (req, res) => {
    try {
        const count = await clearFailedJobs();

        res.json({
            success: true,
            message: `Cleared ${count} failed jobs`
        });
    } catch (error) {
        console.error('Error clearing failed jobs:', error);
        res.status(500).json({ error: 'Failed to clear failed jobs' });
    }
});

router.post('/pause', async (req, res) => {
    try {
        await pauseQueue();

        res.json({
            success: true,
            message: 'Queue has been paused'
        });
    } catch (error) {
        console.error('Error pausing queue:', error);
        res.status(500).json({ error: 'Failed to pause queue' });
    }
});

router.post('/resume', async (req, res) => {
    try {
        await resumeQueue();

        res.json({
            success: true,
            message: 'Queue has been resumed'
        });
    } catch (error) {
        console.error('Error resuming queue:', error);
        res.status(500).json({ error: 'Failed to resume queue' });
    }
});

router.get('/metrics', async (req, res) => {
    try {
        const [stats, health, active, waiting, failed] = await Promise.all([
            getQueueStats(),
            checkQueueHealth(),
            getJobsByState('active', 5),
            getJobsByState('waiting', 5),
            getJobsByState('failed', 5)
        ]);

        res.json({
            success: true,
            data: {
                stats,
                health,
                recentJobs: {
                    active: active.slice(0, 5),
                    waiting: waiting.slice(0, 5),
                    failed: failed.slice(0, 5)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching queue metrics:', error);
        res.status(500).json({ error: 'Failed to fetch queue metrics' });
    }
});

module.exports = router;
