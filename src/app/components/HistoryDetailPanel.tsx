type HistoryDetailPanelProps = {
  title: string;
  details: string;
  actionLabel?: string;
  disabled?: boolean;
  onAction: () => void;
};

export function HistoryDetailPanel({
  title,
  details,
  actionLabel = "Close details",
  disabled = false,
  onAction,
}: HistoryDetailPanelProps) {
  return (
    <section className="history-detail">
      <div>
        <span className="record-status driver">Details</span>
        <h3>{title}</h3>
      </div>
      <textarea readOnly rows={12} value={details} />
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
