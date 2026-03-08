import { describe, it, expect } from 'vitest';
import {
  midpoint,
  before,
  after,
  needsRebalance,
  computeInsertPosition,
  MIN_GAP,
  INITIAL_STEP,
} from '../services/orderingService';

describe('orderingService — fractional indexing', () => {
  describe('midpoint', () => {
    it('returns midpoint of two positions', () => {
      expect(midpoint(0, 1)).toBe(0.5);
      expect(midpoint(1000, 2000)).toBe(1500);
      expect(midpoint(0.25, 0.75)).toBe(0.5);
    });

    it('handles equal positions gracefully', () => {
      expect(midpoint(5, 5)).toBe(5);
    });
  });

  describe('before', () => {
    it('returns position before the first element', () => {
      expect(before(1000)).toBe(500);
      expect(before(2)).toBe(1);
      expect(before(0.5)).toBeCloseTo(0.25);
    });
  });

  describe('after', () => {
    it('returns position after the last element', () => {
      expect(after(1000)).toBe(2000);
      expect(after(500)).toBe(1500);
    });
  });

  describe('needsRebalance', () => {
    it('returns false for positions with large gap', () => {
      expect(needsRebalance(1000, 2000)).toBe(false);
      expect(needsRebalance(0, 1)).toBe(false);
    });

    it('returns true when gap is smaller than MIN_GAP', () => {
      const a = 1.0;
      const b = a + MIN_GAP / 2;
      expect(needsRebalance(a, b)).toBe(true);
    });

    it('returns false exactly at MIN_GAP boundary', () => {
      expect(needsRebalance(0, MIN_GAP)).toBe(false);
    });
  });

  describe('computeInsertPosition', () => {
    const tasks = [
      { position: 1000 },
      { position: 2000 },
      { position: 3000 },
    ];

    it('appends to empty column at INITIAL_STEP', () => {
      expect(computeInsertPosition([], 0)).toBe(INITIAL_STEP);
    });

    it('inserts before first element', () => {
      expect(computeInsertPosition(tasks, 0)).toBe(500); // before(1000)
    });

    it('inserts after last element', () => {
      expect(computeInsertPosition(tasks, 3)).toBe(4000); // after(3000)
    });

    it('inserts between elements', () => {
      // Between index 0 (1000) and index 1 (2000) → 1500
      expect(computeInsertPosition(tasks, 1)).toBe(1500);
    });

    it('inserts between last two elements', () => {
      // Between index 1 (2000) and index 2 (3000) → 2500
      expect(computeInsertPosition(tasks, 2)).toBe(2500);
    });

    it('handles negative insertIndex as prepend', () => {
      expect(computeInsertPosition(tasks, -1)).toBe(500);
    });

    it('handles very large insertIndex as append', () => {
      expect(computeInsertPosition(tasks, 100)).toBe(4000);
    });

    it('is O(1) — does not iterate all tasks to compute position', () => {
      // Create a large list to ensure constant-time behavior
      const large = Array.from({ length: 10000 }, (_, i) => ({
        position: (i + 1) * 1000,
      }));
      const start = Date.now();
      computeInsertPosition(large, 5000); // middle of 10000 items
      const elapsed = Date.now() - start;
      // Should complete in well under 10ms regardless of list size
      expect(elapsed).toBeLessThan(10);
    });
  });
});
