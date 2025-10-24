import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from './use-toast';

describe('useToast Hook', () => {
  it('initializes with empty toast array', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('adds a toast when toast() is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({
        title: 'Test Toast',
        description: 'This is a test',
      });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
    expect(result.current.toasts[0].description).toBe('This is a test');
  });

  it('generates unique IDs for each toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Toast 1' });
      result.current.toast({ title: 'Toast 2' });
    });

    const ids = result.current.toasts.map(t => t.id);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('dismisses a toast', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;

    act(() => {
      result.current.toast({ title: 'Test Toast' });
      toastId = result.current.toasts[0].id;
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('removes a toast', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;

    act(() => {
      result.current.toast({ title: 'Test Toast' });
      toastId = result.current.toasts[0].id;
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.toasts[0].onOpenChange?.(false);
    });

    // Toast should be marked as not open but still in array initially
    expect(result.current.toasts[0].open).toBe(false);
  });
});
