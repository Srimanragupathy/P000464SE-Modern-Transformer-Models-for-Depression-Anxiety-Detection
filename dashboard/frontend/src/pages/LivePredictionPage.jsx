import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchPredictionModels,
  predictWithModel,
} from "../api";

import "./LivePredictionPage.css";


const FALLBACK_MODELS = [
  {
    key: "clinicalbert",
    name: "ClinicalBERT",
    tag: "Clinical language",
    description:
      "Clinical-domain BERT with a compact 512-token context window.",
    context_length: 512,
    truncation: {
      depression: 89.18,
      anxiety: 88.75,
    },
    metrics: {
      depression: {
        pr_auc: 0.696,
        f1: 0.689,
        recall: 0.716,
      },
      anxiety: {
        pr_auc: 0.611,
        f1: 0.590,
        recall: 0.600,
      },
    },
    ready: true,
  },
  {
    key: "roberta",
    name: "RoBERTa",
    tag: "General transformer",
    description:
      "A general-language transformer adapted to the two clinical tasks.",
    context_length: 512,
    truncation: {
      depression: 91.48,
      anxiety: 91.15,
    },
    metrics: {
      depression: {
        pr_auc: 0.690,
        f1: 0.680,
        recall: 0.687,
      },
      anxiety: {
        pr_auc: 0.590,
        f1: 0.580,
        recall: 0.598,
      },
    },
    ready: true,
  },
  {
    key: "deberta",
    name: "DeBERTa",
    tag: "Best 512-token option",
    description:
      "The strongest short-context model in the final comparison.",
    context_length: 512,
    truncation: {
      depression: 82.80,
      anxiety: 82.25,
    },
    metrics: {
      depression: {
        pr_auc: 0.731,
        f1: 0.696,
        recall: 0.764,
      },
      anxiety: {
        pr_auc: 0.640,
        f1: 0.614,
        recall: 0.654,
      },
    },
    ready: true,
  },
  {
    key: "clinical_longformer",
    name: "Clinical Longformer",
    tag: "Best overall",
    description:
      "Long-context clinical transformer with the strongest final test performance.",
    context_length: 2048,
    truncation: {
      depression: 9.43,
      anxiety: 9.04,
    },
    metrics: {
      depression: {
        pr_auc: 0.785,
        f1: 0.730,
        recall: 0.818,
      },
      anxiety: {
        pr_auc: 0.713,
        f1: 0.657,
        recall: 0.712,
      },
    },
    ready: true,
  },
];


const SAMPLE_NOTE = `PAST MEDICAL HISTORY:
Hypertension, type 2 diabetes, coronary artery disease and chronic kidney disease.

CHIEF COMPLAINT:
Reduced appetite, poor sleep and increasing social withdrawal.

HISTORY OF PRESENT ILLNESS:
The patient reports persistent low mood, reduced energy and difficulty concentrating over recent weeks. Family members report that the patient has stopped attending usual social activities.

MEDICATIONS ON ADMISSION:
Metformin, atorvastatin and metoprolol.

BRIEF HOSPITAL COURSE:
The patient remained medically stable. Follow-up with the general practitioner and community mental health team was recommended.`;


function percent(value, digits = 1) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "N/A";
  }

  return `${(numericValue * 100).toFixed(
    digits
  )}%`;
}


function formatNumber(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "N/A";
  }

  return Math.round(
    numericValue
  ).toLocaleString();
}


