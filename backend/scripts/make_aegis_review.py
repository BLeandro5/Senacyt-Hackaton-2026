"""Create a local HTML reviewer for draft AEGIS labels; it makes no changes."""
import argparse
import json
from pathlib import Path


def rows(path):
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('dataset', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    items = []
    for split in ('train', 'validation', 'test'):
        for row in rows(args.dataset / f'{split}_raw.jsonl'):
            items.append({'id': row['id'], 'split': split, 'difficulty': row['difficulty'], 'tags': row['tags'],
                          'input': row['input'], 'expected': row['expected'], 'source_expected': row['source_expected'],
                          'corrections': row['metadata']['corrections'], 'unmapped_fields': row['metadata']['unmapped_fields']})
    data = json.dumps(items, ensure_ascii=False).replace('</', '<\\/')
    html = '''<!doctype html><meta charset="utf-8"><title>AEGIS label review</title>
<style>body{font:15px system-ui;margin:24px;background:#f5f7fb;color:#172033}main{max-width:1180px;margin:auto}.filters,article{background:#fff;border:1px solid #dce3ec;border-radius:12px;padding:16px;margin:12px 0}button,select,input{padding:8px;border-radius:7px;border:1px solid #b8c4d3;background:white}button{cursor:pointer}article{display:grid;gap:12px}pre{white-space:pre-wrap;word-break:break-word;background:#f7f9fc;padding:12px;border-radius:8px;max-height:360px;overflow:auto}.meta{display:flex;gap:8px;flex-wrap:wrap;color:#526274}.pill{background:#eaf2ff;padding:3px 7px;border-radius:999px}.decision{display:flex;gap:14px;align-items:center}textarea{width:100%;min-height:54px;box-sizing:border-box}details{border-top:1px solid #e5eaf0;padding-top:10px}.hidden{display:none}</style>
<main><h1>Revisión de etiquetas AEGIS</h1><p>Compara el texto con el JSON de producción. Aprueba solo hechos explícitos; usa excluir para ejemplos incorrectos o duplicados. Las decisiones se descargan como JSON y luego se importan con el script del proyecto.</p><div class="filters"><label>Split <select id="split"><option value="">Todos</option><option>train</option><option>validation</option><option>test</option></select></label> <label>Estado <select id="status"><option value="">Todos</option><option value="approved">Aprobados</option><option value="exclude">Excluidos</option><option value="needs_edit">Editar</option><option value="unreviewed">Sin revisar</option></select></label> <button id="export">Descargar decisiones</button> <span id="count"></span></div><section id="items"></section></main>
<script>const items=''' + data + ''';const decisions=JSON.parse(localStorage.getItem('aegis-review-decisions')||'{}');const box=document.querySelector('#items');
function esc(v){return String(v).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}function pretty(v){return esc(JSON.stringify(v,null,2))}function current(id){return decisions[id]?.decision||'unreviewed'}
function draw(){let shown=0;const split=document.querySelector('#split').value,status=document.querySelector('#status').value;box.innerHTML='';for(const item of items){const choice=current(item.id);if((split&&item.split!==split)||(status&&choice!==status))continue;shown++;const article=document.createElement('article');article.innerHTML=`<div class="meta"><b>${esc(item.id)}</b><span class="pill">${esc(item.split)}</span><span class="pill">${esc(item.difficulty)}</span><span>${item.tags.map(esc).join(', ')}</span></div><div><b>Observación</b><pre>${esc(item.input)}</pre></div><details open><summary><b>JSON que entrenaría producción</b></summary><pre>${pretty(item.expected)}</pre></details><details><summary>Etiqueta sintética original y trazabilidad</summary><pre>${pretty(item.source_expected)}</pre><pre>${pretty({corrections:item.corrections,unmapped_fields:item.unmapped_fields})}</pre></details><div class="decision"><b>Decisión:</b>${['approved','exclude','needs_edit'].map(v=>`<label><input type="radio" name="${item.id}" value="${v}" ${choice===v?'checked':''}> ${v==='approved'?'Aprobar':v==='exclude'?'Excluir':'Requiere edición'}</label>`).join('')} <button data-clear="${item.id}">Limpiar</button></div><label>Nota de revisión<textarea data-note="${item.id}" placeholder="Motivo o cambio que necesita">${esc(decisions[item.id]?.note||'')}</textarea></label>`;box.append(article)}document.querySelector('#count').textContent=`${shown} de ${items.length} casos`;for(const input of box.querySelectorAll('input[type=radio]'))input.onchange=e=>{decisions[e.target.name]={...(decisions[e.target.name]||{}),decision:e.target.value};save();draw()};for(const area of box.querySelectorAll('textarea'))area.oninput=e=>{const id=e.target.dataset.note;decisions[id]={...(decisions[id]||{}),decision:current(id),note:e.target.value};save()};for(const button of box.querySelectorAll('[data-clear]'))button.onclick=()=>{delete decisions[button.dataset.clear];save();draw()}}
function save(){localStorage.setItem('aegis-review-decisions',JSON.stringify(decisions))}document.querySelector('#split').onchange=draw;document.querySelector('#status').onchange=draw;document.querySelector('#export').onclick=()=>{const blob=new Blob([JSON.stringify({format:'aegis-label-review-v1',decisions},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='aegis-review-decisions.json';a.click();URL.revokeObjectURL(a.href)};draw();</script>'''
    args.output.write_text(html, encoding='utf-8')
    print(f'Created {args.output} with {len(items)} labels')


if __name__ == '__main__':
    main()
