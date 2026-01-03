import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'normal' | 'large';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'normal',
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 tracking-tight";
  
  const sizes = {
    normal: "px-6 py-3 text-sm md:text-base",
    large: "px-12 py-6 text-lg md:text-2xl"
  };

  const variants = {
    primary: "bg-[#1b4332] text-white hover:bg-[#081c15] shadow-lg shadow-[#1b4332]/20 hover:shadow-[0_0_30px_rgba(27,67,50,0.4)]",
    secondary: "bg-gradient-to-r from-[#52b788] to-[#40916c] text-white hover:from-[#40916c] hover:to-[#2d6a4f] shadow-[0_4px_14px_0_rgba(82,183,136,0.3)] hover:shadow-[0_8px_25_rgba(82,183,136,0.4)]",
    outline: "border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-[#1b4332]/30",
    danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-200"
  };

  return (
    <button 
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-6 w-6 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Working...
        </>
      ) : children}
    </button>
  );
};