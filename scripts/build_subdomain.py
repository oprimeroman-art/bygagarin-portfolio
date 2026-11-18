#!/usr/bin/env python3
"""Build a root-mounted static copy for a subdomain without changing GitHub Pages."""
from pathlib import Path
import argparse
import shutil
import os

ROOT = Path(__file__).resolve().parents[1]
PREFIX = '/bygagarin-portfolio/'
OLD_BASE = 'https://oprimeroman-art.github.io' + PREFIX
TEXT_TYPES = {'.html', '.css', '.js', '.xml', '.txt', '.svg', '.json', '.frag', '.webmanifest'}
EXCLUDE_TOP = {'.git', '.openai', 'docs', 'scripts', 'versions', 'dist', '__pycache__'}
EXCLUDE_FILES = {'.gitignore', 'README.md', 'PHOTO_CREDITS.md'}
EXCLUDE_FOLDERS = {'prototype'}

def build(host: str):
    host = host.strip().lower()
    if not host or any(ch in host for ch in '/:?# '):
        raise ValueError('Provide a bare hostname, e.g. gagarin.all-indi.ru')
    target = ROOT / 'dist' / 'subdomain'
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)
    count = 0
    for directory, dirs, files in os.walk(ROOT, topdown=True):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_TOP and d not in EXCLUDE_FOLDERS and not d.startswith('.')]
        for name in files:
            src = Path(directory) / name
            rel = src.relative_to(ROOT)
            if src.name in EXCLUDE_FILES:
                continue
            if any(part.startswith('.') and part != '.nojekyll' for part in rel.parts):
                continue
            dst = target / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            if src.suffix.lower() in TEXT_TYPES or src.name in {'robots.txt', '.nojekyll'}:
                text = src.read_text(encoding='utf-8')
                text = text.replace(OLD_BASE, 'https://' + host + '/')
                text = text.replace(PREFIX, '/')
                if PREFIX in text:
                    raise ValueError(f'Old base path left in {rel}')
                dst.write_text(text, encoding='utf-8')
            else:
                shutil.copy2(src, dst)
            count += 1
    print(f'Subdomain build ready: {target} ({count} files, https://{host}/)')
    print('DNS and web-server configuration are not changed by this script.')
    return target

if __name__ == '__main__':
    cli = argparse.ArgumentParser()
    cli.add_argument('--host', default='gagarin.all-indi.ru', help='Existing-domain subdomain hostname')
    args = cli.parse_args()
    build(args.host)
