import { cn } from "@/lib/utils";

interface ConfidenceGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ConfidenceGauge({ score, size = "md", className }: ConfidenceGaugeProps) {
  const radius = size === "sm" ? 16 : size === "md" ? 24 : 36;
  const stroke = size === "sm" ? 3 : size === "md" ? 4 : 5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let colorClass = "text-primary";
  if (score < 40) colorClass = "text-destructive";
  else if (score < 70) colorClass = "text-chart-4";

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90"
      >
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="text-muted/30"
        />
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className={cn("transition-all duration-1000 ease-out", colorClass)}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={cn(
          "font-bold font-mono tracking-tighter",
          size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-xl",
          colorClass
        )}>
          {score}
        </span>
      </div>
    </div>
  );
}
