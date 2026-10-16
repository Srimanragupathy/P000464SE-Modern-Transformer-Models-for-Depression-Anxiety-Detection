import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./SubgroupAnalysis.css";

const TASK_INFORMATION = {
  depression: {
    name: "Depression",
    shortName: "Depression detection",
    bestModel: "Clinical Longformer",
    bestPrAuc: 0.785,
    colour: "#2471dc",
    description:
      "Comparative evaluation of the four fine-tuned transformer models trained for depression detection.",
  },
  anxiety: {
    name: "Anxiety",
    shortName: "Anxiety detection",
    bestModel: "Clinical Longformer",
    bestPrAuc: 0.713,
    colour: "#7657d5",
    description:
      "Comparative evaluation of the four fine-tuned transformer models trained for anxiety detection.",
  },
};

const FIGURE_SECTIONS = [
  {
    id: "model-comparison",
    eyebrow: "Model benchmarking",
    title: "Overall comparative evaluation",
    description:
      "These figures compare the four fine-tuned models on the common test cohort. PR-AUC was used as the primary ranking metric because the positive classes were less frequent than the control classes.",
    layout: "two",
    figures: [
      {
        file: "best_model_pr_auc_ranking.png",
        title: "Model ranking by test PR-AUC",
        description:
          "Ranks ClinicalBERT, RoBERTa, DeBERTa and Clinical Longformer using the primary test-set evaluation metric.",
      },
      {
        file: "overall_metric_comparison.png",
        title: "Overall metric comparison",
        description:
          "Compares the principal classification measures across the four fine-tuned transformer models.",
      },
      {
        file: "model_scorecard.png",
        title: "Comparative model scorecard",
        description:
          "Provides a consolidated comparison of predictive performance, efficiency and model-selection considerations.",
      },
      {
        file: "confusion_matrices.png",
        title: "Test-set confusion matrices",
        description:
          "Shows true positives, true negatives, false positives and false negatives for each fine-tuned model.",
      },
    ],
  },
  {
    id: "discrimination",
    eyebrow: "Predictive discrimination",
    title: "Precision–recall, ROC and calibration analysis",
    description:
      "The curves provide complementary evidence about discrimination and probability quality. PR curves are particularly important for the imbalanced depression and anxiety classification tasks.",
    layout: "two",
    figures: [
      {
        file: "precision_recall_curves.png",
        title: "Precision–recall curves",
        description:
          "Shows how precision and recall change across classification thresholds for every model.",
      },
      {
        file: "roc_curves.png",
        title: "ROC curves",
        description:
          "Compares the true-positive and false-positive rates across possible decision thresholds.",
      },
      {
        file: "calibration_curves.png",
        title: "Probability calibration curves",
        description:
          "Examines whether the predicted probabilities correspond with the observed outcome frequencies.",
        wide: true,
      },
    ],
  },
  {
    id: "statistical-analysis",
    eyebrow: "Statistical analysis",
    title: "Pairwise model significance testing",
    description:
      "Bootstrap confidence intervals and McNemar testing were used to assess whether observed differences between models were supported statistically. Adjusted p-values account for multiple pairwise comparisons.",
    layout: "one",
    figures: [
      {
        file: "bootstrap_effect_size_forest_plots.png",
        title: "Bootstrap effect-size forest plots",
        description:
          "Displays paired model differences and their bootstrap confidence intervals. Intervals crossing zero indicate that the observed difference may not be statistically distinguishable.",
      },
      {
        file: "bootstrap_adjusted_p_value_heatmaps.png",
        title: "Bootstrap adjusted p-value heatmaps",
        description:
          "Summarises Holm-adjusted bootstrap p-values for the pairwise model comparisons.",
      },
      {
        file: "mcnemar_adjusted_p_value_heatmap.png",
        title: "McNemar adjusted p-value heatmap",
        description:
          "Compares paired classification errors using McNemar tests with adjustment for multiple comparisons.",
      },
    ],
  },
  {
    id: "age-analysis",
    eyebrow: "Demographic subgroup analysis",
    title: "Performance across older-adult age bands",
    description:
      "Age-stratified analysis checks whether model performance remains consistent across different groups within the study population aged 60 years and over.",
    layout: "three",
    figures: [
      {
        file: "subgroup_age_band_pr_auc_heatmap.png",
        title: "Age-band PR-AUC",
        description:
          "Compares precision–recall performance across the defined older-adult age bands.",
      },
      {
        file: "subgroup_age_band_recall_heatmap.png",
        title: "Age-band recall",
        description:
          "Shows the proportion of positive cases identified within each age band.",
      },
      {
        file: "subgroup_age_band_specificity_heatmap.png",
        title: "Age-band specificity",
        description:
          "Shows the proportion of negative cases correctly identified within each age band.",
      },
    ],
  },
  {
    id: "sex-analysis",
    eyebrow: "Demographic subgroup analysis",
    title: "Performance across sex groups",
    description:
      "Sex-stratified results help identify whether predictive performance differs across demographic groups in the evaluation cohort.",
    layout: "three",
    figures: [
      {
        file: "subgroup_sex_group_pr_auc_heatmap.png",
        title: "Sex-group PR-AUC",
        description:
          "Compares PR-AUC across the available sex groups for every model.",
      },
      {
        file: "subgroup_sex_group_recall_heatmap.png",
        title: "Sex-group recall",
        description:
          "Compares sensitivity to positive cases across the available sex groups.",
      },
      {
        file: "subgroup_sex_group_specificity_heatmap.png",
        title: "Sex-group specificity",
        description:
          "Compares correct identification of controls across the available sex groups.",
      },
    ],
  },
  {
    id: "disparity-analysis",
    eyebrow: "Fairness-oriented review",
    title: "Subgroup performance disparities",
    description:
      "These plots summarise the largest difference between the best- and worst-performing demographic subgroups. A larger gap indicates less consistent performance across groups and should be interpreted carefully.",
    layout: "three",
    figures: [
      {
        file: "subgroup_disparity_pr_auc.png",
        title: "PR-AUC disparity",
        description:
          "Shows the range in PR-AUC between demographic subgroups for each model.",
      },
      {
        file: "subgroup_disparity_recall.png",
        title: "Recall disparity",
        description:
          "Shows differences in positive-case detection between demographic subgroups.",
      },
      {
        file: "subgroup_disparity_specificity.png",
        title: "Specificity disparity",
        description:
          "Shows differences in control-case identification between demographic subgroups.",
      },
    ],
  },
  {
    id: "cohort-efficiency",
    eyebrow: "Evaluation context",
    title: "Cohort retention and computational considerations",
    description:
      "These results provide context for the comparison by showing test-cohort retention, input truncation and model training time.",
    layout: "three",
    figures: [
      {
        file: "common_cohort_retention.png",
        title: "Common-cohort retention",
        description:
          "Shows how many test admissions were retained when aligning model predictions for paired comparison.",
      },
      {
        file: "test_truncation_percentage.png",
        title: "Test-note truncation",
        description:
          "Compares the percentage of test notes exceeding the maximum context length of each model.",
      },
      {
        file: "training_runtime.png",
        title: "Training runtime",
        description:
          "Compares the computational time required to train the fine-tuned models.",
      },
    ],
  },
];

