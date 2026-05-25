from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

# --- Authentication Schemas ---

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: Optional[str] = "USER"  # USER, ADMIN

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


# --- Prediction Schemas ---

class PredictionCreate(BaseModel):
    # Expect a dictionary of transaction features
    # V1 to V28, Time, Amount
    features: Dict[str, float]

class FeatureAttribution(BaseModel):
    feature: str
    shap_value: float
    original_value: float
    scaled_value: float

class PredictionExplanation(BaseModel):
    risk_score: float
    label: str
    confidence: float
    top_positive_features: List[FeatureAttribution]
    top_negative_features: List[FeatureAttribution]
    all_attributions: List[FeatureAttribution]

class PredictionOut(BaseModel):
    id: int
    risk_score: float
    label: str
    confidence: float
    explanation: Dict[str, Any]  # contains the compiled SHAP details
    features: Dict[str, float]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Alert Schemas ---

class AlertOut(BaseModel):
    id: int
    severity: str
    message: str
    status: str
    prediction_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Incident Schemas ---

class IncidentCreate(BaseModel):
    type: str
    severity: str
    description: str
    prediction_id: Optional[int] = None

class IncidentOut(BaseModel):
    id: int
    type: str
    severity: str
    description: str
    prediction_id: Optional[int] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- MLOps Schemas ---

class ModelVersionOut(BaseModel):
    id: int
    version: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    pr_auc: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
