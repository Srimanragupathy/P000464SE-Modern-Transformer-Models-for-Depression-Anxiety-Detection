import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./InterpretabilityAnalysis.css";

const TASK_INFORMATION = {
  depression: {
    name: "Depression",
    bestModel: "Clinical Longformer",
    testPrAuc: 0.785,
    colour: "#2471dc",
    description:
      "Interpretability analysis of the best-performing fine-tuned depression model.",
  },
  anxiety: {
    name: "Anxiety",
    bestModel: "Clinical Longformer",
    testPrAuc: 0.713,
    colour: "#7657d5",
    description:
      "Interpretability analysis of the best-performing fine-tuned anxiety model.",
  },
};

const GLOBAL_FIGURES = [
  {
    file: "global_shap_marker_ranking.png",
    title: "Global SHAP marker ranking",
    description:
      "Ranks the clinical-language markers that had the strongest overall contribution to model predictions according to aggregated SHAP values.",
  },
  {
    file: "global_attention_marker_ranking.png",
    title: "Global attention marker ranking",
    description:
      "Ranks clinical-language markers according to the aggregated attention assigned by the transformer model.",
  },
  {
    file: "combined_marker_ranking.png",
    title: "Combined clinical-marker ranking",
    description:
      "Combines evidence from global SHAP values and model attention to identify markers supported by both interpretation methods.",
    wide: true,
  },
];

const VALIDITY_FIGURES = [
  {
    file: "shap_attention_agreement.png",
    title: "Agreement between SHAP and attention",
    description:
      "Examines whether markers identified through SHAP also received strong attention from the transformer model.",
  },
  {
    file: "clinical_validity_status.png",
    title: "Clinical-validity review",
    description:
      "Summarises the literature-based sanity check used to assess whether highly ranked markers were clinically plausible.",
  },
];

const LOCAL_SHAP_FIGURES = Array.from(
  { length: 8 },
  (_, index) => {
    const sampleNumber = String(index + 1).padStart(
      2,
      "0",
    );

    return {
      file: `local_shap_sample_${sampleNumber}.png`,
      title: `Local SHAP explanation — Sample ${
        index + 1
      }`,
      description:
        "Shows which tokens increased or decreased the model prediction for this representative clinical-note sample.",
    };
  },
);

const ATTENTION_FIGURES = Array.from(
  { length: 4 },
  (_, index) => {
    const sampleNumber = String(index + 1).padStart(
      2,
      "0",
    );

    return {
      file: `attention_sample_${sampleNumber}.png`,
      title: `Attention visualisation — Sample ${
        index + 1
      }`,
      description:
        "Highlights the clinical-note tokens receiving comparatively strong attention for this representative sample.",
    };
  },
);

function FigureCard({
  activeTask,
  figure,
  onOpen,
}) {
  const [imageError, setImageError] =
    useState(false);

  const imagePath =
    `/interpretability/${activeTask}/${figure.file}`;

  useEffect(() => {
    setImageError(false);
  }, [activeTask, figure.file]);

  return (
    <article
      className={`ia-figure-card ${
        figure.wide
          ? "ia-figure-card--wide"
          : ""
      }`}
    >
      <div className="ia-figure-heading">
        <div>
          <h3>{figure.title}</h3>
          <p>{figure.description}</p>
        </div>

        {!imageError && (
          <span className="ia-enlarge-label">
            Select to enlarge
          </span>
        )}
      </div>

      {imageError ? (
        <div className="ia-image-error">
          <strong>Figure not found</strong>

          <p>
            Confirm that this PNG file was copied:
          </p>

          <code>
            public/interpretability/{activeTask}/
            {figure.file}
          </code>
        </div>
      ) : (
        <button
          type="button"
          className="ia-image-button"
          aria-label={`Enlarge ${figure.title}`}
          onClick={() =>
            onOpen({
              ...figure,
              imagePath,
            })
          }
        >
          <img
            src={imagePath}
            alt={`${TASK_INFORMATION[activeTask].name}: ${figure.title}`}
            loading="lazy"
            onError={() => setImageError(true)}
          />
        </button>
      )}
    </article>
  );
}