function FigureCard({
  activeTask,
  figure,
  onOpen,
}) {
  const [imageError, setImageError] = useState(false);

  const imagePath =
    `/comparative-evaluation/${activeTask}/${figure.file}`;

  useEffect(() => {
    setImageError(false);
  }, [activeTask, figure.file]);

  return (
    <article
      className={`ce-figure-card ${
        figure.wide ? "ce-figure-card--wide" : ""
      }`}
    >
      <div className="ce-figure-card-heading">
        <div>
          <h3>{figure.title}</h3>
          <p>{figure.description}</p>
        </div>

        {!imageError && (
          <span className="ce-view-label">
            Select to enlarge
          </span>
        )}
      </div>

      {imageError ? (
        <div className="ce-image-error">
          <strong>Figure not found</strong>

          <p>
            Confirm that the PNG file was copied to:
          </p>

          <code>
            public/comparative-evaluation/
            {activeTask}/{figure.file}
          </code>
        </div>
      ) : (
        <button
          className="ce-figure-button"
          type="button"
          onClick={() =>
            onOpen({
              ...figure,
              imagePath,
            })
          }
          aria-label={`Enlarge ${figure.title}`}
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

function SubgroupAnalysis() {
  const [activeTask, setActiveTask] =
    useState("depression");

  const [selectedFigure, setSelectedFigure] =
    useState(null);

  const taskInformation =
    TASK_INFORMATION[activeTask];

  const summaryCards = useMemo(
    () => [
      {
        label: "Best model",
        value: taskInformation.bestModel,
        description:
          "Highest test PR-AUC in the fine-tuned model comparison.",
        colour: taskInformation.colour,
      },
      {
        label: "Best test PR-AUC",
        value: taskInformation.bestPrAuc.toFixed(3),
        description:
          "Primary metric used for final model ranking.",
        colour: "#22977d",
      },
      {
        label: "Models compared",
        value: "4",
        description:
          "ClinicalBERT, RoBERTa, DeBERTa and Clinical Longformer.",
        colour: "#c47a2c",
      },
      {
        label: "Evaluation design",
        value: "Common cohort",
        description:
          "Paired comparisons use aligned admissions and labels.",
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
    <main className="ce-page">
      <section className="ce-hero">
        <div className="ce-hero-content">
          <p className="ce-eyebrow">
            Comparative evaluation and statistical analysis
          </p>

          <h1>
            Model comparison and subgroup analysis
          </h1>

          <p className="ce-hero-description">
            This page compares the fine-tuned transformer
            models, reports statistical significance tests and
            evaluates performance across demographic subgroups
            for the depression and anxiety tasks.
          </p>

          <div className="ce-hero-tags">
            <span>Fine-tuned models</span>
            <span>Common test cohort</span>
            <span>Bootstrap analysis</span>
            <span>Demographic strata</span>
          </div>
        </div>

        <aside className="ce-hero-note">
          <span>Interpretation notice</span>

          <strong>
            Comparative research evidence
          </strong>

          <p>
            Subgroup estimates may be less stable for groups
            containing fewer positive cases. Results should not
            be interpreted as clinical diagnoses or standalone
            evidence of model fairness.
          </p>
        </aside>
      </section>

      <section className="ce-task-panel">
        <div className="ce-task-panel-heading">
          <div>
            <p className="ce-kicker">
              Select classification task
            </p>

            <h2>
              View results separately by outcome
            </h2>
          </div>

          <p>
            Depression and anxiety were trained and evaluated
            as independent binary classification tasks.
          </p>
        </div>

        <div
          className="ce-task-switcher"
          role="tablist"
          aria-label="Select evaluation task"
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
                      ? "ce-task-button ce-task-button--active"
                      : "ce-task-button"
                  }
                  onClick={() =>
                    setActiveTask(taskKey)
                  }
                >
                  <span
                    className="ce-task-dot"
                    style={{
                      backgroundColor: task.colour,
                    }}
                  />

                  <span>
                    <strong>{task.name}</strong>
                    <small>{task.shortName}</small>
                  </span>
                </button>
              );
            },
          )}
        </div>
      </section>

      <section className="ce-current-task">
        <div>
          <p className="ce-kicker">
            Current analysis
          </p>

          <h2>
            {taskInformation.name} model evaluation
          </h2>

          <p>
            {taskInformation.description}
          </p>
        </div>

        <div
          className="ce-current-task-badge"
          style={{
            "--task-colour":
              taskInformation.colour,
          }}
        >
          <span>Primary result</span>
          <strong>
            {taskInformation.bestModel}
          </strong>
          <small>
            Test PR-AUC{" "}
            {taskInformation.bestPrAuc.toFixed(3)}
          </small>
        </div>
      </section>

      <section className="ce-summary-grid">
        {summaryCards.map((card) => (
          <article
            className="ce-summary-card"
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

      <nav
        className="ce-section-navigation"
        aria-label="Comparative analysis sections"
      >
        {FIGURE_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
          >
            {section.title}
          </a>
        ))}
      </nav>

      <aside className="ce-method-note">
        <div className="ce-method-note-icon">
          i
        </div>

        <div>
          <strong>
            How to interpret these results
          </strong>

          <p>
            Higher PR-AUC, ROC-AUC, F1, balanced accuracy,
            recall and specificity generally indicate stronger
            performance. For statistical forest plots, a
            confidence interval crossing zero indicates that
            the paired difference may not be statistically
            distinguishable. For adjusted p-value heatmaps,
            values below 0.05 indicate evidence of a
            statistically significant difference after
            adjustment.
          </p>
        </div>
      </aside>

      {FIGURE_SECTIONS.map((section) => (
        <section
          className="ce-analysis-section"
          id={section.id}
          key={section.id}
        >
          <div className="ce-section-heading">
            <div>
              <p className="ce-kicker">
                {section.eyebrow}
              </p>

              <h2>{section.title}</h2>
            </div>

            <p>{section.description}</p>
          </div>

          <div
            className={`ce-figure-grid ce-figure-grid--${section.layout}`}
          >
            {section.figures.map((figure) => (
              <FigureCard
                key={`${activeTask}-${figure.file}`}
                activeTask={activeTask}
                figure={figure}
                onOpen={setSelectedFigure}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="ce-limitations">
        <div>
          <p className="ce-kicker">
            Responsible interpretation
          </p>

          <h2>
            Important analytical considerations
          </h2>
        </div>

        <div className="ce-limitations-grid">
          <article>
            <span>01</span>
            <div>
              <h3>Subgroup sample size</h3>
              <p>
                Performance estimates can become unstable when
                a subgroup contains relatively few admissions
                or positive cases.
              </p>
            </div>
          </article>

          <article>
            <span>02</span>
            <div>
              <h3>Observational clinical data</h3>
              <p>
                Differences may reflect clinical documentation,
                healthcare utilisation and dataset composition,
                rather than only model behaviour.
              </p>
            </div>
          </article>

          <article>
            <span>03</span>
            <div>
              <h3>No clinical replacement</h3>
              <p>
                These results support research comparison and
                do not establish suitability for independent
                clinical decision-making.
              </p>
            </div>
          </article>
        </div>
      </section>

      {selectedFigure && (
        <div
          className="ce-modal"
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
          <div className="ce-modal-content">
            <div className="ce-modal-heading">
              <div>
                <span>
                  {taskInformation.name} analysis
                </span>

                <h2>
                  {selectedFigure.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedFigure(null)
                }
                aria-label="Close enlarged figure"
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

export default SubgroupAnalysis;