import * as React from "react";
import { cn } from "@/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    // Basic dynamic tailwind button system (simplified cva)
    const baseStyles = "inline-flex items-center justify-center font-bold transition-all focus:outline-none focus:ring-4 disabled:opacity-50 disabled:pointer-events-none transform active:scale-95";
    
    const variants = {
      primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl focus:ring-blue-500/50",
      secondary: "bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 focus:ring-gray-300 dark:focus:ring-slate-600",
      danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg focus:ring-red-500/50",
      outline: "border-2 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 focus:ring-blue-500/30",
      ghost: "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300",
    };
    
    const sizes = {
      sm: "px-4 py-2 text-sm rounded-xl",
      md: "px-6 py-3.5 text-base rounded-2xl",
      lg: "px-8 py-4 text-lg rounded-2xl",
      icon: "p-2 rounded-xl",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
