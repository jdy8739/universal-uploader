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
  const barColors = {
    info: 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]',
    error: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]',
    success: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  };

  return (
    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
      <div
        className={`h-full transition-all duration-300 ease-out rounded-full ${barColors[variant]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
};

export const Card = Object.assign(CardContainer, {
  Title: CardTitle,
  Description: CardDescription,
  ProgressBar: CardProgressBar,
});
