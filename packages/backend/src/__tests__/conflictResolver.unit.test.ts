import { describe, it, expect } from 'vitest';
import {
  resolveMoveConflict,
  buildConflictMessage,
  detectPositionCollision,
  isMoveEditConflict,
} from '../services/conflictResolver';

describe('conflictResolver', () => {
  describe('resolveMoveConflict — concurrent move + move', () => {
    it('higher clientTs wins', () => {
      const opA = { userId: 'user-a', clientTs: 100, columnId: 'in_progress' as const, position: 1000 };
      const opB = { userId: 'user-b', clientTs: 200, columnId: 'done' as const, position: 1000 };
      const result = resolveMoveConflict(opA, opB);
      expect(result.winnerId).toBe('user-b');
      expect(result.loserId).toBe('user-a');
    });

    it('lower clientTs loses', () => {
      const opA = { userId: 'user-a', clientTs: 300, columnId: 'todo' as const, position: 1000 };
      const opB = { userId: 'user-b', clientTs: 100, columnId: 'done' as const, position: 1000 };
      const result = resolveMoveConflict(opA, opB);
      expect(result.winnerId).toBe('user-a');
      expect(result.loserId).toBe('user-b');
    });

    it('ties are broken lexicographically by userId (deterministic)', () => {
      const opA = { userId: 'user-z', clientTs: 100, columnId: 'todo' as const, position: 1000 };
      const opB = { userId: 'user-a', clientTs: 100, columnId: 'done' as const, position: 1000 };
      // 'user-z' > 'user-a' lexicographically
      const result = resolveMoveConflict(opA, opB);
      expect(result.winnerId).toBe('user-z');
      expect(result.loserId).toBe('user-a');
    });

    it('is symmetric — same result regardless of argument order', () => {
      const opA = { userId: 'user-a', clientTs: 100, columnId: 'todo' as const, position: 1000 };
      const opB = { userId: 'user-b', clientTs: 200, columnId: 'done' as const, position: 1000 };
      const r1 = resolveMoveConflict(opA, opB);
      const r2 = resolveMoveConflict(opB, opA);
      expect(r1.winnerId).toBe(r2.winnerId);
      expect(r1.loserId).toBe(r2.loserId);
    });
  });

  describe('isMoveEditConflict — concurrent move + edit detection', () => {
    it('detects conflict on same task', () => {
      expect(
        isMoveEditConflict(
          { taskId: 'task-1', columnId: 'done', version: 1 },
          { taskId: 'task-1', title: 'New title', version: 1 }
        )
      ).toBe(true);
    });

    it('returns false for different tasks', () => {
      expect(
        isMoveEditConflict(
          { taskId: 'task-1', columnId: 'done', version: 1 },
          { taskId: 'task-2', title: 'New title', version: 1 }
        )
      ).toBe(false);
    });
  });

  describe('detectPositionCollision', () => {
    it('detects collision when positions are identical', () => {
      expect(detectPositionCollision(1.5, 1.5)).toBe(true);
    });

    it('detects collision when gap is less than threshold', () => {
      expect(detectPositionCollision(1.0, 1.0 + 1e-11)).toBe(true);
    });

    it('returns false for positions with sufficient gap', () => {
      expect(detectPositionCollision(1000, 2000)).toBe(false);
    });
  });

  describe('buildConflictMessage', () => {
    it('includes both column names and winner username', () => {
      const msg = buildConflictMessage('in_progress', 'done', 'Alice');
      expect(msg).toContain('In Progress');
      expect(msg).toContain('Done');
      expect(msg).toContain('Alice');
    });

    it('handles todo column name', () => {
      const msg = buildConflictMessage('todo', 'in_progress', 'Bob');
      expect(msg).toContain('To Do');
    });
  });
});
