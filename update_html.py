with open('generate_html_slide.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add CSS styles for layer-badge-row, layer-code-ref, layer-impl-badge, and layer-card::after
old_css = '''.layer-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.8px;
      width: fit-content;
      margin-bottom: 2px;
    }'''

new_css = '''.layer-badge-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      margin-bottom: 2px;
    }

    .layer-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.8px;
      width: fit-content;
    }

    .layer-code-ref {
      font-size: 9px;
      font-family: var(--font-mono);
      color: var(--dash-primary-dark);
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
    }

    .layer-impl-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 8px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 3px;
      white-space: nowrap;
    }

    .layer-impl-badge.impl {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }

    .layer-impl-badge.progress {
      background: #f5f3ff;
      color: #6d28d9;
      border: 1px solid #ddd6fe;
    }

    .layer-card:not(:last-child)::after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid #0891b2;
      z-index: 5;
    }'''

if old_css in content:
    content = content.replace(old_css, new_css)
    print('Updated CSS in generate_html_slide.py')
else:
    print('Warning: old_css not found!')

# Now update the layer-meta blocks
replacements = [
    # Layer 1
    ('''<div class="layer-meta">
            <span class="layer-badge badge-cyan">LAYER 1</span>
            <h3 class="layer-title">Natural-Language Input</h3>
            <span class="layer-sub">Declarative Prompt Interface</span>
          </div>''',
     '''<div class="layer-meta">
            <div class="layer-badge-row">
              <span class="layer-badge badge-cyan">LAYER 1 &bull; UI</span>
              <span class="layer-impl-badge impl">[Implemented]</span>
            </div>
            <h3 class="layer-title">Natural-Language Input</h3>
            <span class="layer-code-ref">WorkflowStudio &bull; Prompt Modal</span>
          </div>'''),

    # Layer 2
    ('''<div class="layer-meta">
            <span class="layer-badge badge-purple">LAYER 2</span>
            <h3 class="layer-title">AI Prompt-to-DAG</h3>
            <span class="layer-sub">Semantic Graph Decomposition</span>
          </div>''',
     '''<div class="layer-meta">
            <div class="layer-badge-row">
              <span class="layer-badge badge-purple">LAYER 2 &bull; AI</span>
              <span class="layer-impl-badge impl">[Implemented]</span>
            </div>
            <h3 class="layer-title">AI Prompt-to-DAG</h3>
            <span class="layer-code-ref">ai_service.py &bull; /ai/generate-workflow</span>
          </div>'''),

    # Layer 3
    ('''<div class="layer-meta">
            <span class="layer-badge badge-blue">LAYER 3</span>
            <h3 class="layer-title">Validation &amp; Planning</h3>
            <span class="layer-sub">Kahn's Topological Sort Engine</span>
          </div>''',
     '''<div class="layer-meta">
            <div class="layer-badge-row">
              <span class="layer-badge badge-blue">LAYER 3 &bull; DAG</span>
              <span class="layer-impl-badge impl">[Implemented]</span>
            </div>
            <h3 class="layer-title">Validation &amp; Planning</h3>
            <span class="layer-code-ref">dag_engine.py &bull; Kahn's O(V+E) Algo</span>
          </div>'''),

    # Layer 4
    ('''<div class="layer-meta">
            <span class="layer-badge badge-dark">LAYER 4 &bull; CORE ENGINE</span>
            <h3 class="layer-title" style="color:var(--dash-primary-dark);">Distributed Orchestration</h3>
            <span class="layer-sub">State Machine &amp; Worker Dispatch</span>
          </div>''',
     '''<div class="layer-meta">
            <div class="layer-badge-row">
              <span class="layer-badge badge-dark">LAYER 4 &bull; CORE</span>
              <span class="layer-impl-badge impl">[Implemented]</span>
            </div>
            <h3 class="layer-title" style="color:var(--dash-primary-dark);">Distributed Orchestration</h3>
            <span class="layer-code-ref">ExecutionService &amp; WorkerService</span>
          </div>'''),

    # Layer 5
    ('''<div class="layer-meta">
            <span class="layer-badge badge-purple">LAYER 5</span>
            <h3 class="layer-title">AI Copilot &amp; Diagnosis</h3>
            <span class="layer-sub">Automated RCA &amp; Log Reasoning</span>
          </div>''',
     '''<div class="layer-meta">
            <div class="layer-badge-row">
              <span class="layer-badge badge-purple">LAYER 5 &bull; AI</span>
              <span class="layer-impl-badge impl">[Implemented]</span>
            </div>
            <h3 class="layer-title">AI Copilot &amp; Diagnosis</h3>
            <span class="layer-code-ref">ai_service.py &bull; /ai/diagnose-failure</span>
          </div>'''),

    # Layer 6
    ('''<div class="layer-meta">
            <span class="layer-badge badge-emerald">LAYER 6</span>
            <h3 class="layer-title">Self-Healing &amp; Recovery</h3>
            <span class="layer-sub">Automated vs Human-Approved Actions</span>
          </div>''',
     '''<div class="layer-meta">
            <div class="layer-badge-row">
              <span class="layer-badge badge-emerald">LAYER 6 &bull; OPS</span>
              <span class="layer-impl-badge progress">[Auto-Retry: Done &bull; Patch: Guided]</span>
            </div>
            <h3 class="layer-title">Self-Healing &amp; Recovery</h3>
            <span class="layer-code-ref">ExecutionService &bull; Reclaim Loop</span>
          </div>'''),

    # Layer 7
    ('''<div class="layer-meta">
            <span class="layer-badge badge-cyan">LAYER 7</span>
            <h3 class="layer-title">Monitoring &amp; Feedback</h3>
            <span class="layer-sub">Closed-Loop System Telemetry</span>
          </div>''',
     '''<div class="layer-meta">
            <div class="layer-badge-row">
              <span class="layer-badge badge-cyan">LAYER 7 &bull; OBS</span>
              <span class="layer-impl-badge impl">[Implemented]</span>
            </div>
            <h3 class="layer-title">Monitoring &amp; Feedback</h3>
            <span class="layer-code-ref">ExecutionsPage &bull; Live Telemetry</span>
          </div>'''),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print('Replaced a layer-meta block')
    else:
        print('Warning: could not find layer-meta block for replacement!')

with open('generate_html_slide.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated generate_html_slide.py successfully.')
