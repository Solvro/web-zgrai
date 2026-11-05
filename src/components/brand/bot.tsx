import { MASTER_COLOR } from "@/lib/dashboard/view";
import { cn } from "@/lib/utils";

const ASLEEP = "#ECECEC";

// The agent mascot: rounded head, antenna, two eyes. Asleep it turns grey and
// closes its eyes. The box is a [data-jelly] target: when WebGL is available
// the page's <JellyOverlay> draws a live 3D jelly bot into it and the flat SVG
// below stays as the fallback.
export function Bot({
  color,
  awake = true,
  speaking = false,
  master,
  size = 34,
  antenna = true,
  outline,
  delay = 0,
  className,
}: {
  color: string;
  awake?: boolean;
  speaking?: boolean;
  master?: boolean;
  size?: number;
  antenna?: boolean;
  outline?: string;
  delay?: number;
  className?: string;
}) {
  const isMaster = master ?? color.toUpperCase() === MASTER_COLOR;
  const fill = awake ? color : ASLEEP;
  const transition = (property: string, duration: number) => ({
    transition: `${property} ${duration}s ease ${delay}s`,
  });
  return (
    <span
      data-jelly={isMaster ? "square" : "auto"}
      data-master={isMaster ? "" : undefined}
      data-color={color}
      data-state={!awake ? "asleep" : speaking ? "speaking" : "awake"}
      aria-hidden="true"
      className={cn("block shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 56 56"
        fill="none"
        className="jelly-fallback block overflow-visible"
      >
        {antenna && (
          <>
            <circle
              cx="28"
              cy="6"
              r="3.4"
              style={{ fill, ...transition("fill", 0.7) }}
            />
            <rect
              x="26.5"
              y="7"
              width="3"
              height="7"
              rx="1.5"
              style={{ fill, ...transition("fill", 0.7) }}
            />
          </>
        )}
        <rect
          x="7"
          y="13"
          width="42"
          height="36"
          rx="14"
          stroke={outline}
          strokeWidth={outline ? 4 : 0}
          style={{ fill, ...transition("fill", 0.7) }}
        />
        <path
          d="M16 30q4.5 3.5 9 0M31 30q4.5 3.5 9 0"
          stroke="#B5B5B5"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ opacity: awake ? 0 : 1, ...transition("opacity", 0.25) }}
        />
        <circle
          cx="20.5"
          cy="30"
          r="3.8"
          fill="#FFFFFF"
          style={{ opacity: awake ? 1 : 0, ...transition("opacity", 0.25) }}
        />
        <circle
          cx="35.5"
          cy="30"
          r="3.8"
          fill="#FFFFFF"
          style={{ opacity: awake ? 1 : 0, ...transition("opacity", 0.25) }}
        />
      </svg>
    </span>
  );
}
