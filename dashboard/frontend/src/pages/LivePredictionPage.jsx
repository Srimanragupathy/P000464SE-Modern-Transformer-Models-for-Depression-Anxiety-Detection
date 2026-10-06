import { useState } from "react";

import RiskGauge from "../components/RiskGauge";
import { predictClinicalNote } from "../services/predictionApi";
import "./LivePredictionPage.css";

const exampleNote = `CHIEF COMPLAINT:
Reduced appetite and difficulty sleeping.

HISTORY OF PRESENT ILLNESS:
The patient reports low energy and reduced interest in usual activities over the previous several weeks. Family members report that the patient has become increasingly withdrawn.

PAST MEDICAL HISTORY:
Hypertension and type 2 diabetes mellitus.

SOCIAL HISTORY:
The patient lives alone and receives weekly visits from family members.

MEDICATIONS ON ADMISSION:
Metformin and amlodipine.

BRIEF HOSPITAL COURSE:
The patient remained medically stable during admission.`;

export default function LivePredictionPage() {
  const [note, setNote] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isPredicting, setIsPredicting] =
    useState(false);

  async function handlePrediction(event) {
    event.preventDefault();

    if (!note.trim()) {
      setError("Please enter a clinical note.");
      return;
    }

    setError("");
    setResult(null);
    setIsPredicting(true);

    try {
      const predictionResult =
        await predictClinicalNote(note);

      setResult(predictionResult);
    } catch (requestError) {
      const responseMessage =
        requestError.response?.data?.error;

      setError(
        responseMessage ||
          "The prediction request failed. Check that the Flask backend and model files are available.",
      );
    } finally {
      setIsPredicting(false);
    }
  }

  function handleClear() {
    setNote("");
    setResult(null);
    setError("");
  }

  return (
    <main className="prediction-page">
      <header className="prediction-header">
        <div>
          <p className="prediction-eyebrow">
            Clinical Longformer
          </p>

          <h1>Live Depression and Anxiety Prediction</h1>

          <p>
            Enter a clinical note to obtain separate
            depression and anxiety model-estimated
            probabilities.
          </p>
        </div>
      </header>

      <section className="prediction-notice">
        <strong>Research use only.</strong>
        <span>
          These predictions do not constitute a clinical
          diagnosis and must not replace professional
          assessment.
        </span>
      </section>

      <form
        className="prediction-form"
        onSubmit={handlePrediction}
      >
        <div className="prediction-form__heading">
          <div>
            <h2>Clinical note</h2>

            <p>
              Paste a discharge note containing the clinical
              sections used during model training.
            </p>
          </div>

          <span>
            {note.length.toLocaleString()} characters
          </span>
        </div>

        <textarea
          value={note}
          onChange={(event) =>
            setNote(event.target.value)
          }
          placeholder="Paste the clinical note here..."
          rows={18}
          disabled={isPredicting}
        />

        <div className="prediction-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setNote(exampleNote)}
            disabled={isPredicting}
          >
            Insert example
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={handleClear}
            disabled={isPredicting}
          >
            Clear
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={isPredicting || !note.trim()}
          >
            {isPredicting
              ? "Analysing note..."
              : "Generate predictions"}
          </button>
        </div>
      </form>

      {error && (
        <section className="prediction-error">
          {error}
        </section>
      )}

      {isPredicting && (
        <section className="prediction-loading">
          <div className="prediction-spinner" />
          <div>
            <strong>Running both models</strong>
            <p>
              The first request may take longer while the
              model files are loaded.
            </p>
          </div>
        </section>
      )}

      {result && (
        <>
          <section className="prediction-results">
            <RiskGauge
              title="Depression"
              result={result.predictions.depression}
              color="#3c78d8"
            />

            <RiskGauge
              title="Anxiety"
              result={result.predictions.anxiety}
              color="#8e5bb7"
            />
          </section>

          <section className="preprocessing-summary">
            <h2>Input processing summary</h2>

            <div className="summary-grid">
              <div>
                <span>Clinical sections identified</span>
                <strong>
                  {
                    result.preprocessing
                      .matched_section_count
                  }
                </strong>
              </div>

              <div>
                <span>Original characters</span>
                <strong>
                  {result.preprocessing.original_character_count.toLocaleString()}
                </strong>
              </div>

              <div>
                <span>Selected characters</span>
                <strong>
                  {result.preprocessing.selected_character_count.toLocaleString()}
                </strong>
              </div>

              <div>
                <span>Full-text fallback</span>
                <strong>
                  {result.preprocessing
                    .used_full_text_fallback
                    ? "Yes"
                    : "No"}
                </strong>
              </div>
            </div>

            {result.preprocessing.matched_sections
              .length > 0 && (
              <div className="matched-sections">
                <span>Sections used:</span>

                <div>
                  {result.preprocessing.matched_sections.map(
                    (section) => (
                      <span
                        className="section-badge"
                        key={section}
                      >
                        {section}
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}