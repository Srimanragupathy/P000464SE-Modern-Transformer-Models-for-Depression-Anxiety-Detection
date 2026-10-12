import { useEffect, useMemo, useState } from "react";
import "./DepressionModels.css";

const MODEL_ORDER = [
  "clinicalbert",
  "roberta",
  "deberta",
  "clinical-longformer",
];

const METRIC_COLUMNS = [
  { key: "pr_auc", label: "PR-AUC" },
  { key: "roc_auc", label: "ROC-AUC" },
  { key: "f1", label: "F1" },
  { key: "balanced_accuracy", label: "Balanced accuracy" },
  { key: "recall", label: "Recall" },
  { key: "specificity", label: "Specificity" },
];

function isNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function formatMetric(value, digits = 3) {
  return isNumber(value)
    ? value.toFixed(digits)
    : "Not available";
}

function formatDelta(value) {
  if (!isNumber(value)) {
    return "Not available";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(3)}`;
}

function formatPercentage(value) {
  if (!isNumber(value)) {
    return "Not available";
  }

  return `${value.toFixed(2)}%`;
}

function formatDuration(seconds) {
  if (!isNumber(seconds)) {
    return "Not available";
  }

  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function findRun(runs, modelKey, stage) {
  return runs.find(
    (run) =>
      run.model_key === modelKey &&
      run.stage === stage
  );
}

function statusLabel(status) {
  if (status === "completed") {
    return "Completed";
  }

  if (status === "incomplete") {
    return "Incomplete";
  }

  return "Missing";
}

function MetricCard({
  label,
  value,
  description,
  tone,
}) {
  return (
    <article className={`depression-metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{description}</p>
    </article>
  );
}

