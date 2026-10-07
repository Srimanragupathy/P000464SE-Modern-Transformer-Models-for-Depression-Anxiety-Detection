import { useState } from "react";
import { depressionModels } from "../data/depressionModels";

const show = (v) => (v === null || v === undefined ? "—" : v);

export default function DepressionModelsPage() {
  const [selected, setSelected] = useState(depressionModels[0].name);
  const model = depressionModels.find((m) => m.name === selected);

  return (
    <main className="page-content">
      <p className="page-eyebrow">Mental Health Analytics Dashboard</p>
      <h1>Depression Models</h1>

      <section className="placeholder-card">
        <label>
          Model:{" "}
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {depressionModels.map((m) => (
              <option key={m.name} value={m.name}>{m.name}</option>
            ))}
          </select>
        </label>

        <h2>Setup</h2>
        <ul>
          <li>Type: {model.variant}</li>
          <li>Learning rate: {show(model.learningRate)}</li>
          <li>Batch size: {show(model.batchSize)}</li>
          <li>Epochs: {show(model.epochs)}</li>
        </ul>

        <h2>Final metrics</h2>
        <ul>
          <li>AUC: {show(model.auc)}</li>
          <li>F1: {show(model.f1)}</li>
          <li>Precision-recall: {show(model.prAuc)}</li>
        </ul>
      </section>
    </main>
  );
}
