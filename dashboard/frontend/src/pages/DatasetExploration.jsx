import { useEffect, useMemo, useState } from "react";
import "./DatasetExploration.css";

const DATASET_SUMMARY = [
  {
    label: "Patient records",
    value: "364,627",
    detail: "Records available in the patient table",
    colour: "blue",
  },
  {
    label: "Hospital admissions",
    value: "546,028",
    detail: "Admissions available before cohort filtering",
    colour: "green",
  },
  {
    label: "Diagnosis records",
    value: "6,364,488",
    detail: "ICD diagnosis records available for label creation",
    colour: "purple",
  },
  {
    label: "Discharge summaries",
    value: "331,793",
    detail: "Clinical notes available for text classification",
    colour: "orange",
  },
];

const RESEARCH_DECISIONS = [
  {
    number: "01",
    title: "Older-adult population",
    value: "Age 60+",
    description:
      "The study included adults aged 60 years and older. This threshold captures the broader older-adult population and provides sufficient data for age-stratified evaluation.",
  },
  {
    number: "02",
    title: "Unit of analysis",
    value: "One admission",
    description:
      "Each hospital admission was treated as one classification example. One discharge-summary record was retained for each eligible admission.",
  },
  {
    number: "03",
    title: "Leakage prevention",
    value: "Patient-level split",
    description:
      "Train, validation and test splits were created at patient level so that admissions belonging to the same patient could not appear in multiple splits.",
  },
  {
    number: "04",
    title: "Outcome labels",
    value: "ICD-9 and ICD-10",
    description:
      "Depression and anxiety labels were derived from reviewed ICD diagnosis codes rather than from model predictions or note keywords.",
  },
  {
    number: "05",
    title: "Clinical text input",
    value: "Masked selected sections",
    description:
      "The final models used masked text from clinically relevant discharge-summary sections. Explicit depression and anxiety terms were masked to reduce direct label leakage.",
  },
  {
    number: "06",
    title: "Primary evaluation metric",
    value: "PR-AUC",
    description:
      "Because positive depression and anxiety cases were less common than controls, PR-AUC was prioritised over accuracy for model selection.",
  },
];

