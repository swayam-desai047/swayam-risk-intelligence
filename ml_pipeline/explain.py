import os
import json
import joblib
import pandas as pd
import numpy as np
import xgboost as xgb
import shap

class RiskExplainerService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RiskExplainerService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        pipeline_dir = os.path.dirname(__file__)
        models_dir = os.path.join(pipeline_dir, "saved_models")
        
        self.model_path = os.path.join(models_dir, "xgboost_model.pkl")
        self.scaler_path = os.path.join(models_dir, "scaler.pkl")
        self.features_path = os.path.join(models_dir, "feature_names.json")
        
        self.model = None
        self.scaler = None
        self.feature_names = None
        self.explainer = None
        self._initialized = True
        
    def load_resources(self):
        """Loads model, scaler, and constructs the SHAP TreeExplainer if not already loaded."""
        if self.model is not None:
            return True
            
        if not os.path.exists(self.model_path) or not os.path.exists(self.scaler_path):
            print("Model and scaler resources not found! Run the training script first.")
            return False
            
        print("Loading ML model and scaler into memory...")
        self.model = joblib.load(self.model_path)
        self.scaler = joblib.load(self.scaler_path)
        
        with open(self.features_path, "r") as f:
            self.feature_names = json.load(f)
            
        # Initialize TreeExplainer (instantly works on XGBoost models)
        print("Initializing SHAP TreeExplainer...")
        self.explainer = shap.TreeExplainer(self.model)
        print("Resources loaded successfully!")
        return True

    def explain(self, input_features: dict):
        """
        Takes a raw transaction dictionary, scales the necessary columns,
        runs inference, computes SHAP, and returns a detailed explanation.
        """
        if not self.load_resources():
            raise FileNotFoundError("Model assets are not available. Please run training pipeline first.")
            
        # Ensure all required features are present
        missing = [col for col in self.feature_names if col not in input_features]
        if missing:
            raise ValueError(f"Missing required input features: {missing}")
            
        # Create single row DataFrame in correct feature order
        row_df = pd.DataFrame([input_features])[self.feature_names]
        
        # Scale 'Time' and 'Amount' using our fitted RobustScaler
        cols_to_scale = ["Time", "Amount"]
        row_scaled = row_df.copy()
        row_scaled[cols_to_scale] = self.scaler.transform(row_df[cols_to_scale])
        
        # Run prediction
        prob = float(self.model.predict_proba(row_scaled)[0, 1])
        
        # Classify risk score into HIGH / MEDIUM / LOW
        if prob < 0.3:
            label = "LOW"
        elif prob < 0.7:
            label = "MEDIUM"
        else:
            label = "HIGH"
            
        # Calculate confidence score
        # (e.g., if prob is close to 0 or 1, high confidence, if close to 0.5, lower confidence)
        confidence = float(1.0 - 2.0 * abs(prob - round(prob)) if prob >= 0.3 and prob < 0.7 else 0.85 + 0.15 * abs(prob - round(prob)))
        
        # Compute SHAP values
        shap_vals = self.explainer.shap_values(row_scaled)[0]
        
        # Parse feature attributions
        attributions = []
        for col, s_val in zip(self.feature_names, shap_vals):
            raw_val = float(row_df[col].iloc[0])
            scaled_val = float(row_scaled[col].iloc[0])
            attributions.append({
                "feature": col,
                "shap_value": float(s_val),
                "original_value": raw_val,
                "scaled_value": scaled_val
            })
            
        # Sort contributions
        # Positive values drove the risk score up
        top_positive = sorted([x for x in attributions if x["shap_value"] > 0], key=lambda x: x["shap_value"], reverse=True)
        # Negative values drove the risk score down
        top_negative = sorted([x for x in attributions if x["shap_value"] < 0], key=lambda x: x["shap_value"])
        
        return {
            "risk_score": prob,
            "label": label,
            "confidence": confidence,
            "top_positive_features": top_positive[:5],
            "top_negative_features": top_negative[:5],
            "all_attributions": attributions
        }

# Global singleton
explainer_service = RiskExplainerService()
