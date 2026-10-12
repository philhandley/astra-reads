"""Bundle the recorded voice clips into a few files the app can cache.

  python tools/voice_pack.py            after dev/voice-build.html has recorded the clips
  python tools/voice_pack.py --partial  pack whatever exists (missing lines use the tablet's voice)

Reads tools/voice/lines.json and tools/voice/clips/{s,w}/<id>.ogg and writes:
  assets/audio/<pack>.bin   clips back to back: words.bin, common.bin and one per book
  assets/audio/index.json   {"gap": s, "packs": [...], "s": {sentence id: [pack, offset, length]},
                             "w": {word: [pack, offset, length]}}
js/core/speak.js reads the index, slices a clip out of its pack and decodes it.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOICE = ROOT / 'tools' / 'voice'
CLIPS = VOICE / 'clips'
OUT = ROOT / 'assets' / 'audio'


def main():
    partial = '--partial' in sys.argv
    lines = json.loads((VOICE / 'lines.json').read_text(encoding='utf-8'))
    groups = {}  # pack name -> [(kind, key, path)]
    missing = []
    for s in lines['sentences']:
        name = 'common' if len(s['books']) >= 3 else s['books'][0]
        p = CLIPS / 's' / f"{s['id']}.ogg"
        if p.exists():
            groups.setdefault(name, []).append(('s', s['id'], p))
        else:
            missing.append(s['text'])
    for w in lines['words']:
        p = CLIPS / 'w' / f"{w['id']}.ogg"
        if p.exists():
            groups.setdefault('words', []).append(('w', w['key'], p))
        else:
            missing.append('word: ' + w['text'])
    if missing and not partial:
        print(f'{len(missing)} clips are missing, for example:', *missing[:8], sep='\n  ')
        print('Record them with dev/voice-build.html, or run with --partial.')
        sys.exit(1)

    OUT.mkdir(parents=True, exist_ok=True)
    names = sorted(groups, key=lambda n: (n != 'words', n != 'common', n))
    index = {'v': 1, 'voice': lines.get('voice'), 'gap': lines.get('gap', 0.35), 'packs': names, 's': {}, 'w': {}}
    total = 0
    for i, name in enumerate(names):
        blob = bytearray()
        for kind, key, p in groups[name]:
            data = p.read_bytes()
            index[kind][key] = [i, len(blob), len(data)]
            blob += data
        (OUT / f'{name}.bin').write_bytes(bytes(blob))
        total += len(blob)
        print(f'  {name}.bin  {len(groups[name])} clips  {len(blob) / 1e6:.2f} MB')
    for old in OUT.glob('*.bin'):
        if old.stem not in names:
            old.unlink()
    (OUT / 'index.json').write_text(json.dumps(index, separators=(',', ':')), encoding='utf-8')
    print(f'assets/audio: {len(names)} packs, {len(index["s"])} sentences, {len(index["w"])} words, {total / 1e6:.1f} MB'
          + (f', {len(missing)} missing' if missing else ''))


if __name__ == '__main__':
    main()
