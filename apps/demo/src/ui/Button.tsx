import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
}

export const Button = ({ variant = 'primary', className = '', ...props }: ButtonProps) => {
  const baseClass = variant === 'primary' ? 'btn-primary' : 'btn-outline';
  return <button className={`${baseClass} ${className}`} {...props} />;
};
