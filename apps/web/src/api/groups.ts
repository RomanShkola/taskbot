import type { IGroup, IUser, ApiResponse } from '@tbot/shared';
import { apiClient } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';

export const groupKeys = {
  all: ['groups'] as const,
  list: () => [...groupKeys.all, 'list'] as const,
  members: (groupId: string) => [...groupKeys.all, 'members', groupId] as const,
};

export function useGroupsList() {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<IGroup[]>>('/groups');
      return data.data;
    },
  });
}

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: groupKeys.members(groupId),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<IUser[]>>(`/groups/${groupId}/members`);
      return data.data;
    },
    enabled: !!groupId,
  });
}