const EXPLORATION_SECTIONS = [
  {
    id: "dataset-structure",
    navigationTitle: "Dataset structure",
    eyebrow: "SOURCE DATA",
    title: "Dataset structure and linkage",
    colour: "#267dad",
    introduction:
      "These visualisations describe the size, structure and linkage quality of the source MIMIC-IV tables.",
    importance:
      "Reliable linkage is essential because patient demographics, hospital admissions, diagnoses and discharge summaries originate from separate tables.",
    decision:
      "The cohort was linked using subject_id and hadm_id. Admissions without the identifiers required for reliable cross-table linkage were not used for modelling.",
    figures: [
      {
        number: "01",
        title: "Source file sizes",
        file: "01_source_file_sizes.png",
        description:
          "Compares the storage size of the source files used during dataset exploration.",
      },
      {
        number: "02",
        title: "Schema complexity",
        file: "02_schema_complexity.png",
        description:
          "Compares the number of columns and structural complexity of the source tables.",
      },
      {
        number: "23",
        title: "Cross-table linkage coverage",
        file: "23_cross_table_linkage_coverage.png",
        description:
          "Shows how successfully admissions and patients could be linked across the required tables.",
      },
      {
        number: "24",
        title: "Dataset table row counts",
        file: "24_dataset_table_row_counts.png",
        description:
          "Shows the number of records available in each source dataset table.",
      },
      {
        number: "25",
        title: "Unique identifier coverage",
        file: "25_unique_identifier_coverage.png",
        description:
          "Summarises unique patient and admission identifier coverage across the tables.",
      },
      {
        number: "16",
        title: "ICD dictionary match coverage",
        file: "16_icd_dictionary_match_coverage.png",
        description:
          "Measures how successfully diagnosis codes were linked to their official ICD descriptions.",
      },
    ],
  },
  {
    id: "patient-demographics",
    navigationTitle: "Patient demographics",
    eyebrow: "STUDY POPULATION",
    title: "Older-adult patient characteristics",
    colour: "#5a67b3",
    introduction:
      "These figures describe the demographic characteristics of the patient population available for cohort development.",
    importance:
      "Age, sex and other demographic variables help describe the study population and support later subgroup analysis.",
    decision:
      "Only patients aged 60 years or older were eligible. Age was grouped into 60–69, 70–79, 80–89 and 90+ bands for interpretable subgroup reporting.",
    figures: [
      {
        number: "03",
        title: "Patient gender distribution",
        file: "03_patient_gender_distribution.png",
        description:
          "Shows the recorded gender distribution in the source patient population.",
      },
      {
        number: "04",
        title: "Patient anchor-age distribution",
        file: "04_patient_anchor_age_distribution.png",
        description:
          "Displays the overall distribution of patient anchor ages.",
      },
      {
        number: "05",
        title: "Patient age bands",
        file: "05_patient_age_bands.png",
        description:
          "Groups eligible older adults into age bands used for descriptive and subgroup analysis.",
        highlight:
          "Research decision: the final cohort was restricted to patients aged 60 years and older.",
      },
      {
        number: "06",
        title: "Patient anchor-year groups",
        file: "06_patient_anchor_year_groups.png",
        description:
          "Summarises the de-identified anchor-year groups represented in MIMIC-IV.",
      },
      {
        number: "09",
        title: "Race distribution",
        file: "09_race_distribution.png",
        description:
          "Shows the distribution of recorded race categories in the available admission data.",
      },
      {
        number: "10",
        title: "Marital-status distribution",
        file: "10_marital_status_distribution.png",
        description:
          "Shows the distribution of recorded marital-status categories.",
      },
    ],
  },
  {
    id: "admissions",
    navigationTitle: "Admissions",
    eyebrow: "HOSPITAL ENCOUNTERS",
    title: "Hospital admission characteristics",
    colour: "#278a68",
    introduction:
      "These figures describe admission frequency, admission types and hospital length of stay.",
    importance:
      "Some patients have multiple admissions. Without patient-level splitting, notes from the same patient could appear in both training and testing data and produce overly optimistic results.",
    decision:
      "The admission was used as the modelling unit, but dataset splitting was performed using subject_id so that all admissions from one patient remained in a single split.",
    figures: [
      {
        number: "07",
        title: "Admissions per patient",
        file: "07_admissions_per_patient.png",
        description:
          "Shows how many hospital admissions were recorded for each patient.",
        highlight:
          "This finding supported patient-level rather than admission-level dataset splitting.",
      },
      {
        number: "08",
        title: "Admission-type distribution",
        file: "08_admission_type_distribution.png",
        description:
          "Compares emergency, urgent, elective and other recorded admission types.",
      },
      {
        number: "11",
        title: "Hospital length of stay",
        file: "11_hospital_length_of_stay.png",
        description:
          "Displays the distribution of hospital stay duration across admissions.",
      },
    ],
  },
  {
    id: "diagnoses",
    navigationTitle: "Diagnoses and labels",
    eyebrow: "OUTCOME CONSTRUCTION",
    title: "Diagnosis records and ICD labels",
    colour: "#825aa3",
    introduction:
      "These visualisations describe the diagnosis data used to create the depression and anxiety outcome labels.",
    importance:
      "The quality of ICD linkage directly affects label reliability. Both ICD-9 and ICD-10 records had to be handled consistently.",
    decision:
      "Candidate depression and anxiety codes were identified and checked against the official ICD dictionary. Final task labels were created from diagnosis codes, not from words appearing in the discharge note.",
    figures: [
      {
        number: "12",
        title: "ICD-version distribution",
        file: "12_icd_version_distribution.png",
        description:
          "Compares the number of ICD-9 and ICD-10 diagnosis records.",
      },
      {
        number: "13",
        title: "Primary and secondary diagnoses",
        file: "13_primary_secondary_diagnoses.png",
        description:
          "Compares the availability of primary and secondary diagnosis records.",
      },
      {
        number: "14",
        title: "Diagnoses per admission",
        file: "14_diagnoses_per_admission.png",
        description:
          "Shows the number of diagnosis records associated with each hospital admission.",
      },
      {
        number: "15",
        title: "Most common diagnoses",
        file: "15_most_common_diagnoses.png",
        description:
          "Displays the most frequently occurring diagnosis descriptions in the source data.",
        wide: true,
      },
    ],
  },
  {
    id: "discharge-notes",
    navigationTitle: "Discharge notes",
    eyebrow: "CLINICAL TEXT",
    title: "Discharge-summary characteristics",
    colour: "#c17635",
    introduction:
      "These figures describe the quantity, length, completeness and quality of the discharge summaries used as model input.",
    importance:
      "Transformer models have fixed context limits. Understanding note length and missingness was therefore necessary before selecting the text profile and maximum token lengths.",
    decision:
      "The final input used masked text_selected content from past medical history, chief complaint, history of present illness, medications on admission, discharge medications and brief hospital course. Clinical Longformer used a 2,048-token context, while the other models used 512 tokens.",
    figures: [
      {
        number: "17",
        title: "Discharge-note character counts",
        file: "17_discharge_character_counts.png",
        description:
          "Shows discharge-summary length measured using the number of characters.",
      },
      {
        number: "18",
        title: "Discharge-note word counts",
        file: "18_discharge_word_counts.png",
        description:
          "Shows discharge-summary length measured using the number of words.",
        highlight:
          "Long note lengths motivated testing Clinical Longformer with a larger context window.",
      },
      {
        number: "19",
        title: "Discharge notes per admission",
        file: "19_discharge_notes_per_admission.png",
        description:
          "Shows how many discharge-note records were linked to each hospital admission.",
      },
      {
        number: "20",
        title: "Discharge-note quality",
        file: "20_discharge_note_quality.png",
        description:
          "Summarises quality checks performed on the available discharge summaries.",
      },
      {
        number: "21",
        title: "Discharge-detail missingness",
        file: "21_discharge_detail_missingness.png",
        description:
          "Shows missing-value levels across important discharge-note metadata fields.",
      },
      {
        number: "22",
        title: "Discharge-detail coverage",
        file: "22_discharge_detail_coverage.png",
        description:
          "Shows coverage of important discharge-summary information.",
      },
    ],
  },
];

