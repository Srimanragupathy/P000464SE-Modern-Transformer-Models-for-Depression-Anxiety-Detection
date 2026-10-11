import { useEffect, useMemo, useState } from "react";
import { fetchPredictionModels, predictWithModel } from "../api";
import "./LivePredictionPage.css";


const FALLBACK_MODELS = [
  {
    key: "clinicalbert",
    name: "ClinicalBERT",
    tag: "Clinical language",
    description: "Clinical-domain BERT with a compact 512-token context window.",
    context_length: 512,
    truncation: { depression: 89.18, anxiety: 88.75 },
    metrics: {
      depression: { pr_auc: 0.696, f1: 0.689, recall: 0.716 },
      anxiety: { pr_auc: 0.611, f1: 0.590, recall: 0.600 },
    },
    ready: true,
  },
  {
    key: "roberta",
    name: "RoBERTa",
    tag: "General transformer",
    description: "A strong general-language transformer adapted to the two clinical tasks.",
    context_length: 512,
    truncation: { depression: 91.48, anxiety: 91.15 },
    metrics: {
      depression: { pr_auc: 0.690, f1: 0.680, recall: 0.687 },
      anxiety: { pr_auc: 0.590, f1: 0.580, recall: 0.598 },
    },
    ready: true,
  },
  {
    key: "deberta",
    name: "DeBERTa",
    tag: "Best 512-token option",
    description: "The strongest short-context model in the final comparison.",
    context_length: 512,
    truncation: { depression: 82.80, anxiety: 82.25 },
    metrics: {
      depression: { pr_auc: 0.731, f1: 0.696, recall: 0.764 },
      anxiety: { pr_auc: 0.640, f1: 0.614, recall: 0.654 },
    },
    ready: true,
  },
  {
    key: "clinical_longformer",
    name: "Clinical Longformer",
    tag: "Best overall",
    description: "Long-context clinical transformer with the strongest final test performance.",
    context_length: 2048,
    truncation: { depression: 9.43, anxiety: 9.04 },
    metrics: {
      depression: { pr_auc: 0.785, f1: 0.730, recall: 0.818 },
      anxiety: { pr_auc: 0.713, f1: 0.657, recall: 0.712 },
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
  return `${(Number(value || 0) * 100).toFixed(digits)}%`;
}


function ModelMetricRow({ title, metrics }) {
  return (
    <div className="lp-model-metric-row">
      <span>{title}</span>
      <strong>PR-AUC {metrics.pr_auc.toFixed(3)}</strong>
      <span>F1 {metrics.f1.toFixed(3)}</span>
    </div>
  );
}


function ModelCard({ model, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`lp-model-card ${selected ? "is-selected" : ""}`}
      onClick={() => onSelect(model.key)}
      disabled={!model.ready}
      aria-pressed={selected}
    >
      <div className="lp-model-card-top">
        <div>
          <span className="lp-model-tag">{model.tag}</span>
          <h3>{model.name}</h3>
        </div>
        <span className="lp-radio" aria-hidden="true">
          <span />
        </span>
      </div>
      <p>{model.description}</p>
      <div className="lp-context-line">
        <span>{model.context_length.toLocaleString()} token context</span>
        <span>{model.ready ? "Ready" : "Checkpoint missing"}</span>
      </div>
      <div className="lp-model-metrics">
        <ModelMetricRow title="Depression" metrics={model.metrics.depression} />
        <ModelMetricRow title="Anxiety" metrics={model.metrics.anxiety} />
      </div>
      <div className="lp-truncation-line">
        Test-note truncation: {model.truncation.depression.toFixed(2)}% depression ·{" "}
        {model.truncation.anxiety.toFixed(2)}% anxiety
      </div>
    </button>
  );
}


function ProbabilityResult({ title, result, colour }) {
  const probability = Math.max(0, Math.min(100, Number(result.percentage || 0)));
  return (
    <article className="lp-result-card" style={{ "--result-colour": colour }}>
      <div className="lp-result-heading">
        <div>
          <span className="lp-result-eyebrow">{title} model</span>
          <h3>{probability.toFixed(1)}%</h3>
        </div>
        <span className={`lp-status ${result.above_threshold ? "is-positive" : ""}`}>
          {result.above_threshold ? "Above threshold" : "Below threshold"}
        </span>
      </div>
      <div className="lp-probability-track" aria-label={`${title} probability ${probability.toFixed(1)}%`}>
        <span style={{ width: `${probability}%` }} />
      </div>
      <dl className="lp-result-details">
        <div>
          <dt>Model threshold</dt>
          <dd>{percent(result.threshold)}</dd>
        </div>
        <div>
          <dt>Tokens used</dt>
          <dd>{result.tokens_used.toLocaleString()} / {result.maximum_length.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Input handling</dt>
          <dd>{result.truncated ? "Truncated" : "Not truncated"}</dd>
        </div>
      </dl>
      <p className="lp-result-label">{result.predicted_label}</p>
    </article>
  );
}


export default function LivePrediction() {
  const [models, setModels] = useState(FALLBACK_MODELS);
  const [selectedModel, setSelectedModel] = useState("clinical_longformer");
  const [note, setNote] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [catalogWarning, setCatalogWarning] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchPredictionModels()
      .then((payload) => {
        if (!active || !Array.isArray(payload.models)) return;
        setModels(payload.models);
        const current = payload.models.find((item) => item.key === selectedModel);
        if (!current?.ready) {
          const firstReady = payload.models.find((item) => item.ready);
          if (firstReady) setSelectedModel(firstReady.key);
        }
        setCatalogWarning("");
      })
      .catch(() => {
        if (active) {
          setCatalogWarning(
            "Model performance is shown from the final evaluation. Start the Flask API to check checkpoint availability and run predictions."
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedDetails = useMemo(
    () => models.find((item) => item.key === selectedModel),
    [models, selectedModel]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!note.trim()) {
      setError("Enter a clinical note before running the prediction.");
      return;
    }
    setLoading(true);
    try {
      const payload = await predictWithModel(selectedModel, note.trim());
      setResult(payload);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="lp-page">
      <section className="lp-hero">
        <div>
          <span className="lp-kicker">Interactive research demonstration</span>
          <h1>Live mental-health risk prediction</h1>
          <p>
            Choose a fine-tuned transformer, enter a de-identified clinical note and compare
            the model's depression and anxiety probability estimates.
          </p>
        </div>
        <div className="lp-hero-note">
          <strong>Important</strong>
          <span>Use de-identified text only. Outputs are not clinical diagnoses.</span>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-section-heading">
          <div>
            <span className="lp-step">Step 1</span>
            <h2>Select a fine-tuned model</h2>
          </div>
          <p>PR-AUC is the primary comparison metric because both tasks are imbalanced.</p>
        </div>
        {catalogWarning && <div className="lp-warning">{catalogWarning}</div>}
        <div className="lp-model-grid">
          {models.map((model) => (
            <ModelCard
              key={model.key}
              model={model}
              selected={selectedModel === model.key}
              onSelect={(key) => {
                setSelectedModel(key);
                setResult(null);
                setError("");
              }}
            />
          ))}
        </div>
      </section>

      <section className="lp-section lp-input-section">
        <div className="lp-section-heading">
          <div>
            <span className="lp-step">Step 2</span>
            <h2>Enter a clinical note</h2>
          </div>
          <p>
            {selectedDetails?.name || "The selected model"} will use up to{" "}
            {selectedDetails?.context_length?.toLocaleString() || "—"} tokens.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="lp-textarea-wrap">
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Paste a de-identified discharge note here..."
              maxLength={50000}
              rows={14}
              disabled={loading}
            />
            <span className="lp-character-count">{note.length.toLocaleString()} / 50,000 characters</span>
          </div>
          <div className="lp-form-actions">
            <div className="lp-secondary-actions">
              <button type="button" className="lp-button lp-button-secondary" onClick={() => setNote(SAMPLE_NOTE)} disabled={loading}>
                Use synthetic example
              </button>
              <button type="button" className="lp-button lp-button-ghost" onClick={() => { setNote(""); setResult(null); setError(""); }} disabled={loading || (!note && !result)}>
                Clear
              </button>
            </div>
            <button type="submit" className="lp-button lp-button-primary" disabled={loading || !selectedDetails?.ready}>
              {loading ? "Running both task models…" : `Predict with ${selectedDetails?.name || "model"}`}
            </button>
          </div>
        </form>
        {error && <div className="lp-error" role="alert">{error}</div>}
        {loading && (
          <div className="lp-loading" role="status">
            <span />
            The first request for a model can take longer while its two checkpoints are loaded.
          </div>
        )}
      </section>

      {result && (
        <section className="lp-section lp-results-section">
          <div className="lp-section-heading">
            <div>
              <span className="lp-step">Step 3</span>
              <h2>{result.model.name} results</h2>
            </div>
            <p>Each task uses its own fine-tuned checkpoint and validation-selected threshold.</p>
          </div>
          <div className="lp-results-grid">
            <ProbabilityResult title="Depression" result={result.predictions.depression} colour="#6956d9" />
            <ProbabilityResult title="Anxiety" result={result.predictions.anxiety} colour="#0f9d8a" />
          </div>
          <div className="lp-disclaimer">
            <strong>Research-use disclaimer:</strong> {result.disclaimer}
          </div>
        </section>
      )}
    </main>
  );
}
