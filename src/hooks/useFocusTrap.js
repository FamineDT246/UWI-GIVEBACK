import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(isOpen) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store the element that had focus before the modal opened
    previousFocusRef.current = document.activeElement;

    // Move focus into the modal
    const container = containerRef.current;
    if (!container) return;

    const focusable = container.querySelectorAll(FOCUSABLE_SELECTORS);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      container.focus();
    }

    // Trap focus inside the modal on Tab / Shift+Tab
    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      const focusableElements = [...container.querySelectorAll(FOCUSABLE_SELECTORS)];
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab — going backwards
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab — going forwards
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Close on Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        previousFocusRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleEscape);
      // Return focus to where it was before the modal opened
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  return containerRef;
}