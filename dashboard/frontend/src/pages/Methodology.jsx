import "./Methodology.css";

const PIPELINE_STEPS = [
  {
    number: "01",
    title: "Data extraction",
    description:
      "MIMIC-IV hospital records and de-identified discharge summaries were loaded and linked using patient and admission identifiers.",
  },
  {
    number: "02",
    title: "Older-adult cohort",
    description:
      "Admissions belonging to patients aged 60 years and over were retained for the study.",
  },
  {
    number: "03",
    title: "Outcome labelling",
    description:
      "Depression and anxiety labels were derived from reviewed ICD-9 and ICD-10 diagnosis codes.",
  },
  {
    number: "04",
    title: "Text preparation",
    description:
      "Relevant discharge-summary sections were selected, explicit outcome terms were masked and model-specific tokenisation was applied.",
  },
  {
    number: "05",
    title: "Model training",
    description:
      "Frozen-encoder baselines and fully fine-tuned versions of four transformer architectures were trained independently for both tasks.",
  },
  {
    number: "06",
    title: "Model evaluation",
    description:
      "Best-validation checkpoints were evaluated on held-out test sets using PR-AUC and complementary classification metrics.",
  },
  {
    number: "07",
    title: "Statistical analysis",
    description:
      "Common-cohort comparison, bootstrap analysis, McNemar testing and demographic subgroup evaluation were performed.",
  },
  {
    number: "08",
    title: "Interpretability",
    description:
      "SHAP, transformer attention and clinical-validity checks were used to investigate influential clinical-language markers.",
  },
];

const DATA_SOURCES = [
  {
    name: "patients",
    purpose:
      "Patient identifiers, sex and anchor-age information used to define the older-adult cohort.",
  },
  {
    name: "admissions",
    purpose:
      "Hospital admission identifiers and admission-level information used as the unit of analysis.",
  },
  {
    name: "diagnoses_icd",
    purpose:
      "Admission-level ICD-9 and ICD-10 diagnosis codes used to create depression and anxiety labels.",
  },
  {
    name: "d_icd_diagnoses",
    purpose:
      "Diagnosis descriptions used to review and interpret candidate ICD codes.",
  },
  {
    name: "discharge",
    purpose:
      "De-identified discharge summaries used as the clinical-text input for classification.",
  },
];

const CLINICAL_SECTIONS = [
  "Past medical history",
  "Chief complaint",
  "History of present illness",
  "Medications on admission",
  "Discharge medications",
  "Brief hospital course",
];

const MODEL_ROWS = [
  {
    model: "ClinicalBERT",
    domain: "Clinical language",
    context: "512 tokens",
    baseline:
      "Pretrained encoder frozen; classification head trained.",
    fineTuned:
      "Encoder and classification head updated for the target task.",
  },
  {
    model: "RoBERTa",
    domain: "General language",
    context: "512 tokens",
    baseline:
      "Pretrained encoder frozen; classification head trained.",
    fineTuned:
      "Encoder and classification head updated for the target task.",
  },
  {
    model: "DeBERTa",
    domain: "General language",
    context: "512 tokens",
    baseline:
      "Pretrained encoder frozen; classification head trained.",
    fineTuned:
      "Encoder and classification head updated for the target task.",
  },
  {
    model: "Clinical Longformer",
    domain: "Long clinical text",
    context: "2,048 tokens",
    baseline:
      "Pretrained encoder frozen; classification head trained where computationally available.",
    fineTuned:
      "Long-context encoder and classification head updated for the target task.",
  },
];

const TRAINING_CONTROLS = [
  {
    title: "Independent tasks",
    description:
      "Depression and anxiety were treated as separate binary classification problems with separate model checkpoints.",
  },
  {
    title: "Class-weighted loss",
    description:
      "Training-class frequencies were used to reduce the effect of class imbalance on model optimisation.",
  },
  {
    title: "Validation monitoring",
    description:
      "Validation PR-AUC was monitored after each epoch because it was the primary model-selection metric.",
  },
  {
    title: "Best checkpoint",
    description:
      "The checkpoint with the highest validation PR-AUC was retained for final test evaluation and deployment.",
  },
  {
    title: "Early-stopping signal",
    description:
      "A patience-based signal identified when validation PR-AUC stopped improving sufficiently.",
  },
  {
    title: "Reproducibility",
    description:
      "Fixed random seeds, recorded run configurations and saved prediction files supported reproducible comparison.",
  },
];