function InterpretabilityAnalysis() {
  const [activeTask, setActiveTask] =
    useState("depression");

  const [selectedFigure, setSelectedFigure] =
    useState(null);

  const taskInformation =
    TASK_INFORMATION[activeTask];

  const summaryCards = useMemo(
    () => [
      {
        label: "Model interpreted",
        value: taskInformation.bestModel,
        description:
          "The highest-ranked fine-tuned model for this task.",
        colour: taskInformation.colour,
      },
      {
        label: "Test PR-AUC",
        value: taskInformation.testPrAuc.toFixed(3),
        description:
          "Primary test metric used when selecting the model.",
        colour: "#22977d",
      },
      {
        label: "Local SHAP samples",
        value: "8",
        description:
          "Representative note-level explanations included.",
        colour: "#c47a2c",
      },
      {
        label: "Attention samples",
        value: "4",
        description:
          "Representative transformer-attention visualisations.",
        colour: "#7657d5",
      },
    ],
    [taskInformation],
  );

  useEffect(() => {
    if (!selectedFigure) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedFigure(null);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [selectedFigure]);

  return (
    <main className="ia-page">
      <section className="ia-hero">
        <div className="ia-hero-content">
          <p className="ia-eyebrow">
            Model interpretability
          </p>

          <h1>
            Understanding clinical-language model
            predictions
          </h1>

          <p className="ia-hero-description">
            This page uses SHAP values, transformer
            attention and clinical-validity checks to
            investigate which parts of a discharge note
            influenced depression and anxiety predictions.
          </p>

          <div className="ia-hero-tags">
            <span>Global SHAP</span>
            <span>Local SHAP</span>
            <span>Attention analysis</span>
            <span>Clinical validity</span>
          </div>
        </div>

        <aside className="ia-hero-note">
          <span>Important limitation</span>

          <strong>
            Interpretability is not causality
          </strong>

          <p>
            SHAP and attention identify associations within
            the model. They do not prove that a word,
            symptom or clinical condition causes depression
            or anxiety.
          </p>
        </aside>
      </section>

      <section className="ia-task-panel">
        <div className="ia-task-panel-heading">
          <div>
            <p className="ia-kicker">
              Select classification task
            </p>

            <h2>
              View interpretations by outcome
            </h2>
          </div>

          <p>
            Depression and anxiety were trained as
            independent tasks and therefore have separate
            explanation outputs.
          </p>
        </div>

        <div
          className="ia-task-switcher"
          role="tablist"
          aria-label="Select interpretability task"
        >
          {Object.entries(TASK_INFORMATION).map(
            ([taskKey, task]) => {
              const isActive =
                activeTask === taskKey;

              return (
                <button
                  key={taskKey}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={
                    isActive
                      ? "ia-task-button ia-task-button--active"
                      : "ia-task-button"
                  }
                  onClick={() =>
                    setActiveTask(taskKey)
                  }
                >
                  <span
                    className="ia-task-dot"
                    style={{
                      backgroundColor: task.colour,
                    }}
                  />

                  <span>
                    <strong>{task.name}</strong>
                    <small>
                      {task.bestModel}
                    </small>
                  </span>
                </button>
              );
            },
          )}
        </div>
      </section>

      <section className="ia-current-task">
        <div>
          <p className="ia-kicker">
            Current interpretation
          </p>

          <h2>
            {taskInformation.name} interpretability
            analysis
          </h2>

          <p>
            {taskInformation.description}
          </p>
        </div>

        <div
          className="ia-model-badge"
          style={{
            "--task-colour":
              taskInformation.colour,
          }}
        >
          <span>Selected model</span>
          <strong>
            {taskInformation.bestModel}
          </strong>
          <small>
            Test PR-AUC{" "}
            {taskInformation.testPrAuc.toFixed(3)}
          </small>
        </div>
      </section>

      <section className="ia-summary-grid">
        {summaryCards.map((card) => (
          <article
            className="ia-summary-card"
            key={card.label}
            style={{
              "--summary-colour": card.colour,
            }}
          >
            <p>{card.label}</p>
            <strong>{card.value}</strong>
            <span>{card.description}</span>
          </article>
        ))}
      </section>

      <section className="ia-methodology">
        <div className="ia-methodology-heading">
          <p className="ia-kicker">
            Explanation framework
          </p>

          <h2>
            How the model was interpreted
          </h2>

          <p>
            Multiple complementary methods were used because
            no single interpretation method provides a
            complete explanation of a transformer model.
          </p>
        </div>

        <div className="ia-methodology-grid">
          <article>
            <span>01</span>
            <div>
              <h3>Global SHAP</h3>
              <p>
                Aggregates token-level SHAP values across
                samples to identify language markers with
                the greatest overall contribution.
              </p>
            </div>
          </article>

          <article>
            <span>02</span>
            <div>
              <h3>Local SHAP</h3>
              <p>
                Explains an individual prediction by showing
                which tokens pushed the output towards or
                away from the positive class.
              </p>
            </div>
          </article>

          <article>
            <span>03</span>
            <div>
              <h3>Attention analysis</h3>
              <p>
                Examines which tokens received strong
                attention within the transformer model for
                representative notes.
              </p>
            </div>
          </article>

          <article>
            <span>04</span>
            <div>
              <h3>Clinical validity</h3>
              <p>
                Compares highly ranked markers against known
                geriatric mental-health concepts as a
                qualitative sanity check.
              </p>
            </div>
          </article>
        </div>
      </section>

      <nav
        className="ia-section-navigation"
        aria-label="Interpretability sections"
      >
        <a href="#global-markers">
          Global marker rankings
        </a>

        <a href="#agreement-validity">
          Agreement and validity
        </a>

        <a href="#local-shap">
          Local SHAP samples
        </a>

        <a href="#attention-samples">
          Attention samples
        </a>
      </nav>

      <aside className="ia-reading-guide">
        <div className="ia-reading-guide-icon">
          i
        </div>

        <div>
          <strong>
            Reading the interpretation figures
          </strong>

          <p>
            Marker importance indicates how strongly a token
            was associated with the model output, not whether
            it was clinically causal. For local SHAP figures,
            use the legend in each figure to determine the
            direction of contribution. Attention should be
            interpreted as model focus rather than a complete
            explanation of the final prediction.
          </p>
        </div>
      </aside>

      <section
        className="ia-analysis-section"
        id="global-markers"
      >
        <div className="ia-section-heading">
          <div>
            <p className="ia-kicker">
              Global interpretation
            </p>

            <h2>
              Ranked clinical-language markers
            </h2>
          </div>

          <p>
            Global rankings identify markers that were
            influential across multiple clinical notes.
            Results from SHAP and attention are presented
            separately and then combined.
          </p>
        </div>

        <div className="ia-figure-grid ia-figure-grid--two">
          {GLOBAL_FIGURES.map((figure) => (
            <FigureCard
              key={`${activeTask}-${figure.file}`}
              activeTask={activeTask}
              figure={figure}
              onOpen={setSelectedFigure}
            />
          ))}
        </div>
      </section>

      <section
        className="ia-analysis-section"
        id="agreement-validity"
      >
        <div className="ia-section-heading">
          <div>
            <p className="ia-kicker">
              Triangulation and sanity checking
            </p>

            <h2>
              Method agreement and clinical validity
            </h2>
          </div>

          <p>
            Agreement between explanation methods increases
            confidence that a marker was consistently
            important to the model. Clinical review provides
            an additional plausibility check.
          </p>
        </div>

        <div className="ia-figure-grid ia-figure-grid--two">
          {VALIDITY_FIGURES.map((figure) => (
            <FigureCard
              key={`${activeTask}-${figure.file}`}
              activeTask={activeTask}
              figure={figure}
              onOpen={setSelectedFigure}
            />
          ))}
        </div>
      </section>

      <section
        className="ia-analysis-section"
        id="local-shap"
      >
        <div className="ia-section-heading">
          <div>
            <p className="ia-kicker">
              Note-level interpretation
            </p>

            <h2>
              Representative local SHAP explanations
            </h2>
          </div>

          <p>
            These examples demonstrate how different words
            and phrases contributed to individual model
            predictions. They are representative examples
            and should not be treated as universal rules.
          </p>
        </div>

        <div className="ia-figure-grid ia-figure-grid--two">
          {LOCAL_SHAP_FIGURES.map((figure) => (
            <FigureCard
              key={`${activeTask}-${figure.file}`}
              activeTask={activeTask}
              figure={figure}
              onOpen={setSelectedFigure}
            />
          ))}
        </div>
      </section>

      <section
        className="ia-analysis-section"
        id="attention-samples"
      >
        <div className="ia-section-heading">
          <div>
            <p className="ia-kicker">
              Transformer attention
            </p>

            <h2>
              Representative attention visualisations
            </h2>
          </div>

          <p>
            Attention visualisations indicate the tokens on
            which the transformer placed comparatively high
            emphasis while processing representative
            clinical notes.
          </p>
        </div>

        <div className="ia-figure-grid ia-figure-grid--two">
          {ATTENTION_FIGURES.map((figure) => (
            <FigureCard
              key={`${activeTask}-${figure.file}`}
              activeTask={activeTask}
              figure={figure}
              onOpen={setSelectedFigure}
            />
          ))}
        </div>
      </section>

      <section className="ia-limitations">
        <div>
          <p className="ia-kicker">
            Responsible interpretation
          </p>

          <h2>
            Important interpretability limitations
          </h2>
        </div>

        <div className="ia-limitations-grid">
          <article>
            <span>01</span>

            <div>
              <h3>Association, not causation</h3>

              <p>
                An influential token is associated with the
                model output but does not necessarily
                represent a causal clinical factor.
              </p>
            </div>
          </article>

          <article>
            <span>02</span>

            <div>
              <h3>Context dependent</h3>

              <p>
                The contribution of a word can change
                depending on surrounding text, negation and
                the overall clinical context.
              </p>
            </div>
          </article>

          <article>
            <span>03</span>

            <div>
              <h3>Attention is incomplete</h3>

              <p>
                Attention provides evidence about model focus
                but should not be treated as a complete or
                causal explanation of model behaviour.
              </p>
            </div>
          </article>

          <article>
            <span>04</span>

            <div>
              <h3>Clinical review required</h3>

              <p>
                Automatically identified markers require
                review by qualified domain experts before
                they can support clinical conclusions.
              </p>
            </div>
          </article>
        </div>
      </section>

      {selectedFigure && (
        <div
          className="ia-modal"
          role="dialog"
          aria-modal="true"
          aria-label={selectedFigure.title}
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setSelectedFigure(null);
            }
          }}
        >
          <div className="ia-modal-content">
            <div className="ia-modal-heading">
              <div>
                <span>
                  {taskInformation.name} interpretation
                </span>

                <h2>
                  {selectedFigure.title}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close enlarged figure"
                onClick={() =>
                  setSelectedFigure(null)
                }
              >
                ×
              </button>
            </div>

            <img
              src={selectedFigure.imagePath}
              alt={`${taskInformation.name}: ${selectedFigure.title}`}
            />

            <p>
              {selectedFigure.description}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

export default InterpretabilityAnalysis;