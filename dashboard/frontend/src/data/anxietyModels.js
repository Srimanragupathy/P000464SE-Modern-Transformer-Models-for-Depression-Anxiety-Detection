// Values from verified anxiety run outputs; null means not supplied yet.
export const anxietyModels = [
  {
    "name": "ClinicalBERT",
    "variant": "Fine-tuned",
    "learningRate": 2e-05,
    "batchSize": 8,
    "epochs": 8,
    "auc": 0.881284997831588,
    "f1": 0.5895470383275261,
    "prAuc": 0.6105616125353002,
    "gradientAccumulationSteps": 2,
    "bestEpoch": 3,
    "threshold": 0.8297480940818787,
    "maximumLength": 512,
    "figureDirectory": "clinicalbert"
  },
  {
    "name": "RoBERTa",
    "variant": "Fine-tuned",
    "learningRate": 2e-05,
    "batchSize": 8,
    "epochs": 8,
    "auc": 0.8614432760615864,
    "f1": 0.5800344234079173,
    "prAuc": 0.5900088004095845,
    "gradientAccumulationSteps": 2,
    "bestEpoch": 5,
    "threshold": 0.4321577847003937,
    "maximumLength": 512,
    "figureDirectory": "roberta"
  },
  {
    "name": "DeBERTa",
    "variant": "Fine-tuned",
    "learningRate": 2e-05,
    "batchSize": 8,
    "epochs": 8,
    "auc": 0.8843486139399908,
    "f1": 0.6138976837193801,
    "prAuc": 0.6400499767819846,
    "gradientAccumulationSteps": 2,
    "bestEpoch": 3,
    "threshold": 0.6895840764045715,
    "maximumLength": 512,
    "figureDirectory": "deberta"
  },
  {
    "name": "Clinical Longformer",
    "variant": "Fine-tuned",
    "learningRate": 2e-05,
    "batchSize": 1,
    "epochs": 8,
    "auc": 0.9250426200421442,
    "f1": 0.6574938574938575,
    "prAuc": 0.7134182394389392,
    "gradientAccumulationSteps": 16,
    "bestEpoch": 3,
    "threshold": 0.26223984360694885,
    "maximumLength": 2048,
    "figureDirectory": "clinical-longformer",
    "effectiveBatchSize": 16
  }
];
