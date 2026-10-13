// Fill these in from the real output files (training_history.csv and
// test_classification_report.csv). null means "not added yet".
export const depressionModels = [
  { name: "ClinicalBERT", variant: "Fine-tuned", learningRate: 2e-05, batchSize: 8, epochs: 8, auc: 0.8934698080266014, f1: 0.6889213436261215, prAuc: 0.6959836566278795, gradientAccumulationSteps: 2, bestEpoch: 2, threshold: 0.6041570901870728, maximumLength: 512, figureDirectory: "clinicalbert" },
  { name: "RoBERTa", variant: "Fine-tuned", learningRate: 2e-05, batchSize: 8, epochs: 8, auc: 0.886908898415023, f1: 0.6802019550972177, prAuc: 0.6904116437635672, gradientAccumulationSteps: 2, bestEpoch: 5, threshold: 0.6614400744438171, maximumLength: 512, figureDirectory: "roberta" },
  { name: "DeBERTa", variant: "Fine-tuned", learningRate: 2e-05, batchSize: 8, epochs: 8, auc: 0.9133949989528389, f1: 0.6962626062883133, prAuc: 0.7314886198295987, gradientAccumulationSteps: 2, bestEpoch: 4, threshold: 0.6366170048713684, maximumLength: 512, figureDirectory: "deberta" },
  { name: "Clinical Longformer", figureDirectory: "clinical-longformer", variant: "Fine-tuned", learningRate: 2e-05, batchSize: 1, epochs: 8, auc: 0.9362377343620414, f1: 0.7298082510168507, prAuc: 0.7852497402503443, effectiveBatchSize: 16, gradientAccumulationSteps: 16, bestEpoch: 4, threshold: 0.22004921734333038, maximumLength: 2048 },
];
