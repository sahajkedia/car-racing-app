"""
Oneness — Feedback Signal Collector

This module defines the signal types the app collects, their position on the
proxy ladder, and the mechanism for users to voluntarily report date/relationship
outcomes (the gold-label collection loop).

Proxy Signal Ladder (farthest → closest to true LTR outcome):
  L1: profile_viewed        — weakest; could be casual browsing
  L2: express_interest      — explicit intent (replaces swipe in Conscious Queue)
  L3: message_sent          — open messaging; user initiated conversation
  L4: message_replied       — candidate responded; bidirectional interest
  L5: thread_10plus         — 10+ messages in a thread; sustained engagement
  L6: date_reported         — user self-reported going on a date (gold-ish)
  L7: relationship_reported — user self-reported a committed relationship (gold label)

Phase 1 trains on L5. Phase 2 uses L6 validation. Phase 3 uses L7 as ground truth.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


class SignalType(str, Enum):
    PROFILE_VIEWED = "profile_viewed"         # L1
    EXPRESS_INTEREST = "express_interest"     # L2 (tapping "Express Interest")
    SILENT_PASS = "silent_pass"               # non-signal (negative implicit signal)
    MESSAGE_SENT = "message_sent"             # L3
    MESSAGE_REPLIED = "message_replied"       # L4
    THREAD_10PLUS = "thread_10plus"           # L5 — computed, not logged directly
    DATE_REPORTED = "date_reported"           # L6 — user self-reported
    RELATIONSHIP_REPORTED = "relationship_reported"  # L7 — gold label

# Relative strength of each signal for weighting during Phase 1 analysis
SIGNAL_STRENGTH: dict[SignalType, float] = {
    SignalType.PROFILE_VIEWED: 0.05,
    SignalType.EXPRESS_INTEREST: 0.25,
    SignalType.SILENT_PASS: -0.05,  # weak negative signal
    SignalType.MESSAGE_SENT: 0.40,
    SignalType.MESSAGE_REPLIED: 0.65,
    SignalType.THREAD_10PLUS: 0.80,
    SignalType.DATE_REPORTED: 0.95,
    SignalType.RELATIONSHIP_REPORTED: 1.00,
}


@dataclass
class EngagementSignal:
    """A single behavioral event between two users."""
    from_user_id: str
    to_user_id: str
    signal_type: SignalType
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict = field(default_factory=dict)
    # metadata examples:
    #   profile_viewed: {"time_spent_ms": 4200, "scroll_depth_pct": 0.72}
    #   message_sent: {"message_length": 142, "is_first_message": True}
    #   date_reported: {"venue_type": "cafe", "initiated_by": "from_user"}
    #   relationship_reported: {"relationship_type": "dating", "months_since_match": 3}


@dataclass
class RelationshipReport:
    """
    The gold-label collection mechanism.

    Triggered by an in-app prompt sent to both parties in a thread when:
    - Thread has 10+ messages, AND
    - Thread is > 14 days old

    The prompt: "How are things going with [Name]?"
    Options: [Still chatting] [We went on a date!] [We're together now!] [Not a fit]

    This is voluntary. No coercion. The prompt appears at most once every 30 days
    per thread to avoid fatigue.
    """
    user_id: str
    matched_user_id: str
    reported_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    outcome: str = ""  # "still_chatting" | "went_on_date" | "together" | "not_a_fit"
    thread_age_days: int = 0
    thread_message_count: int = 0
    is_mutual: bool = False  # True when both parties report the same outcome


@dataclass
class FeedbackPromptPolicy:
    """
    Controls when and how often to ask users for relationship status updates.
    Conservative by default — trust is the primary product.
    """
    min_thread_messages: int = 10
    min_thread_age_days: int = 14
    prompt_cooldown_days: int = 30         # never ask more than once per 30 days
    max_prompts_per_user_per_month: int = 2  # never overwhelm the user

    def should_prompt(
        self,
        thread_message_count: int,
        thread_age_days: int,
        days_since_last_prompt: Optional[int],
        prompts_sent_this_month: int,
    ) -> bool:
        if thread_message_count < self.min_thread_messages:
            return False
        if thread_age_days < self.min_thread_age_days:
            return False
        if days_since_last_prompt is not None and days_since_last_prompt < self.prompt_cooldown_days:
            return False
        if prompts_sent_this_month >= self.max_prompts_per_user_per_month:
            return False
        return True


DEFAULT_PROMPT_POLICY = FeedbackPromptPolicy()
