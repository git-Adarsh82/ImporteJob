const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    sourceId: {
        type: String,
        required: true,
        index: true
    },

    title: {
        type: String,
        required: true,
        index: true
    },

    description: {
        type: String,
        required: true
    },

    company: {
        type: String,
        required: true,
        index: true
    },

    location: {
        type: String,
        index: true
    },

    categories: [{
        type: String,
        index: true
    }],

    jobType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship', 'temporary'],
        index: true
    },

    salary: {
        min: Number,
        max: Number,
        currency: String,
        period: String
    },

    sourceUrl: {
        type: String,
        required: true
    },

    applyUrl: {
        type: String
    },

    source: {
        name: {
            type: String,
            required: true,
            index: true
        },
        url: String
    },

    publishedDate: {
        type: Date,
        index: true
    },

    expiryDate: {
        type: Date,
        index: true
    },

    status: {
        type: String,
        enum: ['active', 'expired', 'filled', 'deleted'],
        default: 'active',
        index: true
    },

    rawData: {
        type: mongoose.Schema.Types.Mixed
    },

    lastImportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ImportLog'
    },

    importCount: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

jobSchema.index({ sourceId: 1, 'source.name': 1 }, { unique: true });

jobSchema.index({ title: 'text', description: 'text', company: 'text' });

jobSchema.methods.isExpired = function () {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
};

jobSchema.statics.upsertJob = async function (jobData, importId) {
    const existingJob = await this.findOne({
        sourceId: jobData.sourceId,
        'source.name': jobData.source.name
    });

    if (existingJob) {
        existingJob.set(jobData);
        existingJob.lastImportId = importId;
        existingJob.importCount += 1;
        await existingJob.save();
        return { job: existingJob, isNew: false };
    } else {
        jobData.lastImportId = importId;
        const newJob = await this.create(jobData);
        return { job: newJob, isNew: true };
    }
};

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
