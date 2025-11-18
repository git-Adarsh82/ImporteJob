const { jobImportQueue } = require('../config/queue');
const ImportLog = require('../models/ImportLog');
const Job = require('../models/Job');
const { fetchAndParseJobFeed } = require('../services/jobFetchService');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        }),
        new winston.transports.File({ filename: 'import-errors.log', level: 'error' }),
        new winston.transports.File({ filename: 'import-combined.log' })
    ]
});

const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '2');
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50');

const processImportJob = async (job, io) => {
    const { sourceUrl, importLogId } = job.data;
    let importLog;

    try {
        importLog = await ImportLog.findById(importLogId);
        if (!importLog) {
            throw new Error('Import log not found');
        }

        importLog.status = 'processing';
        importLog.startTime = new Date();
        await importLog.save();

        if (io) {
            io.to('import-updates').emit('import:progress', {
                importId: importLogId,
                status: 'processing',
                message: `Starting import from ${sourceUrl}`
            });
        }

        await job.progress(10);

        logger.info(`Fetching jobs from: ${sourceUrl}`);
        const parsedJobs = await fetchAndParseJobFeed(sourceUrl);

        importLog.totalFetched = parsedJobs.length;
        await importLog.save();

        await job.progress(30);

        const results = {
            new: 0,
            updated: 0,
            failed: 0,
            newJobs: [],
            updatedJobs: [],
            failedJobs: []
        };

        const batches = Math.ceil(parsedJobs.length / BATCH_SIZE);

        for (let i = 0; i < batches; i++) {
            const start = i * BATCH_SIZE;
            const end = Math.min((i + 1) * BATCH_SIZE, parsedJobs.length);
            const batch = parsedJobs.slice(start, end);

            const batchResults = await Promise.allSettled(
                batch.map(jobData => processJob(jobData, importLogId))
            );

            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    if (result.value.isNew) {
                        results.new++;
                        results.newJobs.push({
                            jobId: result.value.job._id,
                            title: result.value.job.title,
                            company: result.value.job.company
                        });
                    } else {
                        results.updated++;
                        results.updatedJobs.push({
                            jobId: result.value.job._id,
                            title: result.value.job.title,
                            company: result.value.job.company
                        });
                    }
                } else {
                    results.failed++;
                    let sourceId = 'unknown';
                    if (result.reason.sourceId) {
                        if (typeof result.reason.sourceId === 'string') {
                            sourceId = result.reason.sourceId;
                        } else if (result.reason.sourceId._) {
                            sourceId = result.reason.sourceId._;
                        } else {
                            sourceId = JSON.stringify(result.reason.sourceId);
                        }
                    }

                    results.failedJobs.push({
                        sourceId: sourceId.substring(0, 200),
                        title: (result.reason.title || 'unknown').substring(0, 100),
                        reason: result.reason.message.substring(0, 500)
                    });
                    logger.error('Failed to process job:', result.reason);
                }
            }

            const progress = 30 + ((i + 1) / batches) * 60;
            await job.progress(Math.round(progress));

            if (io) {
                io.to('import-updates').emit('import:progress', {
                    importId: importLogId,
                    progress: Math.round(progress),
                    processed: end,
                    total: parsedJobs.length
                });
            }
        }

        importLog.statistics = {
            total: parsedJobs.length,
            new: results.new,
            updated: results.updated,
            failed: results.failed
        };

        importLog.newJobs = results.newJobs.slice(0, 100);
        importLog.updatedJobs = results.updatedJobs.slice(0, 100);
        importLog.failedJobs = results.failedJobs.slice(0, 100);

        await importLog.markAsCompleted();

        await job.progress(100);

        if (io) {
            io.to('import-updates').emit('import:complete', {
                importId: importLogId,
                statistics: importLog.statistics,
                status: importLog.status
            });
        }

        logger.info(`Import completed: ${results.new} new, ${results.updated} updated, ${results.failed} failed`);

        return {
            success: true,
            importId: importLogId,
            statistics: importLog.statistics,
            duration: importLog.duration
        };

    } catch (error) {
        logger.error('Import job failed:', error);

        if (importLog) {
            importLog.status = 'failed';
            importLog.endTime = new Date();
            importLog.duration = importLog.endTime - importLog.startTime;

            const safeError = {
                timestamp: new Date(),
                type: 'import_error',
                message: error.message ? error.message.substring(0, 1000) : 'Unknown error',
                stack: error.stack ? error.stack.substring(0, 2000) : '',
                data: { sourceUrl }
            };

            importLog.errors.push(safeError);
            await importLog.save();
        }

        if (io) {
            io.to('import-updates').emit('import:failed', {
                importId: importLogId,
                error: error.message
            });
        }

        throw error;
    }
};

const processJob = async (jobData, importLogId) => {
    try {
        if (!jobData.sourceId || !jobData.title || !jobData.source) {
            throw new Error('Missing required job fields');
        }

        if (typeof jobData.sourceId !== 'string') {
            jobData.sourceId = String(jobData.sourceId);
        }

        const preparedJobData = {
            sourceId: jobData.sourceId,
            title: jobData.title,
            description: jobData.description || '',
            company: jobData.company || 'Unknown Company',
            location: jobData.location,
            categories: jobData.categories || [],
            jobType: jobData.jobType,
            salary: jobData.salary,
            sourceUrl: jobData.sourceUrl,
            applyUrl: jobData.applyUrl,
            source: jobData.source,
            publishedDate: jobData.publishedDate ? new Date(jobData.publishedDate) : new Date(),
            expiryDate: jobData.expiryDate ? new Date(jobData.expiryDate) : null,
            status: 'active',
            rawData: jobData.rawData
        };

        const result = await Job.upsertJob(preparedJobData, importLogId);

        return result;
    } catch (error) {
        error.sourceId = jobData.sourceId;
        error.title = jobData.title;
        throw error;
    }
};

const startWorkers = (io) => {
    console.log(`Starting ${WORKER_CONCURRENCY} worker(s)...`);

    jobImportQueue.process('import-jobs', WORKER_CONCURRENCY, async (job) => {
        return processImportJob(job, io);
    });

    console.log('Workers started successfully');
};

process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing queue...');
    await jobImportQueue.close();
    process.exit(0);
});

module.exports = {
    startWorkers,
    processImportJob
};