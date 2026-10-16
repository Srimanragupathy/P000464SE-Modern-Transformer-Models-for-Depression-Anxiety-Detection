import "./Overview.css";

const MODEL_RESULTS = [
  {
    name: "ClinicalBERT",
    architecture: "Clinical transformer",
    context: "512 tokens",
    depression: 0.696,
    anxiety: 0.611,
  },
  {
    name: "RoBERTa",
    architecture: "General transformer",
    context: "512 tokens",
    depression: 0.690,
    anxiety: 0.590,
  },
  {
    name: "DeBERTa",
    architecture: "Disentangled attention",
    context: "512 tokens",
    depression: 0.731,
    anxiety: 0.640,
  },
  {
    name: "Clinical Longformer",
    architecture: "Long-document clinical transformer",
    context: "4,096 tokens",
    depression: 0.785,
    anxiety: 0.713,
  },
];

const WORKFLOW_STEPS = [
  {
    number: "01",
    title: "Cohort preparation",
    description:
      "Hospital admissions for adults aged 60 years and over were identified from MIMIC-IV.",
  },
  {
    number: "02",
    title: "Task construction",
    description:
      "Separate depression and anxiety classification datasets were created using diagnosis-code-derived labels.",
  },
  {
    number: "03",
    title: "Clinical text preparation",
    description:
      "Relevant discharge-summary sections were extracted, explicit diagnostic terms were masked, and patient-level splits were retained.",
  },
  {
    number: "04",
    title: "Model benchmarking",
    description:
      "ClinicalBERT, RoBERTa, DeBERTa and Clinical Longformer were evaluated using the same core benchmarking framework.",
  },
];

const PAGE_GUIDE = [
  {
    number: "01",
    title: "Dataset Exploration",
    description:
      "Explore cohort composition, age groups, class distributions, text lengths and selected clinical sections.",
    target: "dataset-exploration",
  },
  {
    number: "02",
    title: "Depression Models",
    description:
      "Review training behaviour, test performance and model comparisons for depression detection.",
    target: "depression-models",
  },
  {
    number: "03",
    title: "Anxiety Models",
    description:
      "Review training behaviour, test performance and model comparisons for anxiety detection.",
    target: "anxiety-models",
  },
  {
    number: "04",
    title: "Live Prediction",
    description:
      "Choose a fine-tuned model and obtain separate depression and anxiety risk scores for a clinical note.",
    target: "live-prediction",
  },
  {
    number: "05",
    title: "Subgroup Analysis",
    description:
      "Inspect model performance across demographic and clinical subgroups.",
    target: "subgroup-analysis",
  },
  {
    number: "06",
    title: "Methodology",
    description:
      "Review the study design, preprocessing decisions, training strategy and evaluation methodology.",
    target: "methodology",
  },
];

function MetricCard({ value, label, description, accent }) {
  return (
    <article className={`overview-metric-card ${accent}`}>
      <div className="overview-metric-value">{value}</div>
      <div className="overview-metric-label">{label}</div>
      <p>{description}</p>
    </article>
  );
}

