# -*- coding: utf-8 -*-
import re

with open('E:/Ninewood/client-react/src/views/Help.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the target block
idx = content.find('filteredPages.length > 0 ?')
line_start = content.rfind('\n', 0, idx) + 1

# Read from line_start to find the closing pattern
block_end = content.find('\n            ) : (', line_start)
if block_end == -1:
    block_end = content.find('\n            ) : (', line_start + 100)
    
# Extract the exact text
old_text = content[line_start:block_end]

print('=== OLD TEXT (repr) ===')
print(repr(old_text))
print('=== OLD TEXT (plain) ===')
print(old_text)

# Build new text
indent = '            '
new_text = indent + '{filteredPages.length > 0 ? (\n'
new_text += indent + '  !query.trim() ? (\n'
new_text += indent + '    <LogoGrid\n'
new_text += indent + '      badge="导航"\n'
new_text += indent + '      heading="选择要前往的页面"\n'
new_text += indent + '      pages={pageGridItems}\n'
new_text += indent + '    />\n'
new_text += indent + '  ) : (\n'
new_text += indent + '    <div className="mx-auto max-w-6xl rounded-xl overflow-hidden border border-border/30">\n'
new_text += indent + '      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">\n'
new_text += indent + '        {filteredPages.map((entry) => (\n'
new_text += indent + '          <JumpBrandCard key={entry.id} entry={entry} onNavigate={handleJumpNavigate} />\n'
new_text += indent + '        ))}\n'
new_text += indent + '      </div>\n'
new_text += indent + '    </div>\n'
new_text += indent + '  )\n'
new_text += indent + ')'

print('\n=== NEW TEXT ===')
print(new_text)

# Do the replacement
replaced = content.replace(old_text, new_text)
if replaced != content:
    with open('E:/Ninewood/client-react/src/views/Help.tsx', 'w', encoding='utf-8') as f:
        f.write(replaced)
    print('\nSUCCESS: Replaced!')
else:
    print('\nFAILED: No replacement made')
