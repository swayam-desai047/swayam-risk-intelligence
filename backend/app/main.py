import os
import sys
import asyncio
import random
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

# Add project root to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from app.db.database import engine, Base, get_db, SessionLocal
from app.models.models import User, Prediction, Alert, Incident, ModelVersion
from app.schemas.schemas import (
    UserCreate, UserOut, Token, PredictionCreate, PredictionOut,
    AlertOut, IncidentCreate, IncidentOut
)
from app.core.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_admin_user
)
from app.services.prediction_service import create_prediction
from app.core.websocket_manager import ws_manager
from ml_pipeline.explain import explainer_service

# 1. Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-Powered Risk Intelligence Platform API",
    description="Enterprise operational risk classification and real-time SHAP-based explanations backend.",
    version="1.0.0"
)

# 2. CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development ease, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Create a default admin user on startup
@app.on_event("startup")
def create_default_accounts():
    db = next(get_db())
    try:
        admin_exists = db.query(User).filter(User.role == "ADMIN").first()
        if not admin_exists:
            print("Creating default admin account...")
            default_admin = User(
                name="Swayam Desai",
                email="admin@riskplatform.com",
                hashed_password=hash_password("admin123"),
                role="ADMIN"
            )
            db.add(default_admin)
            db.commit()
            print("Default admin account created: admin@riskplatform.com / admin123")
    except Exception as e:
        print(f"Error creating default accounts: {e}")
    finally:
        db.close()

# Start background simulation task
@app.on_event("startup")
async def start_background_telemetry():
    asyncio.create_task(simulate_live_threat_feed())


# --- AUTHENTICATION ROUTES ---

@app.post("/auth/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )
    
    new_user = User(
        name=user_in.name,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role
    }


# --- PREDICTION ROUTES ---

@app.post("/predict", response_model=PredictionOut)
async def predict_risk(payload: PredictionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        db_prediction = await create_prediction(db, payload.features)
        return db_prediction
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/predictions", response_model=List[PredictionOut])
def get_predictions(
    label: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Prediction)
    if label:
        query = query.filter(Prediction.label == label)
    
    return query.order_by(Prediction.created_at.desc()).limit(limit).offset(offset).all()


# --- ALERTS & INCIDENTS ROUTES ---

@app.get("/alerts", response_model=List[AlertOut])
def get_alerts(status: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    return query.order_by(Alert.created_at.desc()).limit(50).all()

@app.get("/incidents", response_model=List[IncidentOut])
def get_incidents(status: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    return query.order_by(Incident.created_at.desc()).limit(50).all()

@app.post("/incidents", response_model=IncidentOut, status_code=status.HTTP_201_CREATED)
def create_manual_incident(payload: IncidentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    incident = Incident(
        type=payload.type,
        severity=payload.severity,
        description=payload.description,
        prediction_id=payload.prediction_id,
        status="OPEN"
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


# --- MLOps RETRAINING & METRICS ---

@app.get("/retrain/metrics")
def get_model_metrics(current_user: User = Depends(get_admin_user)):
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    metrics_path = os.path.join(root_dir, "ml_pipeline", "saved_models", "metrics.json")
    
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            import json
            return json.load(f)
    else:
        # Fallback if training is not complete yet
        return {
            "status": "awaiting_training",
            "message": "Model training is currently in progress or model files are missing."
        }

@app.post("/retrain/trigger")
def trigger_retraining(background_tasks: BackgroundTasks, current_user: User = Depends(get_admin_user)):
    """Triggers model training in the background so the API is not blocked."""
    def run_training_script():
        import subprocess
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        # Execute train.py using virtual environment python
        python_bin = os.path.join(root_dir, "venv", "Scripts", "python.exe")
        train_script = os.path.join(root_dir, "ml_pipeline", "train.py")
        print(f"Triggering asynchronous retraining via: {python_bin} {train_script}")
        subprocess.run([python_bin, train_script], capture_output=True)

    background_tasks.add_task(run_training_script)
    return {"status": "retraining_triggered", "message": "Model retraining pipeline launched successfully in background."}


# --- WEBSOCKET CLIENT STREAMING ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for messages if needed
            data = await websocket.receive_text()
            # Echo or process if client communicates back
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# --- TELEMETRY SIMULATOR ENGINE ---

async def simulate_live_threat_feed():
    """
    Background simulation worker. When a client dashboard is connected over WebSockets,
    it automatically synthesizes realistic transaction parameters (Time, Amount, V1-V28)
    every 8 seconds and runs it through the full model prediction, DB logger, and alert engine.
    """
    print("Background live threat telemetry generator initialized.")
    await asyncio.sleep(5)  # Warm up delay
    
    db_session_maker = SessionLocal
    
    while True:
        try:
            # Only generate traffic if there are active WebSocket connections
            # This avoids CPU bloat when the dashboard is idle/closed
            if len(ws_manager.active_connections) > 0:
                print("WebSocket dashboard active. Synthesizing live transaction telemetry...")
                
                # Setup features
                features = {}
                features["Time"] = float(datetime.utcnow().timestamp() % 86400)
                
                # 85% normal transactions, 15% mock suspicious anomalies
                is_fraud = random.random() < 0.15
                
                if is_fraud:
                    features["Amount"] = float(random.uniform(500.0, 3000.0))
                    # V columns are PCA representations, high deviations mark fraud
                    for i in range(1, 29):
                        features[f"V{i}"] = float(random.uniform(-4.0, -10.0) if i in [3, 12, 14, 17] else random.uniform(-2.0, 2.0))
                else:
                    features["Amount"] = float(random.uniform(5.0, 150.0))
                    for i in range(1, 29):
                        features[f"V{i}"] = float(random.uniform(-1.5, 1.5))
                
                # Open DB session and run predict
                db = db_session_maker()
                try:
                    await create_prediction(db, features)
                except Exception as ex:
                    print(f"Error during background prediction simulation: {ex}")
                finally:
                    db.close()
                    
            await asyncio.sleep(8)
            
        except Exception as e:
            print(f"Telemetry simulator crashed, restarting in 10s. Error: {e}")
            await asyncio.sleep(10)
