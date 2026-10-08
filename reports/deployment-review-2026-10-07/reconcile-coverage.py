"""Reconcile saved read evidence with current files; never infer a completed read."""
import collections
import datetime
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
LEDGERS = ['backend-coverage.json', 'frontend-coverage.json',
           'legal-docs-coverage.json', 'tooling-coverage.json', 'root-coverage.json']
evidence = collections.defaultdict(list)
for name in LEDGERS:
    data = json.loads((OUT / name).read_text())
    if isinstance(data, dict) and 'files' in data:
        data = data['files']
    entries = ((entry['path'], entry) for entry in data) if isinstance(data, list) else data.items()
    for path, entry in entries:
        evidence[path].append({'ledger': name, **entry})

paths = set(subprocess.check_output(
    ['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT
).decode().rstrip('\0').split('\0'))
paths.update(entry['path'] for entry in json.loads((OUT / 'inventory.json').read_text())['files'])
rows = []
for name in sorted(paths):
    path = ROOT / name
    if not path.is_file():
        rows.append({'path': name, 'status': 'removed_or_missing'})
        continue
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    binary = b'\0' in raw
    lines = None if binary else len(raw.splitlines())
    matched = []
    for entry in evidence[name]:
        expected = entry.get('sha256_after') or entry.get('sha256') or entry.get('sha256_before')
        ranges = entry.get('read_ranges', entry.get('ranges_read', []))
        read_to = 0
        for start, end in sorted(ranges):
            if start <= read_to + 1:
                read_to = max(read_to, end)
        if (entry.get('status') in ('complete', 'reviewed', 'complete_after_concurrent_change')
                and digest == expected and lines is not None and read_to >= lines):
            matched.append(entry['ledger'])
    generated = (path.name.endswith('lock.json') or name.startswith('graphify-out/')
                 or name.startswith('reports/deployment-review-2026-10-07/'))
    status = ('current_full_read' if matched else 'binary_requires_asset_check' if binary
              else 'generated_or_audit_artifact' if generated else 'pending_or_changed')
    rows.append({'path': name, 'sha256': digest, 'lines': lines, 'status': status,
                 'matching_evidence': matched})

result = {'checked_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT).decode().strip(),
          'note': 'Current hash plus full read-range evidence only. Read does not mean defect-free. '
                  'Generated/binary classification is not review completion. Ignored external scrape '
                  'corpora are outside this tracked/untracked inventory and require separate accounting.',
          'counts': dict(collections.Counter(row['status'] for row in rows)), 'files': rows}
(OUT / 'coverage-status.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
print(json.dumps(result['counts'], ensure_ascii=False))
