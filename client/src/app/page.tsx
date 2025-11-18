'use client';

import { useState } from 'react';
import {
    useImportHistory,
    useQueueStats,
    useJobStatistics,
    useSocketUpdates,
    useTriggerImport,
} from '@/hooks/useApi';
import { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
    RefreshCw,
    Upload,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Activity,
    Database,
    Loader2,
    TrendingUp,
    Calendar,
} from 'lucide-react';

type ImportStatus = 'completed' | 'failed' | 'processing' | 'pending' | 'partial' | string;

interface ImportStatistics {
    total: number;
    new: number;
    updated: number;
    failed: number;
}

interface ImportHistoryItem {
    _id: string;
    fileName: string;
    importDateTime: string | Date;
    status: ImportStatus;
    statistics: ImportStatistics;
}

interface QueueStats {
    total: number;
    active: number;
    waiting: number;
}

interface JobOverview {
    total?: number;
    active?: number;
}

interface JobStatistics {
    overall?: JobOverview;
}

const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate().toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');

    return {
        date: `${month} ${day}, ${year}`,
        time: `${hours}:${minutes}:${seconds}`,
        short: `${hours}:${minutes}`
    };
};

interface StatusConfig {
    icon: any;
    className: string;
    label: string;
}

const getStatusConfig = (status: ImportStatus): StatusConfig => {
    const configs: Record<string, StatusConfig> = {
        completed: { icon: CheckCircle, className: 'text-emerald-600 bg-emerald-50', label: 'Completed' },
        failed: { icon: XCircle, className: 'text-rose-600 bg-rose-50', label: 'Failed' },
        processing: { icon: RefreshCw, className: 'text-blue-600 bg-blue-50', label: 'Processing' },
        pending: { icon: Clock, className: 'text-amber-600 bg-amber-50', label: 'Pending' },
        partial: { icon: AlertCircle, className: 'text-orange-600 bg-orange-50', label: 'Partial' }
    };
    return configs[status] || configs.pending;
};

const StatusBadge = ({ status }: { status: ImportStatus }) => {
    const config = getStatusConfig(status);
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.className}`}>
            <Icon className={`w-3.5 h-3.5 ${status === 'processing' ? 'animate-spin' : ''}`} />
            {config.label}
        </span>
    );
};

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    trend?: string;
    loading?: boolean;
    color?: 'blue' | 'emerald' | 'purple' | 'amber';
}

const StatCard = ({ title, value, subtitle, icon: Icon, trend, loading, color = 'blue' }: StatCardProps) => {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        emerald: 'from-emerald-500 to-emerald-600',
        purple: 'from-purple-500 to-purple-600',
        amber: 'from-amber-500 to-amber-600'
    };

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                    {loading ? (
                        <div className="h-8 w-24 bg-gray-100 animate-pulse rounded" />
                    ) : (
                        <p className="text-3xl font-bold text-gray-900">{value}</p>
                    )}
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-lg bg-gradient-to-br ${colors[color]} shadow-sm`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
            {trend && (
                <div className="flex items-center gap-1 text-xs">
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">{trend}</span>
                    <span className="text-gray-500">vs last period</span>
                </div>
            )}
        </div>
    );
};

