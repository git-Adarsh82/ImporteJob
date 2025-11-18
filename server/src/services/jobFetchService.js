const axios = require('axios');
const xml2js = require('xml2js');
const { parseString } = require('xml2js');
const util = require('util');

const parseXML = util.promisify(parseString);

// XML parser options
const parserOptions = {
    explicitArray: false,
    mergeAttrs: true,
    normalizeTags: true,
    explicitRoot: false
};

// List of job source URLs
const JOB_SOURCES = [
    'https://jobicy.com/?feed=job_feed',
    'https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time',
    'https://jobicy.com/?feed=job_feed&job_categories=seller&job_types=full-time&search_region=france',
    'https://jobicy.com/?feed=job_feed&job_categories=design-multimedia',
    'https://jobicy.com/?feed=job_feed&job_categories=data-science',
    'https://jobicy.com/?feed=job_feed&job_categories=copywriting',
    'https://jobicy.com/?feed=job_feed&job_categories=business',
    'https://jobicy.com/?feed=job_feed&job_categories=management',
    'https://www.higheredjobs.com/rss/articleFeed.cfm'
];

const fetchAndParseJobFeed = async (sourceUrl) => {
    try {
        console.log(`Fetching feed from: ${sourceUrl}`);

        const response = await axios.get(sourceUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; JobImporter/1.0)',
                'Accept': 'application/rss+xml, application/xml, text/xml'
            }
        });

        const parsed = await parseXML(response.data, parserOptions);

        let jobs = [];

        if (parsed.channel && parsed.channel.item) {
            const items = Array.isArray(parsed.channel.item)
                ? parsed.channel.item
                : [parsed.channel.item];

            jobs = items.map(item => parseRSSJob(item, sourceUrl));
        }
        else if (parsed.jobs && parsed.jobs.job) {
            const items = Array.isArray(parsed.jobs.job)
                ? parsed.jobs.job
                : [parsed.jobs.job];

            jobs = items.map(item => parseGenericJob(item, sourceUrl));
        }
        else if (parsed.item) {
            const items = Array.isArray(parsed.item)
                ? parsed.item
                : [parsed.item];

            jobs = items.map(item => parseRSSJob(item, sourceUrl));
        }

        console.log(`Parsed ${jobs.length} jobs from feed`);
        return jobs;

    } catch (error) {
        console.error(`Error fetching/parsing feed from ${sourceUrl}:`, error.message);
        throw new Error(`Failed to fetch/parse feed: ${error.message}`);
    }
};

const parseRSSJob = (item, sourceUrl) => {
    let guidValue = '';
    if (item.guid) {
        if (typeof item.guid === 'string') {
            guidValue = item.guid;
        } else if (item.guid && item.guid._) {
            guidValue = item.guid._;
        } else if (item.guid && typeof item.guid === 'object') {
            guidValue = JSON.stringify(item.guid);
        }
    }

    const job = {
        sourceId: guidValue || item.link || generateSourceId(item.title, item.pubdate),

        title: cleanText(item.title),
        description: cleanHTML(item.description || item['content:encoded'] || ''),

        company: extractCompany(item),

        location: extractLocation(item),

        categories: extractCategories(item),

        jobType: extractJobType(item),

        sourceUrl: item.link || guidValue || '',
        applyUrl: item.link || guidValue || '',

        publishedDate: item.pubdate || item.pubDate || new Date(),
        expiryDate: extractExpiryDate(item),

        source: {
            name: extractSourceName(sourceUrl),
            url: sourceUrl
        },

        rawData: item
    };

    const salary = extractSalary(item);
    if (salary) {
        job.salary = salary;
    }

    return job;
};

const parseGenericJob = (item, sourceUrl) => {
    return {
        sourceId: item.id || item.jobid || generateSourceId(item.title, item.date),
        title: cleanText(item.title || item.jobtitle),
        description: cleanHTML(item.description || item.jobdescription || ''),
        company: cleanText(item.company || item.employer || 'Unknown Company'),
        location: cleanText(item.location || item.joblocation || ''),
        categories: item.category ? [item.category] : [],
        jobType: normalizeJobType(item.type || item.jobtype),
        sourceUrl: item.url || item.link,
        applyUrl: item.applyurl || item.url || item.link,
        publishedDate: item.date || item.postdate || new Date(),
        expiryDate: item.expiry || item.expirydate,
        source: {
            name: extractSourceName(sourceUrl),
            url: sourceUrl
        },
        rawData: item
    };
};


const cleanText = (text) => {
    if (!text) return '';
    return text.toString().trim();
};

