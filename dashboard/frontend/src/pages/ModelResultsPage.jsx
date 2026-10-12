import { useEffect, useMemo, useState } from "react";
import "./ModelResultsPage.css";

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
    "Shows the class balance across the train, validation and test splits.",

  "test_confusion_matrix.png":
    "Summarises correct and incorrect classifications on the held-out test set.",

  "test_roc_pr_curves.png":
    "Shows discrimination across possible thresholds using ROC and precision-recall curves.",

  "token_length_distribution.png":
    "Shows note lengths relative to the selected model context window.",

  "training_validation_accuracy_loss.png":
    "Shows training behaviour and possible divergence between training and validation performance.",

  "validation_metrics_by_epoch.png":
    "Shows how validation performance changed and supports best-checkpoint selection.",

  "validation_threshold_selection.png":
    "Shows how the decision threshold was selected using validation data.",
};

function isNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function formatScore(value, digits = 3) {
  return isNumber(value)
    ? value.toFixed(digits)
    : "—";
}

function formatDelta(value) {
  if (!isNumber(value)) {
    return "—";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(3)}`;
}

function formatPercent(value) {
  return isNumber(value)
    ? `${value.toFixed(2)}%`
    : "—";
}

function formatDuration(seconds) {
  if (!isNumber(seconds)) {
    return "—";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round(
    (seconds % 3600) / 60
  );

  return hours
    ? `${hours}h ${minutes}m`
    : `${minutes}m`;
}

function stageLabel(stage) {
  return stage === "Fine-tuned"
    ? "Full fine-tuning"
    : "Frozen encoder baseline";
}

function titleCase(value) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function SummaryCard({
  label,
  value,
  description,
  colour,
}) {
  return (
    <article
      className="model-summary-card"
      style={{
        "--summary-colour": colour,
      }}
    >
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{description}</span>
    </article>
  );
}

function StatusBadge({ status }) {
  const text =
    status === "complete"
      ? "Completed"
      : status === "missing"
        ? "Not available"
        : "Incomplete";

  return (
    <span
      className={`model-status model-status--${status}`}
    >
      {text}
    </span>
  );
}

function ComparisonChart({
  runs,
  metricKey,
  title,
}) {
  const modelData = MODEL_ORDER.map(
    (model) => ({
      model,

      baseline: runs.find(
        (run) =>
          run.model === model &&
          run.stage === "Baseline"
      ),

      fineTuned: runs.find(
        (run) =>
          run.model === model &&
          run.stage === "Fine-tuned"
      ),
    })
  );

  const barHeight = (value) =>
    isNumber(value)
      ? `${Math.max(
          0,
          Math.min(1, value)
        ) * 100}%`
      : "0%";

  return (
    <article className="model-chart-panel">
      <div className="model-chart-heading">
        <div>
          <p className="model-kicker">
            Baseline versus fine-tuning
          </p>

          <h3>{title}</h3>
        </div>

        <div className="model-chart-legend">
          <span>
            <i className="model-legend-baseline" />
            Baseline
          </span>

          <span>
            <i className="model-legend-finetuned" />
            Fine-tuned
          </span>
        </div>
      </div>

      <div className="model-vertical-chart">
        {modelData.map(
          ({
            model,
            baseline,
            fineTuned,
          }) => {
            const baselineValue =
              baseline?.metrics?.[metricKey];

            const fineTunedValue =
              fineTuned?.metrics?.[metricKey];

            return (
              <div
                className="model-chart-group"
                key={model}
              >
                <div className="model-chart-bars">
                  <div className="model-bar-column">
                    <span className="model-bar-value">
                      {formatScore(
                        baselineValue
                      )}
                    </span>

                    <div
                      className="model-bar model-bar--baseline"
                      style={{
                        height:
                          barHeight(
                            baselineValue
                          ),
                      }}
                      title={`${model} baseline: ${formatScore(
                        baselineValue
                      )}`}
                    />
                  </div>

                  <div className="model-bar-column">
                    <span className="model-bar-value">
                      {formatScore(
                        fineTunedValue
                      )}
                    </span>

                    <div
                      className="model-bar model-bar--finetuned"
                      style={{
                        height:
                          barHeight(
                            fineTunedValue
                          ),
                      }}
                      title={`${model} fine-tuned: ${formatScore(
                        fineTunedValue
                      )}`}
                    />
                  </div>
                </div>

                <span className="model-chart-model">
                  {model}
                </span>
              </div>
            );
          }
        )}
      </div>

      <p className="model-chart-scale">
        Score range: 0.00 to 1.00
      </p>
    </article>
  );
}

function ModelResultsPage({ task }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [
    selectedRunId,
    setSelectedRunId,
  ] = useState("");

  const taskTitle = titleCase(task);

  useEffect(() => {
    let active = true;

    setData(null);
    setError("");

    fetch(
      `/dashboard_data/${task}/results.json`,
      {
        cache: "no-store",
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `${taskTitle} dashboard data was not found. Run the preparation script first.`
          );
        }

        return response.json();
      })
      .then((payload) => {
        if (!active) {
          return;
        }

        setData(payload);

        const preferred =
          payload.runs.find(
            (run) =>
              run.model ===
                "Clinical Longformer" &&
              run.stage ===
                "Fine-tuned" &&
              run.figures?.length
          );

        const firstWithFigures =
          payload.runs.find(
            (run) =>
              run.figures?.length
          );

        setSelectedRunId(
          (
            preferred ||
            firstWithFigures
          )?.id || ""
        );
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.message
          );
        }
      });

    return () => {
      active = false;
    };
  }, [task, taskTitle]);

  const runs = data?.runs || [];

  const completeRuns = useMemo(
    () =>
      runs.filter(
        (run) =>
          run.status === "complete" &&
          run.metrics
      ),
    [runs]
  );

  const fineTunedRuns = useMemo(
    () =>
      completeRuns.filter(
        (run) =>
          run.stage === "Fine-tuned"
      ),
    [completeRuns]
  );

  const baselineRuns = useMemo(
    () =>
      completeRuns.filter(
        (run) =>
          run.stage === "Baseline"
      ),
    [completeRuns]
  );

  const bestFineTuned = useMemo(
    () =>
      [...fineTunedRuns].sort(
        (a, b) =>
          (b.metrics.prAuc ?? -1) -
          (a.metrics.prAuc ?? -1)
      )[0],
    [fineTunedRuns]
  );

  const bestBaseline = useMemo(
    () =>
      [...baselineRuns].sort(
        (a, b) =>
          (b.metrics.prAuc ?? -1) -
          (a.metrics.prAuc ?? -1)
      )[0],
    [baselineRuns]
  );

  const comparable = useMemo(
    () =>
      (
        data?.comparisons || []
      ).filter(
        (comparison) =>
          comparison.status ===
          "comparable"
      ),
    [data]
  );

  const largestGain = useMemo(
    () =>
      [...comparable]
        .filter(
          (comparison) =>
            isNumber(
              comparison.deltas
                ?.prAuc
            )
        )
        .sort(
          (a, b) =>
            b.deltas.prAuc -
            a.deltas.prAuc
        )[0],
    [comparable]
  );

  const selectedRun = runs.find(
    (run) =>
      run.id === selectedRunId
  );

  if (error) {
    return (
      <main className="page-content model-results-page">
        <section className="model-message model-message--error">
          <h1>
            {taskTitle} Models
          </h1>

          <p>{error}</p>

          <code>
            python
            dashboard/scripts/prepare_
            {task}_dashboard.py
          </code>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page-content model-results-page">
        <div className="model-message">
          Loading {task} model
          results…
        </div>
      </main>
    );
  }

  return (
    <main className="page-content model-results-page">
      <header className="model-results-hero">
        <div>
          <p className="model-hero-eyebrow">
            {taskTitle} model
            benchmarking
          </p>

          <h1>
            {taskTitle} - Baseline vs fine-tuned
            model results
          </h1>

          <p className="model-hero-copy">
            This page presents the{" "}
            {task}-detection results
            for ClinicalBERT, RoBERTa,
            DeBERTa and Clinical
            Longformer. It compares
            frozen-encoder baselines
            with fully fine-tuned
            models using test-set
            metrics, training
            information and
            notebook-generated
            visualisations.
          </p>
        </div>

        <div className="model-primary-card">
          <span>
            Primary evaluation metric
          </span>

          <strong>PR-AUC</strong>

          <p>
            PR-AUC was prioritised
            because it provides an
            informative summary when
            the {task}-positive and
            control classes are
            imbalanced.
          </p>
        </div>
      </header>

      <section className="model-section">
        <div className="model-section-heading">
          <div>
            <p className="model-kicker">
              Results overview
            </p>

            <h2>
              Principal {task} findings
            </h2>
          </div>

          <p>
            Summary cards are
            generated directly from
            the completed model output
            files.
          </p>
        </div>

        <div className="model-summary-grid">
          <SummaryCard
            label="Best fine-tuned PR-AUC"
            value={formatScore(
              bestFineTuned?.metrics
                ?.prAuc
            )}
            description={
              bestFineTuned
                ? `Achieved by ${bestFineTuned.model}.`
                : "No completed run."
            }
            colour="#2471dc"
          />

          <SummaryCard
            label="Best baseline PR-AUC"
            value={formatScore(
              bestBaseline?.metrics
                ?.prAuc
            )}
            description={
              bestBaseline
                ? `Achieved by ${bestBaseline.model}.`
                : "No completed baseline."
            }
            colour="#8ea0b5"
          />

          <SummaryCard
            label="Largest PR-AUC change"
            value={formatDelta(
              largestGain?.deltas
                ?.prAuc
            )}
            description={
              largestGain
                ? `${largestGain.model}, fine-tuned minus baseline.`
                : "No paired comparison."
            }
            colour="#22977d"
          />

          <SummaryCard
            label="Completed runs"
            value={`${completeRuns.length}/${runs.length}`}
            description="Model runs containing final test metrics."
            colour="#c77b2f"
          />
        </div>
      </section>

      <section className="model-section">
        <div className="model-section-heading">
          <div>
            <p className="model-kicker">
              Performance comparison
            </p>

            <h2>
              Impact of fine-tuning
            </h2>
          </div>

          <p>
            Exact values are
            displayed above every bar.
            Missing experiments are
            left blank.
          </p>
        </div>

        <div className="model-chart-grid">
          <ComparisonChart
            runs={runs}
            metricKey="prAuc"
            title="Test PR-AUC"
          />

          <ComparisonChart
            runs={runs}
            metricKey="f1"
            title="Test F1 score"
          />
        </div>
      </section>

      <section className="model-section">
        <div className="model-section-heading">
          <div>
            <p className="model-kicker">
              Complete evaluation
            </p>

            <h2>
              {taskTitle} test-set
              results
            </h2>
          </div>

          <p>
            PR-AUC is the primary
            metric; the remaining
            metrics provide
            complementary evidence.
          </p>
        </div>

        <div className="model-table-wrap">
          <table className="model-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>
                  Training approach
                </th>

                {TABLE_METRICS.map(
                  ([, label]) => (
                    <th key={label}>
                      {label}
                    </th>
                  )
                )}

                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>
                    <strong>
                      {run.model}
                    </strong>
                  </td>

                  <td>
                    {stageLabel(
                      run.stage
                    )}
                  </td>

                  {TABLE_METRICS.map(
                    ([key]) => (
                      <td key={key}>
                        {formatScore(
                          run.metrics
                            ?.[key]
                        )}
                      </td>
                    )
                  )}

                  <td>
                    <StatusBadge
                      status={
                        run.status
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="model-table-note">
          “Not available” is not a
          zero score. It indicates
          that a comparable saved run
          or usable evaluation
          artifact was unavailable.
        </p>
      </section>

      <section className="model-section">
        <div className="model-section-heading">
          <div>
            <p className="model-kicker">
              Absolute metric changes
            </p>

            <h2>
              Fine-tuned minus
              baseline
            </h2>
          </div>

          <p>
            Positive values indicate
            improvement; negative
            values favour the frozen
            baseline.
          </p>
        </div>

        <div className="model-table-wrap">
          <table className="model-table model-delta-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>
                  Comparison
                  availability
                </th>
                <th>Δ PR-AUC</th>
                <th>Δ ROC-AUC</th>
                <th>Δ F1</th>
                <th>
                  Δ balanced accuracy
                </th>
                <th>Δ accuracy</th>
                <th>Δ precision</th>
                <th>Δ recall</th>
                <th>Δ specificity</th>
              </tr>
            </thead>

            <tbody>
              {(
                data.comparisons || []
              ).map((comparison) => (
                <tr
                  key={
                    comparison.model
                  }
                >
                  <td>
                    <strong>
                      {
                        comparison.model
                      }
                    </strong>
                  </td>

                  <td>
                    {comparison.status ===
                    "comparable"
                      ? "Baseline and fine-tuned available"
                      : "Paired comparison unavailable"}
                  </td>

                  {[
                    "prAuc",
                    "rocAuc",
                    "f1",
                    "balancedAccuracy",
                    "accuracy",
                    "precision",
                    "recall",
                    "specificity",
                  ].map((key) => {
                    const value =
                      comparison.deltas
                        ?.[key];

                    const className =
                      isNumber(value)
                        ? value > 0
                          ? "metric-positive"
                          : value < 0
                            ? "metric-negative"
                            : ""
                        : "";

                    return (
                      <td
                        className={
                          className
                        }
                        key={key}
                      >
                        {formatDelta(
                          value
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="model-section">
        <div className="model-section-heading">
          <div>
            <p className="model-kicker">
              Training context
            </p>

            <h2>
              Validation, runtime and
              truncation
            </h2>
          </div>

          <p>
            These values explain
            checkpoint selection,
            computational cost and
            retained text.
          </p>
        </div>

        <div className="model-table-wrap">
          <table className="model-table model-training-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Approach</th>
                <th>
                  Best validation
                  epoch
                </th>
                <th>
                  Best validation
                  PR-AUC
                </th>
                <th>
                  Best validation
                  accuracy
                </th>
                <th>Final epoch</th>
                <th>Training time</th>
                <th>
                  Test truncation
                </th>
                <th>Max tokens</th>
              </tr>
            </thead>

            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>
                    <strong>
                      {run.model}
                    </strong>
                  </td>

                  <td>
                    {stageLabel(
                      run.stage
                    )}
                  </td>

                  <td>
                    {run.training
                      ?.bestEpoch ??
                      "—"}
                  </td>

                  <td>
                    {formatScore(
                      run.training
                        ?.bestValidationPrAuc
                    )}
                  </td>

                  <td>
                    {formatScore(
                      run.training
                        ?.bestValidationAccuracy
                    )}
                  </td>

                  <td>
                    {run.training
                      ?.finalEpoch ??
                      "—"}
                  </td>

                  <td>
                    {formatDuration(
                      run.training
                        ?.trainingSeconds
                    )}
                  </td>

                  <td>
                    {formatPercent(
                      run.truncation
                        ?.testPercentage
                    )}
                  </td>

                  <td>
                    {run.truncation
                      ?.selectedMaxLength ??
                      "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="model-section">
        <div className="model-section-heading">
          <div>
            <p className="model-kicker">
              Interpretation
            </p>

            <h2>
              Model-level findings
            </h2>
          </div>

          <p>
            Statements are generated
            from measured PR-AUC
            values rather than
            manually entered
            conclusions.
          </p>
        </div>

        <div className="model-findings-grid">
          {(
            data.comparisons || []
          ).map((comparison) => {
            const baseline = runs.find(
              (run) =>
                run.id ===
                comparison.baselineRunId
            );

            const fineTuned =
              runs.find(
                (run) =>
                  run.id ===
                  comparison.fineTunedRunId
              );

            const delta =
              comparison.deltas
                ?.prAuc;

            let title =
              `${comparison.model}: paired comparison unavailable`;

            let description =
              "A conclusion about improvement was not generated because both model stages were not available.";

            if (
              comparison.status ===
                "comparable" &&
              isNumber(delta)
            ) {
              title =
                delta >= 0
                  ? `${comparison.model} improved after fine-tuning`
                  : `${comparison.model} performed better as a baseline`;

              description =
                `PR-AUC changed from ${formatScore(
                  baseline?.metrics
                    ?.prAuc
                )} to ${formatScore(
                  fineTuned?.metrics
                    ?.prAuc
                )}, an absolute change of ${formatDelta(
                  delta
                )}.`;
            }

            return (
              <article
                key={
                  comparison.model
                }
              >
                <i />

                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="model-section">
        <div className="model-section-heading">
          <div>
            <p className="model-kicker">
              Notebook outputs
            </p>

            <h2>
              Training and evaluation
              figures
            </h2>
          </div>

          <p>
            Choose a model output.
            Figures are displayed one
            after another at full page
            width.
          </p>
        </div>

        <div className="model-output-selector">
          <label
            htmlFor={`${task}-model-output`}
          >
            Select model output
          </label>

          <select
            id={`${task}-model-output`}
            value={selectedRunId}
            onChange={(event) =>
              setSelectedRunId(
                event.target.value
              )
            }
          >
            {runs
              .filter(
                (run) =>
                  run.figures?.length
              )
              .map((run) => (
                <option
                  value={run.id}
                  key={run.id}
                >
                  {run.model} —{" "}
                  {run.stage}
                </option>
              ))}
          </select>
        </div>

        {selectedRun?.figures
          ?.length ? (
          <div className="model-figure-list">
            {selectedRun.figures.map(
              (figure) => (
                <figure
                  className="model-figure-card"
                  key={figure.url}
                >
                  <figcaption>
                    <div>
                      <span>
                        {
                          selectedRun.model
                        }{" "}
                        ·{" "}
                        {
                          selectedRun.stage
                        }
                      </span>

                      <strong>
                        {figure.label}
                      </strong>
                    </div>

                    <a
                      href={figure.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open full size
                    </a>
                  </figcaption>

                  <a
                    className="model-figure-image"
                    href={figure.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={figure.url}
                      alt={`${selectedRun.model}: ${figure.label}`}
                    />
                  </a>

                  <p>
                    {FIGURE_NOTES[
                      figure.name
                    ] ||
                      "Saved visual output from the completed notebook run."}
                  </p>
                </figure>
              )
            )}
          </div>
        ) : (
          <div className="model-message">
            No saved PNG figures were
            found for this model run.
          </div>
        )}
      </section>

      <aside className="model-research-notice">
        <strong>
          Research-use notice:
        </strong>{" "}
        These outputs indicate
        patterns found in clinical
        text. They do not provide a
        clinical diagnosis and should
        not replace professional
        assessment.
      </aside>
    </main>
  );
}

export default ModelResultsPage;