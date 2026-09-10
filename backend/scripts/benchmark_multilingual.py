"""Real synthetic ES/EN/PT benchmark; never substitutes a mock model."""
import argparse
import json
import sys
import time
from pathlib import Path
from collections import Counter
from unittest.mock import patch
import httpx
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.ai.extractor import extract_result

# Tuple labels: modality, manufacturer, model, age. Missing attributes are null.
CASES=[
    ('es','Hay un tomógrafo Philips de ocho años.', [('CT','Philips',None,8)]),
    ('en','There is an eight-year-old Philips CT system.', [('CT','Philips',None,8)]),
    ('pt','Há um tomógrafo Philips com cerca de oito anos.', [('CT','Philips',None,8)]),
    ('es','Un resonador de fabricante desconocido.', [('MRI',None,None,None)]),
    ('en','One MRI system, manufacturer unknown.', [('MRI',None,None,None)]),
    ('pt','Um equipamento de ressonância, fabricante desconhecido.', [('MRI',None,None,None)]),
    ('es','Dos resonadores Siemens y un CT Philips de siete años.', [('MRI','Siemens',None,None),('MRI','Siemens',None,None),('CT','Philips',None,7)]),
    ('en','Two MRI systems from Siemens and one Philips CT aged seven years.', [('MRI','Siemens',None,None),('MRI','Siemens',None,None),('CT','Philips',None,7)]),
    ('pt','Dois equipamentos MRI Siemens e um CT Philips com sete anos.', [('MRI','Siemens',None,None),('MRI','Siemens',None,None),('CT','Philips',None,7)]),
    ('es','Un CT Philips Incisive.', [('CT','Philips','Incisive',None)]),
    ('en','One Philips Incisive CT.', [('CT','Philips','Incisive',None)]),
    ('pt','Um CT Philips Incisive.', [('CT','Philips','Incisive',None)]),
    ('es','No hay equipos en esta sala.', []),
    ('en','There is no equipment in this room.', []),
    ('pt','Não há equipamentos nesta sala.', []),
]


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--limit',type=int,default=len(CASES))
    args=parser.parse_args()
    results=[]
    for index,(language,note,expected) in enumerate(CASES[:max(1,args.limit)]):
        metrics={}; started=time.perf_counter()
        def real_generate(prompt):
            response=httpx.post('http://127.0.0.1:11500/generate',json={'prompt':prompt},timeout=180)
            response.raise_for_status()
            data=response.json(); metrics.update(data.get('metrics') or {})
            if metrics.get('model')!='MedPsy-1.7B': raise ValueError('Unexpected model')
            return data['output_text']
        row={'case':index+1,'language':language,'input':note,'expected':expected}
        try:
            # Wrap transport only to collect SDK metrics. It calls the real service.
            with patch('app.ai.extractor.generate_with_qvac',side_effect=real_generate): result=extract_result(note)
            actual=[(e.modality,e.manufacturer,e.model,e.estimated_age_years) for e in result.equipment]
            row.update(actual=actual,detected_language=result.detected_language,
                checks={'quantity':len(actual)==len(expected),'language':result.detected_language==language,
                    **{name:Counter(a[pos] for a in actual)==Counter(e[pos] for e in expected) for pos,name in enumerate(['modality','manufacturer','model','age'])},
                    'unknown_nulls':sum(value is None for item in actual for value in item)==sum(value is None for item in expected for value in item)})
            row['passed']=all(row['checks'].values())
        except Exception as exc: row.update(error=str(exc),passed=False)
        row.update(metrics=metrics,total_ms=round((time.perf_counter()-started)*1000,2)); results.append(row)
        print(f"{language} case {index+1}: {'PASS' if row['passed'] else 'FAIL'}",flush=True)
    summary={language:{'passed':sum(r['passed'] for r in results if r['language']==language),'total':sum(r['language']==language for r in results)} for language in ['es','en','pt']}
    target=Path(__file__).resolve().parents[2]/'benchmarks/results/multilingual.json'
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps({'scope':'Synthetic inventory labels; not clinical validation','summary':summary,'results':results},ensure_ascii=False,indent=2),encoding='utf-8')
    print(target)
    return 0 if all(r['passed'] for r in results) else 1


if __name__=='__main__': raise SystemExit(main())