const cleanHTML = (html) => {
    if (!html) return '';
    return html
        .toString()
        .replace(/<[^>]*>?/gm, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
};

const generateSourceId = (title, date) => {
    const titlePart = title ? title.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const datePart = date ? new Date(date).getTime() : Date.now();
    return `${titlePart}-${datePart}`;
};

const extractCompany = (item) => {
    if (item.company) return cleanText(item.company);
    if (item.employer) return cleanText(item.employer);
    if (item['dc:creator']) return cleanText(item['dc:creator']);

    const title = item.title || '';
    const atMatch = title.match(/\sat\s(.+?)(?:\s-|\s\||$)/i);
    if (atMatch) return cleanText(atMatch[1]);

    return 'Unknown Company';
};

const extractLocation = (item) => {
    if (item.location) return cleanText(item.location);
    if (item['job:location']) return cleanText(item['job:location']);

    const text = `${item.title || ''} ${item.description || ''}`;
    const locationMatch = text.match(/(?:location|based in|office in):\s*([^,\n]+)/i);
    if (locationMatch) return cleanText(locationMatch[1]);

    return 'Remote';
};

const extractCategories = (item) => {
    const categories = [];

    if (item.category) {
        if (Array.isArray(item.category)) {
            categories.push(...item.category.map(c => cleanText(c)));
        } else {
            categories.push(cleanText(item.category));
        }
    }

    return categories.filter(c => c);
};

const extractJobType = (item) => {
    const text = `${item.title || ''} ${item.description || ''} ${item.type || ''}`.toLowerCase();

    if (text.includes('full-time') || text.includes('full time')) return 'full-time';
    if (text.includes('part-time') || text.includes('part time')) return 'part-time';
    if (text.includes('contract')) return 'contract';
    if (text.includes('freelance')) return 'freelance';
    if (text.includes('internship') || text.includes('intern')) return 'internship';
    if (text.includes('temporary') || text.includes('temp')) return 'temporary';

    return 'full-time';
};

const normalizeJobType = (type) => {
    if (!type) return 'full-time';

    const normalized = type.toLowerCase().replace(/[^a-z]/g, '');
    const typeMap = {
        'fulltime': 'full-time',
        'parttime': 'part-time',
        'contract': 'contract',
        'freelance': 'freelance',
        'internship': 'internship',
        'temporary': 'temporary',
        'temp': 'temporary',
        'intern': 'internship'
    };

    return typeMap[normalized] || 'full-time';
};

const extractExpiryDate = (item) => {
    if (item.expirydate || item.expiry || item['job:expiry']) {
        return new Date(item.expirydate || item.expiry || item['job:expiry']);
    }

    const publishedDate = new Date(item.pubdate || item.pubDate || Date.now());
    const expiryDate = new Date(publishedDate);
    expiryDate.setDate(expiryDate.getDate() + 30);
    return expiryDate;
};

const extractSalary = (item) => {
    if (item.salary) {
        return parseSalary(item.salary);
    }

    const text = `${item.title || ''} ${item.description || ''}`;
    const salaryMatch = text.match(/\$?([\d,]+)\s*-\s*\$?([\d,]+)\s*(per\s+)?(\w+)?/i);

    if (salaryMatch) {
        return {
            min: parseInt(salaryMatch[1].replace(/,/g, '')),
            max: parseInt(salaryMatch[2].replace(/,/g, '')),
            currency: 'USD',
            period: salaryMatch[4] || 'year'
        };
    }

    return null;
};

const parseSalary = (salaryText) => {
    if (typeof salaryText === 'object') return salaryText;

    const text = salaryText.toString();
    const match = text.match(/\$?([\d,]+)\s*-?\s*\$?([\d,]+)?/);

    if (match) {
        return {
            min: parseInt(match[1].replace(/,/g, '')),
            max: match[2] ? parseInt(match[2].replace(/,/g, '')) : parseInt(match[1].replace(/,/g, '')),
            currency: 'USD',
            period: 'year'
        };
    }

    return null;
};

const extractSourceName = (url) => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return 'unknown';
    }
};

const getAllSources = () => {
    return JOB_SOURCES.map(url => ({
        url,
        name: extractSourceName(url),
        enabled: true
    }));
};

const fetchFromAllSources = async () => {
    const results = await Promise.allSettled(
        JOB_SOURCES.map(url => fetchAndParseJobFeed(url))
    );

    const allJobs = [];
    const errors = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            allJobs.push(...result.value);
        } else {
            errors.push({
                source: JOB_SOURCES[index],
                error: result.reason.message
            });
        }
    });

    return { jobs: allJobs, errors };
};

module.exports = {
    fetchAndParseJobFeed,
    getAllSources,
    fetchFromAllSources,
    JOB_SOURCES
};