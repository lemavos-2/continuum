import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border-0 bg-[hsl(0_0%_13%)] px-3 py-2 text-sm text-foreground ring-offset-background transition-colors placeholder:text-[hsl(40_5%_43%)] focus-visible:outline-none focus-visible:bg-[hsl(0_0%_16%)] focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
