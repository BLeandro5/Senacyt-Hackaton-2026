"""Aggregation of canonical assets and separate observation evidence."""
from collections import Counter
from app.services.installed_base import assets, known

def inventory_summary(db):
    installed=assets(db)
    hospitals={r['id']:{**dict(r),'assets':0,'evidence':0,'visits':0,'observations':0,'stale':0,'opportunities':0,'conflicts':0,'needsReview':0,'modalities':{}} for r in db.execute('SELECT * FROM hospitals')}
    for row in db.execute("SELECT hospital_id,count(*) AS n FROM visits WHERE completed_at!='' GROUP BY hospital_id"):
        hospitals[row['hospital_id']]['visits']=row['n']
    for row in db.execute("SELECT v.hospital_id,count(*) AS n FROM observations o JOIN visits v ON v.id=o.visit_id WHERE v.completed_at!='' GROUP BY v.hospital_id"):
        hospitals[row['hospital_id']]['observations']=row['n']
    for row in db.execute("SELECT v.hospital_id,count(*) AS n FROM equipment e JOIN visits v ON v.id=e.visit_id WHERE v.completed_at!='' GROUP BY v.hospital_id"):
        hospitals[row['hospital_id']]['evidence']=row['n']
    for a in installed:
        h=hospitals[a['hospital_id']];h['assets']+=1
        h['stale']+=a['reliability']['freshness']=='Stale';h['opportunities']+=a['potentialOpportunity'];h['conflicts']+=a['hasConflict']
        h['needsReview']+=a['hasConflict'] or a['reliability']['level']=='Low' or a['status']=='Needs verification'
        h['modalities'][a['modality']]=h['modalities'].get(a['modality'],0)+1
    groups={}
    for field in ('country','region','city'):
        buckets={}
        for h in hospitals.values():
            if not h['visits']:continue
            # City/region labels retain parent country to avoid mixing namesakes.
            label=h[field] or 'No informado'
            if field!='country':label=f"{h['country'] or 'País no informado'} / {label}"
            bucket=buckets.setdefault(label,dict(label=label,hospitals=0,assets=0,evidence=0,observations=0,visits=0,stale=0,opportunities=0,conflicts=0))
            bucket['hospitals']+=1
            for metric in ('assets','evidence','observations','visits','stale','opportunities','conflicts'):bucket[metric]+=h[metric]
        groups[field]=list(buckets.values())
    def distribution(values):return [{'label':key,'assets':count} for key,count in sorted(Counter(values).items())]
    totals={metric:sum(h[metric] for h in hospitals.values()) for metric in ('assets','evidence','observations','visits','stale','opportunities','conflicts','needsReview')}
    totals.update(hospitals=sum(bool(h['visits']) for h in hospitals.values()),catalogHospitals=len(hospitals),
        incomplete=sum(not all(known(a[f]) for f in ('manufacturer','model','estimated_age')) for a in installed))
    return {'summary':totals,'hospitals':list(hospitals.values()),'geography':groups,
        'byModality':distribution(a['modality'] for a in installed),
        'byReliability':distribution(a['reliability']['level'] for a in installed),
        'byFreshness':distribution(a['reliability']['freshness'] for a in installed),
        'byAge':distribution('>7 años' if a['potentialOpportunity'] else '<=7 años' if known(a['estimated_age']) else 'Unknown' for a in installed)}
