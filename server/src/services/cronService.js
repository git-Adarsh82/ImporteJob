const cron = require('node-cron');
const ImportLog = require('../models/ImportLog');
const { addImportJob } = require('../config/queue');
const { JOB_SOURCES } = require('./jobFetchService');

const scheduleJobImports = () => {
    cron.schedule('0 * * * *', async () => {
        console.log('🕐 Running scheduled job import...');

        try {
            for (const sourceUrl of JOB_SOURCES) {
                await triggerImport(sourceUrl);

                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            console.log('✅ Scheduled imports triggered successfully');
        } catch (error) {
            console.error('❌ Error in scheduled import:', error);
        }
    });

    console.log('📅 Cron job scheduled: Hourly job imports');
};

const scheduleCleanup = () => {
    cron.schedule('0 3 * * *', async () => {
        console.log('🧹 Running daily cleanup...');

        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const result = await ImportLog.deleteMany({
                createdAt: { $lt: thirtyDaysAgo }
            });

            console.log(`✅ Deleted ${result.deletedCount} old import logs`);

        } catch (error) {
            console.error('❌ Error in cleanup:', error);
        }
    });

    console.log('📅 Cron job scheduled: Daily cleanup');
};

const scheduleStatisticsReport = () => {
    cron.schedule('0 9 * * *', async () => {
        console.log('📊 Generating daily statistics report...');

        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const stats = await ImportLog.getStatistics(yesterday, today);

            console.log('📈 Daily Import Statistics:');
            console.log(`- Total imports: ${stats.totalImports}`);
            console.log(`- Successful: ${stats.successfulImports}`);
            console.log(`- Failed: ${stats.failedImports}`);
            console.log(`- Jobs processed: ${stats.totalJobsProcessed}`);
            console.log(`- New jobs: ${stats.newJobsCreated}`);
            console.log(`- Updated jobs: ${stats.jobsUpdated}`);


        } catch (error) {
            console.error('❌ Error generating statistics:', error);
        }
    });

    console.log('📅 Cron job scheduled: Daily statistics');
};

const triggerImport = async (sourceUrl, options = {}) => {
    try {
        const importLog = new ImportLog({
            fileName: sourceUrl,
            sourceUrl: sourceUrl,
            status: 'pending',
            metadata: options.metadata
        });

        await importLog.save();

        const job = await addImportJob({
            sourceUrl,
            importLogId: importLog._id.toString(),
            ...options
        }, {
            priority: options.priority || 0,
            delay: options.delay || 0
        });

        importLog.queueJobId = job.id.toString();
        await importLog.save();

        console.log(`✅ Import job queued: ${job.id} for ${sourceUrl}`);

        return {
            importId: importLog._id,
            jobId: job.id,
            status: 'queued'
        };

    } catch (error) {
        console.error('Error triggering import:', error);
        throw error;
    }
};

const checkScheduleHealth = async () => {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const recentImports = await ImportLog.find({
        createdAt: { $gte: oneHourAgo }
    }).countDocuments();

    return {
        isHealthy: recentImports > 0,
        lastHourImports: recentImports,
        message: recentImports > 0
            ? 'Scheduled imports are running'
            : 'No imports in the last hour - check cron jobs'
    };
};

const initializeScheduledTasks = () => {
    scheduleJobImports();
    scheduleCleanup();
    scheduleStatisticsReport();

    console.log('✅ All scheduled tasks initialized');
};

module.exports = {
    scheduleJobImports,
    scheduleCleanup,
    scheduleStatisticsReport,
    triggerImport,
    checkScheduleHealth,
    initializeScheduledTasks
};
