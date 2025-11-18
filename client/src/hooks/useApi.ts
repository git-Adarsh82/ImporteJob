import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useEffect } from 'react';
import { socketClient } from '@/lib/socket';



// Import hooks
export function useImportHistory(params?: any) {
    return useQuery({
        queryKey: ['imports', 'history', params],
        queryFn: () => apiClient.getImportHistory(params),
        select: (resp: any) => {
            if (!resp) return [];
            if (Array.isArray(resp.data)) return resp.data;
            if (resp.data && Array.isArray(resp.data.imports)) return resp.data.imports;
            if (Array.isArray(resp)) return resp;
            return [];
        },
    });
}

export function useImportDetails(id: string) {
    return useQuery({
        queryKey: ['imports', id],
        queryFn: () => apiClient.getImportDetails(id),
        enabled: !!id,
    });
}

export function useTriggerImport() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { sourceUrl?: string; sources?: string[] }) =>
            apiClient.triggerImport(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['imports'] });
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
}

export function useRetryImport() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiClient.retryImport(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['imports'] });
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
}

export function useDeleteImportLog() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiClient.deleteImportLog(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['imports'] });
        },
    });
}

export function useImportSources() {
    return useQuery({
        queryKey: ['imports', 'sources'],
        queryFn: () => apiClient.getSources(),
    });
}

export function useImportStatistics(period?: string) {
    return useQuery({
        queryKey: ['imports', 'statistics', period],
        queryFn: () => apiClient.getImportStatistics(period),
    });
}




// Job hooks
export function useJobs(params?: any) {
    return useQuery({
        queryKey: ['jobs', params],
        queryFn: () => apiClient.getJobs(params),
    });
}

export function useJob(id: string) {
    return useQuery({
        queryKey: ['jobs', id],
        queryFn: () => apiClient.getJobById(id),
        enabled: !!id,
    });
}

export function useUpdateJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            apiClient.updateJob(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
    });
}

export function useDeleteJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiClient.deleteJob(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
    });
}

export function useJobStatistics() {
    return useQuery({
        queryKey: ['jobs', 'statistics'],
        queryFn: () => apiClient.getJobStatistics(),
    });
}

export function useJobCategories() {
    return useQuery({
        queryKey: ['jobs', 'categories'],
        queryFn: () => apiClient.getJobCategories(),
    });
}

export function useJobSources() {
    return useQuery({
        queryKey: ['jobs', 'sources'],
        queryFn: () => apiClient.getJobSources(),
    });
}




// Queue hooks
export function useQueueStats() {
    return useQuery({
        queryKey: ['queue', 'stats'],
        queryFn: () => apiClient.getQueueStats(),
        refetchInterval: 5000, // Refetch every 5 seconds
    });
}

export function useQueueHealth() {
    return useQuery({
        queryKey: ['queue', 'health'],
        queryFn: () => apiClient.getQueueHealth(),
        refetchInterval: 10000, // Refetch every 10 seconds
    });
}

export function useActiveJobs() {
    return useQuery({
        queryKey: ['queue', 'jobs', 'active'],
        queryFn: () => apiClient.getActiveJobs(),
        refetchInterval: 3000, // Refetch every 3 seconds
    });
}

export function useWaitingJobs() {
    return useQuery({
        queryKey: ['queue', 'jobs', 'waiting'],
        queryFn: () => apiClient.getWaitingJobs(),
        refetchInterval: 5000,
    });
}

export function useFailedJobs() {
    return useQuery({
        queryKey: ['queue', 'jobs', 'failed'],
        queryFn: () => apiClient.getFailedJobs(),
    });
}

export function useRetryFailedJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (jobId: string) => apiClient.retryFailedJob(jobId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
}

export function useClearCompletedJobs() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => apiClient.clearCompletedJobs(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
}

export function usePauseQueue() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => apiClient.pauseQueue(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
}

export function useResumeQueue() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => apiClient.resumeQueue(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
}




// Socket hook for real-time updates
export function useSocketUpdates() {
    const queryClient = useQueryClient();

    useEffect(() => {
        socketClient.connect();
        socketClient.subscribeToImports();

        const handleImportComplete = (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['imports'] });
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        };

        const handleImportProgress = (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['queue', 'jobs', 'active'] });
        };

        const handleQueueStatus = (data: any) => {
            queryClient.setQueryData(['queue', 'stats'], data.stats);
        };

        socketClient.on('import:complete', handleImportComplete);
        socketClient.on('import:failed', handleImportComplete);
        socketClient.on('import:progress', handleImportProgress);
        socketClient.on('queue:status', handleQueueStatus);

        return () => {
            socketClient.off('import:complete', handleImportComplete);
            socketClient.off('import:failed', handleImportComplete);
            socketClient.off('import:progress', handleImportProgress);
            socketClient.off('queue:status', handleQueueStatus);
        };
    }, [queryClient]);
}
