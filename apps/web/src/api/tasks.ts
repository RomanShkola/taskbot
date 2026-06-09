import type { ITask, TaskFilters, CreateTaskInput, UpdateTaskInput, PaginatedResponse, ApiResponse } from '@tbot/shared';
import { apiClient } from '@/lib/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (groupId: string, filters?: TaskFilters) => [...taskKeys.lists(), groupId, filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (taskId: string) => [...taskKeys.details(), taskId] as const,
  stats: (groupId: string) => [...taskKeys.all, 'stats', groupId] as const,
};

// Fetch tasks
export function useTasksList(groupId: string, filters?: TaskFilters) {
  return useQuery({
    queryKey: taskKeys.list(groupId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.priority) params.set('priority', filters.priority);
      if (filters?.assigneeId) params.set('assigneeId', filters.assigneeId);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));

      const { data } = await apiClient.get<PaginatedResponse<ITask>>(
        `/groups/${groupId}/tasks?${params.toString()}`
      );
      return data;
    },
    enabled: !!groupId,
  });
}

// Fetch single task
export function useTask(taskId: string) {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ITask>>(`/tasks/${taskId}`);
      return data.data;
    },
    enabled: !!taskId,
  });
}

// Fetch task stats
export function useTaskStats(groupId: string) {
  return useQuery({
    queryKey: taskKeys.stats(groupId),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Record<string, number>>>(`/groups/${groupId}/stats`);
      return data.data;
    },
    enabled: !!groupId,
  });
}

// Create task
export function useCreateTask(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data } = await apiClient.post<ApiResponse<ITask>>(`/groups/${groupId}/tasks`, input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats(groupId) });
    },
  });
}

// Update task
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, ...input }: UpdateTaskInput & { taskId: string }) => {
      const { data } = await apiClient.patch<ApiResponse<ITask>>(`/tasks/${taskId}`, input);
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data._id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats(data.groupId) });
    },
  });
}

// Delete task
export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      await apiClient.delete(`/tasks/${taskId}`);
      return taskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
