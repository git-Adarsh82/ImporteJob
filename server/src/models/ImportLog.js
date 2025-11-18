const mongoose = require('mongoose');

const importLogSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true,
        index: true
    },

    sourceUrl: {
        type: String,
        required: true
    },

    importDateTime: {
        type: Date,
        default: Date.now,
        index: true
    },

    startTime: {
        type: Date,
        default: Date.now
    },

    endTime: {
        type: Date
    },

    duration: {
        type: Number // in milliseconds
    },

    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'partial'],
        default: 'pending',
        index: true
    },

    statistics: {
        total: {
            type: Number,
            default: 0
        },
        new: {
            type: Number,
            default: 0
        },
        updated: {
            type: Number,
            default: 0
        },
        failed: {
            type: Number,
            default: 0
        }
    },

    totalFetched: {
        type: Number,
        default: 0
    },

    totalImported: {
        type: Number,
        default: 0
    },

    newJobs: [{
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job'
        },
        title: String,
        company: String
    }],

    updatedJobs: [{
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job'
        },
        title: String,
        company: String
    }],

    failedJobs: [{
        sourceId: String,
        title: String,
        reason: String,
        error: mongoose.Schema.Types.Mixed
    }],

    errors: [{
        timestamp: Date,
        type: String,
        message: String,
        stack: String,
        data: mongoose.Schema.Types.Mixed
    }],

    queueJobId: {
        type: String,
        index: true
    },

    processingDetails: {
        xmlParsingTime: Number,
        dbOperationTime: Number,
        totalProcessingTime: Number,
        batchSize: Number,
        concurrency: Number
    },

    retryCount: {
        type: Number,
        default: 0
    },

    lastRetryAt: Date,

    metadata: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

importLogSchema.index({ status: 1, importDateTime: -1 });
importLogSchema.index({ sourceUrl: 1, importDateTime: -1 });

importLogSchema.virtual('successRate').get(function () {
    if (this.statistics.total === 0) return 0;
    return Math.round(((this.statistics.total - this.statistics.failed) / this.statistics.total) * 100);
});

importLogSchema.methods.markAsCompleted = function () {
    this.status = 'completed';
    this.endTime = new Date();
    this.duration = this.endTime - this.startTime;

    this.totalImported = this.statistics.new + this.statistics.updated;

    if (this.statistics.failed === 0 && this.totalImported > 0) {
        this.status = 'completed';
    } else if (this.statistics.failed > 0 && this.totalImported > 0) {
        this.status = 'partial';
    } else if (this.totalImported === 0) {
        this.status = 'failed';
    }

    return this.save();
};

importLogSchema.methods.addError = function (error) {
    this.errors.push({
        timestamp: new Date(),
        type: error.type || 'general',
        message: error.message,
        stack: error.stack,
        data: error.data
    });
    return this.save();
};

importLogSchema.statics.getRecent = async function (limit = 10) {
    return this.find()
        .sort({ importDateTime: -1 })
        .limit(limit)
        .select('-newJobs -updatedJobs -failedJobs -errors')
        .lean();
};

importLogSchema.statics.getStatistics = async function (startDate, endDate) {
    const stats = await this.aggregate([
        {
            $match: {
                importDateTime: {
                    $gte: startDate,
                    $lte: endDate
                }
            }
        },
        {
            $group: {
                _id: null,
                totalImports: { $sum: 1 },
                successfulImports: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                failedImports: {
                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                },
                partialImports: {
                    $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] }
                },
                totalJobsProcessed: { $sum: '$statistics.total' },
                newJobsCreated: { $sum: '$statistics.new' },
                jobsUpdated: { $sum: '$statistics.updated' },
                jobsFailed: { $sum: '$statistics.failed' }
            }
        }
    ]);

    return stats[0] || {
        totalImports: 0,
        successfulImports: 0,
        failedImports: 0,
        partialImports: 0,
        totalJobsProcessed: 0,
        newJobsCreated: 0,
        jobsUpdated: 0,
        jobsFailed: 0
    };
};

const ImportLog = mongoose.model('ImportLog', importLogSchema);

module.exports = ImportLog;
