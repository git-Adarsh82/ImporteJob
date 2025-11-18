// Job types
export interface Job {
    _id: string;
    externalId: string;
    title: string;
    description: string;
    company: string;
    location?: string;
    category?: string[];
    jobType?: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship' | 'remote';
    salary?: {
        min?: number;
        max?: number;
        currency?: string;
    };
    link: string;
    source: string;
    sourceUrl: string;
    publishedDate?: Date;
    expiryDate?: Date;
    skills?: string[];
    experience?: string;
    education?: string;
    status: 'active' | 'expired' | 'filled' | 'draft';
    metadata?: {
        importId?: string;
        lastImportDate?: Date;
        updateCount?: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

// Import log types
export interface ImportLog {
    _id: string;
    fileName: string;
    sourceUrl: string;
    importDateTime: Date;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
    statistics: {
        total: number;
        new: number;
        updated: number;
        failed: number;
        skipped: number;
    };
    processingTime?: {
        start?: Date;
        end?: Date;
        duration?: number;
    };
    errors?: Array<{
        jobId?: string;
        error: string;
        timestamp: Date;
        details?: any;
    }>;
    metadata?: {
        apiSource?: string;
        categories?: string[];
        jobTypes?: string[];
        region?: string;
        batchSize?: number;
        concurrency?: number;
    };
    queueJobId?: string;
    retryCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// Queue types
export interface QueueJob {
    id: string;
    name: string;
    data: any;
    progress?: number;
    timestamp?: number;
    processedOn?: number;
    attemptsMade?: number;
    failedReason?: string;
    stacktrace?: string;
}

export interface QueueStats {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
    total: number;
}

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

// Job source types
export interface JobSource {
    name: string;
    url: string;
    categories?: string[];
    jobType?: string;
    region?: string;
}

// Import statistics types
export interface ImportStatistics {
    totalImports: number;
    successfulImports: number;
    failedImports: number;
    partialImports: number;
    totalJobsImported: number;
    newJobsAdded: number;
    jobsUpdated: number;
    jobsFailed: number;
    averageProcessingTime: number;
    importsBySource: Record<string, {
        total: number;
        successful: number;
        failed: number;
        jobs: number;
    }>;
    importsByDay: Record<string, {
        total: number;
        successful: number;
        failed: number;
        jobs: number;
    }>;
}

// Socket event types
export interface SocketImportEvent {
    jobId: string;
    sourceUrl?: string;
    progress?: number;
    timestamp: Date;
    status?: string;
    result?: any;
    error?: string;
}

// Filter types
export interface JobFilters {
    search?: string;
    category?: string[];
    jobType?: string[];
    source?: string[];
    location?: string;
    salaryMin?: number;
    salaryMax?: number;
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
    includeInactive?: boolean;
}
