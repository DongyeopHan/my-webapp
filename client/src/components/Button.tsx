import type { ReactNode, ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classNames} {...props}>
      {children}
    </button>
  );
}
