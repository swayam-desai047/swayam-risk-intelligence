from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="USER")  # USER, ADMIN
    created_at = Column(DateTime, default=datetime.utcnow)


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    risk_score = Column(Float, nullable=False)
    label = Column(String, nullable=False)  # LOW, MEDIUM, HIGH
    confidence = Column(Float, nullable=False)
    explanation = Column(JSON, nullable=False)  # SHAP attributions JSON
    features = Column(JSON, nullable=False)  # Original feature values JSON
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    alerts = relationship("Alert", back_populates="prediction", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="prediction", cascade="all, delete-orphan")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    severity = Column(String, nullable=False)  # LOW, MEDIUM, HIGH
    message = Column(String, nullable=False)
    status = Column(String, default="ACTIVE")  # ACTIVE, RESOLVED
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    prediction = relationship("Prediction", back_populates="alerts")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # e.g., Fraud Attempt, System Anomaly, High Latency
    severity = Column(String, nullable=False)  # LOW, MEDIUM, HIGH
    description = Column(String, nullable=False)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=True)
    status = Column(String, default="OPEN")  # OPEN, INVESTIGATING, CLOSED
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    prediction = relationship("Prediction", back_populates="incidents")


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String, unique=True, index=True, nullable=False)
    accuracy = Column(Float, nullable=False)
    precision = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1_score = Column(Float, nullable=False)
    roc_auc = Column(Float, nullable=False)
    pr_auc = Column(Float, nullable=False)
    status = Column(String, default="INACTIVE")  # ACTIVE, INACTIVE
    created_at = Column(DateTime, default=datetime.utcnow)
