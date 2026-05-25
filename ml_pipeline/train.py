import os
import json
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import RobustScaler
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    precision_recall_curve,
    auc,
    confusion_matrix
)
import shap

def main():
    print("="*60)
    print("STARTING ML MODEL TRAINING PIPELINE")
    print("="*60)
    
    # 1. Paths Setup
    pipeline_dir = os.path.dirname(__file__)
    data_path = os.path.join(pipeline_dir, "data", "creditcard.csv")
    models_dir = os.path.join(pipeline_dir, "saved_models")
    os.makedirs(models_dir, exist_ok=True)
    
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset CSV not found at: {data_path}. Run download_dataset.py first.")
        
    # 2. Load Dataset
    print(f"Loading dataset from {data_path}...")
    df = pd.read_csv(data_path)
    print(f"Dataset loaded. Shape: {df.shape}")
    
    # Check class distribution
    class_counts = df["Class"].value_counts()
    print("Class distribution:")
    for cls, count in class_counts.items():
        percentage = (count / len(df)) * 100
        print(f"  Class {cls}: {count} ({percentage:.4f}%)")
        
    X = df.drop(columns=["Class"])
    y = df["Class"]
    
    # 3. Stratified Train-Test Split
    print("Performing stratified train-test split (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Train set shape: {X_train.shape}, Test set shape: {X_test.shape}")
    
    # 4. Feature Preprocessing (Scale Time and Amount)
    print("Fitting RobustScaler on Time and Amount features...")
    scaler = RobustScaler()
    
    # We fit scaler only on training set and transform both
    cols_to_scale = ["Time", "Amount"]
    X_train_scaled = X_train.copy()
    X_test_scaled = X_test.copy()
    
    X_train_scaled[cols_to_scale] = scaler.fit_transform(X_train[cols_to_scale])
    X_test_scaled[cols_to_scale] = scaler.transform(X_test[cols_to_scale])
    
    # Save the fitted scaler
    scaler_path = os.path.join(models_dir, "scaler.pkl")
    joblib.dump(scaler, scaler_path)
    print(f"Saved fitted RobustScaler to: {scaler_path}")
    
    # 5. Handle Imbalance dynamically with scale_pos_weight
    neg_count = sum(y_train == 0)
    pos_count = sum(y_train == 1)
    scale_pos_weight = neg_count / pos_count
    print(f"Calculated scale_pos_weight for XGBoost: {scale_pos_weight:.4f}")
    
    # 6. Train XGBoost Classifier
    print("Training XGBoost Classifier...")
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        eval_metric="logloss"
    )
    
    model.fit(X_train_scaled, y_train)
    print("Model training completed successfully!")
    
    # Save the trained model
    model_joblib_path = os.path.join(models_dir, "xgboost_model.pkl")
    model_json_path = os.path.join(models_dir, "xgboost_model.json")
    
    joblib.dump(model, model_joblib_path)
    model.save_model(model_json_path)
    print(f"Saved model (joblib) to: {model_joblib_path}")
    print(f"Saved model (JSON format) to: {model_json_path}")
    
    # Save feature names list for the backend to validate schema
    feature_names = list(X.columns)
    feature_names_path = os.path.join(models_dir, "feature_names.json")
    with open(feature_names_path, "w") as f:
        json.dump(feature_names, f)
    print(f"Saved feature list schema to: {feature_names_path}")
    
    # 7. Model Evaluation
    print("\n" + "="*30 + " MODEL EVALUATION " + "="*30)
    y_pred = model.predict(X_test_scaled)
    y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    print(f"ROC-AUC Score: {roc_auc:.4f}")
    
    # PR-AUC Calculation
    precision, recall, _ = precision_recall_curve(y_test, y_pred_proba)
    pr_auc = auc(recall, precision)
    print(f"PR-AUC (Precision-Recall Area): {pr_auc:.4f}")
    
    # Risk Score distributions on test set
    risk_labels = []
    for prob in y_pred_proba:
        if prob < 0.3:
            risk_labels.append("LOW")
        elif prob < 0.7:
            risk_labels.append("MEDIUM")
        else:
            risk_labels.append("HIGH")
            
    risk_labels = pd.Series(risk_labels)
    print("\nPlatform Risk Label distribution on Test Set:")
    print(risk_labels.value_counts())
    
    # 8. SHAP Explanations test
    print("\nTesting SHAP Explainer...")
    explainer = shap.TreeExplainer(model)
    
    # We'll explain a small sample of transactions
    sample_size = 5
    sample_indices = X_test_scaled.index[:sample_size]
    sample_X = X_test_scaled.loc[sample_indices]
    
    shap_values = explainer.shap_values(sample_X)
    print(f"Successfully computed SHAP values for {sample_size} sample predictions.")
    print(f"SHAP values matrix shape: {shap_values.shape}")
    
    # Save test metrics metadata for MLOps panel
    metrics_metadata = {
        "accuracy": float(np.mean(y_pred == y_test)),
        "precision": float(classification_report(y_test, y_pred, output_dict=True)["1"]["precision"]),
        "recall": float(classification_report(y_test, y_pred, output_dict=True)["1"]["recall"]),
        "f1_score": float(classification_report(y_test, y_pred, output_dict=True)["1"]["f1-score"]),
        "roc_auc": float(roc_auc),
        "pr_auc": float(pr_auc),
        "class_distribution": {str(k): int(v) for k, v in class_counts.items()}
    }
    
    metrics_path = os.path.join(models_dir, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics_metadata, f, indent=4)
    print(f"Saved MLOps metrics metadata to: {metrics_path}")
    print("="*60)
    print("TRAINING PIPELINE COMPLETED SUCCESSFULLY!")
    print("="*60)

if __name__ == "__main__":
    main()
