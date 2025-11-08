import { cn } from "../../../lib/utils";

interface StatusIndicatorProps {
  isOnline: boolean;
  className?: string;
  showLabel?: boolean;
}

export const StatusIndicator = ({ isOnline, className, showLabel = true }: StatusIndicatorProps) => {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <div className="relative flex items-center justify-center w-6 h-6">
        {/* Outer glow ring */}
        <div
          className={cn(
            "absolute h-5 w-5 rounded-full transition-colors duration-500 ease-in-out",
            isOnline 
              ? "bg-green-500/25 animate-pulse" 
              : "bg-gray-400/25"
          )}
        />

        {/* Main status dot */}
        <div
          className={cn(
            "relative h-3 w-3 rounded-full border-2 transition-all duration-500 ease-in-out",
            isOnline 
              ? "bg-green-500 border-green-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" 
              : "bg-gray-400 border-gray-400"
          )}
        />

        {/* Ping animation for online */}
        {isOnline && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-ping opacity-50" />
          </div>
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <span className={cn(
          "text-xs font-semibold tracking-wide transition-colors duration-500 capitalize",
          isOnline ? "text-green-600" : "text-gray-500"
        )}>
          {isOnline ? "Online" : "Offline"}
        </span>
      )}
    </div>
  );
};
