import { useState } from "react";
import { anxietyModels } from "../data/anxietyModels";

const metric = (v) => v == null ? "—" : v.toFixed(4);
const show = (v) => (v === null || v === undefined ? "—" : v);

export default function AnxietyModelsPage() {
  const [selected, setSelected] = useState(anxietyModels[0].name);
  const model = anxietyModels.find((m) => m.name === selected);

  return (
    <main className="page-content">
      <p className="page-eyebrow">Mental Health Analytics Dashboard</p>
      <h1>Anxiety Models</h1>

      <section className="placeholder-card">
        <label>
          Model:{" "}
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {anxietyModels.map((m) => (
              <option key={m.name} value={m.name}>{m.name}</option>
            ))}
          </select>
        </label>

        <h2>Setup</h2>
        <ul>
          <li>Type: {model.variant}</li>
          <li>Learning rate: {show(model.learningRate)}</li>
          <li>Training batch size: {show(model.batchSize)}</li>
          <li>Completed epochs: {show(model.epochs)}</li>
          {model.effectiveBatchSize != null && <li>Effective batch size: {model.effectiveBatchSize} (gradient accumulation: {model.gradientAccumulationSteps} steps)</li>}
          {model.effectiveBatchSize == null && model.gradientAccumulationSteps != null && <li>Gradient accumulation: {model.gradientAccumulationSteps} steps</li>}
          {model.bestEpoch != null && <li>Best checkpoint: epoch {model.bestEpoch}, selected by validation PR-AUC</li>}
          {model.maximumLength != null && <li>Maximum input: {model.maximumLength} tokens; truncation, no chunking</li>}
        </ul>

        <h2>Test metrics</h2>
        <ul>
          <li>ROC-AUC: {metric(model.auc)}</li>
          <li>F1 (anxiety class): {metric(model.f1)}</li>
          <li>PR-AUC: {metric(model.prAuc)}</li>
          {model.threshold != null && <li>Decision threshold: {metric(model.threshold)} (selected on validation data)</li>}
        </ul>
      </section>

      <section className="placeholder-card" aria-labelledby="results-heading">
        <h2 id="results-heading">Saved training and evaluation results</h2>
        {model.figureDirectory ? (
          <>
            <p>Static figures from the completed {model.name} anxiety run.</p>
            {[
              ["training_validation_accuracy_loss", "Training and validation accuracy and loss"],
              ["test_confusion_matrix", "Test confusion matrix"],
              ["test_roc_pr_curves", "Test ROC and precision-recall curves"],
              ["validation_metrics_by_epoch", "Validation metrics by epoch"],
              ["validation_threshold_selection", "Validation threshold selection"],
              ["class_distribution", "Class distribution"],
              ["token_length_distribution", "Token length distribution"],
            ].map(([file, title]) => (
              <figure key={file} style={{ margin: "24px 0" }}>
                <figcaption><h3>{title}</h3></figcaption>
                <a href={`${import.meta.env.BASE_URL}figures/anxiety/${model.figureDirectory}/${file}.png`} target="_blank" rel="noreferrer">
                  <img src={`${import.meta.env.BASE_URL}figures/anxiety/${model.figureDirectory}/${file}.png`} alt={`${model.name} anxiety: ${title}`} loading="lazy" style={{ display: "block", width: "100%", height: "auto" }} />
                </a>
              </figure>
            ))}
          </>
        ) : <p>Result figures have not been added for this model yet.</p>}
      </section>
    </main>
  );
}