function ComparisonChart({ runs, metricKey, title }) {
  const rows = MODEL_ORDER.map((modelKey) => {
    const baseline = findRun(
      runs,
      modelKey,
      "baseline"
    );

    const fineTuned = findRun(
      runs,
      modelKey,
      "fine-tuned"
    );

    return {
      model:
        fineTuned?.model ||
        baseline?.model ||
        modelKey,
      baseline: baseline?.metrics?.[metricKey],
      fineTuned: fineTuned?.metrics?.[metricKey],
    };
  });

  return (
    <article className="depression-chart-card">
      <header>
        <div>
          <span className="depression-kicker">
            Baseline versus fine-tuning
          </span>
          <h3>{title}</h3>
        </div>

        <div className="depression-chart-legend">
          <span>
            <i className="baseline" />
            Baseline
          </span>
          <span>
            <i className="fine-tuned" />
            Fine-tuned
          </span>
        </div>
      </header>

      <div className="depression-comparison-bars">
        {rows.map((row) => (
          <div
            className="depression-comparison-row"
            key={`${metricKey}-${row.model}`}
          >
            <strong>{row.model}</strong>

            <div className="depression-stage-bar">
              <span>Baseline</span>

              <div className="depression-bar-track">
                {isNumber(row.baseline) && (
                  <div
                    className="depression-bar-fill baseline"
                    style={{
                      width: `${row.baseline * 100}%`,
                    }}
                  />
                )}
              </div>

              <b>{formatMetric(row.baseline)}</b>
            </div>

            <div className="depression-stage-bar">
              <span>Fine-tuned</span>

              <div className="depression-bar-track">
                {isNumber(row.fineTuned) && (
                  <div
                    className="depression-bar-fill fine-tuned"
                    style={{
                      width: `${row.fineTuned * 100}%`,
                    }}
                  />
                )}
              </div>

              <b>{formatMetric(row.fineTuned)}</b>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function ResultsTable({ runs }) {
  return (
    <div className="depression-table-wrapper">
      <table className="depression-results-table">
        <thead>
          <tr>
            <th>Model</th>
            <th>Training approach</th>
            <th>Status</th>

            {METRIC_COLUMNS.map((metric) => (
              <th key={metric.key}>
                {metric.label}
              </th>
            ))}

            <th>Best validation epoch</th>
            <th>Training time</th>
            <th>Truncation</th>
          </tr>
        </thead>

        <tbody>
          {runs.map((run) => (
            <tr
              key={`${run.model_key}-${run.stage}`}
            >
              <td>
                <strong>{run.model}</strong>
              </td>

              <td>
                {run.stage === "fine-tuned"
                  ? "Full fine-tuning"
                  : "Frozen encoder baseline"}
              </td>

              <td>
                <span
                  className={`depression-status ${run.status}`}
                >
                  {statusLabel(run.status)}
                </span>
              </td>

              {METRIC_COLUMNS.map((metric) => (
                <td key={metric.key}>
                  {formatMetric(
                    run.metrics?.[metric.key]
                  )}
                </td>
              ))}

              <td>
                {run.training?.best_epoch ??
                  "Not available"}
              </td>

              <td>
                {formatDuration(
                  run.training?.training_time_seconds
                )}
              </td>

              <td>
                {formatPercentage(
                  run.token_information
                    ?.truncation_percentage
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImprovementTable({ runs }) {
  const comparisons = MODEL_ORDER.map(
    (modelKey) => {
      const baseline = findRun(
        runs,
        modelKey,
        "baseline"
      );

      const fineTuned = findRun(
        runs,
        modelKey,
        "fine-tuned"
      );

      const metricDeltas = {};

      METRIC_COLUMNS.forEach((metric) => {
        const baselineValue =
          baseline?.metrics?.[metric.key];

        const fineTunedValue =
          fineTuned?.metrics?.[metric.key];

        metricDeltas[metric.key] =
          isNumber(baselineValue) &&
          isNumber(fineTunedValue)
            ? fineTunedValue - baselineValue
            : null;
      });

      return {
        model:
          fineTuned?.model ||
          baseline?.model ||
          modelKey,
        status:
          baseline?.status === "completed" &&
          fineTuned?.status === "completed"
            ? "comparable"
            : "unavailable",
        deltas: metricDeltas,
      };
    }
  );

  return (
    <div className="depression-table-wrapper">
      <table className="depression-results-table">
        <thead>
          <tr>
            <th>Model</th>
            <th>Comparison availability</th>

            {METRIC_COLUMNS.map((metric) => (
              <th key={metric.key}>
                Δ {metric.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {comparisons.map((comparison) => (
            <tr key={comparison.model}>
              <td>
                <strong>{comparison.model}</strong>
              </td>

              <td>
                {comparison.status === "comparable"
                  ? "Baseline and fine-tuned available"
                  : "Complete pair unavailable"}
              </td>

              {METRIC_COLUMNS.map((metric) => {
                const delta =
                  comparison.deltas[metric.key];

                let className = "";

                if (isNumber(delta)) {
                  if (delta > 0) {
                    className = "positive-delta";
                  } else if (delta < 0) {
                    className = "negative-delta";
                  }
                }

                return (
                  <td
                    className={className}
                    key={metric.key}
                  >
                    {formatDelta(delta)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FindingsPanel({ runs }) {
  const findings = [];

  MODEL_ORDER.forEach((modelKey) => {
    const baseline = findRun(
      runs,
      modelKey,
      "baseline"
    );

    const fineTuned = findRun(
      runs,
      modelKey,
      "fine-tuned"
    );

    const modelName =
      fineTuned?.model ||
      baseline?.model ||
      modelKey;

    const baselinePRAUC =
      baseline?.metrics?.pr_auc;

    const fineTunedPRAUC =
      fineTuned?.metrics?.pr_auc;

    if (
      isNumber(baselinePRAUC) &&
      isNumber(fineTunedPRAUC)
    ) {
      const difference =
        fineTunedPRAUC - baselinePRAUC;

      if (difference > 0) {
        findings.push({
          title: `${modelName} improved after fine-tuning`,
          text:
            `PR-AUC increased from ` +
            `${baselinePRAUC.toFixed(3)} to ` +
            `${fineTunedPRAUC.toFixed(3)}, an absolute ` +
            `improvement of ${difference.toFixed(3)}.`,
          tone: "positive",
        });
      } else if (difference < 0) {
        findings.push({
          title: `${modelName} did not improve in PR-AUC`,
          text:
            `PR-AUC changed from ` +
            `${baselinePRAUC.toFixed(3)} to ` +
            `${fineTunedPRAUC.toFixed(3)}, an absolute ` +
            `change of ${difference.toFixed(3)}.`,
          tone: "negative",
        });
      } else {
        findings.push({
          title: `${modelName} produced equal PR-AUC`,
          text:
            `Both approaches produced a PR-AUC of ` +
            `${fineTunedPRAUC.toFixed(3)}.`,
          tone: "neutral",
        });
      }
    } else {
      findings.push({
        title: `${modelName} comparison is incomplete`,
        text:
          "A complete baseline and fine-tuned result pair " +
          "was not available, so an improvement value was " +
          "not calculated.",
        tone: "neutral",
      });
    }
  });

  return (
    <div className="depression-findings-grid">
      {findings.map((finding) => (
        <article
          className={`depression-finding ${finding.tone}`}
          key={finding.title}
        >
          <span />
          <div>
            <h3>{finding.title}</h3>
            <p>{finding.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function FigureGallery({ runs }) {
  const availableRuns = runs.filter(
    (run) => run.figures?.length > 0
  );

  const [selectedRunKey, setSelectedRunKey] =
    useState("");

  useEffect(() => {
    if (
      availableRuns.length > 0 &&
      !selectedRunKey
    ) {
      const preferredRun =
        availableRuns.find(
          (run) =>
            run.model_key ===
              "clinical-longformer" &&
            run.stage === "fine-tuned"
        ) || availableRuns[0];

      setSelectedRunKey(
        `${preferredRun.model_key}:${preferredRun.stage}`
      );
    }
  }, [availableRuns, selectedRunKey]);

  const selectedRun =
    availableRuns.find(
      (run) =>
        `${run.model_key}:${run.stage}` ===
        selectedRunKey
    ) || availableRuns[0];

  if (!selectedRun) {
    return (
      <div className="depression-empty-state">
        No depression figures were found. Run the data
        preparation script again after confirming that the
        model output folders contain PNG files.
      </div>
    );
  }

  return (
    <>
      <div className="depression-gallery-controls">
        <label htmlFor="depression-run-select">
          Select model output
        </label>

        <select
          id="depression-run-select"
          value={selectedRunKey}
          onChange={(event) =>
            setSelectedRunKey(event.target.value)
          }
        >
          {availableRuns.map((run) => {
            const key =
              `${run.model_key}:${run.stage}`;

            return (
              <option key={key} value={key}>
                {run.model} —{" "}
                {run.stage === "fine-tuned"
                  ? "Fine-tuned"
                  : "Baseline"}
              </option>
            );
          })}
        </select>
      </div>

      <div className="depression-figure-gallery">
        {selectedRun.figures.map((figure) => (
          <figure
            className="depression-figure-card"
            key={figure.url}
          >
            <div className="depression-figure-heading">
              <div>
                <span>
                  {selectedRun.model} ·{" "}
                  {selectedRun.stage === "fine-tuned"
                    ? "Fine-tuned"
                    : "Baseline"}
                </span>
                <h3>{figure.title}</h3>
              </div>

              <a
                href={figure.url}
                target="_blank"
                rel="noreferrer"
              >
                Open full size
              </a>
            </div>

            <img
              src={figure.url}
              alt={
                `${figure.title} for ` +
                `${selectedRun.model} ` +
                `${selectedRun.stage}`
              }
              loading="lazy"
            />

            <figcaption>
              {figure.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}

function DepressionModels() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadResults() {
      try {
        const response = await fetch(
          "/dashboard_data/depression/results.json"
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load depression results (${response.status}).`
          );
        }

        const result = await response.json();

        if (active) {
          setData(result);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadResults();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const runs = data?.runs || [];

    const completedRuns = runs.filter(
      (run) => run.status === "completed"
    );

    const fineTunedRuns = completedRuns.filter(
      (run) =>
        run.stage === "fine-tuned" &&
        isNumber(run.metrics?.pr_auc)
    );

    const baselineRuns = completedRuns.filter(
      (run) =>
        run.stage === "baseline" &&
        isNumber(run.metrics?.pr_auc)
    );

    const bestFineTuned =
      fineTunedRuns.length > 0
        ? [...fineTunedRuns].sort(
            (a, b) =>
              b.metrics.pr_auc -
              a.metrics.pr_auc
          )[0]
        : null;

    const bestBaseline =
      baselineRuns.length > 0
        ? [...baselineRuns].sort(
            (a, b) =>
              b.metrics.pr_auc -
              a.metrics.pr_auc
          )[0]
        : null;

    const improvements = MODEL_ORDER.map(
      (modelKey) => {
        const baseline = findRun(
          runs,
          modelKey,
          "baseline"
        );

        const fineTuned = findRun(
          runs,
          modelKey,
          "fine-tuned"
        );

        if (
          !isNumber(baseline?.metrics?.pr_auc) ||
          !isNumber(fineTuned?.metrics?.pr_auc)
        ) {
          return null;
        }

        return {
          model: fineTuned.model,
          improvement:
            fineTuned.metrics.pr_auc -
            baseline.metrics.pr_auc,
        };
      }
    ).filter(Boolean);

    const largestImprovement =
      improvements.length > 0
        ? [...improvements].sort(
            (a, b) =>
              b.improvement - a.improvement
          )[0]
        : null;

    return {
      completedRuns: completedRuns.length,
      bestFineTuned,
      bestBaseline,
      largestImprovement,
    };
  }, [data]);

  if (loading) {
    return (
      <main className="page-content depression-page">
        <div className="depression-loading">
          Loading depression model results…
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="page-content depression-page">
        <section className="depression-error">
          <h1>Depression results are unavailable</h1>

          <p>{error}</p>

          <p>
            Run the following command from your project
            root and refresh the browser:
          </p>

          <code>
            python
            dashboard/scripts/prepare_depression_dashboard.py
          </code>
        </section>
      </main>
    );
  }

  const runs = data.runs || [];

  return (
    <main className="page-content depression-page">
      <section className="depression-hero">
        <div>
          <span className="depression-eyebrow">
            Depression model benchmarking
          </span>

          <h1>
            Baseline and fine-tuned model results
          </h1>

          <p>
            This page presents the depression-detection
            results for ClinicalBERT, RoBERTa, DeBERTa and
            Clinical Longformer. It compares frozen-encoder
            baselines with fully fine-tuned models using
            test-set metrics, training information and
            notebook-generated visualisations.
          </p>
        </div>

        <aside>
          <span>Primary evaluation metric</span>
          <strong>PR-AUC</strong>
          <p>
            PR-AUC was prioritised because it provides an
            informative summary of performance when the
            positive and control classes are imbalanced.
          </p>
        </aside>
      </section>

      <section className="depression-section">
        <div className="depression-section-heading">
          <div>
            <span className="depression-kicker">
              Results overview
            </span>
            <h2>Principal depression findings</h2>
          </div>

          <p>
            Summary cards are generated directly from the
            completed model output files.
          </p>
        </div>

        <div className="depression-metric-grid">
          <MetricCard
            label="Best fine-tuned PR-AUC"
            value={formatMetric(
              summary.bestFineTuned?.metrics?.pr_auc
            )}
            description={
              summary.bestFineTuned
                ? `Achieved by ${summary.bestFineTuned.model}.`
                : "No completed fine-tuned result was found."
            }
            tone="blue"
          />

          <MetricCard
            label="Best baseline PR-AUC"
            value={formatMetric(
              summary.bestBaseline?.metrics?.pr_auc
            )}
            description={
              summary.bestBaseline
                ? `Achieved by ${summary.bestBaseline.model}.`
                : "No completed baseline result was found."
            }
            tone="slate"
          />

          <MetricCard
            label="Largest PR-AUC change"
            value={formatDelta(
              summary.largestImprovement?.improvement
            )}
            description={
              summary.largestImprovement
                ? `${summary.largestImprovement.model}, fine-tuned minus baseline.`
                : "No complete comparison pair was found."
            }
            tone="green"
          />

          <MetricCard
            label="Completed runs"
            value={`${summary.completedRuns}/${runs.length}`}
            description="Model runs containing final test metrics."
            tone="orange"
          />
        </div>
      </section>

      <section className="depression-section">
        <div className="depression-section-heading">
          <div>
            <span className="depression-kicker">
              Performance comparison
            </span>
            <h2>Impact of fine-tuning</h2>
          </div>

          <p>
            Exact values are displayed beside every bar.
            Missing or incomplete experiments are left blank
            instead of being estimated.
          </p>
        </div>

        <div className="depression-chart-grid">
          <ComparisonChart
            runs={runs}
            metricKey="pr_auc"
            title="Test PR-AUC"
          />

          <ComparisonChart
            runs={runs}
            metricKey="f1"
            title="Test F1 score"
          />
        </div>
      </section>

      <section className="depression-section">
        <div className="depression-section-heading">
          <div>
            <span className="depression-kicker">
              Complete evaluation
            </span>
            <h2>Depression test-set results</h2>
          </div>

          <p>
            Metrics are read from each experiment’s
            metrics.json file, while training and truncation
            information is read from the accompanying CSV
            outputs.
          </p>
        </div>

        <ResultsTable runs={runs} />
      </section>

      <section className="depression-section">
        <div className="depression-section-heading">
          <div>
            <span className="depression-kicker">
              Absolute metric changes
            </span>
            <h2>Fine-tuned minus baseline</h2>
          </div>

          <p>
            Positive values indicate improvement after
            fine-tuning. Negative values indicate that the
            baseline achieved the higher result for that
            metric.
          </p>
        </div>

        <ImprovementTable runs={runs} />
      </section>

      <section className="depression-section">
        <div className="depression-section-heading">
          <div>
            <span className="depression-kicker">
              Interpretation
            </span>
            <h2>Model-level findings</h2>
          </div>

          <p>
            These statements are generated from the measured
            PR-AUC values rather than manually entered
            conclusions.
          </p>
        </div>

        <FindingsPanel runs={runs} />
      </section>

      <section className="depression-section">
        <div className="depression-section-heading">
          <div>
            <span className="depression-kicker">
              Notebook outputs
            </span>
            <h2>Training and evaluation figures</h2>
          </div>

          <p>
            Choose a model and training approach to inspect
            its figures. Images are displayed one after
            another at full page width without an internal
            scrolling container.
          </p>
        </div>

        <FigureGallery runs={runs} />
      </section>

      <section className="depression-notice">
        <strong>Interpretation notice</strong>
        <p>
          Results describe performance on the defined
          MIMIC-IV research cohort. They do not establish
          clinical diagnostic validity and should not be
          interpreted as treatment or diagnostic advice.
        </p>
      </section>
    </main>
  );
}

export default DepressionModels;