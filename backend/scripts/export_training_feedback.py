"""Export local review packets; never approve labels or start training."""
import argparse
import json
from pathlib import Path
import sqlite3


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, default=Path('backend/data/inventory.sqlite3'))
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    # Read-only connection avoids migrations, catalog updates and synthetic data.
    with sqlite3.connect(args.database.resolve().as_uri() + '?mode=ro', uri=True) as db:
        db.row_factory = sqlite3.Row
        rows = db.execute('SELECT * FROM training_feedback ORDER BY created_at,id').fetchall()
    with args.output.open('x', encoding='utf-8') as output:
        for row in rows:
            packet = dict(row)
            for key in ('original_prediction', 'human_corrected_output'):
                packet[key] = json.loads(packet[key])
            output.write(json.dumps(packet, ensure_ascii=False) + '\n')
    print(f'{len(rows)} review packets exported. Review and project labels before offline training.')
