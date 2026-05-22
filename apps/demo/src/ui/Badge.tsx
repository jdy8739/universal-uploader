import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "info" | "error" | "success";
  className?: string;
}

export const Badge = ({
  children,
  variant = "info",
  className = "",
}: BadgeProps) => {
  const baseClasses = "text-[10px] font-mono p-1 rounded border";
  const variants = {
    info: "bg-blue-50 border-blue-100 text-blue-700",
    error: "bg-red-50 border-red-100 text-red-700",
    success: "bg-green-50 border-green-100 text-green-700",
  };

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};
