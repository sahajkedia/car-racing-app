"""
Oneness MLOps Data Pipeline — Phase 1

This module bridges the app's behavioral signals table with the scoring engine.
It is structured to be directly upgradeable to a ZenML pipeline in Phase 2.

What it does now (Phase 1):
  - Pulls raw signals from Supabase
  - Aggregates them into training-ready feature rows
  - Computes proxy labels (L5: thread_10plus)
  - Produces a dataset that can feed Phase 2 Learning-to-Rank model

ZenML compatibility:
  Each function below maps to a future ZenML @step. The pipeline function
  maps to a future ZenML @pipeline. No ZenML dependency required for Phase 1.
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any


# ---------------------------------------------------------------------------
# Feature row — what one (viewer, candidate) pair looks like as training data
# ---------------------------------------------------------------------------

@dataclass
class PairFeatureRow:
    """One row in the training dataset. Represents a (viewer, candidate) pair
    shown together in a Sangha session."""

    # Identifiers
    viewer_id: str
    candidate_id: str
    session_id: str
    shown_at: str  # ISO timestamp

    # Scoring engine features at the time the pair was shown
    age_bucket_gap: int = 0
    looking_for_gap: int = 0
    spiritual_depth_viewer: float = 0.0
    spiritual_depth_candidate: float = 0.0
    diet_compat_score: float = 0.0
    commitment_compat_score: float = 0.0
    distance_km: float = 0.0
    height_compat_score: float = 0.0
    rule_based_score: float = 0.0       # the Phase 1 score that ranked this pair

    # Behavioral signals (collected after the Sangha was shown)
    viewed: bool = False
    time_spent_ms: int = 0
    scroll_depth_pct: float = 0.0
    expressed_interest: bool = False
    silent_pass: bool = False
    message_sent: bool = False
    message_replied: bool = False
    thread_10plus: bool = False         # L5 proxy label

    # Gold labels (collected weeks/months later via relationship reports)
    date_reported: bool = False
    relationship_reported: bool = False

    # Target variable for Phase 2 model (proxy label, updated over time)
    # 0 = no engagement, 1 = sustained conversation (L5+)
    proxy_label: int = 0

    def to_dict(self) -> dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Pipeline steps (future ZenML @step functions)
# ---------------------------------------------------------------------------

def step_ingest_sessions(sessions: list[dict]) -> list[dict]:
    """Step 1: Ingest Sangha session records.

    In Phase 2, this becomes:
        @step
        def ingest_sessions(supabase_conn: str) -> pd.DataFrame: ...
    """
    rows = []
    for session in sessions:
        viewer_id = session["viewer_id"]
        session_id = session["id"]
        shown_at = session["created_at"]
        candidate_ids = session.get("candidate_ids", [])
        scores = session.get("scores", [])

        for cid, score in zip(candidate_ids, scores):
            rows.append({
                "viewer_id": viewer_id,
                "candidate_id": cid,
                "session_id": session_id,
                "shown_at": shown_at,
                "rule_based_score": score,
            })
    return rows


def step_attach_signals(pairs: list[dict], signals: list[dict]) -> list[dict]:
    """Step 2: Join behavioral signals onto each (viewer, candidate) pair.

    In Phase 2:
        @step
        def attach_signals(pairs: pd.DataFrame, signals: pd.DataFrame) -> pd.DataFrame: ...
    """
    # Build a lookup: (from_id, to_id, signal_type) → list[signal_row]
    sig_lookup: dict[tuple[str, str, str], list[dict]] = {}
    for sig in signals:
        key = (sig["from_profile_id"], sig["to_profile_id"], sig["signal_type"])
        sig_lookup.setdefault(key, []).append(sig)

    for pair in pairs:
        v = pair["viewer_id"]
        c = pair["candidate_id"]

        # L1: profile viewed
        viewed_sigs = sig_lookup.get((v, c, "profile_viewed"), [])
        if viewed_sigs:
            pair["viewed"] = True
            metadata = viewed_sigs[-1].get("metadata", {})
            pair["time_spent_ms"] = metadata.get("time_spent_ms", 0)
            pair["scroll_depth_pct"] = metadata.get("scroll_depth_pct", 0.0)

        # L2: express interest
        pair["expressed_interest"] = bool(sig_lookup.get((v, c, "express_interest")))

        # Silent pass
        pair["silent_pass"] = bool(sig_lookup.get((v, c, "silent_pass")))

        # L3: message sent
        pair["message_sent"] = bool(sig_lookup.get((v, c, "message_sent")))

        # L4: message replied (candidate replied back to viewer)
        pair["message_replied"] = bool(sig_lookup.get((c, v, "message_replied")))

        # L5: thread 10+ (proxy label)
        pair["thread_10plus"] = bool(sig_lookup.get((v, c, "thread_10plus")))

        # L6: date reported
        pair["date_reported"] = bool(sig_lookup.get((v, c, "date_reported")))

        # L7: relationship reported (gold label)
        pair["relationship_reported"] = bool(sig_lookup.get((v, c, "relationship_reported")))

        # Proxy label: 1 if thread_10plus or better
        pair["proxy_label"] = int(
            pair["thread_10plus"] or pair["date_reported"] or pair["relationship_reported"]
        )

    return pairs


def step_compute_statistics(pairs: list[dict]) -> dict:
    """Step 3: Compute dataset statistics for drift monitoring and data validation.

    In Phase 2 this feeds Evidently or GreatExpectations.
    """
    if not pairs:
        return {}

    total = len(pairs)
    stats = {
        "total_pairs": total,
        "viewed_rate": sum(p.get("viewed", False) for p in pairs) / total,
        "interest_rate": sum(p.get("expressed_interest", False) for p in pairs) / total,
        "message_rate": sum(p.get("message_sent", False) for p in pairs) / total,
        "reply_rate": sum(p.get("message_replied", False) for p in pairs) / total,
        "thread_10plus_rate": sum(p.get("thread_10plus", False) for p in pairs) / total,
        "date_rate": sum(p.get("date_reported", False) for p in pairs) / total,
        "ltr_rate": sum(p.get("relationship_reported", False) for p in pairs) / total,
        "avg_rule_based_score": sum(p.get("rule_based_score", 0) for p in pairs) / total,
        "proxy_label_positive_rate": sum(p.get("proxy_label", 0) for p in pairs) / total,
    }
    return stats


def step_validate_data(stats: dict) -> list[str]:
    """Step 4: Basic data validation — flags data quality issues.

    Checks that signal rates are within plausible bounds.
    In Phase 2 this is a ZenML step with GreatExpectations.
    """
    warnings: list[str] = []

    # Sanity bounds for a healthy app
    if stats.get("viewed_rate", 0) < 0.1:
        warnings.append("viewed_rate < 10%: users may not be engaging with their Sangha")
    if stats.get("message_rate", 0) > 0.8:
        warnings.append("message_rate > 80%: suspicious — possible bot activity")
    if stats.get("proxy_label_positive_rate", 0) > 0.5:
        warnings.append("proxy_label_positive_rate > 50%: label imbalance may skew Phase 2 model")
    if stats.get("total_pairs", 0) < 100:
        warnings.append(f"Only {stats.get('total_pairs', 0)} training pairs — Phase 2 model not ready yet (need 500+)")

    return warnings


def run_pipeline(sessions: list[dict], signals: list[dict]) -> dict[str, Any]:
    """Full Phase 1 pipeline. Call this from a cron job or Supabase Edge Function.

    Returns:
        {
            "dataset": list[dict],   # training-ready feature rows
            "statistics": dict,      # dataset health metrics
            "warnings": list[str],   # data quality issues
            "phase2_ready": bool,    # True when enough data for ML training
        }
    """
    pairs = step_ingest_sessions(sessions)
    pairs = step_attach_signals(pairs, signals)
    stats = step_compute_statistics(pairs)
    warnings = step_validate_data(stats)

    phase2_ready = (
        stats.get("total_pairs", 0) >= 500
        and stats.get("proxy_label_positive_rate", 0) > 0.0
    )

    return {
        "dataset": pairs,
        "statistics": stats,
        "warnings": warnings,
        "phase2_ready": phase2_ready,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# ZenML upgrade path (documentation)
# ---------------------------------------------------------------------------

ZENML_UPGRADE_NOTES = """
When to upgrade to ZenML (Phase 2, ~500 mutual engagements):

1. Install: pip install zenml[server] mlflow
2. Initialize: zenml init
3. Decorate each step_ function above with @step
4. Decorate run_pipeline with @pipeline
5. Register artifacts: use ZenML artifact store (local or S3)
6. Add experiment tracker: zenml experiment-tracker register mlflow ...
7. Add model registry: zenml model-registry register mlflow ...

The free ZenML stack for 500 users:
    Orchestrator:        Local
    Artifact Store:      Local filesystem (or Supabase Storage)
    Experiment Tracker:  MLflow (self-hosted on same Render instance)
    Model Registry:      MLflow
    Data Validator:      Evidently (open source)

No cloud ML infrastructure needed until Phase 3 (2000+ users).
"""