const EVALUATION_METRICS = [
  {
    abbreviation: "PR-AUC",
    name: "Area under the precision–recall curve",
    role: "Primary metric",
    explanation:
      "Prioritised because positive depression and anxiety cases were less common than controls.",
  },
  {
    abbreviation: "ROC-AUC",
    name: "Area under the ROC curve",
    role: "Discrimination",
    explanation:
      "Measures how well the model separates positive and negative cases across thresholds.",
  },
  {
    abbreviation: "F1",
    name: "F1 score",
    role: "Combined measure",
    explanation:
      "Harmonic mean of precision and recall at the selected classification threshold.",
  },
  {
    abbreviation: "Balanced accuracy",
    name: "Average of sensitivity and specificity",
    role: "Imbalance-aware accuracy",
    explanation:
      "Gives equal importance to positive-case and control-case performance.",
  },
  {
    abbreviation: "Precision",
    name: "Positive predictive value",
    role: "Prediction reliability",
    explanation:
      "Proportion of predicted positive cases that were labelled positive.",
  },
  {
    abbreviation: "Recall",
    name: "Sensitivity",
    role: "Positive-case detection",
    explanation:
      "Proportion of labelled positive cases correctly identified by the model.",
  },
  {
    abbreviation: "Specificity",
    name: "True-negative rate",
    role: "Control-case detection",
    explanation:
      "Proportion of labelled controls correctly identified by the model.",
  },
  {
    abbreviation: "Accuracy",
    name: "Overall classification accuracy",
    role: "Descriptive metric",
    explanation:
      "Proportion of all test cases classified correctly; interpreted alongside imbalance-aware metrics.",
  },
];

const STATISTICAL_METHODS = [
  {
    title: "Common-cohort alignment",
    description:
      "Model predictions were aligned using the same admission identifiers and outcome labels before paired comparisons were performed.",
  },
  {
    title: "Patient-clustered bootstrap",
    description:
      "Patients, rather than individual admissions, were resampled to preserve dependence between admissions belonging to the same patient.",
  },
  {
    title: "Bootstrap confidence intervals",
    description:
      "Repeated bootstrap samples were used to estimate uncertainty around metrics and paired model differences.",
  },
  {
    title: "McNemar testing",
    description:
      "Paired classification errors were compared to test whether two models made significantly different decisions.",
  },
  {
    title: "Multiple-testing adjustment",
    description:
      "Holm adjustment was applied to reduce false-positive findings across multiple pairwise model comparisons.",
  },
  {
    title: "Subgroup analysis",
    description:
      "PR-AUC, recall and specificity were examined across age and sex strata, subject to subgroup sample availability.",
  },
];

const INTERPRETABILITY_METHODS = [
  {
    number: "01",
    title: "Global SHAP analysis",
    description:
      "Token-level SHAP contributions were aggregated across representative samples to identify influential clinical-language markers.",
  },
  {
    number: "02",
    title: "Local SHAP analysis",
    description:
      "Individual note predictions were examined to identify tokens pushing the result towards or away from the positive class.",
  },
  {
    number: "03",
    title: "Attention visualisation",
    description:
      "Transformer attention was visualised for representative notes to inspect which tokens received comparatively strong attention.",
  },
  {
    number: "04",
    title: "Combined ranking",
    description:
      "Evidence from SHAP and attention was combined to identify markers supported by both interpretation approaches.",
  },
  {
    number: "05",
    title: "Clinical sanity check",
    description:
      "Highly ranked markers were reviewed against known geriatric mental-health concepts to assess clinical plausibility.",
  },
];

