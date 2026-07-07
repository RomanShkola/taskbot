import type { IUser } from '@tbot/shared';

interface AssigneePickerProps {
  members: IUser[];
  currentAssigneeId?: string;
  onSelect: (userId: string | null) => void;
}

export function AssigneePicker({ members, currentAssigneeId, onSelect }: AssigneePickerProps) {
  return (
    <select
      value={currentAssigneeId || ''}
      onChange={(e) => onSelect(e.target.value || null)}
      className="w-full rounded-lg border border-[var(--tg-theme-secondary-bg-color)] bg-transparent px-3 py-2 text-sm text-[var(--tg-theme-text-color)]"
    >
      <option value="">Без исполнителя</option>
      {members.map((member) => (
        <option key={member.telegramUserId} value={(member as any)._id}>
          {member.username ? `@${member.username}` : member.firstName || `Пользователь ${member.telegramUserId}`}
        </option>
      ))}
    </select>
  );
}