export default function Dashboard() {
    const [selectedSource, setSelectedSource] = useState<string>('');

    const importHistoryQuery = useImportHistory({ limit: 10 }) as UseQueryResult<ImportHistoryItem[] | undefined, Error>;
    const queueStatsQuery = useQueueStats() as UseQueryResult<QueueStats | undefined, Error>;
    const jobStatsQuery = useJobStatistics() as UseQueryResult<JobStatistics | undefined, Error>;
    const triggerImport = useTriggerImport() as unknown;

    useSocketUpdates();

    const importHistory = importHistoryQuery?.data ?? [];
    const historyLoading = Boolean(importHistoryQuery?.isLoading);
    const queueStats = queueStatsQuery?.data;
    const queueLoading = Boolean(queueStatsQuery?.isLoading);
    const jobStats = jobStatsQuery?.data;
    const jobStatsLoading = Boolean(jobStatsQuery?.isLoading);

    const isTriggerImportLoading = (() => {
        const t = triggerImport as any;
        if (!t) return false;
        if (typeof t.isLoading === 'boolean') return t.isLoading;
        if (typeof t.status === 'string') return t.status === 'loading';
        return false;
    })();

    const handleTriggerImport = () => {
        const t = triggerImport as any;
        if (t && typeof t.mutate === 'function') {
            const payload = selectedSource ? { sourceUrl: selectedSource } : undefined;
            t.mutate(payload);
        } else if (t && typeof t === 'function') {
            const payload = selectedSource ? { sourceUrl: selectedSource } : undefined;
            t(payload);
        }
    };

    const successRate = importHistory && importHistory.length > 0
        ? Math.round((importHistory.filter((i) => i.status === 'completed').length / importHistory.length) * 100)
        : 0;

    const queueTotal = typeof queueStats?.total === 'number' ? queueStats.total : 0;
    const queueActive = typeof queueStats?.active === 'number' ? queueStats.active : 0;
    const queueWaiting = typeof queueStats?.waiting === 'number' ? queueStats.waiting : 0;

    const totalJobsNumber = typeof jobStats?.overall?.total === 'number' ? jobStats.overall!.total : undefined;
    const totalJobsDisplay = typeof totalJobsNumber === 'number' ? totalJobsNumber.toLocaleString() : 0;
    const activeJobsDisplay = typeof jobStats?.overall?.active === 'number' ? jobStats!.overall!.active.toLocaleString() : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                Job Importer
                            </h1>
                            <p className="text-sm text-gray-600 mt-0.5">Monitor and manage your job imports</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                value={selectedSource}
                                onChange={(e) => setSelectedSource(e.target.value)}
                                placeholder="Source URL (optional)"
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-64"
                            />
                            <button
                                onClick={handleTriggerImport}
                                disabled={Boolean(isTriggerImportLoading)}
                                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium text-sm hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                                {isTriggerImportLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                Trigger Import
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Queue Status"
                        value={queueTotal ?? 0}
                        subtitle={`${queueActive ?? 0} active · ${queueWaiting ?? 0} waiting`}
                        icon={Activity}
                        loading={queueLoading}
                        color="blue"
                    />
                    <StatCard
                        title="Total Jobs"
                        value={totalJobsDisplay}
                        subtitle={`${activeJobsDisplay} active jobs`}
                        icon={Database}
                        loading={jobStatsLoading}
                        color="emerald"
                    />
                    <StatCard
                        title="Success Rate"
                        value={`${successRate}%`}
                        subtitle="Last 10 imports"
                        icon={CheckCircle}
                        trend="+5%"
                        color="purple"
                    />
                    <StatCard
                        title="Last Import"
                        value={importHistory?.[0] ? formatDate(importHistory[0].importDateTime).short : '--:--'}
                        subtitle={importHistory?.[0] ? formatDate(importHistory[0].importDateTime).date : 'No imports yet'}
                        icon={Clock}
                        color="amber"
                    />
                </div>

                {/* Import History Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Import History</h2>
                                <p className="text-sm text-gray-600 mt-0.5">Recent import operations and their status</p>
                            </div>
                            <Calendar className="w-5 h-5 text-gray-400" />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Source</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date & Time</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">New</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Updated</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Failed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {historyLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12">
                                            <div className="flex items-center justify-center">
                                                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                            </div>
                                        </td>
                                    </tr>
                                ) : importHistory && importHistory.length > 0 ? (
                                    importHistory.map((item) => (
                                        <tr key={item._id} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                    <span className="text-sm font-medium text-gray-900">{item.fileName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900">{formatDate(item.importDateTime).date}</div>
                                                <div className="text-xs text-gray-500">{formatDate(item.importDateTime).time}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={item.status} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-semibold text-gray-900">{typeof item.statistics?.total === 'number' ? item.statistics.total : 0}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-medium text-emerald-600">+{typeof item.statistics?.new === 'number' ? item.statistics.new : 0}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-medium text-blue-600">{typeof item.statistics?.updated === 'number' ? item.statistics.updated : 0}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-medium text-rose-600">{typeof item.statistics?.failed === 'number' ? item.statistics.failed : 0}</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12">
                                            <div className="text-center">
                                                <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                                <p className="text-sm text-gray-600 font-medium">No import history found</p>
                                                <p className="text-xs text-gray-500 mt-1">Start by triggering your first import</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
