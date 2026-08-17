type HeroPanelProps = {
  eyebrow: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function HeroPanel({ eyebrow, title, body, actionLabel, onAction }: HeroPanelProps) {
  return (
    <section className="hero-panel">
      <div className="hero-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{body}</p>
        {actionLabel && onAction ? (
          <button className="primary-action" onClick={onAction} type="button">
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="signal-card signal-card-main">
          <span>Audit</span>
          <strong>78</strong>
          <small>Immediate prospect</small>
        </div>
        <div className="signal-row">
          <span />
          <span />
          <span />
        </div>
        <div className="workflow-dots">
          <i />
          <i />
          <i />
        </div>
      </div>
    </section>
  );
}