function PerformancePanel({ title, task, colourClass }) {
  const bestScore = Math.max(...MODEL_RESULTS.map((model) => model[task]));

  return (
    <article className="overview-performance-panel">
      <div className="overview-panel-heading">
        <div>
          <span className={`overview-task-indicator ${colourClass}`} />
          <h3>{title}</h3>
        </div>
        <span className="overview-panel-label">Test PR-AUC</span>
      </div>

      <div className="overview-bars">
        {MODEL_RESULTS.map((model) => {
          const score = model[task];
          const isBest = score === bestScore;

          return (
            <div className="overview-bar-row" key={`${task}-${model.name}`}>
              <div className="overview-bar-header">
                <span>{model.name}</span>
                <strong>{score.toFixed(3)}</strong>
              </div>

              <div
                className="overview-bar-track"
                role="img"
                aria-label={`${model.name} ${title} PR-AUC ${score.toFixed(3)}`}
              >
                <div
                  className={`overview-bar-fill ${colourClass} ${
                    isBest ? "best" : ""
                  }`}
                  style={{ width: `${score * 100}%` }}
                />
              </div>

              {isBest && (
                <span className="overview-best-label">Best-performing model</span>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function Overview({ onNavigate }) {
  const navigateTo = (target) => {
    if (typeof onNavigate === "function") {
      onNavigate(target);
    }
  };

  return (
    <main className="overview-page">
      <section className="overview-hero">
        <div className="overview-hero-content">
          <span className="overview-eyebrow">
            GERiatric Mental Health NLP Benchmark
          </span>

          <h1>
            Depression and anxiety detection from clinical discharge notes
          </h1>

          <p className="overview-hero-description">
            This dashboard presents the development, evaluation and
            interpretation of transformer-based models for identifying
            depression and anxiety indicators among adults aged 60 years and
            over using MIMIC-IV clinical notes.
          </p>

          <div className="overview-hero-actions">
            <button
              type="button"
              className="overview-primary-button"
              onClick={() => navigateTo("live-prediction")}
            >
              Open Live Prediction
              <span aria-hidden="true">→</span>
            </button>

            <button
              type="button"
              className="overview-secondary-button"
              onClick={() => navigateTo("dataset-exploration")}
            >
              Explore the Dataset
            </button>
          </div>
        </div>

        <aside className="overview-hero-summary">
          <div className="overview-summary-header">
            <span>Project scope</span>
            <span className="overview-status">
              <span />
              Completed study
            </span>
          </div>

          <div className="overview-summary-grid">
            <div>
              <strong>2</strong>
              <span>Classification tasks</span>
            </div>
            <div>
              <strong>4</strong>
              <span>Transformer models</span>
            </div>
            <div>
              <strong>60+</strong>
              <span>Target age group</span>
            </div>
            <div>
              <strong>4,096</strong>
              <span>Maximum context</span>
            </div>
          </div>

          <div className="overview-summary-note">
            <span className="overview-note-icon">i</span>
            <p>
              Results shown in this dashboard are research outputs and are not
              intended to replace clinical assessment or diagnosis.
            </p>
          </div>
        </aside>
      </section>

      <section className="overview-section">
        <div className="overview-section-heading">
          <div>
            <span className="overview-section-kicker">Study at a glance</span>
            <h2>Research scope and principal findings</h2>
          </div>
          <p>
            The study compared clinical and general-domain transformer
            architectures under two related but independently evaluated mental
            health classification tasks.
          </p>
        </div>

        <div className="overview-metric-grid">
          <MetricCard
            value="0.785"
            label="Best depression PR-AUC"
            description="Achieved by the fine-tuned Clinical Longformer."
            accent="blue"
          />
          <MetricCard
            value="0.713"
            label="Best anxiety PR-AUC"
            description="Achieved by the fine-tuned Clinical Longformer."
            accent="purple"
          />
          <MetricCard
            value="4"
            label="Fine-tuned architectures"
            description="ClinicalBERT, RoBERTa, DeBERTa and Clinical Longformer."
            accent="green"
          />
          <MetricCard
            value="2"
            label="Independent tasks"
            description="Depression and anxiety were trained and evaluated separately."
            accent="orange"
          />
        </div>
      </section>

      <section className="overview-section">
        <div className="overview-section-heading">
          <div>
            <span className="overview-section-kicker">Model benchmarking</span>
            <h2>Fine-tuned model performance</h2>
          </div>
          <p>
            PR-AUC was treated as the primary comparison metric because it is
            informative when evaluating classification performance under class
            imbalance.
          </p>
        </div>

        <div className="overview-performance-grid">
          <PerformancePanel
            title="Depression"
            task="depression"
            colourClass="depression"
          />
          <PerformancePanel
            title="Anxiety"
            task="anxiety"
            colourClass="anxiety"
          />
        </div>

        <p className="overview-chart-note">
          Values represent final full-mode test-set results. Detailed metrics,
          confidence intervals and statistical comparisons are provided on the
          corresponding model pages.
        </p>
      </section>

      <section className="overview-section">
        <div className="overview-section-heading">
          <div>
            <span className="overview-section-kicker">Model portfolio</span>
            <h2>Architectures included in the benchmark</h2>
          </div>
          <p>
            Short-context models used selected clinical sections, while
            Clinical Longformer supported substantially longer clinical input.
          </p>
        </div>

        <div className="overview-table-container">
          <table className="overview-model-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Architecture</th>
                <th>Maximum input</th>
                <th>Depression PR-AUC</th>
                <th>Anxiety PR-AUC</th>
              </tr>
            </thead>
            <tbody>
              {MODEL_RESULTS.map((model) => (
                <tr key={model.name}>
                  <td>
                    <strong>{model.name}</strong>
                    {model.name === "Clinical Longformer" && (
                      <span className="overview-table-badge">Best overall</span>
                    )}
                  </td>
                  <td>{model.architecture}</td>
                  <td>{model.context}</td>
                  <td>{model.depression.toFixed(3)}</td>
                  <td>{model.anxiety.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overview-section overview-method-section">
        <div className="overview-section-heading">
          <div>
            <span className="overview-section-kicker">Research workflow</span>
            <h2>From clinical data to model evaluation</h2>
          </div>
          <p>
            A consistent pipeline was used to reduce leakage risk and support
            fair, reproducible model comparisons.
          </p>
        </div>

        <div className="overview-workflow">
          {WORKFLOW_STEPS.map((step) => (
            <article className="overview-workflow-card" key={step.number}>
              <span className="overview-workflow-number">{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="overview-section">
        <div className="overview-section-heading">
          <div>
            <span className="overview-section-kicker">Dashboard guide</span>
            <h2>Explore the research outputs</h2>
          </div>
          <p>
            Each dashboard section presents a different stage of the research
            and its supporting results.
          </p>
        </div>

        <div className="overview-page-guide">
          {PAGE_GUIDE.map((page) => (
            <button
              type="button"
              className="overview-guide-card"
              key={page.target}
              onClick={() => navigateTo(page.target)}
            >
              <span className="overview-guide-number">{page.number}</span>
              <span className="overview-guide-content">
                <strong>{page.title}</strong>
                <small>{page.description}</small>
              </span>
              <span className="overview-guide-arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="overview-research-note">
        <div className="overview-research-note-icon">!</div>
        <div>
          <h2>Research-use notice</h2>
          <p>
            Model probabilities indicate patterns learned from the research
            dataset. They should not be interpreted as confirmed diagnoses,
            treatment recommendations or substitutes for qualified clinical
            judgement.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Overview;