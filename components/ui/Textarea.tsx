import * as React from "react";
import { cn } from "@/utils/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  isPdfMode?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, isPdfMode, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          isPdfMode
            ? "w-full py-1 text-base text-black bg-transparent border-0 border-b border-gray-300 font-medium leading-relaxed min-h-[4rem] resize-none overflow-hidden"
            : "w-full px-3 py-2.5 sm:p-4 text-sm sm:text-lg border-2 border-gray-200 dark:border-slate-700 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500 transition-colors text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800 min-h-[5rem] sm:min-h-[7rem] max-h-[40vh] sm:max-h-[28rem] placeholder:text-gray-400 dark:placeholder:text-gray-500 leading-relaxed shadow-sm overflow-y-auto resize-y touch-pan-y print:shadow-none print:border-gray-300 print:text-base print:p-2 print:min-h-[5rem] print:max-h-none print:overflow-visible print:resize-none print:bg-transparent print:text-black",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