function Methodology() {
  return (
    <main className="meth-page">
      <section className="meth-hero">
        <div className="meth-hero-content">
          <p className="meth-eyebrow">
            Research methodology
          </p>

          <h1>
            From clinical data to interpretable model
            evaluation
          </h1>

          <p className="meth-hero-description">
            The study used a reproducible experimental
            pipeline to construct older-adult depression and
            anxiety cohorts, prepare discharge-summary text,
            train transformer models and evaluate predictive
            performance, statistical significance and model
            interpretability.
          </p>

          <div className="meth-hero-tags">
            <span>MIMIC-IV</span>
            <span>Adults aged 60+</span>
            <span>Patient-level splitting</span>
            <span>Transformer benchmarking</span>
          </div>
        </div>

        <aside className="meth-hero-summary">
          <span>Study design</span>

          <strong>
            Retrospective observational benchmarking
          </strong>

          <dl>
            <div>
              <dt>Tasks</dt>
              <dd>2</dd>
            </div>

            <div>
              <dt>Architectures</dt>
              <dd>4</dd>
            </div>

            <div>
              <dt>Primary metric</dt>
              <dd>PR-AUC</dd>
            </div>

            <div>
              <dt>Target population</dt>
              <dd>60+</dd>
            </div>
          </dl>
        </aside>
      </section>

      <nav
        className="meth-navigation"
        aria-label="Methodology sections"
      >
        <a href="#research-design">
          Research design
        </a>

        <a href="#pipeline">
          Study pipeline
        </a>

        <a href="#data-cohort">
          Data and cohort
        </a>

        <a href="#text-preparation">
          Text preparation
        </a>

        <a href="#models">
          Models
        </a>

        <a href="#training">
          Training
        </a>

        <a href="#evaluation">
          Evaluation
        </a>

        <a href="#statistics">
          Statistical analysis
        </a>

        <a href="#interpretability-method">
          Interpretability
        </a>

        <a href="#dashboard-architecture">
          Dashboard
        </a>
      </nav>

      <section
        className="meth-section"
        id="research-design"
      >
        <div className="meth-section-heading">
          <div>
            <p className="meth-kicker">
              Research design
            </p>

            <h2>
              Comparative transformer benchmarking
            </h2>
          </div>

          <p>
            A retrospective experimental design was used to
            compare baseline and fine-tuned transformer
            models on two independently evaluated binary
            classification tasks.
          </p>
        </div>

        <div className="meth-design-grid">
          <article>
            <span>Research population</span>
            <strong>
              Older adults aged 60+
            </strong>
            <p>
              The age threshold captured the broader
              older-adult population while retaining enough
              observations for model development and
              demographic analysis.
            </p>
          </article>

          <article>
            <span>Unit of analysis</span>
            <strong>
              One hospital admission
            </strong>
            <p>
              Each eligible admission was treated as one
              classification example and linked with one
              discharge-summary text record.
            </p>
          </article>

          <article>
            <span>Outcome tasks</span>
            <strong>
              Depression and anxiety
            </strong>
            <p>
              The two conditions were modelled separately,
              producing independent datasets, checkpoints,
              predictions and evaluation results.
            </p>
          </article>

          <article>
            <span>Model selection</span>
            <strong>
              Validation PR-AUC
            </strong>
            <p>
              Test data were kept separate from model
              selection. The best validation checkpoint was
              selected before final test evaluation.
            </p>
          </article>
        </div>
      </section>

      <section
        className="meth-section"
        id="pipeline"
      >
        <div className="meth-section-heading">
          <div>
            <p className="meth-kicker">
              End-to-end process
            </p>

            <h2>
              Experimental pipeline
            </h2>
          </div>

          <p>
            The same ordered workflow was followed for the
            depression and anxiety tasks to support a
            systematic and reproducible comparison.
          </p>
        </div>

        <div className="meth-pipeline">
          {PIPELINE_STEPS.map((step) => (
            <article
              className="meth-pipeline-step"
              key={step.number}
            >
              <span>{step.number}</span>

              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="meth-section"
        id="data-cohort"
      >
        <div className="meth-section-heading">
          <div>
            <p className="meth-kicker">
              Data source and cohort
            </p>

            <h2>
              MIMIC-IV clinical records
            </h2>
          </div>

          <p>
            MIMIC-IV provides de-identified hospital records.
            The analysis linked structured patient,
            admission and diagnosis data with unstructured
            discharge summaries.
          </p>
        </div>

        <div className="meth-table-container">
          <table className="meth-table">
            <thead>
              <tr>
                <th>Source table</th>
                <th>Methodological purpose</th>
              </tr>
            </thead>

            <tbody>
              {DATA_SOURCES.map((source) => (
                <tr key={source.name}>
                  <td>
                    <code>{source.name}</code>
                  </td>
                  <td>{source.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="meth-decision-grid">
          <article>
            <span>01</span>

            <div>
              <h3>Age filtering</h3>
              <p>
                Patient age was derived using MIMIC-IV
                anchor-age information. Admissions belonging
                to patients below 60 years were excluded.
              </p>
            </div>
          </article>

          <article>
            <span>02</span>

            <div>
              <h3>ICD-derived labels</h3>
              <p>
                Labels were created from reviewed ICD-9 and
                ICD-10 diagnosis codes rather than searching
                discharge notes for condition names.
              </p>
            </div>
          </article>

          <article>
            <span>03</span>

            <div>
              <h3>Patient-level splitting</h3>
              <p>
                All admissions belonging to one patient were
                assigned to only one of the training,
                validation or test splits to prevent leakage.
              </p>
            </div>
          </article>

          <article>
            <span>04</span>

            <div>
              <h3>Separate task datasets</h3>
              <p>
                Depression and anxiety datasets were created
                separately so that each task had a clear
                positive class and control group.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section
        className="meth-section"
        id="text-preparation"
      >
        <div className="meth-section-heading">
          <div>
            <p className="meth-kicker">
              Clinical-text preparation
            </p>

            <h2>
              Selected and masked discharge text
            </h2>
          </div>

          <p>
            Clinically useful sections were extracted from
            discharge summaries to reduce irrelevant text
            while retaining information likely to describe a
            patient’s condition and hospital course.
          </p>
        </div>

        <div className="meth-text-layout">
          <article className="meth-section-list-card">
            <span className="meth-card-label">
              Selected clinical sections
            </span>

            <div className="meth-clinical-sections">
              {CLINICAL_SECTIONS.map(
                (section, index) => (
                  <div key={section}>
                    <span>
                      {String(index + 1).padStart(
                        2,
                        "0",
                      )}
                    </span>

                    <strong>{section}</strong>
                  </div>
                ),
              )}
            </div>
          </article>

          <div className="meth-text-decisions">
            <article>
              <h3>Section extraction</h3>
              <p>
                Section headings were identified and the
                selected content was joined in a consistent
                order. Missing sections were handled without
                discarding the complete admission.
              </p>
            </article>

            <article>
              <h3>Outcome-term masking</h3>
              <p>
                Explicit depression- and anxiety-related
                terms were masked to reduce the possibility
                that the model simply reproduced direct
                diagnostic wording.
              </p>
            </article>

            <article>
              <h3>Model-specific tokenisation</h3>
              <p>
                Each model used its own pretrained tokenizer.
                ClinicalBERT, RoBERTa and DeBERTa used
                512-token inputs, while Clinical Longformer
                used up to 2,048 tokens.
              </p>
            </article>

            <article>
              <h3>Truncation auditing</h3>
              <p>
                Token lengths and truncation percentages were
                calculated for every data split to quantify
                the text lost at each model’s context limit.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section
        className="meth-section"
        id="models"
      >
        <div className="meth-section-heading">
          <div>
            <p className="meth-kicker">
              Model architectures
            </p>

            <h2>
              Baseline and fine-tuned transformers
            </h2>
          </div>

          <p>
            Frozen-encoder baselines measured performance
            using pretrained representations without
            modifying the encoder. Fine-tuned models allowed
            task-specific adaptation throughout the network.
          </p>
        </div>

        <div className="meth-table-container">
          <table className="meth-table meth-model-table">
            <thead>
              <tr>
                <th>Architecture</th>
                <th>Pretraining domain</th>
                <th>Maximum context</th>
                <th>Frozen baseline</th>
                <th>Fine-tuned model</th>
              </tr>
            </thead>

            <tbody>
              {MODEL_ROWS.map((row) => (
                <tr key={row.model}>
                  <td>
                    <strong>{row.model}</strong>
                  </td>
                  <td>{row.domain}</td>
                  <td>{row.context}</td>
                  <td>{row.baseline}</td>
                  <td>{row.fineTuned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="meth-information-note">
          <div>i</div>

          <p>
            <strong>
              Why fine-tune all encoder layers?
            </strong>{" "}
            The pretrained models understand general or
            clinical language, but they were not originally
            trained to identify depression and anxiety in
            older-adult discharge summaries. Updating all
            layers allows their internal representations to
            adapt to the target population, clinical-text
            profile and classification objective.
          </p>
        </aside>
      </section>

      <section
        className="meth-section"
        id="training"
      >
        <div className="meth-section-heading">
          <div>
            <p className="meth-kicker">
              Training protocol
            </p>

            <h2>
              Controlled and reproducible optimisation
            </h2>
          </div>

          <p>
            Training settings, checkpoints and epoch-level
            histories were recorded for every model and
            task. Comparable procedures were used wherever
            architecture and GPU-memory constraints allowed.
          </p>
        </div>

        <div className="meth-training-grid">
          {TRAINING_CONTROLS.map(
            (control, index) => (
              <article key={control.title}>
                <span>
                  {String(index + 1).padStart(
                    2,
                    "0",
                  )}
                </span>

                <div>
                  <h3>{control.title}</h3>
                  <p>{control.description}</p>
                </div>
              </article>
            ),
          )}
        </div>

        <div className="meth-checkpoint-flow">
          <div>
            <span>Training data</span>
            <strong>
              Parameter optimisation
            </strong>
          </div>

          <div className="meth-flow-arrow">
            →
          </div>

          <div>
            <span>Validation data</span>
            <strong>
              Model and threshold selection
            </strong>
          </div>

          <div className="meth-flow-arrow">
            →
          </div>

          <div>
            <span>Test data</span>
            <strong>
              One final evaluation
            </strong>
          </div>
        </div>
      </section>

      <section
        className="meth-section"
        id="evaluation"
      >
        <div className="meth-section-heading">
          <div>
            <p className="meth-kicker">
              Model evaluation
            </p>

            <h2>
              Test-set performance measures
            </h2>
          </div>

          <p>
            Multiple metrics were reported because a single
            score cannot fully describe performance under
            class imbalance.
          </p>
        </div>

        <div className="meth-metric-grid">
          {EVALUATION_METRICS.map((metric) => (
            <article key={metric.abbreviation}>
              <div>
                <strong>
                  {metric.abbreviation}
                </strong>

                <span>{metric.role}</span>
              </div>

              <h3>{metric.name}</h3>
              <p>{metric.explanation}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="meth-section"
        id="statistics"
      >
        <div className="meth-section-heading">
          <div>
            <p className="meth-kicker">
              Comparative and subgroup analysis
            </p>

            <h2>
              Statistical evaluation across models
            </h2>
          </div>

          <p>
            Paired comparisons were performed only after
            confirming that model prediction files referred
            to aligned admissions, patients and outcome
            labels.
          </p>
        </div>

        <div className="meth-statistics-grid">
          {STATISTICAL_METHODS.map(
            (method, index) => (
              <article key={method.title}>
                <span>
                  {String(index + 1).padStart(
                    2,
                    "0",
                  )}
                </span>

                <div>
                  <h3>{method.title}</h3>
                  <p>{method.description}</p>
                </div>
              </article>
            ),
          )}
        </div>
      </section>

      <section
        className="meth-section"
        id="interpretability-method"
      >
        <div className="meth-section-heading">
          <div>
            <p className="meth-kicker">
              Interpretability methodology
            </p>

            <h2>
              Explaining the best-performing models
            </h2>
          </div>

          <p>
            Interpretability analysis was performed on the
            selected best-performing model for each task.
            Multiple techniques were used to avoid relying on
            one explanation method.
          </p>
        </div>

        <div className="meth-interpretability-grid">
          {INTERPRETABILITY_METHODS.map(
            (method) => (
              <article key={method.number}>
                <span>{method.number}</span>

                <div>
                  <h3>{method.title}</h3>
                  <p>{method.description}</p>
                </div>
              </article>
            ),
          )}
        </div>

        <aside className="meth-warning-note">
          <strong>
            Interpretation limitation
          </strong>

          <p>
            SHAP values and attention weights describe model
            behaviour and associations. They do not establish
            clinical causality and do not replace review by
            qualified clinical experts.
          </p>
        </aside>
      </section>

      <section
        className="meth-section"
        id="dashboard-architecture"
      >
        <div className="meth-section-heading">
          <div>
            <p className="meth-kicker">
              System implementation
            </p>

            <h2>
              Dashboard architecture
            </h2>
          </div>

          <p>
            The dashboard uses a component-based React
            frontend and a Flask inference service. No
            application database is required.
          </p>
        </div>

        <div className="meth-architecture">
          <article>
            <span>Frontend</span>
            <strong>React</strong>
            <p>
              Presents dataset figures, model results,
              comparative evaluation, subgroup analysis,
              interpretability outputs and prediction forms.
            </p>
          </article>

          <div className="meth-architecture-arrow">
            REST API
            <span>→</span>
          </div>

          <article>
            <span>Backend</span>
            <strong>Flask</strong>
            <p>
              Validates prediction requests, selects the
              requested model and performs depression and
              anxiety inference.
            </p>
          </article>

          <div className="meth-architecture-arrow">
            Local files
            <span>→</span>
          </div>

          <article>
            <span>Research artefacts</span>
            <strong>
              Models, JSON, CSV and PNG
            </strong>
            <p>
              Saved checkpoints support inference, while
              notebook-generated outputs populate the
              research and visualisation pages.
            </p>
          </article>
        </div>

        <div className="meth-system-notes">
          <article>
            <h3>No database</h3>
            <p>
              The dashboard reads prepared research outputs
              and saved model artefacts directly from the
              project file structure.
            </p>
          </article>

          <article>
            <h3>De-identified input only</h3>
            <p>
              The live-prediction interface should only
              receive de-identified clinical text and must
              not store submitted notes.
            </p>
          </article>

          <article>
            <h3>Research demonstration</h3>
            <p>
              Predictions are experimental risk estimates
              and are not intended to replace professional
              clinical assessment.
            </p>
          </article>
        </div>
      </section>

      <section className="meth-reproducibility">
        <div>
          <p className="meth-kicker">
            Reproducibility and governance
          </p>

          <h2>
            Research safeguards
          </h2>
        </div>

        <div className="meth-reproducibility-grid">
          <article>
            <strong>Patient-level separation</strong>
            <p>
              Prevents records from the same patient appearing
              across training and evaluation splits.
            </p>
          </article>

          <article>
            <strong>Saved experiment metadata</strong>
            <p>
              Run manifests, model settings, training
              histories and test predictions document each
              experiment.
            </p>
          </article>

          <article>
            <strong>Held-out test evaluation</strong>
            <p>
              Test data are reserved for final evaluation and
              are not used to select model parameters.
            </p>
          </article>

          <article>
            <strong>Privacy-conscious presentation</strong>
            <p>
              Dashboard pages display aggregated results and
              generated figures rather than patient
              identifiers or raw research records.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}

export default Methodology;