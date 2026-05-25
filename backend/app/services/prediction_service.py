import os
import sys
from sqlalchemy.orm import Session
from datetime import datetime

# Allow backend/app to import from the sibling ml_pipeline directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from ml_pipeline.explain import explainer_service
from ..models.models import Prediction, Alert, Incident
from ..core.websocket_manager import ws_manager

async def create_prediction(db: Session, features: dict) -> Prediction:
    """
    Invokes the ML explanation pipeline to compute risk scores, SHAP explanations,
    logs the result to the DB, triggers relevant alerts/incidents based on risk thresholds,
    and streams updates to connected UI clients over WebSockets.
    """
    # 1. Run ML inference and explainability pipeline
    explanation = explainer_service.explain(features)
    
    risk_score = explanation["risk_score"]
    label = explanation["label"]
    confidence = explanation["confidence"]
    
    # 2. Save prediction record to Database
    db_prediction = Prediction(
        risk_score=risk_score,
        label=label,
        confidence=confidence,
        explanation=explanation,  # JSON column
        features=features         # JSON column
    )
    db.add(db_prediction)
    db.commit()
    db.refresh(db_prediction)
    
    # 3. Intelligent Alert Thresholds (LOW, MEDIUM, HIGH)
    db_alert = None
    if label in ["MEDIUM", "HIGH"]:
        severity = label
        message = f"Suspicious activity detected! High risk transaction flagged. Score: {risk_score:.4f} ({label})"
        
        db_alert = Alert(
            severity=severity,
            message=message,
            status="ACTIVE",
            prediction_id=db_prediction.id
        )
        db.add(db_alert)
        db.commit()
        db.refresh(db_alert)
        
    # 4. Automatic Incident Logging for HIGH threat anomalies
    db_incident = None
    if label == "HIGH":
        db_incident = Incident(
            type="FRAUD_ATTEMPT",
            severity="HIGH",
            description=f"Automated threat block: High risk transaction (Score: {risk_score:.4f}) triggered security incident.",
            prediction_id=db_prediction.id,
            status="OPEN"
        )
        db.add(db_incident)
        db.commit()
        db.refresh(db_incident)
        
    # 5. Broadcast to real-time WebSockets Dashboard
    ws_payload = {
        "event_type": "PREDICTION_CREATED",
        "timestamp": datetime.utcnow().isoformat(),
        "prediction": {
            "id": db_prediction.id,
            "risk_score": risk_score,
            "label": label,
            "confidence": confidence,
            "created_at": db_prediction.created_at.isoformat(),
            "amount": features.get("Amount", 0.0),
            "time": features.get("Time", 0.0)
        }
    }
    
    if db_alert:
        ws_payload["alert"] = {
            "id": db_alert.id,
            "severity": db_alert.severity,
            "message": db_alert.message,
            "status": db_alert.status,
            "created_at": db_alert.created_at.isoformat()
        }
        
    if db_incident:
        ws_payload["incident"] = {
            "id": db_incident.id,
            "type": db_incident.type,
            "severity": db_incident.severity,
            "status": db_incident.status,
            "created_at": db_incident.created_at.isoformat()
        }
        
    # Broadcast to all active websockets
    await ws_manager.broadcast_json(ws_payload)
    
    return db_prediction
