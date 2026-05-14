import type { ReactNode } from "react";

type HistoryDetailPanelProps = {
  title: string;
  details: string;
  actionLabel?: string;
  disabled?: boolean;
  onAction: () => void;
  children?: ReactNode;
};

export function HistoryDetailPanel({
  title,
  details,
  actionLabel = "Close details",
  disabled = false,
  onAction,
  children,
}: HistoryDetailPanelProps) {
  return (
    <section className="history-detail">
      <div>
        <span className="record-status driver">Details</span>
        <h3>{title}</h3>
      </div>
      <textarea readOnly rows={12} value={details} />
      {children}
      <button
        className="secondary-button dark-secondary-button"
        disabled={disabled}
        onClick={onAction}
        type="button"
      >
        {actionLabel}
      </button>
    </section>
  );
}
