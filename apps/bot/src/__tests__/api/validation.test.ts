import { createTaskSchema, updateTaskSchema, taskQuerySchema } from 'src/api/validation';

describe('Validation Schemas', () => {
  describe('createTaskSchema', () => {
    it('should accept valid input with required title', () => {
      const result = createTaskSchema.safeParse({ title: 'Deploy API' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Deploy API');
        expect(result.data.priority).toBe('medium'); // default
      }
    });

    it('should accept full input', () => {
      const result = createTaskSchema.safeParse({
        title: 'Deploy API',
        description: 'Deploy the API server to production',
        priority: 'high',
        assigneeId: '507f1f77bcf86cd799439011',
        dueDate: '2026-04-01T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const result = createTaskSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });

    it('should reject missing title', () => {
      const result = createTaskSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject title exceeding 200 chars', () => {
      const result = createTaskSchema.safeParse({ title: 'x'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('should reject invalid priority', () => {
      const result = createTaskSchema.safeParse({ title: 'Task', priority: 'super_high' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid dueDate format', () => {
      const result = createTaskSchema.safeParse({ title: 'Task', dueDate: 'not-a-date' });
      expect(result.success).toBe(false);
    });
  });

  describe('updateTaskSchema', () => {
    it('should accept partial updates', () => {
      const result = updateTaskSchema.safeParse({ title: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('should accept empty object (no updates)', () => {
      const result = updateTaskSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept status update', () => {
      const result = updateTaskSchema.safeParse({ status: 'done' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = updateTaskSchema.safeParse({ status: 'cancelled' });
      expect(result.success).toBe(false);
    });

    it('should accept nullable assigneeId', () => {
      const result = updateTaskSchema.safeParse({ assigneeId: null });
      expect(result.success).toBe(true);
    });

    it('should accept nullable dueDate', () => {
      const result = updateTaskSchema.safeParse({ dueDate: null });
      expect(result.success).toBe(true);
    });
  });

  describe('taskQuerySchema', () => {
    it('should accept empty query (defaults)', () => {
      const result = taskQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should coerce string numbers for page/limit', () => {
      const result = taskQuerySchema.safeParse({ page: '2', limit: '50' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should accept valid filter combination', () => {
      const result = taskQuerySchema.safeParse({
        status: 'todo',
        priority: 'high',
        search: 'deploy',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = taskQuerySchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject limit over 100', () => {
      const result = taskQuerySchema.safeParse({ limit: '101' });
      expect(result.success).toBe(false);
    });

    it('should reject negative page', () => {
      const result = taskQuerySchema.safeParse({ page: '-1' });
      expect(result.success).toBe(false);
    });
  });
});
