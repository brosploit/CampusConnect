import React from 'react';

interface SafeTextProps {
  content: string | null | undefined;
  fallback?: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * XSS-Safe Text Component
 * Strictly relies on React's native string interpolation to prevent injection attacks.
 * Raw HTML is never evaluated.
 */
export const SafeText: React.FC<SafeTextProps> = ({
  content,
  fallback = '—',
  className = '',
  as: Component = 'span',
}) => {
  const safeString = content && content.trim().length > 0 ? content : fallback;
  return <Component className={className}>{safeString}</Component>;
};
