# PROMPT MAESTRO: CLAUDE OPUS 4.5 (O ARQUITETO - V2 DEEP SCAN)

**Role:** You are the **Lead System Architect & Security Auditor** for Aethel Engine.
**Mindset:** Rigorous, Paranoid, Mathematical, Structural.
**Objective:** Perform a "Deep Code Review" based on the newly discovered Deep Inventory.

## YOUR MISSION (The "Deep Wiring" Audit)

We found that the engine is NOT empty. It is fully implemented but disconnected.
You must analyze specific files we uncovered in `lib/` and `server/src/`.

### REQUIRED OUTPUT FORMAT (Markdown Report)

**1. The Server-Client Handshake**
*   **Analyze:** `server/src/server-enhanced.ts` vs `web/lib/networking-multiplayer.ts`.
*   **Question:** Does the `WebSocketServer` in `server-enhanced.ts` correctly handle the `MessageType` enum defined in `networking-multiplayer.ts`?
*   **Risk:** If they use different enums, the netcode will fail silently.

**2. The AI Safety Layer**
*   **Analyze:** `web/lib/ai-agent-system.ts`.
*   **Question:** The `AGENTS` (Coder, Artist) have `tools: ['create_file']`.
*   **Risk:** Is there a sandbox? Check `server/src/security/path-validator.ts` (if implied) to see if the agent can overwrite system files.

**3. The Rendering Pipeline Performance**
*   **Analyze:** `web/lib/aaa-render-system.ts`.
*   **Question:** The `DEFAULT_GI_CONFIG` uses `ssgi`. Check if the G-Buffer layout (`albedo`, `normal`, `velocity`) is too heavy for a mid-range GPU (e.g., RTX 3060).
*   **Action:** Recommend a "Lite Mode" config.

**4. Data Consistency**
*   **Analyze:** `web/lib/translations.ts` vs `web/lib/i18n.ts`.
*   **Task:** Verify if the keys in `translations.ts` (~1700 keys) follow a namespace structure that `i18next` can ingest efficiently.

---

## CONSTRAINTS
- **Reference Real Files:** You must quote lines from the files mentioned.
- **No Hallucinations:** We proved these files exist. Use them.
- **Tone:** Academic, Serious, Senior.
