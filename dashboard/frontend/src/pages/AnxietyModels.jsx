import { useEffect, useMemo, useState } from "react";
import "./AnxietyModels.css";

const MODEL_ORDER = [
  "ClinicalBERT",
  "RoBERTa",
  "DeBERTa",
  "Clinical Longformer",
];

const TABLE_METRICS = [
  ["prAuc", "PR-AUC"],
  ["rocAuc", "ROC-AUC"],
  ["f1", "F1"],
  ["balancedAccuracy", "Balanced accuracy"],
  ["accuracy", "Accuracy"],
  ["precision", "Precision"],
  ["recall", "Recall"],
  ["specificity", "Specificity"],
];

const FIGURE_NOTES = {
  "class_distribution.png":
    "Shows the class balance used to interpret accuracy and motivates reporting PR-AUC, F1 and balanced accuracy alongside raw accuracy.",
  "test_confusion_matrix.png":
    "Summarises correct and incorrect anxiety classifications on the held-out test set at the selected validation threshold.",
  "test_roc_pr_curves.png":
    "Compares discrimination over possible thresholds. PR-AUC is especially informative when the anxiety classes are imbalanced.",
  "token_length_distribution.png":
    "Shows note lengths relative to the model context limit and helps explain the potential effect of truncation.",
  "training_validation_accuracy_loss.png":
    "Shows optimisation behaviour and whether training and validation performance diverged across epochs.",
  "validation_metrics_by_epoch.png":
    "Supports selection of the best validation checkpoint rather than assuming the final epoch is the strongest model.",
  "validation_threshold_selection.png":
    "Shows how the operating threshold was selected using validation data before final test evaluation.",
};

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function formatScore(value, digits = 3) {
  return isNumber(value) ? value.toFixed(digits) : "—";
}

function formatPercent(value, digits = 2) {
  return isNumber(value) ? `${value.toFixed(digits)}%` : "—";
}

