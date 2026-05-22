import React from 'react';

interface LogContainerProps {
  children: React.ReactNode;
  className?: string;
}

const LogContainer = ({ children, className = '' }: LogContainerProps) => (
  <div className={`text-[10px] bg-stone-100 p-2 rounded text-stone-600 font-mono ${className}`}>
    {children}
  </div>
);

const LogEntry = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

const LogData = ({ items }: { items: { label: string; value: string | number }[] }) => (
  <dl className="grid grid-cols-[max-content_1fr] gap-x-2">
    {items.map((item) => (
      <React.Fragment key={item.label}>
        <dt>{item.label}:</dt>
        <dd>{item.value}</dd>
      </React.Fragment>
    ))}
  </dl>
);

export const Log = Object.assign(LogContainer, {
  Entry: LogEntry,
  Data: LogData,
});
