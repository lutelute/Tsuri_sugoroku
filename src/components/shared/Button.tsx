interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

// 和モダン: 藍を基調に、朱の差し色、金箔のアクセント
const variants = {
  primary:
    'bg-gradient-to-b from-ai-400 to-ai-600 hover:from-ai-300 hover:to-ai-500 text-washi border border-kin-500/30 shadow-lg shadow-ai-900/50',
  secondary:
    'bg-ai-800/60 hover:bg-ai-700/70 text-washi border border-kin-500/35',
  danger:
    'bg-gradient-to-b from-shu-400 to-shu-600 hover:from-shu-400 hover:to-shu-500 text-washi border border-shu-700/50 shadow-lg shadow-shu-700/40',
  gold:
    'bg-gradient-to-b from-kin-300 to-kin-600 hover:from-kin-300 hover:to-kin-500 text-[#3a2a0e] font-bold border border-kin-300/60 shadow-lg shadow-kin-700/40',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-base rounded-xl',
  lg: 'px-8 py-3.5 text-lg rounded-xl',
};

export default function Button({
  onClick,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        font-medium tracking-wide transition-all duration-200
        active:scale-95
        disabled:opacity-40 disabled:pointer-events-none
        cursor-pointer
        ${className}
      `}
    >
      {children}
    </button>
  );
}