function DatasetExploration() {
  const [selectedSection, setSelectedSection] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [selectedFigure, setSelectedFigure] = useState(null);
  const [failedImages, setFailedImages] = useState({});

  const figureBasePath = `${
    import.meta.env.BASE_URL || "/"
  }dashboard_figures/`;

  const visibleSections = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return EXPLORATION_SECTIONS.filter(
      (section) =>
        selectedSection === "all" || section.id === selectedSection
    )
      .map((section) => {
        const figures = section.figures.filter((figure) => {
          if (!query) {
            return true;
          }

          return [
            section.title,
            section.introduction,
            section.importance,
            section.decision,
            figure.title,
            figure.description,
            figure.highlight || "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        });

        return {
          ...section,
          figures,
        };
      })
      .filter((section) => section.figures.length > 0);
  }, [searchText, selectedSection]);

  const visibleFigureCount = visibleSections.reduce(
    (total, section) => total + section.figures.length,
    0
  );

  useEffect(() => {
    if (!selectedFigure) {
      return undefined;
    }

    const closeWithEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedFigure(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeWithEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [selectedFigure]);

  const handleImageError = (filename) => {
    setFailedImages((current) => ({
      ...current,
      [filename]: true,
    }));
  };

  return (
    <main className="dataset-page">
      <header className="dataset-hero">
        <div className="dataset-hero-content">
          <p className="dataset-eyebrow">MIMIC-IV DATA EXPLORATION</p>

          <h1>Understanding the clinical dataset</h1>

          <p className="dataset-hero-description">
            This page presents the exploratory analysis used to define the
            older-adult cohort, construct depression and anxiety labels,
            select the clinical-note content and prepare reliable train,
            validation and test datasets.
          </p>

          <div className="dataset-hero-tags">
            <span>Adults aged 60+</span>
            <span>Patient-level splitting</span>
            <span>Masked clinical text</span>
            <span>ICD-derived labels</span>
          </div>
        </div>

        <div className="dataset-hero-status">
          <span className="dataset-status-dot" />

          <div>
            <strong>Exploration completed</strong>
            <small>Figures generated from the final notebook</small>
          </div>
        </div>
      </header>

      <section
        className="dataset-summary-grid"
        aria-label="Source dataset summary"
      >
        {DATASET_SUMMARY.map((item) => (
          <article
            className={`dataset-summary-card dataset-summary-${item.colour}`}
            key={item.label}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="dataset-decisions-section">
        <div className="dataset-section-heading">
          <div>
            <p className="dataset-eyebrow">RESEARCH DESIGN</p>
            <h2>Key decisions informed by exploration</h2>
          </div>

          <p>
            These decisions were made before model training and were applied
            consistently across the depression and anxiety tasks.
          </p>
        </div>

        <div className="dataset-decisions-grid">
          {RESEARCH_DECISIONS.map((decision) => (
            <article className="dataset-decision-card" key={decision.number}>
              <span className="dataset-decision-number">
                {decision.number}
              </span>

              <div>
                <p>{decision.title}</p>
                <h3>{decision.value}</h3>
                <span>{decision.description}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="dataset-privacy-note">
        <div className="dataset-note-icon">i</div>

        <div>
          <h2>Privacy and responsible presentation</h2>

          <p>
            This dashboard displays only aggregated statistics and generated
            figures. It does not expose raw discharge-note text or patient
            identifiers.
          </p>
        </div>
      </aside>

      <section className="dataset-results-section">
        <div className="dataset-section-heading dataset-results-heading">
          <div>
            <p className="dataset-eyebrow">NOTEBOOK OUTPUTS</p>
            <h2>Exploration figures</h2>
          </div>

          <span className="dataset-figure-count">
            {visibleFigureCount}{" "}
            {visibleFigureCount === 1 ? "figure" : "figures"}
          </span>
        </div>

        <div className="dataset-controls">
          <div
            className="dataset-category-buttons"
            aria-label="Exploration categories"
          >
            <button
              type="button"
              className={
                selectedSection === "all"
                  ? "dataset-category-button dataset-category-active"
                  : "dataset-category-button"
              }
              onClick={() => setSelectedSection("all")}
            >
              All sections
            </button>

            {EXPLORATION_SECTIONS.map((section) => (
              <button
                type="button"
                key={section.id}
                className={
                  selectedSection === section.id
                    ? "dataset-category-button dataset-category-active"
                    : "dataset-category-button"
                }
                onClick={() => setSelectedSection(section.id)}
              >
                {section.navigationTitle}
              </button>
            ))}
          </div>

          <label className="dataset-search">
            <span className="dataset-visually-hidden">
              Search exploration figures
            </span>

            <input
              type="search"
              value={searchText}
              placeholder="Search figures..."
              onChange={(event) => setSearchText(event.target.value)}
            />

            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>
        </div>

        {visibleSections.length === 0 && (
          <div className="dataset-empty-state">
            <h3>No figures found</h3>
            <p>Try using a different search term or category.</p>

            <button
              type="button"
              onClick={() => {
                setSearchText("");
                setSelectedSection("all");
              }}
            >
              Show all figures
            </button>
          </div>
        )}

        {visibleSections.map((section) => (
          <section
            className="dataset-figure-section"
            key={section.id}
            style={{ "--dataset-accent": section.colour }}
          >
            <div className="dataset-figure-section-header">
              <div className="dataset-figure-section-title">
                <p>{section.eyebrow}</p>
                <h2>{section.title}</h2>
                <span>{section.introduction}</span>
              </div>

              <div className="dataset-section-summary">
                <div>
                  <strong>Why this matters</strong>
                  <p>{section.importance}</p>
                </div>

                <div className="dataset-section-decision">
                  <strong>Decision taken</strong>
                  <p>{section.decision}</p>
                </div>
              </div>
            </div>

            <div className="dataset-figure-grid">
              {section.figures.map((figure) => (
                <article
                  className={`dataset-figure-card ${
                    figure.wide ? "dataset-figure-card-wide" : ""
                  }`}
                  key={figure.file}
                >
                  <button
                    type="button"
                    className="dataset-figure-preview"
                    onClick={() =>
                      !failedImages[figure.file] &&
                      setSelectedFigure({
                        ...figure,
                        sectionTitle: section.title,
                      })
                    }
                    aria-label={`Open enlarged ${figure.title} figure`}
                  >
                    {failedImages[figure.file] ? (
                      <div className="dataset-image-error">
                        <strong>Figure could not be loaded</strong>
                        <span>{figure.file}</span>
                      </div>
                    ) : (
                      <>
                        <img
                          src={`${figureBasePath}${figure.file}`}
                          alt={figure.title}
                          loading="lazy"
                          onError={() => handleImageError(figure.file)}
                        />

                        <span className="dataset-enlarge-label">
                          View larger
                        </span>
                      </>
                    )}
                  </button>

                  <div className="dataset-figure-content">
                    <span className="dataset-figure-number">
                      Figure {figure.number}
                    </span>

                    <h3>{figure.title}</h3>
                    <p>{figure.description}</p>

                    {figure.highlight && (
                      <div className="dataset-figure-highlight">
                        <strong>Project relevance</strong>
                        <span>{figure.highlight}</span>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </section>

      <section className="dataset-outcome-section">
        <p className="dataset-eyebrow">OUTCOME OF EXPLORATION</p>
        <h2>How these findings shaped model development</h2>

        <div className="dataset-outcome-grid">
          <article>
            <span>01</span>
            <h3>Cohort construction</h3>
            <p>
              Eligible admissions were restricted to patients aged 60 years
              and older and linked across the patient, admission, diagnosis
              and discharge-note tables.
            </p>
          </article>

          <article>
            <span>02</span>
            <h3>Task preparation</h3>
            <p>
              Separate depression and anxiety datasets were created using ICD
              labels while preserving identical patient-level split logic.
            </p>
          </article>

          <article>
            <span>03</span>
            <h3>Text preparation</h3>
            <p>
              Clinically relevant discharge sections were selected and direct
              depression and anxiety expressions were masked to reduce
              leakage.
            </p>
          </article>

          <article>
            <span>04</span>
            <h3>Model evaluation</h3>
            <p>
              Class imbalance observed during exploration supported the use
              of PR-AUC as the primary model-selection metric.
            </p>
          </article>
        </div>
      </section>

      {selectedFigure && (
        <div
          className="dataset-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dataset-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedFigure(null);
            }
          }}
        >
          <div className="dataset-modal-content">
            <div className="dataset-modal-header">
              <div>
                <span>{selectedFigure.sectionTitle}</span>

                <h2 id="dataset-modal-title">
                  {selectedFigure.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFigure(null)}
                aria-label="Close enlarged figure"
              >
                ×
              </button>
            </div>

            <div className="dataset-modal-image">
              <img
                src={`${figureBasePath}${selectedFigure.file}`}
                alt={selectedFigure.title}
              />
            </div>

            <p>{selectedFigure.description}</p>

            {selectedFigure.highlight && (
              <div className="dataset-modal-highlight">
                <strong>Project relevance</strong>
                <span>{selectedFigure.highlight}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default DatasetExploration;