function estimateTokens(text) {
  const cleaned = text.trim();

  if (!cleaned) {
    return 0;
  }

  const words = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .length;

  const punctuation = (
    cleaned.match(
      /[.,;:!?()[\]{}"'/-]/g
    ) || []
  ).length;

  return Math.ceil(
    words * 1.35
    + punctuation * 0.08
    + 2
  );
}


function getTokenStatistics(result) {
  const tokensUsed = Number(
    result?.tokens_used || 0
  );

  const tokensBefore = Number(
    result?.tokens_before_truncation
    ?? tokensUsed
  );

  const tokensOmitted = Number(
    result?.tokens_omitted
    ?? Math.max(
      0,
      tokensBefore - tokensUsed
    )
  );

  const truncationPercentage =
    Number.isFinite(
      Number(
        result?.truncation_percentage
      )
    )
      ? Number(
          result.truncation_percentage
        )
      : tokensBefore > 0
        ? (
            tokensOmitted
            / tokensBefore
            * 100
          )
        : 0;

  return {
    tokensUsed,
    tokensBefore,
    tokensOmitted,
    truncationPercentage,
    truncated:
      Boolean(result?.truncated)
      || tokensOmitted > 0,
  };
}


function ModelMetricRow({
  title,
  metrics,
}) {
  return (
    <div className="lp-model-metric-row">
      <span>{title}</span>

      <strong>
        PR-AUC{" "}
        {Number(
          metrics.pr_auc
        ).toFixed(3)}
      </strong>

      <span>
        F1{" "}
        {Number(
          metrics.f1
        ).toFixed(3)}
      </span>
    </div>
  );
}


function ModelCard({
  model,
  selected,
  onSelect,
}) {
  return (
    <button
      type="button"
      className={`lp-model-card ${
        selected
          ? "is-selected"
          : ""
      }`}
      onClick={() =>
        onSelect(model.key)
      }
      disabled={!model.ready}
      aria-pressed={selected}
    >
      <div className="lp-model-card-top">
        <div>
          <span className="lp-model-tag">
            {model.tag}
          </span>

          <h3>{model.name}</h3>
        </div>

        <span
          className="lp-radio"
          aria-hidden="true"
        >
          <span />
        </span>
      </div>

      <p>{model.description}</p>

      <div className="lp-context-line">
        <span>
          Reads up to{" "}
          {Number(
            model.context_length
          ).toLocaleString()}{" "}
          tokens
        </span>

        <span>
          {model.ready
            ? "Ready"
            : "Checkpoint missing"}
        </span>
      </div>

      <div className="lp-model-metrics">
        <ModelMetricRow
          title="Depression"
          metrics={
            model.metrics.depression
          }
        />

        <ModelMetricRow
          title="Anxiety"
          metrics={
            model.metrics.anxiety
          }
        />
      </div>

      <div className="lp-model-limit">
        <strong>
          Long-note limitation:
        </strong>{" "}
        During testing,{" "}
        {Number(
          model.truncation.depression
        ).toFixed(2)}
        % of depression notes and{" "}
        {Number(
          model.truncation.anxiety
        ).toFixed(2)}
        % of anxiety notes were longer
        than this model could read
        completely.
      </div>
    </button>
  );
}


function TokenLimitGuide({
  model,
  note,
}) {
  const tokenLimit = Number(
    model?.context_length || 512
  );

  const estimatedTokens =
    estimateTokens(note);

  const usagePercentage =
    tokenLimit > 0
      ? (
          estimatedTokens
          / tokenLimit
          * 100
        )
      : 0;

  let state = "safe";
  let title =
    "The note is likely within the model limit.";

  let explanation =
    "The selected model is expected to analyse the complete prepared note.";

  if (!note.trim()) {
    state = "empty";
    title =
      "Enter a note to check its approximate length.";

    explanation =
      "The dashboard will provide an early warning before prediction.";
  } else if (usagePercentage > 100) {
    state = "over";
    title =
      "Part of this note may not be analysed.";

    explanation =
      "The note appears longer than the selected model can read. Text at the end may be omitted.";
  } else if (usagePercentage >= 80) {
    state = "near";
    title =
      "The note is approaching the model limit.";

    explanation =
      "The note may fit, but clinical words can be divided into several tokens.";
  }

  const barWidth = Math.min(
    100,
    Math.max(
      0,
      usagePercentage
    )
  );

  return (
    <div
      className={`lp-token-guide lp-token-guide-${state}`}
      role="status"
    >
      <div className="lp-token-guide-header">
        <span className="lp-token-icon">
          {state === "over"
            || state === "near"
            ? "!"
            : "i"}
        </span>

        <div>
          <h3>
            How much of the note can
            this model read?
          </h3>

          <p>
            <strong>{model?.name}</strong>{" "}
            accepts up to{" "}
            <strong>
              {tokenLimit.toLocaleString()}{" "}
              tokens
            </strong>
            .
          </p>
        </div>
      </div>

      <div className="lp-token-explanation">
        <p>
          A <strong>token</strong> is
          a word or part of a word. It
          is not the same as a character
          or an exact word count.
        </p>

        <p>
          If the prepared note is too
          long, the model reads the
          beginning and ignores the
          remaining text at the end.
        </p>
      </div>

      <div className="lp-token-meter-labels">
        <span>
          Approximate note length:{" "}
          <strong>
            {estimatedTokens.toLocaleString()}{" "}
            tokens
          </strong>
        </span>

        <span>
          Model limit:{" "}
          <strong>
            {tokenLimit.toLocaleString()}{" "}
            tokens
          </strong>
        </span>
      </div>

      <div className="lp-token-meter">
        <span
          style={{
            width: `${barWidth}%`,
          }}
        />
      </div>

      <div className="lp-token-message">
        <strong>{title}</strong>
        <span>{explanation}</span>
      </div>

      <small>
        This is an approximate warning
        based on the pasted note. The
        exact token count is shown after
        prediction.
      </small>
    </div>
  );
}


function ProbabilityResult({
  title,
  result,
  colour,
}) {
  const probability = Math.max(
    0,
    Math.min(
      100,
      Number(
        result?.percentage || 0
      )
    )
  );

  const statistics =
    getTokenStatistics(result);

  return (
    <article
      className="lp-result-card"
      style={{
        "--result-colour": colour,
      }}
    >
      <div className="lp-result-heading">
        <div>
          <span className="lp-result-eyebrow">
            {title} model
          </span>

          <h3>
            {probability.toFixed(1)}%
          </h3>
        </div>

        <span
          className={`lp-status ${
            result.above_threshold
              ? "is-positive"
              : ""
          }`}
        >
          {result.above_threshold
            ? "Above threshold"
            : "Below threshold"}
        </span>
      </div>

      <div
        className="lp-probability-track"
        aria-label={`${title} probability ${probability.toFixed(
          1
        )}%`}
      >
        <span
          style={{
            width: `${probability}%`,
          }}
        />
      </div>

      <dl className="lp-result-details">
        <div>
          <dt>Model threshold</dt>
          <dd>
            {percent(
              result.threshold
            )}
          </dd>
        </div>

        <div>
          <dt>Prepared-note tokens</dt>
          <dd>
            {formatNumber(
              statistics.tokensBefore
            )}
          </dd>
        </div>

        <div>
          <dt>Tokens analysed</dt>
          <dd>
            {formatNumber(
              statistics.tokensUsed
            )}
          </dd>
        </div>

        <div>
          <dt>Tokens omitted</dt>
          <dd
            className={
              statistics.truncated
                ? "lp-red-value"
                : ""
            }
          >
            {formatNumber(
              statistics.tokensOmitted
            )}
          </dd>
        </div>
      </dl>

      <p className="lp-result-label">
        {result.predicted_label}
      </p>

      {statistics.truncated ? (
        <div className="lp-truncated-warning">
          <strong>
            Some of the note was not
            analysed
          </strong>

          <p>
            The model analysed the first{" "}
            {formatNumber(
              statistics.tokensUsed
            )}{" "}
            of{" "}
            {formatNumber(
              statistics.tokensBefore
            )}{" "}
            tokens. The final{" "}
            {formatNumber(
              statistics.tokensOmitted
            )}{" "}
            tokens (
            {statistics
              .truncationPercentage
              .toFixed(1)}
            %) did not influence this
            prediction.
          </p>

          {result
            .omitted_text_preview && (
            <details className="lp-omitted-text">
              <summary>
                View a preview of the
                text that was not
                analysed
              </summary>

              <div>
                {
                  result
                    .omitted_text_preview
                }

                {result
                  .omitted_preview_is_partial && (
                  <small>
                    Only the beginning
                    of the omitted text
                    is displayed.
                  </small>
                )}
              </div>
            </details>
          )}
        </div>
      ) : (
        <div className="lp-complete-message">
          <strong>
            Complete prepared note
            analysed
          </strong>

          <span>
            No text was removed because
            of the model's token limit.
          </span>
        </div>
      )}
    </article>
  );
}


export default function LivePredictionPage() {
  const [
    models,
    setModels,
  ] = useState(FALLBACK_MODELS);

  const [
    selectedModel,
    setSelectedModel,
  ] = useState(
    "clinical_longformer"
  );

  const [
    note,
    setNote,
  ] = useState("");

  const [
    result,
    setResult,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    catalogWarning,
    setCatalogWarning,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let active = true;

    fetchPredictionModels()
      .then((payload) => {
        if (
          !active
          || !Array.isArray(
            payload.models
          )
          || payload.models.length === 0
        ) {
          return;
        }

        setModels(payload.models);

        const longformer =
          payload.models.find(
            (item) =>
              item.key
              === "clinical_longformer"
              && item.ready
          );

        if (longformer) {
          setSelectedModel(
            longformer.key
          );
        } else {
          const firstReady =
            payload.models.find(
              (item) => item.ready
            );

          if (firstReady) {
            setSelectedModel(
              firstReady.key
            );
          }
        }

        setCatalogWarning("");
      })
      .catch(() => {
        if (active) {
          setCatalogWarning(
            "The Flask server could not be reached. Saved model information is shown, but predictions require the backend server."
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedDetails = useMemo(
    () =>
      models.find(
        (item) =>
          item.key === selectedModel
      ) || models[0],
    [
      models,
      selectedModel,
    ]
  );

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    setError("");
    setResult(null);

    if (!note.trim()) {
      setError(
        "Enter a clinical note before running the prediction."
      );
      return;
    }

    setLoading(true);

    try {
      const payload =
        await predictWithModel(
          selectedModel,
          note.trim()
        );

      setResult(payload);
    } catch (requestError) {
      setError(
        requestError?.message
        || "Prediction failed. Confirm that the Flask server and model checkpoints are available."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearForm() {
    setNote("");
    setResult(null);
    setError("");
  }

  return (
    <main className="lp-page">
      <section className="lp-hero">
        <div>
          <span className="lp-kicker">
            Interactive research
            demonstration
          </span>

          <h1>
            Live mental-health risk
            prediction
          </h1>

          <p>
            Choose a fine-tuned
            transformer, enter a
            de-identified clinical note
            and compare the model's
            depression and anxiety
            probability estimates.
          </p>
        </div>

        <div className="lp-hero-note">
          <strong>Important</strong>

          <span>
            Use de-identified text only.
            Outputs are model estimates,
            not clinical diagnoses.
          </span>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-section-heading">
          <div>
            <span className="lp-step">
              Step 1
            </span>

            <h2>
              Select a fine-tuned model
            </h2>
          </div>

          <p>
            ClinicalBERT, RoBERTa and
            DeBERTa read up to 512
            tokens. Clinical Longformer
            reads up to 2,048 tokens.
          </p>
        </div>

        {catalogWarning && (
          <div className="lp-warning">
            {catalogWarning}
          </div>
        )}

        <div className="lp-model-grid">
          {models.map((model) => (
            <ModelCard
              key={model.key}
              model={model}
              selected={
                selectedModel
                === model.key
              }
              onSelect={(key) => {
                setSelectedModel(key);
                setResult(null);
                setError("");
              }}
            />
          ))}
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-section-heading">
          <div>
            <span className="lp-step">
              Step 2
            </span>

            <h2>
              Enter a clinical note
            </h2>
          </div>

          <p>
            The same note is evaluated
            for depression and anxiety
            using separate fine-tuned
            checkpoints.
          </p>
        </div>

        <TokenLimitGuide
          model={selectedDetails}
          note={note}
        />

        <form onSubmit={handleSubmit}>
          <div className="lp-textarea-wrap">
            <textarea
              value={note}
              onChange={(event) =>
                setNote(
                  event.target.value
                )
              }
              placeholder="Paste a de-identified discharge note here..."
              maxLength={50000}
              rows={14}
              disabled={loading}
            />

            <span className="lp-character-count">
              {note.length.toLocaleString()}{" "}
              / 50,000 characters
            </span>
          </div>

          <div className="lp-form-actions">
            <div className="lp-secondary-actions">
              <button
                type="button"
                className="lp-button lp-button-secondary"
                onClick={() =>
                  setNote(SAMPLE_NOTE)
                }
                disabled={loading}
              >
                Use synthetic example
              </button>

              <button
                type="button"
                className="lp-button lp-button-ghost"
                onClick={clearForm}
                disabled={
                  loading
                  || (
                    !note
                    && !result
                  )
                }
              >
                Clear
              </button>
            </div>

            <button
              type="submit"
              className="lp-button lp-button-primary"
              disabled={
                loading
                || !selectedDetails
                  ?.ready
              }
            >
              {loading
                ? "Running both task models…"
                : `Predict with ${
                    selectedDetails
                      ?.name
                    || "model"
                  }`}
            </button>
          </div>
        </form>

        {error && (
          <div
            className="lp-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {loading && (
          <div
            className="lp-loading"
            role="status"
          >
            <span />

            The first request can take
            longer while the depression
            and anxiety checkpoints are
            loaded.
          </div>
        )}
      </section>

      {result && (
        <section className="lp-section">
          <div className="lp-section-heading">
            <div>
              <span className="lp-step">
                Step 3
              </span>

              <h2>
                {result.model?.name}
                {" "}results
              </h2>
            </div>

            <p>
              Each task uses its own
              fine-tuned checkpoint and
              validation-selected
              threshold.
            </p>
          </div>

          <div className="lp-results-grid">
            <ProbabilityResult
              title="Depression"
              result={
                result.predictions
                  .depression
              }
              colour="#6956d9"
            />

            <ProbabilityResult
              title="Anxiety"
              result={
                result.predictions
                  .anxiety
              }
              colour="#0f9d8a"
            />
          </div>

          <div className="lp-disclaimer">
            <strong>
              Research-use disclaimer:
            </strong>{" "}
            {result.disclaimer}
          </div>
        </section>
      )}
    </main>
  );
}