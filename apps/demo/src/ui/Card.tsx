import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const CardContainer = ({ children, className = '' }: CardProps) => (
  <article className={`card ${className}`}>{children}</article>
);

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mt-0 text-xl font-bold">{children}</h3>
);

const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-500 mb-6">{children}</p>
);

const CardProgressBar = ({ value, variant = 'info' }: { value: number, variant?: 'info' | 'error' | 'success' }) => {
  const colors = {
    info: 'var(--primary)',
    error: 'var(--error)',
    success: 'var(--success)',
  };
  return (
    <progress
      value={value}
      max="100"
      className="w-full h-1.5 rounded-full"
      style={{ accentColor: colors[variant] }}
    />
  );
};

export const Card = Object.assign(CardContainer, {
  Title: CardTitle,
  Description: CardDescription,
  ProgressBar: CardProgressBar,
});