function formatDelta(value) {
  if (!isNumber(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(3)}`;
}

function formatDuration(seconds) {
  if (!isNumber(seconds)) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function displayStage(stage) {
  return stage === "Fine-tuned" ? "Fine-tuned" : "Frozen baseline";
}

function MetricCard({ label, value, detail, accent = "teal" }) {
  return (
    <article className={`anxiety-metric-card anxiety-metric-card--${accent}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

function ComparisonChart({ runs, metricKey, title }) {
  const available = MODEL_ORDER.map((model) => {
    const baseline = runs.find(
      (run) => run.model === model && run.stage === "Baseline"
    );
    const fineTuned = runs.find(
      (run) => run.model === model && run.stage === "Fine-tuned"
    );
    return { model, baseline, fineTuned };
  });

  return (
    <article className="anxiety-panel">
      <div className="anxiety-panel-heading">
        <div>
          <p className="anxiety-kicker">Baseline versus fine-tuning</p>
          <h3>{title}</h3>
        </div>
        <div className="anxiety-chart-legend" aria-label="Chart legend">
          <span><i className="anxiety-legend-baseline" />Baseline</span>
          <span><i className="anxiety-legend-finetuned" />Fine-tuned</span>
        </div>
      </div>

      <div className="anxiety-comparison-chart">
        {available.map(({ model, baseline, fineTuned }) => {
          const baselineValue = baseline?.metrics?.[metricKey];
          const fineTunedValue = fineTuned?.metrics?.[metricKey];
          return (
            <div className="anxiety-chart-group" key={model}>
              <div className="anxiety-bars">
                <div className="anxiety-bar-column">
                  <span className="anxiety-bar-value">
                    {formatScore(baselineValue)}
                  </span>
                  <div
                    className="anxiety-bar anxiety-bar--baseline"
                    style={{ height: `${isNumber(baselineValue) ? baselineValue * 100 : 0}%` }}
                    title={`${model} baseline: ${formatScore(baselineValue)}`}
                  />
                </div>
                <div className="anxiety-bar-column">
                  <span className="anxiety-bar-value">
                    {formatScore(fineTunedValue)}
                  </span>
                  <div
                    className="anxiety-bar anxiety-bar--finetuned"
                    style={{ height: `${isNumber(fineTunedValue) ? fineTunedValue * 100 : 0}%` }}
                    title={`${model} fine-tuned: ${formatScore(fineTunedValue)}`}
                  />
                </div>
              </div>
              <span className="anxiety-chart-label">{model}</span>
            </div>
          );
        })}
      </div>
      <p className="anxiety-chart-scale">Score range: 0.00 to 1.00</p>
    </article>
  );
}

function StatusBadge({ status }) {
  const label = status === "complete" ? "Available" : status === "missing" ? "Not available" : "Incomplete";
  return <span className={`anxiety-status anxiety-status--${status}`}>{label}</span>;
}

function AnxietyModels() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/dashboard_data/anxiety/results.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Anxiety dashboard data was not found. Run prepare_anxiety_dashboard.py first."
          );
        }
        return response.json();
      })
      .then((payload) => {
        if (!active) return;
        setData(payload);
        const preferred = payload.runs.find(
          (run) =>
            run.model === "Clinical Longformer" &&
            run.stage === "Fine-tuned" &&
            run.status === "complete"
        );
        const firstAvailable = payload.runs.find(
          (run) => run.status === "complete"
        );
        setSelectedRunId((preferred || firstAvailable)?.id || "");
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const runs = data?.runs || [];
  const completeRuns = useMemo(
    () => runs.filter((run) => run.status === "complete" && run.metrics),
    [runs]
  );
  const fineTunedRuns = useMemo(
    () => completeRuns.filter((run) => run.stage === "Fine-tuned"),
    [completeRuns]
  );
  const baselineRuns = useMemo(
    () => completeRuns.filter((run) => run.stage === "Baseline"),
    [completeRuns]
  );

  const bestFineTuned = useMemo(
    () =>
      [...fineTunedRuns].sort(
        (a, b) => (b.metrics.prAuc ?? -1) - (a.metrics.prAuc ?? -1)
      )[0],
    [fineTunedRuns]
  );
  const bestBaseline = useMemo(
    () =>
      [...baselineRuns].sort(
        (a, b) => (b.metrics.prAuc ?? -1) - (a.metrics.prAuc ?? -1)
      )[0],
    [baselineRuns]
  );
  const comparable = useMemo(
    () => (data?.comparisons || []).filter((item) => item.status === "comparable"),
    [data]
  );
  const largestGain = useMemo(
    () =>
      [...comparable]
        .filter((item) => isNumber(item.deltas?.prAuc))
        .sort((a, b) => b.deltas.prAuc - a.deltas.prAuc)[0],
    [comparable]
  );

  const selectedRun = runs.find((run) => run.id === selectedRunId);

  if (error) {
    return (
      <main className="page-content anxiety-page">
        <section className="anxiety-error">
          <h1>Anxiety Models</h1>
          <p>{error}</p>
          <code>python dashboard/scripts/prepare_anxiety_dashboard.py</code>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page-content anxiety-page">
        <div className="anxiety-loading">Loading anxiety model results…</div>
      </main>
    );
  }

  return (
    <main className="page-content anxiety-page">
      <header className="anxiety-hero">
        <div>
          <p className="anxiety-eyebrow">Anxiety detection · held-out test evaluation</p>
          <h1>Anxiety Model Results</h1>
          <p className="anxiety-hero-copy">
            Comparison of frozen-encoder baselines and fully fine-tuned transformer
            models using the clinical text profile. Test results, validation behaviour,
            truncation and saved notebook figures are presented together.
          </p>
        </div>
        <div className="anxiety-hero-note">
          <strong>Evaluation rule</strong>
          <span>
            Checkpoints and thresholds were selected using validation data. The held-out
            test set was used for final reporting only.
          </span>
        </div>
      </header>

      <section className="anxiety-metric-grid" aria-label="Anxiety result summary">
        <MetricCard
          label="Best fine-tuned PR-AUC"
          value={formatScore(bestFineTuned?.metrics?.prAuc)}
          detail={bestFineTuned?.model || "No completed run"}
          accent="violet"
        />
        <MetricCard
          label="Best baseline PR-AUC"
          value={formatScore(bestBaseline?.metrics?.prAuc)}
          detail={bestBaseline?.model || "No completed baseline"}
          accent="blue"
        />
        <MetricCard
          label="Largest PR-AUC change"
          value={formatDelta(largestGain?.deltas?.prAuc)}
          detail={largestGain?.model || "No paired comparison"}
          accent={largestGain?.deltas?.prAuc >= 0 ? "teal" : "orange"}
        />
        <MetricCard
          label="Available evaluations"
          value={`${completeRuns.length}/${runs.length}`}
          detail="Baseline and fine-tuned runs"
          accent="slate"
        />
      </section>

      <section className="anxiety-section">
        <div className="anxiety-section-heading">
          <div>
            <p className="anxiety-kicker">Direct comparison</p>
            <h2>Baseline versus fine-tuned performance</h2>
          </div>
          <p>
            Values are printed above each bar. A missing bar means that the corresponding
            experiment or usable evaluation artifact was unavailable.
          </p>
        </div>
        <div className="anxiety-chart-grid">
          <ComparisonChart runs={runs} metricKey="prAuc" title="Test PR-AUC" />
          <ComparisonChart runs={runs} metricKey="f1" title="Test F1 score" />
        </div>
      </section>

      <section className="anxiety-section">
        <div className="anxiety-section-heading">
          <div>
            <p className="anxiety-kicker">Complete benchmark</p>
            <h2>Final test-set evaluation</h2>
          </div>
          <p>
            PR-AUC is the primary comparison metric; balanced accuracy, F1, recall and
            specificity provide complementary evidence.
          </p>
        </div>
        <div className="anxiety-table-wrap">
          <table className="anxiety-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Training approach</th>
                {TABLE_METRICS.map(([, label]) => <th key={label}>{label}</th>)}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td><strong>{run.model}</strong></td>
                  <td>{displayStage(run.stage)}</td>
                  {TABLE_METRICS.map(([key]) => (
                    <td key={key}>{formatScore(run.metrics?.[key])}</td>
                  ))}
                  <td><StatusBadge status={run.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="anxiety-table-note">
          “Not available” is not a zero score. It means that a comparable saved run was
          not present. ClinicalBERT baseline metrics are reconstructed from its saved
          test predictions when its metrics file is absent.
        </p>
      </section>

      <section className="anxiety-section">
        <div className="anxiety-section-heading">
          <div>
            <p className="anxiety-kicker">Effect of fine-tuning</p>
            <h2>Change from frozen baseline</h2>
          </div>
          <p>
            Positive values indicate improvement after fine-tuning; negative values
            indicate a reduction relative to the same model’s baseline.
          </p>
        </div>
        <div className="anxiety-table-wrap">
          <table className="anxiety-table anxiety-delta-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Δ PR-AUC</th>
                <th>Δ ROC-AUC</th>
                <th>Δ F1</th>
                <th>Δ balanced accuracy</th>
                <th>Δ recall</th>
                <th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {(data.comparisons || []).map((comparison) => {
                const primaryDelta = comparison.deltas?.prAuc;
                let interpretation = "Paired baseline comparison unavailable";
                if (isNumber(primaryDelta)) {
                  interpretation = primaryDelta > 0
                    ? "Fine-tuning improved PR-AUC"
                    : primaryDelta < 0
                      ? "Baseline achieved higher PR-AUC"
                      : "No PR-AUC change";
                }
                return (
                  <tr key={comparison.model}>
                    <td><strong>{comparison.model}</strong></td>
                    {["prAuc", "rocAuc", "f1", "balancedAccuracy", "recall"].map((key) => {
                      const value = comparison.deltas?.[key];
                      return (
                        <td
                          key={key}
                          className={
                            isNumber(value)
                              ? value > 0
                                ? "anxiety-positive"
                                : value < 0
                                  ? "anxiety-negative"
                                  : ""
                              : ""
                          }
                        >
                          {formatDelta(value)}
                        </td>
                      );
                    })}
                    <td>{interpretation}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="anxiety-section">
        <div className="anxiety-section-heading">
          <div>
            <p className="anxiety-kicker">Training context</p>
            <h2>Validation, runtime and truncation</h2>
          </div>
          <p>
            These values help explain checkpoint selection, computational cost and how
            much text was excluded by each context window.
          </p>
        </div>
        <div className="anxiety-table-wrap">
          <table className="anxiety-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Approach</th>
                <th>Best validation epoch</th>
                <th>Best validation PR-AUC</th>
                <th>Best validation accuracy</th>
                <th>Final epoch</th>
                <th>Training time</th>
                <th>Test truncation</th>
                <th>Max tokens</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td><strong>{run.model}</strong></td>
                  <td>{displayStage(run.stage)}</td>
                  <td>{run.training?.bestEpoch ?? "—"}</td>
                  <td>{formatScore(run.training?.bestValidationPrAuc)}</td>
                  <td>{formatScore(run.training?.bestValidationAccuracy)}</td>
                  <td>{run.training?.finalEpoch ?? "—"}</td>
                  <td>{formatDuration(run.training?.trainingSeconds)}</td>
                  <td>{formatPercent(run.truncation?.testPercentage)}</td>
                  <td>{run.truncation?.selectedMaxLength ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="anxiety-section">
        <div className="anxiety-section-heading">
          <div>
            <p className="anxiety-kicker">Evidence-led summary</p>
            <h2>Key findings</h2>
          </div>
        </div>
        <div className="anxiety-findings-grid">
          <article>
            <span>01</span>
            <h3>Strongest fine-tuned model</h3>
            <p>
              {bestFineTuned
                ? `${bestFineTuned.model} achieved the highest available fine-tuned test PR-AUC (${formatScore(bestFineTuned.metrics.prAuc)}).`
                : "No completed fine-tuned evaluation was found."}
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Fine-tuning effect</h3>
            <p>
              {largestGain && isNumber(largestGain.deltas.prAuc)
                ? `${largestGain.model} showed the largest PR-AUC change (${formatDelta(largestGain.deltas.prAuc)}) between its frozen baseline and fine-tuned model.`
                : "No model had both baseline and fine-tuned metrics available for a paired comparison."}
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Long-context interpretation</h3>
            <p>
              Clinical Longformer can retain substantially more of each selected clinical
              note. Its results should be interpreted together with the truncation table,
              not only its classification scores.
            </p>
          </article>
          <article>
            <span>04</span>
            <h3>Fair comparison boundary</h3>
            <p>
              Clinical Longformer baseline is shown as unavailable when the run is absent.
              The dashboard does not treat a missing experiment as a zero or infer an
              improvement without a valid paired baseline.
            </p>
          </article>
        </div>
      </section>

      <section className="anxiety-section">
        <div className="anxiety-section-heading anxiety-gallery-heading">
          <div>
            <p className="anxiety-kicker">Notebook visualisations</p>
            <h2>Model figure gallery</h2>
          </div>
          <label>
            Select model run
            <select
              value={selectedRunId}
              onChange={(event) => setSelectedRunId(event.target.value)}
            >
              {runs.filter((run) => run.figures?.length).map((run) => (
                <option value={run.id} key={run.id}>
                  {run.model} — {displayStage(run.stage)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedRun?.figures?.length ? (
          <div className="anxiety-figure-grid">
            {selectedRun.figures.map((figure) => (
              <figure className="anxiety-figure-card" key={figure.url}>
                <a href={figure.url} target="_blank" rel="noreferrer">
                  <img src={figure.url} alt={`${selectedRun.model}: ${figure.label}`} />
                </a>
                <figcaption>
                  <strong>{figure.label}</strong>
                  <span>
                    {selectedRun.model} · {displayStage(selectedRun.stage)}
                  </span>
                  <p>{FIGURE_NOTES[figure.name] || "Saved visual output from the completed notebook run."}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="anxiety-empty">No saved PNG figures were found for this run.</div>
        )}
      </section>

      <aside className="anxiety-disclaimer">
        <strong>Research-use notice:</strong> These models estimate patterns associated
        with anxiety in clinical text. They do not provide a diagnosis and must not replace
        assessment by a qualified healthcare professional.
      </aside>
    </main>
  );
}

export default AnxietyModels;
