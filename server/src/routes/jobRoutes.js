const express = require('express');
const router = express.Router();
const Job = require('../models/Job');

router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status = 'active',
            company,
            location,
            category,
            jobType,
            search,
            sortBy = 'publishedDate',
            order = 'desc'
        } = req.query;

        const query = {};

        if (status) query.status = status;
        if (company) query.company = new RegExp(company, 'i');
        if (location) query.location = new RegExp(location, 'i');
        if (category) query.categories = category;
        if (jobType) query.jobType = jobType;

        if (search) {
            query.$text = { $search: search };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOrder = order === 'asc' ? 1 : -1;

        const [jobs, total] = await Promise.all([
            Job.find(query)
                .sort({ [sortBy]: sortOrder })
                .limit(parseInt(limit))
                .skip(skip)
                .select('-rawData'),
            Job.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                jobs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

router.get('/statistics', async (req, res) => {
    try {
        const [total, active, expired] = await Promise.all([
            Job.countDocuments(),
            Job.countDocuments({ status: 'active' }),
            Job.countDocuments({ status: 'expired' })
        ]);

        const categoryCounts = await Job.aggregate([
            { $unwind: '$categories' },
            {
                $group: {
                    _id: '$categories',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        const typeCounts = await Job.aggregate([
            {
                $group: {
                    _id: '$jobType',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const companyCounts = await Job.aggregate([
            {
                $group: {
                    _id: '$company',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            success: true,
            data: {
                overall: {
                    total,
                    active,
                    expired
                },
                byCategory: categoryCounts,
                byType: typeCounts,
                topCompanies: companyCounts
            }
        });
    } catch (error) {
        console.error('Error fetching job statistics:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

router.get('/categories', async (req, res) => {
    try {
        const categories = await Job.distinct('categories');

        res.json({
            success: true,
            data: categories.sort()
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

router.get('/sources', async (req, res) => {
    try {
        const sources = await Job.distinct('source.name');

        res.json({
            success: true,
            data: sources
        });
    } catch (error) {
        console.error('Error fetching sources:', error);
        res.status(500).json({ error: 'Failed to fetch sources' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({
            success: true,
            data: job
        });
    } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).json({ error: 'Failed to fetch job' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const job = await Job.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({
            success: true,
            data: job
        });
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).json({ error: 'Failed to update job' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const job = await Job.findByIdAndDelete(req.params.id);

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({
            success: true,
            message: 'Job deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ error: 'Failed to delete job' });
    }
});

router.post('/search', async (req, res) => {
    try {
        const {
            query = {},
            page = 1,
            limit = 20,
            sort = { publishedDate: -1 }
        } = req.body;

        const skip = (page - 1) * limit;

        const [jobs, total] = await Promise.all([
            Job.find(query)
                .sort(sort)
                .limit(limit)
                .skip(skip)
                .select('-rawData'),
            Job.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                jobs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error searching jobs:', error);
        res.status(500).json({ error: 'Failed to search jobs' });
    }
});

router.post('/bulk-update', async (req, res) => {
    try {
        const { jobIds, update } = req.body;

        if (!jobIds || !Array.isArray(jobIds)) {
            return res.status(400).json({ error: 'Invalid job IDs' });
        }

        const result = await Job.updateMany(
            { _id: { $in: jobIds } },
            update
        );

        res.json({
            success: true,
            message: `Updated ${result.modifiedCount} jobs`,
            data: result
        });
    } catch (error) {
        console.error('Error bulk updating jobs:', error);
        res.status(500).json({ error: 'Failed to bulk update jobs' });
    }
});

router.post('/check-expired', async (req, res) => {
    try {
        const now = new Date();

        const result = await Job.updateMany(
            {
                expiryDate: { $lte: now },
                status: 'active'
            },
            {
                $set: { status: 'expired' }
            }
        );

        res.json({
            success: true,
            message: `Marked ${result.modifiedCount} jobs as expired`,
            data: result
        });
    } catch (error) {
        console.error('Error checking expired jobs:', error);
        res.status(500).json({ error: 'Failed to check expired jobs' });
    }
});

module.exports = router;
