# 27_DOMAIN_READINESS_SCORECARDS_2026-02-28
Status: DOMAIN READINESS SCORECARDS
Date: 2026-02-28
Owner: Chief Architecture + Critical Agent

## 1) Purpose
Define the current readiness of the Aethel Engine across its three primary domains: Games, Films, and Apps. This document sets the threshold for what can be claimed and what remains a "Critical Gap."

## 2) Scorecard Summary

| Domain | Orchestration | Memory | Validation | Runtime | Economics | Overall Status |
|---|---|---|---|---|---|---|
| **Games** | PARTIAL | PARTIAL | NOT_IMPLEMENTED | PARTIAL | PARTIAL | **L2 - Experimental** |
| **Films** | PARTIAL | PARTIAL | NOT_IMPLEMENTED | PARTIAL | PARTIAL | **L2 - Experimental** |
| **Apps** | IMPLEMENTED | IMPLEMENTED | PARTIAL | IMPLEMENTED | PARTIAL | **L3 - Production Ready (Beta)** |

---

## 3) Domain Details

### 3.1 Games (The Forge / Nexus)
*   **Status:** L2 - Experimental
*   **Claims Allowed:** "AI-assisted asset generation", "Scene preview", "Code-based logic generation".
*   **Claims PROHIBITED:** "AAA Game Engine parity", "One-click AAA game creation", "Real-time Unreal-grade physics in browser".
*   **Critical Gaps:**
    1.  Missing Gameplay QA Loop (Soft-lock/Pacing/Difficulty).
    2.  Missing Asset Validation Pipeline (Topology/Rigging/Perf).
    3.  Missing Deterministic Gameplay Runtime (WASM-based).

### 3.2 Films (The Nexus / Forge)
*   **Status:** L2 - Experimental
*   **Claims Allowed:** "Storyboarding assistance", "Shot description generation", "Static asset preview".
*   **Claims PROHIBITED:** "Sora/Kling parity", "Temporal continuity guarantee", "Automated shot-to-shot identity consistency".
*   **Critical Gaps:**
    1.  Missing Continuity Engine (Character/Prop identity over time).
    2.  Missing Shot-Control Pipeline (Camera/Motion coherence).
    3.  Missing Post-Process Quality Gates.

### 3.3 Apps (The Forge / Gateway)
*   **Status:** L3 - Production Ready (Beta)
*   **Claims Allowed:** "Full-stack code generation", "Multi-file refactoring", "Integrated CI/CD gates (lint/type/build)".
*   **Claims PROHIBITED:** "Zero-human-intervention enterprise deployment", "L4/L5 autonomous engineering".
*   **Critical Gaps:**
    1.  Missing Dependency-Impact Guard for all high-risk flows.
    2.  Missing Unified Acceptance Matrix (Verification Verdict).
    3.  Partial Economics Enforcement (Per-session budget).

---

## 4) Promotion Thresholds (To L4)
To move any domain to **L4 - Autonomous Production**, the following must be evidenced:
1.  **Success Rate:** >90% of AI-generated changes pass all automated validation gates.
2.  **Regression Rate:** <5% in critical journeys after AI application.
3.  **Deterministic Apply:** `Plan -> Patch -> Validate -> Apply -> Rollback` pipeline fully operational.
4.  **Cost Predictability:** <10% variance between estimated and actual task cost.

## 5) Mandatory Evidence Rule
No status change in this scorecard is valid without:
1.  Command output from `npm run qa:*`.
2.  Reproducible operational artifacts (e.g., successful build logs, validation reports).
3.  Link to the specific canonical doc providing the technical baseline.
