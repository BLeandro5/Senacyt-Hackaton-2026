"""Review projected packs locally and group related templates before splitting.

Automatic approval describes eligibility for an experimental extraction dataset,
never human approval or correctness of the original synthetic labels.
"""
import argparse
from collections import Counter, defaultdict
from copy import deepcopy
from hashlib import sha256
from html import escape
import json
from pathlib import Path
import random
import re

try:
    from .adapt_aegis_pack import adapt, normal, mentioned, SYSTEM, ExtractionResult, CONDITIONS
except ImportError:
    from adapt_aegis_pack import adapt, normal, mentioned, SYSTEM, ExtractionResult, CONDITIONS

SPLITS = ('train', 'validation', 'test')
MODALITIES = {'CT', 'MRI', 'Ultrasound', 'Mammography', 'X-ray', 'PET/CT', 'Unknown'}
# These notes describe absences already encoded as null, or future maintenance
# which does not change current status. Other notes remain in the review queue.
REDUNDANT_NOTES = {
    'modelo no legible', 'modelo ilegible', 'antiguedad desconocida',
    'antiguedad reportada por personal', 'placa ilegible',
    'apagado; condicion desconocida', 'apagado; condicion no confirmada',
    'estaba apagado; no implica fuera de servicio',
    'apagado temporalmente por limpieza; condicion no inferida',
    'mantenimiento programado futuro',
    'mantenimiento preventivo futuro; no cambia condicion actual',
    'fabricante sugerido pero no confirmado',
}
UNRESOLVED_TAGS = {
    'duplicate_risk', 'inventory_conflict', 'conflicting_counts', 'count_conflict',
    'identity_conflict', 'manufacturer_conflict', 'source_uncertainty',
    'open_count', 'at_least', 'ambiguous_modality', 'uncertain_modality',
}


def read(path):
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def write_rows(path, rows):
    path.write_text(''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in rows), encoding='utf-8')


def review(row):
    reasons = []
    source, target = row['source_expected'], row['expected']
    for tag in sorted(set(row['tags']) & UNRESOLVED_TAGS):
        reasons.append('Conflicto o conteo pendiente: ' + tag)
    for i, (original, projected) in enumerate(zip(source['equipment'], target['equipment'])):
        prefix = f'Equipo {i + 1}: '
        if projected['modality'] not in MODALITIES:
            reasons.append(prefix + 'modalidad fuera del conjunto actual de entrenamiento')
        if original['condition'] is not None and original['condition'] not in CONDITIONS:
            reasons.append(prefix + 'estado no soportado; se omite este caso del entrenamiento')
        if original['observation_status'] != 'observed':
            reasons.append(prefix + 'la salida pierde la distinción reportado/observado')
        if original['condition_status'] in ('uncertain', 'reported') and original['condition'] is not None:
            reasons.append(prefix + 'estado con evidencia mixta; pendiente de corrección')
        quantity = original.get('quantity_statement')
        if quantity is not None and not str(quantity).isdigit():
            reasons.append(prefix + 'conteo abierto no representable')
        note = normal(original.get('notes') or '')
        if note and note not in REDUNDANT_NOTES:
            if not (note.startswith('no atribuir ') and projected['manufacturer'] is None):
                reasons.append(prefix + 'nota con información pendiente: ' + original['notes'])
        for field in ('manufacturer', 'model', 'age_description'):
            value = projected[field]
            if value and not mentioned(value, row['input']):
                reasons.append(prefix + field + ' sin respaldo literal')
    if len(source['equipment']) != len(target['equipment']):
        reasons.append('La proyección cambió la cantidad de equipos')
    return ('exclude', sorted(set(reasons))) if reasons else (
        'approved', ['Etiqueta compatible con extracción; desconocidos y negaciones conservados.'])


def family_key(text, entities):
    text = normal(text)
    # Erase variable slots, retain narrative structure and order. Full-match
    # templates are conservative; this is not a semantic similarity guarantee.
    for value in entities:
        text = re.sub(r'(?<!\w)' + re.escape(value) + r'(?!\w)', ' ENTITY ', text)
    text = re.sub(r'\b\d+(?:[.,]\d+)?\b', ' NUMBER ', text)
    return re.sub(r'\W+', ' ', text).strip()


