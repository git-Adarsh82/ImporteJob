const express = require('express');
const router = express.Router();
const ImportLog = require('../models/ImportLog');
const { triggerImport } = require('../services/cronService');
const { JOB_SOURCES, getAllSources } = require('../services/jobFetchService');

router.get('/history', async (req, res) => {
    try {
        const {
            limit = 10,
            offset = 0,
            status,
            startDate,
            endDate
        } = req.query;

        const query = {};

        if (status) {
            query.status = status;
        }

        if (startDate || endDate) {
            query.importDateTime = {};
            if (startDate) query.importDateTime.$gte = new Date(startDate);
            if (endDate) query.importDateTime.$lte = new Date(endDate);
        }

        const imports = await ImportLog.find(query)
            .sort({ importDateTime: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset))
            .select('-failedJobs -errors -rawData');

        const total = await ImportLog.countDocuments(query);

        const transformedImports = imports.map(imp => ({
            _id: imp._id,
            fileName: imp.fileName,
            importDateTime: imp.importDateTime,
            status: imp.status,
            statistics: {
                total: imp.statistics.total,
                new: imp.statistics.new,
                updated: imp.statistics.updated,
                failed: imp.statistics.failed
            }
        }));

        res.json(transformedImports);

    } catch (error) {
        console.error('Error fetching import history:', error);
        res.status(500).json({ error: 'Failed to fetch import history' });
    }
});

router.get('/history/:id', async (req, res) => {
    try {
        const importLog = await ImportLog.findById(req.params.id);

        if (!importLog) {
            return res.status(404).json({ error: 'Import log not found' });
        }

        res.json({
            success: true,
            data: importLog
        });
    } catch (error) {
        console.error('Error fetching import details:', error);
        res.status(500).json({ error: 'Failed to fetch import details' });
    }
});

router.post('/trigger', async (req, res) => {
    try {
        const { sourceUrl, sources } = req.body;
        const results = [];

        if (sourceUrl) {
            const result = await triggerImport(sourceUrl);
            results.push(result);
        }
        else if (sources && Array.isArray(sources)) {
            for (const source of sources) {
                const result = await triggerImport(source);
                results.push(result);
            }
        }
        else {
            for (const source of JOB_SOURCES) {
                const result = await triggerImport(source);
                results.push(result);
            }
        }

        res.json({
            success: true,
            message: 'Import(s) triggered successfully',
            imports: results
        });
    } catch (error) {
        console.error('Error triggering import:', error);
        res.status(500).json({ error: 'Failed to trigger import' });
    }
});

router.post('/retry/:id', async (req, res) => {
    try {
        const importLog = await ImportLog.findById(req.params.id);

        if (!importLog) {
            return res.status(404).json({ error: 'Import log not found' });
        }

        if (importLog.status !== 'failed' && importLog.status !== 'partial') {
            return res.status(400).json({
                error: 'Can only retry failed or partial imports'
            });
        }

        const result = await triggerImport(importLog.sourceUrl, {
            metadata: { retryOf: importLog._id }
        });

        importLog.retryCount += 1;
        importLog.lastRetryAt = new Date();
        await importLog.save();

        res.json({
            success: true,
            message: 'Import retry triggered',
            ...result
        });
    } catch (error) {
        console.error('Error retrying import:', error);
        res.status(500).json({ error: 'Failed to retry import' });
    }
});

router.delete('/history/:id', async (req, res) => {
    try {
        const result = await ImportLog.findByIdAndDelete(req.params.id);

        if (!result) {
            return res.status(404).json({ error: 'Import log not found' });
        }

        res.json({
            success: true,
            message: 'Import log deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting import log:', error);
        res.status(500).json({ error: 'Failed to delete import log' });
    }
});

router.get('/sources', async (req, res) => {
    try {
        const sources = getAllSources();

        res.json({
            success: true,
            data: sources
        });
    } catch (error) {
        console.error('Error fetching sources:', error);
        res.status(500).json({ error: 'Failed to fetch sources' });
    }
});

router.get('/statistics', async (req, res) => {
    try {
        const { period = 'day' } = req.query;

        const now = new Date();
        let startDate = new Date();

        switch (period) {
            case 'hour':
                startDate.setHours(startDate.getHours() - 1);
                break;
            case 'day':
                startDate.setDate(startDate.getDate() - 1);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 1);
        }

        const stats = await ImportLog.getStatistics(startDate, now);

        res.json({
            success: true,
            data: {
                period,
                startDate,
                endDate: now,
                statistics: stats
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;
