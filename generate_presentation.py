import xml.etree.ElementTree as ET

# 1. GENERATE PURE STANDALONE SVG SLIDE (1920 x 1080)
svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080" style="background:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0891b2" />
      <stop offset="100%" stop-color="#0e7490" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#fbfcfe" />
    </linearGradient>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="feedbackGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#0891b2" />
      <stop offset="50%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#7c3aed" />
    </linearGradient>
    <filter id="cardShadow" x="-2%" y="-4%" width="104%" height="112%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.04" />
    </filter>
    <marker id="arrowDown" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 1 2 L 7 5 L 1 8 z" fill="#0891b2" />
    </marker>
    <marker id="arrowUpFeedback" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 1 2 L 7 5 L 1 8 z" fill="#7c3aed" />
    </marker>
    <marker id="arrowRight" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M 1 2 L 7 5 L 1 8 z" fill="#0891b2" />
    </marker>
    <marker id="arrowRightGreen" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M 1 2 L 7 5 L 1 8 z" fill="#10b981" />
    </marker>
    <marker id="arrowRightPurple" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M 1 2 L 7 5 L 1 8 z" fill="#7c3aed" />
    </marker>
  </defs>

  <!-- BACKGROUND -->
  <rect width="1920" height="1080" fill="#f8fafc" />
  <g opacity="0.35">
    <line x1="48" y1="0" x2="48" y2="1080" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 4" />
    <line x1="1872" y1="0" x2="1872" y2="1080" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 4" />
    <line x1="1685" y1="0" x2="1685" y2="1080" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 4" />
  </g>

  <!-- ============================================================== -->
  <!-- HEADER SECTION (Y: 24 to 105) -->
  <!-- ============================================================== -->
  <g id="header-section">
    <!-- Eyebrow Tag -->
    <rect x="48" y="24" width="310" height="22" rx="4" fill="#ecfeff" stroke="#a5f3fc" stroke-width="1" />
    <circle cx="58" cy="35" r="4" fill="#0891b2" />
    <text x="70" y="39" font-size="10" font-weight="800" fill="#0891b2" letter-spacing="1.2">CODEBASE ARCHITECTURE SPECIFICATION</text>

    <!-- Main Title -->
    <text x="48" y="74" font-size="32" font-weight="900" fill="#0f172a" letter-spacing="-0.8">FlowForge: AI-Powered Workflow Orchestration</text>
    
    <!-- Subtitle -->
    <text x="48" y="98" font-size="14.5" font-weight="500" fill="#64748b">From natural-language instructions to intelligent, distributed, and self-healing workflow execution.</text>

    <!-- Top Right Implementation Badges -->
    <g transform="translate(1330, 26)">
      <rect x="0" y="0" width="168" height="28" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1" />
      <text x="84" y="18" font-size="11" font-weight="750" fill="#2563eb" text-anchor="middle">DAG Engine: Kahn O(V+E)</text>

      <rect x="178" y="0" width="176" height="28" rx="6" fill="#f5f3ff" stroke="#ddd6fe" stroke-width="1" />
      <text x="266" y="18" font-size="11" font-weight="750" fill="#7c3aed" text-anchor="middle">AI: 9Router + Local Engine</text>

      <rect x="364" y="0" width="178" height="28" rx="6" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1" />
      <text x="453" y="18" font-size="11" font-weight="750" fill="#059669" text-anchor="middle">5 Isolated Worker Queues</text>
    </g>

    <!-- Core Message Callout Bar -->
    <rect x="48" y="112" width="1624" height="34" rx="7" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <circle cx="66" cy="129" r="6" fill="#0891b2" opacity="0.15" />
    <circle cx="66" cy="129" r="3" fill="#0891b2" />
    <text x="82" y="133" font-size="12" font-weight="800" fill="#0e7490">CORE LIFECYCLE:</text>
    <text x="210" y="133" font-size="12" font-weight="500" fill="#334155">FlowForge uses AI to generate, analyze, and recover distributed workflows, while Kahn's deterministic orchestration engine coordinates parallel task scheduling, worker queues, and atomic execution states.</text>
  </g>

  <!-- ============================================================== -->
  <!-- DOWNWARD ARROWS (Between Layers) -->
  <!-- ============================================================== -->
  <g stroke="#0891b2" stroke-width="2" fill="none">
    <line x1="860" y1="250" x2="860" y2="262" marker-end="url(#arrowDown)" />
    <line x1="860" y1="366" x2="860" y2="378" marker-end="url(#arrowDown)" />
    <line x1="860" y1="478" x2="860" y2="490" marker-end="url(#arrowDown)" />
    <line x1="860" y1="606" x2="860" y2="618" marker-end="url(#arrowDown)" />
    <line x1="860" y1="718" x2="860" y2="730" marker-end="url(#arrowDown)" />
    <line x1="860" y1="836" x2="860" y2="848" marker-end="url(#arrowDown)" />
  </g>

  <!-- ============================================================== -->
  <!-- RIGHT FEEDBACK CHANNEL (Verified Return Pathways) -->
  <!-- ============================================================== -->
  <g id="feedback-loop-channel">
    <rect x="1692" y="156" width="180" height="794" rx="12" fill="#ffffff" stroke="#cffafe" stroke-width="1.5" filter="url(#cardShadow)" />
    
    <path d="M 1692 156 L 1872 156 A 12 12 0 0 1 1872 196 L 1692 196 Z" fill="url(#primaryGrad)" />
    <text x="1782" y="176" font-size="10.5" font-weight="850" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">CLOSED-LOOP FEEDBACK</text>
    <text x="1782" y="189" font-size="8.5" font-weight="600" fill="#cffafe" text-anchor="middle">VERIFIED RECOVERY PATHS</text>

    <!-- Upward dashed connector -->
    <path d="M 1782 870 L 1782 216" stroke="url(#feedbackGrad)" stroke-width="3" stroke-dasharray="6 4" fill="none" marker-end="url(#arrowUpFeedback)" />

    <!-- Branch to Layer 4 (Engine Retry Re-schedule) -->
    <path d="M 1782 552 L 1672 552" stroke="#2563eb" stroke-width="2.5" fill="none" marker-end="url(#arrowRight)" />
    <rect x="1702" y="530" width="160" height="44" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1" />
    <text x="1782" y="545" font-size="9.5" font-weight="800" fill="#1e40af" text-anchor="middle">TO ENGINE (L4)</text>
    <text x="1782" y="559" font-size="8.5" font-weight="600" fill="#3b82f6" text-anchor="middle">Auto-Reschedule on Fail</text>
    <text x="1782" y="569" font-size="8" font-weight="500" fill="#64748b" text-anchor="middle">Worker Service reclaim loop</text>

    <!-- Branch to Layer 2 (Prompt-to-DAG refinement) -->
    <path d="M 1782 312 L 1672 312" stroke="#7c3aed" stroke-width="2.5" fill="none" marker-end="url(#arrowRightPurple)" />
    <rect x="1702" y="290" width="160" height="44" rx="6" fill="#f5f3ff" stroke="#ddd6fe" stroke-width="1" />
    <text x="1782" y="305" font-size="9.5" font-weight="800" fill="#5b21b6" text-anchor="middle">TO PROMPT AI (L2)</text>
    <text x="1782" y="319" font-size="8.5" font-weight="600" fill="#7c3aed" text-anchor="middle">DAG Schema Tuning</text>
    <text x="1782" y="329" font-size="8" font-weight="500" fill="#64748b" text-anchor="middle">Learned topologies in Studio</text>

    <!-- Tap from Layer 7 (Monitoring / Telemetry) -->
    <path d="M 1672 906 L 1782 906" stroke="#0891b2" stroke-width="2.5" fill="none" />
    <circle cx="1672" cy="906" r="4" fill="#0891b2" />
    <rect x="1702" y="884" width="160" height="44" rx="6" fill="#ecfeff" stroke="#a5f3fc" stroke-width="1" />
    <text x="1782" y="899" font-size="9.5" font-weight="800" fill="#0e7490" text-anchor="middle">FROM METRICS (L7)</text>
    <text x="1782" y="913" font-size="8.5" font-weight="600" fill="#0891b2" text-anchor="middle">Active Worker Latency</text>
    <text x="1782" y="923" font-size="8" font-weight="500" fill="#64748b" text-anchor="middle">Runtime state telemetry (2s)</text>

    <!-- Tap from Layer 6 (Self-Healing / Reclaim) -->
    <path d="M 1672 786 L 1782 786" stroke="#10b981" stroke-width="2.5" fill="none" />
    <circle cx="1672" cy="786" r="4" fill="#10b981" />
    <rect x="1702" y="764" width="160" height="44" rx="6" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1" />
    <text x="1782" y="779" font-size="9.5" font-weight="800" fill="#065f46" text-anchor="middle">FROM RECOVERY (L6)</text>
    <text x="1782" y="793" font-size="8.5" font-weight="600" fill="#059669" text-anchor="middle">Retried Tasks + Suggested Fix</text>
    <text x="1782" y="803" font-size="8" font-weight="500" fill="#64748b" text-anchor="middle">Stale task auto-recovery</text>
  </g>

  <!-- ============================================================== -->
  <!-- LAYER 1: USER INPUT & WORKFLOW CREATION (Y: 156, H: 94) -->
  <!-- ============================================================== -->
  <g id="layer-1" transform="translate(48, 156)">
    <rect width="1624" height="94" rx="10" fill="url(#cardGrad)" stroke="#e2e8f0" stroke-width="1" filter="url(#cardShadow)" />
    <rect width="6" height="94" rx="3" fill="#0891b2" />

    <!-- Left Info -->
    <g transform="translate(24, 16)">
      <rect x="0" y="0" width="85" height="19" rx="4" fill="#ecfeff" stroke="#a5f3fc" stroke-width="1" />
      <text x="42" y="13" font-size="9.5" font-weight="800" fill="#0891b2" text-anchor="middle">LAYER 1 • UI</text>
      
      <text x="0" y="39" font-size="15.5" font-weight="850" fill="#0f172a">User Input &amp; Workflow Creation</text>
      <text x="0" y="55" font-size="10.5" font-weight="700" fill="#0891b2">WorkflowDefinitionsPage &amp; WorkflowStudio</text>
      <text x="0" y="69" font-size="9.5" font-weight="750" fill="#059669">[Implemented: Modal &amp; Visual Studio]</text>
    </g>

    <!-- Center Description -->
    <g transform="translate(365, 14)">
      <text x="0" y="15" font-size="12" font-weight="750" fill="#1e293b">User describes a multi-step business process in plain English or imports JSON.</text>
      <text x="0" y="34" font-size="11" font-weight="400" fill="#64748b">• Modal prompts accept business tasks without requiring manual DAG schema authoring.</text>
      <text x="0" y="50" font-size="11" font-weight="400" fill="#64748b">• Visual Studio provides interactive canvas editing with auto-layout, zoom, and preset library.</text>
      <text x="0" y="66" font-size="10.5" font-weight="600" fill="#0891b2">Supports: Prompt input, 3 parallel preset templates (eCommerce, Sentiment, Parquet ETL).</text>
    </g>

    <!-- Right Visual -->
    <g transform="translate(1000, 11)">
      <rect width="600" height="72" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
      
      <circle cx="34" cy="36" r="18" fill="#ecfeff" stroke="#a5f3fc" stroke-width="1.5" />
      <circle cx="34" cy="31" r="6" fill="#0891b2" />
      <path d="M 23 44 C 23 39, 45 39, 45 44" stroke="#0891b2" stroke-width="1.8" fill="none" />

      <rect x="66" y="14" width="520" height="44" rx="6" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
      <text x="80" y="32" font-size="11.5" font-weight="600" fill="#0f172a">"Process customer orders, validate payments, and update inventory."</text>
      <text x="80" y="47" font-size="9.5" font-family="monospace" fill="#0891b2">Module: POST /api/v1/ai/generate-workflow • Frontend: AI Prompt-to-DAG Modal</text>
    </g>
  </g>

  <!-- ============================================================== -->
  <!-- LAYER 2: AI PROMPT-TO-DAG (Y: 262, H: 104) -->
  <!-- ============================================================== -->
  <g id="layer-2" transform="translate(48, 262)">
    <rect width="1624" height="104" rx="10" fill="url(#cardGrad)" stroke="#e2e8f0" stroke-width="1" filter="url(#cardShadow)" />
    <rect width="6" height="104" rx="3" fill="#7c3aed" />

    <!-- Left Info -->
    <g transform="translate(24, 16)">
      <rect x="0" y="0" width="85" height="19" rx="4" fill="#f5f3ff" stroke="#ddd6fe" stroke-width="1" />
      <text x="42" y="13" font-size="9.5" font-weight="800" fill="#7c3aed" text-anchor="middle">LAYER 2 • AI</text>
      
      <text x="0" y="39" font-size="15.5" font-weight="850" fill="#0f172a">AI Prompt-to-DAG</text>
      <text x="0" y="55" font-size="10.5" font-weight="700" fill="#7c3aed">AiOrchestratorService.generate_workflow</text>
      <text x="0" y="69" font-size="9.5" font-weight="750" fill="#059669">[Implemented: 9Router + Local Fallback]</text>
      <text x="0" y="82" font-size="9" font-family="monospace" fill="#64748b">Endpoint: POST /ai/generate-workflow</text>
    </g>

    <!-- Center Description -->
    <g transform="translate(365, 14)">
      <text x="0" y="15" font-size="12" font-weight="750" fill="#1e293b">Decomposes natural language into a structured, executable Directed Acyclic Graph.</text>
      <text x="0" y="34" font-size="11" font-weight="400" fill="#64748b">• Dual-tier engine: 9Router AI Gateway (OpenAI-compatible) with rule-based local fallback.</text>
      <text x="0" y="50" font-size="11" font-weight="400" fill="#64748b">• Classifies into 4 Task Types: HTTP_TASK, WORKER_TASK, AI_AGENT_TASK, NOTIFICATION.</text>
      <text x="0" y="66" font-size="11" font-weight="400" fill="#64748b">• Maps to isolated queues (`compute`, `payment`, `data-io`, `ai-agent`) and bounds retries/timeouts.</text>
      <text x="0" y="81" font-size="10.5" font-weight="600" fill="#7c3aed">Sanitizes &amp; repairs DAG: prunes dangling dependencies and validates acyclic invariant.</text>
    </g>

    <!-- Right Visual (Generated DAG) -->
    <g transform="translate(970, 12)">
      <rect width="630" height="80" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
      
      <!-- Node 1 -->
      <g transform="translate(18, 16)">
        <rect width="115" height="48" rx="6" fill="#ffffff" stroke="#0891b2" stroke-width="1.5" />
        <rect x="6" y="6" width="16" height="16" rx="3" fill="#ecfeff" />
        <text x="14" y="18" font-size="9" font-weight="800" fill="#0891b2" text-anchor="middle">H</text>
        <text x="28" y="18" font-size="10" font-weight="750" fill="#0f172a">receive-order</text>
        <text x="8" y="36" font-size="8" font-family="monospace" fill="#64748b">Q: default • 30s</text>
      </g>

      <path d="M 133 40 L 165 24" stroke="#0891b2" stroke-width="1.5" fill="none" marker-end="url(#arrowRight)" />
      <path d="M 133 40 L 165 56" stroke="#0891b2" stroke-width="1.5" fill="none" marker-end="url(#arrowRight)" />

      <!-- Node 2 (Parallel A) -->
      <g transform="translate(170, 6)">
        <rect width="125" height="34" rx="5" fill="#ffffff" stroke="#2563eb" stroke-width="1.5" />
        <text x="10" y="15" font-size="9.5" font-weight="750" fill="#0f172a">check-payment</text>
        <text x="10" y="27" font-size="8" font-family="monospace" fill="#2563eb">Q: payment [PARALLEL]</text>
      </g>

      <!-- Node 3 (Parallel B) -->
      <g transform="translate(170, 42)">
        <rect width="125" height="34" rx="5" fill="#ffffff" stroke="#2563eb" stroke-width="1.5" />
        <text x="10" y="15" font-size="9.5" font-weight="750" fill="#0f172a">check-inventory</text>
        <text x="10" y="27" font-size="8" font-family="monospace" fill="#2563eb">Q: data-io [PARALLEL]</text>
      </g>

      <path d="M 295 24 L 328 40" stroke="#2563eb" stroke-width="1.5" fill="none" marker-end="url(#arrowRight)" />
      <path d="M 295 56 L 328 40" stroke="#2563eb" stroke-width="1.5" fill="none" marker-end="url(#arrowRight)" />

      <!-- Node 4 (AI Agent) -->
      <g transform="translate(334, 16)">
        <rect width="125" height="48" rx="6" fill="#ffffff" stroke="#7c3aed" stroke-width="1.5" />
        <rect x="6" y="6" width="16" height="16" rx="3" fill="#f5f3ff" />
        <text x="14" y="18" font-size="9" font-weight="800" fill="#7c3aed" text-anchor="middle">AI</text>
        <text x="28" y="18" font-size="10" font-weight="750" fill="#0f172a">ai-fraud-eval</text>
        <text x="8" y="36" font-size="8" font-family="monospace" fill="#64748b">Q: ai-agent • 90s</text>
      </g>

      <path d="M 459 40 L 485 40" stroke="#7c3aed" stroke-width="1.5" fill="none" marker-end="url(#arrowRight)" />

      <!-- Node 5 (Notification) -->
      <g transform="translate(490, 16)">
        <rect width="120" height="48" rx="6" fill="#ffffff" stroke="#10b981" stroke-width="1.5" />
        <rect x="6" y="6" width="16" height="16" rx="3" fill="#ecfdf5" />
        <text x="14" y="18" font-size="9" font-weight="800" fill="#059669" text-anchor="middle">N</text>
        <text x="28" y="18" font-size="10" font-weight="750" fill="#0f172a">notify-customer</text>
        <text x="8" y="36" font-size="8" font-family="monospace" fill="#64748b">Q: notification • 30s</text>
      </g>
    </g>
  </g>

  <!-- ============================================================== -->
  <!-- LAYER 3: DAG VALIDATION & TOPOLOGICAL PLANNING (Y: 378, H: 100) -->
  <!-- ============================================================== -->
  <g id="layer-3" transform="translate(48, 378)">
    <rect width="1624" height="100" rx="10" fill="url(#cardGrad)" stroke="#e2e8f0" stroke-width="1" filter="url(#cardShadow)" />
    <rect width="6" height="100" rx="3" fill="#2563eb" />

    <!-- Left Info -->
    <g transform="translate(24, 16)">
      <rect x="0" y="0" width="85" height="19" rx="4" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1" />
      <text x="42" y="13" font-size="9.5" font-weight="800" fill="#2563eb" text-anchor="middle">LAYER 3 • DAG</text>
      
      <text x="0" y="39" font-size="15.5" font-weight="850" fill="#0f172a">Validation &amp; Planning</text>
      <text x="0" y="55" font-size="10.5" font-weight="700" fill="#2563eb">DagEngine (Kahn's Algorithm)</text>
      <text x="0" y="69" font-size="9.5" font-weight="750" fill="#059669">[Implemented: Kahn O(V+E) + Conditions]</text>
    </g>

    <!-- Center Description -->
    <g transform="translate(365, 14)">
      <text x="0" y="15" font-size="12" font-weight="750" fill="#1e293b">Validates DAG acyclicity, detects deadlocks, and computes topological stages.</text>
      <text x="0" y="34" font-size="11" font-weight="400" fill="#64748b">• Kahn's algorithm validates in-degrees, guaranteeing zero circular dependencies before database write.</text>
      <text x="0" y="50" font-size="11" font-weight="400" fill="#64748b">• Computes execution layers (`compute_execution_layers`): identifies tasks ready for concurrent execution.</text>
      <text x="0" y="66" font-size="10.5" font-weight="600" fill="#2563eb">Conditional Branching: evaluates expression rules (`evaluate_condition`) with `SKIPPED` cascade.</text>
    </g>

    <!-- Right Visual -->
    <g transform="translate(980, 12)">
      <rect width="610" height="76" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
      
      <g transform="translate(18, 12)">
        <rect width="165" height="52" rx="6" fill="#ffffff" stroke="#a7f3d0" stroke-width="1.5" />
        <text x="12" y="18" font-size="10" font-weight="800" fill="#059669">STAGE 1: ROOT INGEST</text>
        <text x="12" y="32" font-size="8.5" font-family="monospace" fill="#334155">inDegree[receive] = 0</text>
        <rect x="12" y="36" width="65" height="12" rx="3" fill="#ecfdf5" />
        <text x="44" y="45" font-size="8" font-weight="800" fill="#059669" text-anchor="middle">SCHEDULED</text>
      </g>

      <path d="M 190 38 L 218 38" stroke="#10b981" stroke-width="1.8" fill="none" marker-end="url(#arrowRightGreen)" />

      <g transform="translate(225, 12)">
        <rect width="180" height="52" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1.5" />
        <text x="12" y="18" font-size="10" font-weight="800" fill="#1d4ed8">STAGE 2: PARALLEL TIERS</text>
        <text x="12" y="32" font-size="8.5" font-family="monospace" fill="#334155">Payment || Inventory</text>
        <text x="12" y="44" font-size="8" font-weight="700" fill="#64748b">Prerequisite barrier: wait L1</text>
      </g>

      <path d="M 412 38 L 440 38" stroke="#2563eb" stroke-width="1.8" fill="none" marker-end="url(#arrowRight)" />

      <g transform="translate(448, 14)">
        <rect width="145" height="48" rx="6" fill="#eff6ff" stroke="#60a5fa" stroke-width="1" />
        <text x="72" y="20" font-size="9.5" font-weight="800" fill="#1e40af" text-anchor="middle">KAHN ENGINE AUDIT</text>
        <text x="72" y="36" font-size="11" font-weight="800" fill="#059669" text-anchor="middle">PASS • 0 Deadlocks</text>
      </g>
    </g>
  </g>

  <!-- ============================================================== -->
  <!-- LAYER 4: DISTRIBUTED ORCHESTRATION ENGINE (Y: 490, H: 116) -->
  <!-- ============================================================== -->
  <g id="layer-4" transform="translate(48, 490)">
    <rect width="1624" height="116" rx="10" fill="#ffffff" stroke="#0891b2" stroke-width="2" filter="url(#cardShadow)" />
    <rect width="6" height="116" rx="3" fill="#0891b2" />

    <!-- Left Info -->
    <g transform="translate(24, 18)">
      <rect x="0" y="0" width="105" height="19" rx="4" fill="#ecfeff" stroke="#0891b2" stroke-width="1" />
      <text x="52" y="13" font-size="9.5" font-weight="800" fill="#0891b2" text-anchor="middle">LAYER 4 • CORE</text>
      
      <text x="0" y="42" font-size="16.5" font-weight="900" fill="#0f172a">Distributed Orchestrator</text>
      <text x="0" y="60" font-size="10.5" font-weight="700" fill="#0891b2">ExecutionService &amp; WorkerService</text>
      <text x="0" y="74" font-size="9.5" font-weight="750" fill="#059669">[Implemented: Atomic CAS + 5 Queues]</text>
      <text x="0" y="88" font-size="9" font-family="monospace" fill="#0e7490">Master Node: Ready • 2s Polling</text>
    </g>

    <!-- Center Description -->
    <g transform="translate(365, 14)">
      <text x="0" y="15" font-size="12" font-weight="750" fill="#1e293b">Schedules tasks, manages states, and dispatches to isolated worker queues.</text>
      <text x="0" y="34" font-size="11" font-weight="400" fill="#64748b">• State Machine: PENDING → SCHEDULED → RUNNING → COMPLETED / FAILED / SKIPPED.</text>
      <text x="0" y="50" font-size="11" font-weight="400" fill="#64748b">• Atomic Compare-and-Swap Claiming: prevents race conditions between competing worker nodes.</text>
      <text x="0" y="66" font-size="11" font-weight="400" fill="#64748b">• Heartbeat monitoring: 45s stale worker lease timeout recovery with task auto-reclaim.</text>
      <text x="0" y="81" font-size="10.5" font-weight="600" fill="#0891b2">Cascades output payloads across dependencies and resolves dynamic fan-in barriers.</text>
    </g>

    <!-- Right Visual (Orchestrator to 5 Queues) -->
    <g transform="translate(940, 12)">
      <rect width="665" height="92" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
      
      <g transform="translate(18, 14)">
        <rect width="128" height="64" rx="6" fill="#0f172a" />
        <circle cx="24" cy="24" r="6" fill="#10b981" />
        <text x="36" y="27" font-size="10" font-weight="800" fill="#ffffff">DISPATCH CORE</text>
        <text x="14" y="44" font-size="8.5" font-family="monospace" fill="#94a3b8">Kahn Scheduler</text>
        <text x="14" y="57" font-size="8" font-family="monospace" fill="#38bdf8">Atomic State DB</text>
      </g>

      <path d="M 148 30 L 195 20" stroke="#0891b2" stroke-width="1.8" fill="none" marker-end="url(#arrowRight)" />
      <path d="M 148 40 L 195 38" stroke="#0891b2" stroke-width="1.8" fill="none" marker-end="url(#arrowRight)" />
      <path d="M 148 46 L 195 56" stroke="#0891b2" stroke-width="1.8" fill="none" marker-end="url(#arrowRight)" />
      <path d="M 148 56 L 195 74" stroke="#0891b2" stroke-width="1.8" fill="none" marker-end="url(#arrowRight)" />

      <!-- 5 Isolated Worker Queues -->
      <g transform="translate(202, 10)">
        <rect x="0" y="0" width="84" height="72" rx="5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
        <text x="42" y="14" font-size="8.5" font-weight="800" fill="#0891b2" text-anchor="middle">default</text>
        <text x="42" y="25" font-size="7.5" fill="#64748b" text-anchor="middle">HTTP / Webhooks</text>
        <rect x="8" y="32" width="68" height="6" rx="3" fill="#ecfeff" />
        <rect x="8" y="32" width="45" height="6" rx="3" fill="#0891b2" />
        <text x="42" y="50" font-size="7.5" font-family="monospace" fill="#0e7490" text-anchor="middle">Worker-01: OK</text>
        <text x="42" y="62" font-size="7.5" font-weight="700" fill="#10b981" text-anchor="middle">Load: 65%</text>

        <rect x="90" y="0" width="84" height="72" rx="5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
        <text x="132" y="14" font-size="8.5" font-weight="800" fill="#2563eb" text-anchor="middle">compute</text>
        <text x="132" y="25" font-size="7.5" fill="#64748b" text-anchor="middle">Spark / High-CPU</text>
        <rect x="98" y="32" width="68" height="6" rx="3" fill="#eff6ff" />
        <rect x="98" y="32" width="55" height="6" rx="3" fill="#2563eb" />
        <text x="132" y="50" font-size="7.5" font-family="monospace" fill="#1e40af" text-anchor="middle">Worker-02: OK</text>
        <text x="132" y="62" font-size="7.5" font-weight="700" fill="#10b981" text-anchor="middle">Load: 80%</text>

        <rect x="180" y="0" width="84" height="72" rx="5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
        <text x="222" y="14" font-size="8.5" font-weight="800" fill="#7c3aed" text-anchor="middle">ai-agent</text>
        <text x="222" y="25" font-size="7.5" fill="#64748b" text-anchor="middle">LLM Reasoning</text>
        <rect x="188" y="32" width="68" height="6" rx="3" fill="#f5f3ff" />
        <rect x="188" y="32" width="30" height="6" rx="3" fill="#7c3aed" />
        <text x="222" y="50" font-size="7.5" font-family="monospace" fill="#5b21b6" text-anchor="middle">Worker-03: OK</text>
        <text x="222" y="62" font-size="7.5" font-weight="700" fill="#10b981" text-anchor="middle">Load: 42%</text>

        <rect x="270" y="0" width="84" height="72" rx="5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
        <text x="312" y="14" font-size="8.5" font-weight="800" fill="#0d9488" text-anchor="middle">data-io</text>
        <text x="312" y="25" font-size="7.5" fill="#64748b" text-anchor="middle">Parquet / DB ETL</text>
        <rect x="278" y="32" width="68" height="6" rx="3" fill="#f0fdfa" />
        <rect x="278" y="32" width="50" height="6" rx="3" fill="#0d9488" />
        <text x="312" y="50" font-size="7.5" font-family="monospace" fill="#115e59" text-anchor="middle">Worker-04: OK</text>
        <text x="312" y="62" font-size="7.5" font-weight="700" fill="#10b981" text-anchor="middle">Load: 60%</text>

        <rect x="360" y="0" width="88" height="72" rx="5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
        <text x="404" y="14" font-size="8.5" font-weight="800" fill="#f59e0b" text-anchor="middle">notification</text>
        <text x="404" y="25" font-size="7.5" fill="#64748b" text-anchor="middle">Slack / Email Alerts</text>
        <rect x="368" y="32" width="72" height="6" rx="3" fill="#fffbeb" />
        <rect x="368" y="32" width="20" height="6" rx="3" fill="#f59e0b" />
        <text x="404" y="50" font-size="7.5" font-family="monospace" fill="#b45309" text-anchor="middle">Worker-05: OK</text>
        <text x="404" y="62" font-size="7.5" font-weight="700" fill="#10b981" text-anchor="middle">Load: 25%</text>
      </g>
    </g>
  </g>

  <!-- ============================================================== -->
  <!-- LAYER 5: AI COPILOT & FAILURE DIAGNOSIS (Y: 618, H: 100) -->
  <!-- ============================================================== -->
  <g id="layer-5" transform="translate(48, 618)">
    <rect width="1624" height="100" rx="10" fill="url(#cardGrad)" stroke="#e2e8f0" stroke-width="1" filter="url(#cardShadow)" />
    <rect width="6" height="100" rx="3" fill="#7c3aed" />

    <!-- Left Info -->
    <g transform="translate(24, 16)">
      <rect x="0" y="0" width="85" height="19" rx="4" fill="#f5f3ff" stroke="#ddd6fe" stroke-width="1" />
      <text x="42" y="13" font-size="9.5" font-weight="800" fill="#7c3aed" text-anchor="middle">LAYER 5 • AI</text>
      
      <text x="0" y="39" font-size="15.5" font-weight="850" fill="#0f172a">Failure Diagnosis &amp; RCA</text>
      <text x="0" y="55" font-size="10.5" font-weight="700" fill="#7c3aed">AiOrchestratorService.diagnose_failure</text>
      <text x="0" y="69" font-size="9.5" font-weight="750" fill="#059669">[Implemented: RCA &amp; Severity Scoring]</text>
      <text x="0" y="82" font-size="9" font-family="monospace" fill="#64748b">Endpoint: POST /ai/diagnose-failure</text>
    </g>

    <!-- Center Description -->
    <g transform="translate(365, 14)">
      <text x="0" y="15" font-size="12" font-weight="750" fill="#1e293b">Performs automated Root-Cause Analysis (RCA) on failed executions and task timeouts.</text>
      <text x="0" y="34" font-size="11" font-weight="400" fill="#64748b">• Ingests task error logs, HTTP status codes, and execution duration in ExecutionsPage.</text>
      <text x="0" y="50" font-size="11" font-weight="400" fill="#64748b">• Categorizes failures: Timeout vs Connection Refused/404 vs Runtime payload exceptions.</text>
      <text x="0" y="66" font-size="10.5" font-weight="600" fill="#7c3aed">Outputs severity (HIGH/MEDIUM/LOW), autoFixable flag, and actionable self-healing steps.</text>
    </g>

    <!-- Right Visual -->
    <g transform="translate(980, 10)">
      <g transform="translate(0, 0)">
        <rect width="250" height="78" rx="6" fill="#0f172a" />
        <circle cx="12" cy="14" r="3" fill="#ef4444" />
        <text x="22" y="17" font-size="9" font-family="monospace" fill="#f87171">FAILED: step-payment</text>
        <text x="10" y="33" font-size="8" font-family="monospace" fill="#94a3b8">HTTP 504 Gateway Timeout</text>
        <text x="10" y="46" font-size="8" font-family="monospace" fill="#94a3b8">Retries exhausted: 3/3</text>
        <text x="10" y="59" font-size="8" font-family="monospace" fill="#fca5a5">Upstream payment service delay</text>
        <text x="10" y="71" font-size="8" font-family="monospace" fill="#64748b">Worker: compute-node-02</text>
      </g>

      <path d="M 255 40 L 278 40" stroke="#7c3aed" stroke-width="2" fill="none" marker-end="url(#arrowRightPurple)" />

      <g transform="translate(285, 0)">
        <rect width="325" height="78" rx="6" fill="#fbf7ff" stroke="#ddd6fe" stroke-width="1.5" />
        <rect x="8" y="8" width="115" height="18" rx="4" fill="#ede9fe" />
        <text x="65" y="20" font-size="9" font-weight="800" fill="#6d28d9" text-anchor="middle">AI RCA DIAGNOSIS</text>
        
        <rect x="220" y="8" width="95" height="18" rx="4" fill="#fee2e2" />
        <text x="267" y="20" font-size="8.5" font-weight="800" fill="#dc2626" text-anchor="middle">HIGH SEVERITY</text>

        <text x="10" y="38" font-size="9" font-weight="700" fill="#1e1b4b">Root Cause: Downstream Payment Rate Limiting (504)</text>
        <rect x="8" y="44" width="308" height="28" rx="4" fill="#ffffff" stroke="#c4b5fd" stroke-width="1" />
        <text x="14" y="56" font-size="8.5" font-weight="750" fill="#5b21b6">Fix: Exponential backoff with jitter + retry queue</text>
        <text x="14" y="67" font-size="8" font-family="monospace" fill="#64748b">Actionable remediation plan copied to clipboard</text>
      </g>
    </g>
  </g>

  <!-- ============================================================== -->
  <!-- LAYER 6: RECOVERY & SELF-HEALING (Y: 730, H: 106) -->
  <!-- ============================================================== -->
  <g id="layer-6" transform="translate(48, 730)">
    <rect width="1624" height="106" rx="10" fill="url(#cardGrad)" stroke="#e2e8f0" stroke-width="1" filter="url(#cardShadow)" />
    <rect width="6" height="106" rx="3" fill="#10b981" />

    <!-- Left Info -->
    <g transform="translate(24, 18)">
      <rect x="0" y="0" width="85" height="19" rx="4" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1" />
      <text x="42" y="13" font-size="9.5" font-weight="800" fill="#059669" text-anchor="middle">LAYER 6 • OPS</text>
      
      <text x="0" y="42" font-size="15.5" font-weight="850" fill="#0f172a">Recovery &amp; Self-Healing</text>
      <text x="0" y="58" font-size="10.5" font-weight="700" fill="#059669">ExecutionService &amp; Reclaim Loop</text>
      <text x="0" y="72" font-size="9.5" font-weight="750" fill="#059669">[Implemented: Auto-Retry + Reclaim]</text>
      <text x="0" y="85" font-size="9" font-family="monospace" fill="#64748b">1-Click Topology Patch: In Progress</text>
    </g>

    <!-- Center Description -->
    <g transform="translate(365, 14)">
      <text x="0" y="15" font-size="12" font-weight="750" fill="#1e293b">Separates automated engine recovery from user-reviewed architectural remediation.</text>
      <text x="0" y="34" font-size="11" font-weight="400" fill="#64748b">• <tspan font-weight="700" fill="#059669">Automated Recovery (Implemented):</tspan> Task retries (within maxRetries) and dead worker auto-reclaim.</text>
      <text x="0" y="50" font-size="11" font-weight="400" fill="#64748b">• <tspan font-weight="700" fill="#7c3aed">Human-in-the-Loop Remediation (Implemented):</tspan> Suggested fix guides user to adjust DAG in Studio.</text>
      <text x="0" y="66" font-size="10.5" font-weight="600" fill="#059669">Reclaimed &amp; retried tasks re-enter Layer 4 Engine as SCHEDULED for immediate worker claiming.</text>
    </g>

    <!-- Right Visual (Dual Path) -->
    <g transform="translate(970, 10)">
      <rect width="630" height="86" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
      
      <!-- Automated Path -->
      <g transform="translate(16, 10)">
        <rect width="140" height="30" rx="4" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1" />
        <circle cx="12" cy="15" r="4" fill="#10b981" />
        <text x="24" y="19" font-size="9" font-weight="800" fill="#065f46">AUTOMATED RECOVERY</text>
        
        <path d="M 140 15 L 168 15" stroke="#10b981" stroke-width="1.8" fill="none" marker-end="url(#arrowRightGreen)" />
        
        <rect x="175" y="0" width="185" height="30" rx="4" fill="#ffffff" stroke="#10b981" stroke-width="1.5" />
        <text x="185" y="14" font-size="9" font-weight="750" fill="#0f172a">Retry Attempt + Worker Reclaim</text>
        <text x="185" y="24" font-size="8" font-family="monospace" fill="#059669">attempt &lt; maxRetries → SCHEDULED</text>

        <path d="M 360 15 L 388 15" stroke="#10b981" stroke-width="1.8" fill="none" marker-end="url(#arrowRightGreen)" />
        
        <rect x="395" y="0" width="180" height="30" rx="4" fill="#10b981" />
        <text x="485" y="14" font-size="9" font-weight="800" fill="#ffffff" text-anchor="middle">RE-DISPATCHED TO L4</text>
        <text x="485" y="24" font-size="8" font-weight="600" fill="#ecfdf5" text-anchor="middle">Execution Resumed</text>
      </g>

      <!-- Human-in-the-Loop Path -->
      <g transform="translate(16, 46)">
        <rect width="140" height="30" rx="4" fill="#f5f3ff" stroke="#ddd6fe" stroke-width="1" />
        <circle cx="12" cy="15" r="4" fill="#7c3aed" />
        <text x="24" y="19" font-size="9" font-weight="800" fill="#5b21b6">HUMAN REMEDIATION</text>

        <path d="M 140 15 L 168 15" stroke="#7c3aed" stroke-width="1.8" fill="none" marker-end="url(#arrowRightPurple)" />

        <rect x="175" y="0" width="185" height="30" rx="4" fill="#ffffff" stroke="#7c3aed" stroke-width="1.5" />
        <text x="185" y="14" font-size="9" font-weight="750" fill="#0f172a">AI Suggested Fix Report</text>
        <text x="185" y="24" font-size="8" font-family="monospace" fill="#7c3aed">User adjusts DAG parameters</text>

        <path d="M 360 15 L 388 15" stroke="#7c3aed" stroke-width="1.8" fill="none" marker-end="url(#arrowRightPurple)" />

        <rect x="395" y="0" width="180" height="30" rx="4" fill="#ffffff" stroke="#7c3aed" stroke-width="1" />
        <text x="485" y="14" font-size="9" font-weight="800" fill="#5b21b6" text-anchor="middle">USER APPLIES FIX</text>
        <text x="485" y="24" font-size="8" font-weight="700" fill="#059669" text-anchor="middle">Updated via Studio Canvas</text>
      </g>
    </g>
  </g>

  <!-- ============================================================== -->
  <!-- LAYER 7: MONITORING & AUDIT TELEMETRY (Y: 848, H: 102) -->
  <!-- ============================================================== -->
  <g id="layer-7" transform="translate(48, 848)">
    <rect width="1624" height="102" rx="10" fill="url(#cardGrad)" stroke="#e2e8f0" stroke-width="1" filter="url(#cardShadow)" />
    <rect width="6" height="102" rx="3" fill="#0891b2" />

    <!-- Left Info -->
    <g transform="translate(24, 16)">
      <rect x="0" y="0" width="85" height="19" rx="4" fill="#ecfeff" stroke="#a5f3fc" stroke-width="1" />
      <text x="42" y="13" font-size="9.5" font-weight="800" fill="#0891b2" text-anchor="middle">LAYER 7 • OBS</text>
      
      <text x="0" y="39" font-size="15.5" font-weight="850" fill="#0f172a">Monitoring &amp; Audit Trail</text>
      <text x="0" y="55" font-size="10.5" font-weight="700" fill="#0891b2">ExecutionsPage &amp; AuditPage</text>
      <text x="0" y="69" font-size="9.5" font-weight="750" fill="#059669">[Implemented: Live Telemetry &amp; Logs]</text>
    </g>

    <!-- Center Description -->
    <g transform="translate(365, 14)">
      <text x="0" y="15" font-size="12" font-weight="750" fill="#1e293b">Provides real-time visibility into distributed execution states and records audit history.</text>
      <text x="0" y="34" font-size="11" font-weight="400" fill="#64748b">• Polling loop (2s interval): updates task lifecycle, step progress bars, and duration metrics.</text>
      <text x="0" y="50" font-size="11" font-weight="400" fill="#64748b">• Immutable Audit Trail (`/api/v1/audit`): logs LOGIN, TRIGGER, SKIP, DISPATCH, FAIL, and RETRY events.</text>
      <text x="0" y="66" font-size="10.5" font-weight="600" fill="#0891b2">Closed feedback loop feeds worker throughput and failure patterns back to Engine &amp; AI Studio.</text>
    </g>

    <!-- Right Visual -->
    <g transform="translate(980, 12)">
      <rect width="610" height="76" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
      
      <g transform="translate(18, 12)">
        <rect width="105" height="52" rx="5" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
        <text x="10" y="18" font-size="8.5" font-weight="700" fill="#64748b">TOTAL RUNS</text>
        <text x="10" y="38" font-size="18" font-weight="900" fill="#2563eb">142</text>
        <text x="52" y="38" font-size="8" font-weight="700" fill="#059669">+12 live</text>
      </g>

      <g transform="translate(132, 12)">
        <rect width="115" height="52" rx="5" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
        <text x="10" y="18" font-size="8.5" font-weight="700" fill="#64748b">SUCCESS RATE</text>
        <text x="10" y="38" font-size="18" font-weight="900" fill="#059669">98.4%</text>
        <text x="70" y="38" font-size="8" font-weight="700" fill="#64748b">verified</text>
      </g>

      <g transform="translate(256, 12)">
        <rect width="110" height="52" rx="5" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
        <text x="10" y="18" font-size="8.5" font-weight="700" fill="#64748b">ACTIVE WORKERS</text>
        <text x="10" y="38" font-size="18" font-weight="900" fill="#d97706">5 Online</text>
        <text x="10" y="48" font-size="7.5" fill="#64748b">5 queues mapped</text>
      </g>

      <g transform="translate(376, 12)">
        <rect width="216" height="52" rx="5" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
        <text x="12" y="18" font-size="9" font-weight="800" fill="#0f172a">STEP PROGRESS TRACKER</text>
        <text x="156" y="18" font-size="8.5" font-weight="800" fill="#059669">4/4 (100%)</text>
        <rect x="12" y="26" width="192" height="8" rx="4" fill="#f1f5f9" />
        <rect x="12" y="26" width="192" height="8" rx="4" fill="#10b981" />
        <text x="12" y="44" font-size="8" font-family="monospace" fill="#64748b">Audit: /api/v1/audit • 2s Polling</text>
      </g>
    </g>
  </g>

  <!-- ============================================================== -->
  <!-- BOTTOM TAKEAWAY BANNER (Y: 966, H: 84) -->
  <!-- ============================================================== -->
  <g id="bottom-takeaway-section" transform="translate(48, 966)">
    <rect width="1824" height="84" rx="12" fill="url(#headerGrad)" stroke="#334155" stroke-width="1.5" />
    <rect x="0" y="0" width="1824" height="4" rx="2" fill="url(#primaryGrad)" />

    <g transform="translate(28, 24)">
      <rect width="150" height="36" rx="8" fill="rgba(8,145,178,0.2)" stroke="#0891b2" stroke-width="1" />
      <circle cx="20" cy="18" r="5" fill="#22d3ee" />
      <text x="34" y="22" font-size="11" font-weight="800" fill="#cffafe" letter-spacing="1">KEY TAKEAWAY</text>
    </g>

    <g transform="translate(200, 22)">
      <text x="0" y="24" font-size="18.5" font-weight="800" fill="#ffffff" letter-spacing="-0.3">
        "FlowForge turns natural-language intent into reliable, distributed, and self-healing workflow execution."
      </text>
      <text x="0" y="44" font-size="11.5" font-weight="500" fill="#94a3b8">
        Verified Implementation: 9Router AI Gateway • Kahn's O(V+E) DAG Engine • Atomic Compare-and-Swap Claiming • 5 Isolated Worker Queues.
      </text>
    </g>

    <g transform="translate(1260, 26)">
      <rect x="0" y="0" width="125" height="32" rx="6" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <text x="62" y="20" font-size="10.5" font-weight="700" fill="#38bdf8" text-anchor="middle">Zero-Cycle Kahn</text>

      <rect x="135" y="0" width="135" height="32" rx="6" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <text x="202" y="20" font-size="10.5" font-weight="700" fill="#a78bfa" text-anchor="middle">9Router AI Copilot</text>

      <rect x="280" y="0" width="135" height="32" rx="6" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <text x="347" y="20" font-size="10.5" font-weight="700" fill="#34d399" text-anchor="middle">Self-Healing Loops</text>

      <rect x="425" y="0" width="115" height="32" rx="6" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <text x="482" y="20" font-size="10.5" font-weight="700" fill="#fbcfe8" text-anchor="middle">5 Worker Queues</text>
    </g>
  </g>
</svg>"""

with open("docs/presentation/flowforge-ai-architecture-slide.svg", "w", encoding="utf-8") as f:
    f.write(svg_content)

ET.parse("docs/presentation/flowforge-ai-architecture-slide.svg")
print("Verified SVG is 100% valid XML.")