def build(sources, output):
    if output.exists():
        raise ValueError(f'Output already exists: {output}')
    rows, ids, inputs, duplicates = [], set(), {}, []
    for source in sources:
        for split in SPLITS:
            for old in read(source / f'{split}_raw.jsonl'):
                if old['id'] in ids:
                    raise ValueError('Duplicate ID: ' + old['id'])
                ids.add(old['id'])
                key = normal(old['input'])
                if key in inputs:
                    duplicates.append({'id': old['id'], 'retained_id': inputs[key]})
                    continue
                inputs[key] = old['id']
                row = adapt({**old, 'expected': deepcopy(old['source_expected'])}, split)
                row['metadata'].update(source_dataset=str(source), original_split=split)
                # A city embedded only in the facility name is not a location assertion;
                # likewise a country embedded only in the city name.
                location_text = normal(row['input'])
                for field in ('facility', 'city', 'country'):
                    value = row['expected'][field]
                    if value and not mentioned(value, location_text):
                        row['metadata']['corrections'].append({'field': field, 'from': value, 'to': None,
                            'reason': 'Solo aparece dentro de otro nombre; ubicación no explícita.'})
                        row['expected'][field] = None
                    if value:
                        location_text = location_text.replace(normal(value), '')
                ExtractionResult.model_validate(row['expected'])
                decision, reasons = review(row)
                row['metadata'].update(review_status=decision, review_method='automatic-projection-v2',
                                       human_reviewed=False, review_note='; '.join(reasons))
                rows.append(row)

    entities = {'ge', 'philips', 'siemens', 'canon', 'mindray', 'hologic', 'samsung', 'fujifilm'}
    entities.update(normal(v) for row in rows for k, v in row['source_expected'].items()
                    if k in ('facility_name', 'city', 'country') and v)
    entities.update(normal(item['model']) for row in rows for item in row['source_expected']['equipment'] if item['model'])
    entities.update(['tomografo', 'tomografos', 'ct', 'mri', 'mris', 'resonador magnetico',
        'resonador magneticos', 'resonador', 'resonadores', 'ecografo', 'ecografos',
        'ultrasonido', 'ultrasonidos', 'equipo de ultrasonido', 'mamografo', 'mamografos',
        'equipo de mamografia', 'equipo de mamografias', 'mammography', 'ultrasound',
        'equipo de rayos x', 'equipo de rayos xs', 'sistema de radiografia',
        'sistema de radiografias', 'x-ray', 'pet/ct', 'pet/cts', 'arco en c', 'arco en cs',
        'equipo de tomografia', 'equipo de tomografias', 'equipo de resonancia magnetica'])
    entities = sorted(entities, key=lambda s: (-len(s), s))
    groups = defaultdict(list)
    for row in rows:
        key = family_key(row['input'], entities)
        row['metadata']['template_family'] = sha256(key.encode()).hexdigest()[:16]
        groups[key].append(row)
    accepted_groups = [g for g in groups.values() if any(r['metadata']['review_status'] == 'approved' for r in g)]
    random.Random(42).shuffle(accepted_groups)
    total = sum(r['metadata']['review_status'] == 'approved' for r in rows)
    targets = {'train': total * .7, 'validation': total * .15, 'test': total * .15}
    split_rows = {s: [] for s in SPLITS}
    for group in sorted(accepted_groups, key=lambda g: -sum(r['metadata']['review_status'] == 'approved' for r in g)):
        split = max(SPLITS, key=lambda s: targets[s] - len(split_rows[s]))
        for row in group:
            if row['metadata']['review_status'] == 'approved':
                row['metadata']['split'] = split
                split_rows[split].append(row)
    family_sets = {s: {r['metadata']['template_family'] for r in group} for s, group in split_rows.items()}
    assert not (family_sets['train'] & family_sets['test'] or family_sets['train'] & family_sets['validation'] or family_sets['test'] & family_sets['validation'])

    output.mkdir(parents=True)
    for split, group in split_rows.items():
        write_rows(output / f'{split}_raw.jsonl', group)
        write_rows(output / f'{split}_chat.jsonl', [{'messages': [
            {'role': 'system', 'content': SYSTEM}, {'role': 'user', 'content': row['input']},
            {'role': 'assistant', 'content': json.dumps(row['expected'], ensure_ascii=False)}]} for row in group])
    write_rows(output / 'all_reviewed_raw.jsonl', rows)
    write_rows(output / 'excluded_raw.jsonl', [r for r in rows if r['metadata']['review_status'] == 'exclude'])
    write(output / 'decisions.json', {'format': 'aegis-label-review-v1', 'reviewer': 'automatic-projection-v2',
        'decisions': {r['id']: {'decision': r['metadata']['review_status'], 'note': r['metadata']['review_note']} for r in rows}})
    report = {'source_cases': len(ids), 'unique_cases': len(rows), 'duplicates': duplicates,
        'decisions': dict(Counter(r['metadata']['review_status'] for r in rows)),
        'by_source': {str(s): dict(Counter(r['metadata']['review_status'] for r in rows if r['metadata']['source_dataset'] == str(s))) for s in sources},
        'splits': {s: len(g) for s, g in split_rows.items()}, 'template_families': len(groups),
        'approved_template_families': len(accepted_groups), 'template_overlap_between_splits': 0,
        'approved_difficulty': dict(Counter(r['difficulty'] for r in rows if r['metadata']['review_status'] == 'approved')),
        'weights_trained': False, 'limitations': [
            'Revisión automática de proyección, no certificación humana de los labels.',
            'Particiones nuevas agrupadas por plantilla normalizada; las métricas antiguas no son comparables.',
            'Puede haber similitud semántica residual entre familias distintas.',
            'Los estados no soportados quedan excluidos. No se amplía la app.',
            'Los casos excluidos se conservan completos; no sirven aún para entrenar el esquema actual.']}
    write(output / 'report.json', report)
    cards = []
    for row in rows:
        cards.append('<details><summary>' + escape(row['id'] + ' — ' + row['metadata']['review_status']) +
            '</summary><p>' + escape(row['metadata']['review_note']) + '</p><pre>' + escape(row['input']) +
            '</pre><pre>' + escape(json.dumps(row['expected'], ensure_ascii=False, indent=2)) + '</pre></details>')
    (output / 'review.html').write_text('<!doctype html><html lang="es"><meta charset="utf-8"><title>Revisión AEGIS V1 + V2</title>'
        '<style>body{font:16px system-ui;max-width:1100px;margin:32px auto;padding:16px}details{padding:12px;border-bottom:1px solid #ccc}pre{white-space:pre-wrap}</style>'
        '<h1>Revisión automática AEGIS V1 + V2</h1><p>Aprobado indica selección experimental para entrenamiento. Excluido conserva el caso para corregirlo posteriormente.</p><pre>' +
        escape(json.dumps(report, ensure_ascii=False, indent=2)) + '</pre>' + ''.join(cards) + '</html>', encoding='utf-8')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('sources', nargs='+', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(build(args.sources, args.output), ensure_ascii=False, indent=2))
