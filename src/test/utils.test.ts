import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('cn (className utility)', () => {
    it('merges class names correctly', () => {
      const result = cn('base-class', 'additional-class');
      expect(result).toContain('base-class');
      expect(result).toContain('additional-class');
    });

    it('handles conditional classes', () => {
      const isActive = true;
      const isHidden = false;
      const result = cn('base', isActive && 'conditional', isHidden && 'hidden');
      expect(result).toContain('base');
      expect(result).toContain('conditional');
      expect(result).not.toContain('hidden');
    });

    it('handles tailwind class conflicts', () => {
      const result = cn('px-4', 'px-6');
      // Should only include the last px class
      expect(result).toContain('px-6');
      expect(result).not.toContain('px-4');
    });

    it('handles undefined and null values', () => {
      const result = cn('base', undefined, null, 'additional');
      expect(result).toContain('base');
      expect(result).toContain('additional');
    });
  });
});
