import { ReactNode } from 'react';

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  children: ReactNode;
  className?: string;
}

export function Alert({
  variant = 'info',
  children,
  className = '',
}: AlertProps) {
  const variantClasses = {
    info: 'alert-info',
    success: 'alert-success',
    warning: 'alert-warning',
    danger: 'alert-danger',
  };

  return (
    <div className={`${variantClasses[variant]} ${className}`}>{children}</div>
  );
}
