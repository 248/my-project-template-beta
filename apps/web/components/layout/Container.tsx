import { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  size?: 'narrow' | 'wide' | 'full';
  className?: string;
}

export function Container({
  children,
  size = 'wide',
  className = '',
}: ContainerProps) {
  const sizeClasses = {
    narrow: 'container-narrow',
    wide: 'container-wide',
    full: 'w-full px-4 sm:px-6 lg:px-8',
  };

  return <div className={`${sizeClasses[size]} ${className}`}>{children}</div>;
}
