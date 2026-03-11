const LoadingSpinner = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-secondary/60 animate-branded-dot-1" />
      <span className="h-1.5 w-1.5 rounded-full bg-secondary/60 animate-branded-dot-2" />
      <span className="h-1.5 w-1.5 rounded-full bg-secondary/60 animate-branded-dot-3" />
    </div>
  );
};

export default LoadingSpinner;
