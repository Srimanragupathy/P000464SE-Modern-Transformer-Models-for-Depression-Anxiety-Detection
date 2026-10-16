import "./RiskGauge.css";

function clamp(value, minimum, maximum) {
  return Math.min(
    Math.max(value, minimum),
    maximum,
  );
}

export default function RiskGauge({
  title,
  result,
  color,
}) {
  const probability = clamp(
    Number(result.positive_probability_percent),
    0,
    100,
  );

  const gaugeStyle = {
    background: `conic-gradient(
      ${color} 0deg ${probability * 3.6}deg,
      #e8edf3 ${probability * 3.6}deg 360deg
    )`,
  };

  return (
    <article className="risk-card">
      <h3>{title}</h3>

      <div
        className="risk-gauge"
        style={gaugeStyle}
        aria-label={`${title} probability ${probability}%`}
      >
        <div className="risk-gauge__centre">
          <strong>{probability.toFixed(2)}%</strong>
          <span>Probability</span>
        </div>
      </div>

      <p
        className={
          result.predicted_label_id === 1
            ? "risk-status risk-status--elevated"
            : "risk-status risk-status--lower"
        }
      >
        {result.risk_category}
      </p>

      <dl className="risk-details">
        <div>
          <dt>Decision threshold</dt>
          <dd>
            {Number(
              result.classification_threshold_percent,
            ).toFixed(2)}
            %
          </dd>
        </div>

        <div>
          <dt>Tokens analysed</dt>
          <dd>
            {result.used_token_count.toLocaleString()}
            {" / "}
            {result.maximum_length.toLocaleString()}
          </dd>
        </div>

        <div>
          <dt>Original tokens</dt>
          <dd>
            {result.original_token_count.toLocaleString()}
          </dd>
        </div>

        <div>
          <dt>Truncated</dt>
          <dd>{result.truncated ? "Yes" : "No"}</dd>
        </div>
      </dl>
    </article>
  );
}