import type { CSSProperties } from "react";
import { getInitials } from "../utils";

type OptionCardProps = {
  alert?: boolean;
  badgeCount?: number;
  index?: number;
  label: string;
  onClick: () => void;
};

export function OptionCard({
  alert = false,
  badgeCount = 0,
  index,
  label,
  onClick,
}: OptionCardProps) {
  const style =
    typeof index === "number"
      ? ({ "--i": index } as CSSProperties)
      : undefined;
  return (
    <button
      className="module-card"
      onClick={onClick}
      style={style}
      type="button"
    >
      <span className="module-card-glow" />
      {badgeCount > 0 && (
        <span className={`option-badge ${alert ? "alert" : ""}`}>
          {badgeCount}
        </span>
      )}
      <span className="module-icon">{getInitials(label)}</span>
      <span className="module-name">{label}</span>
    </button>
  );
}
