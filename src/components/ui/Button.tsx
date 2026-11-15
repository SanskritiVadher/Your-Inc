import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "quiet"
    | "outline"
    | "ghost"
    | "destructive";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-body font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-cobalt/40 disabled:opacity-40 disabled:pointer-events-none rounded select-none whitespace-nowrap shrink-0 cursor-pointer";

    // 3 consistent button styles: primary (cobalt filled), secondary (outlined ink), quiet (text only)
    const variantStyles = {
      primary: "bg-cobalt text-white hover:bg-cobalt/90 active:scale-[0.99] shadow-xs",
      secondary: "bg-surface/70 text-text hover:bg-surface border border-border text-text hover:border-cobalt/30",
      quiet: "bg-transparent text-text-muted hover:text-text hover:bg-surface/60 border-transparent",
      // Compatibility aliases
      outline: "bg-surface/70 text-text hover:bg-surface border border-border text-text hover:border-cobalt/30",
      ghost: "bg-transparent text-text-muted hover:text-text hover:bg-surface/60 border-transparent",
      destructive: "bg-terracotta text-white hover:bg-terracotta/90",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs min-h-[30px]",
      md: "px-4 py-2 text-xs min-h-[36px]",
      lg: "px-5 py-2.5 text-sm min-h-[42px]",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
