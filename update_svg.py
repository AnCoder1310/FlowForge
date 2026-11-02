with open('generate_presentation.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_markers = '''    <marker id="arrowDown" viewBox="0 0 10 10" refX="5" refY="7" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1 L 5 7 L 9 1 z" fill="#0891b2" />
    </marker>
    <marker id="arrowUpFeedback" viewBox="0 0 10 10" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 9 L 5 3 L 9 9 z" fill="#7c3aed" />
    </marker>
    <marker id="arrowRight" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 1 1 L 7 5 L 1 9 z" fill="#0891b2" />
    </marker>
    <marker id="arrowRightGreen" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 1 1 L 7 5 L 1 9 z" fill="#10b981" />
    </marker>
    <marker id="arrowRightPurple" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 1 1 L 7 5 L 1 9 z" fill="#7c3aed" />
    </marker>'''

new_markers = '''    <marker id="arrowDown" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
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
    </marker>'''

if old_markers in content:
    content = content.replace(old_markers, new_markers)
    print("Markers replaced successfully in generate_presentation.py")
else:
    print("Warning: old markers not found in generate_presentation.py")

with open('generate_presentation.py', 'w', encoding='utf-8') as f:
    f.write(content)

