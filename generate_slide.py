import re

with open('docs/presentation/flowforge-ai-architecture-slide.svg', 'r') as f:
    text = f.read()

# Verify XML validity
import xml.etree.ElementTree as ET
ET.parse('docs/presentation/flowforge-ai-architecture-slide.svg')
print("Verified SVG XML is 100% valid.")
