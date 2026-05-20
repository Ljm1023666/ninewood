# -*- coding: utf-8 -*-
from pathlib import Path
from docx import Document

desktop = Path(r'C:/Users/19617/Desktop')
docx_file = desktop / '《软件测试与质量控制》实验报告（三）.docx'
doc = Document(docx_file)

with open('E:/Ninewood/doc_content.txt', 'w', encoding='utf-8') as f:
    for i, para in enumerate(doc.paragraphs):
        if para.text.strip():
            f.write(f'[{i}] {para.text}\n')
print('Done')
