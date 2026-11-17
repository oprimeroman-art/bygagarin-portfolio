#!/usr/bin/env python3
"""Check document metadata, local links, anchors, assets and JavaScript syntax."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin,urlsplit,unquote
from collections import Counter
import re,json,subprocess,sys,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1];PREFIX='/bygagarin-portfolio/';BASE='https://oprimeroman-art.github.io'+PREFIX
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__();self.ids=[];self.refs=[];self.h1=0;self.title='';self.in_title=False;self.description=[];self.canonical=[];self.robots='';self.ld=[];self.in_ld=False;self.feed(text)
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if t=='h1':self.h1+=1
  if t=='title':self.in_title=True
  if t=='a' and 'href' in a:self.refs.append(a['href'])
  if t in ('img','script','source') and 'src' in a:self.refs.append(a['src'])
  if t=='link' and 'href' in a:
   if a.get('rel')=='canonical':self.canonical.append(a['href'])
   elif a.get('rel') in ('stylesheet','icon','preload'):self.refs.append(a['href'])
  if t=='meta':
   if a.get('name')=='description':self.description.append(a.get('content',''))
   if a.get('name')=='robots':self.robots=a.get('content','')
  if t=='script' and a.get('type')=='application/ld+json':self.in_ld=True
 def handle_endtag(self,t):
  if t=='title':self.in_title=False
  if t=='script':self.in_ld=False
 def handle_data(self,d):
  if self.in_title:self.title+=d
  if self.in_ld:self.ld.append(d)
files=[p for p in ROOT.rglob('*.html') if not set(p.relative_to(ROOT).parts).intersection({'dist','.git','.openai'}) and p.name!='qa.html']
pages={p:Page(p.read_text()) for p in files};errors=[];refs=0;anchors=0;titles=[];descriptions=[]
for path,page in pages.items():
 rel=path.relative_to(ROOT);url=BASE+str(rel).replace('index.html','')
 if page.h1!=1:errors.append(f'{rel}: expected one H1, found {page.h1}')
 if len(page.canonical)!=1:errors.append(f'{rel}: missing or duplicated canonical')
 if 'noindex' not in page.robots:
  titles.append(page.title);descriptions.extend(page.description)
  if len(page.description)!=1 or not page.description[0]:errors.append(f'{rel}: missing description')
 for value,n in Counter(page.ids).items():
  if n>1:errors.append(f'{rel}: duplicate id {value}')
 for source in page.ld:
  try:json.loads(source)
  except Exception as e:errors.append(f'{rel}: invalid JSON-LD: {e}')
 for ref in page.refs:
  u=urlsplit(urljoin(url,ref))
  if u.scheme not in ('http','https') or u.netloc!='oprimeroman-art.github.io':continue
  if not u.path.startswith(PREFIX):continue
  target=ROOT/unquote(u.path[len(PREFIX):]);target=target/'index.html' if u.path.endswith('/') else target
  refs+=1
  if not target.is_file():errors.append(f'{rel}: missing {ref}');continue
  if u.fragment and target.suffix=='.html':
   anchors+=1
   target_page=pages.get(target)
   if target_page and unquote(u.fragment) not in target_page.ids:errors.append(f'{rel}: missing anchor {ref}')
for title,n in Counter(titles).items():
 if n>1:errors.append(f'Duplicate title: {title}')
for desc,n in Counter(descriptions).items():
 if n>1:errors.append(f'Duplicate description: {desc}')
for p in (ROOT/'assets').glob('*.css'):
 for ref in re.findall(r'url\([\'\"]?([^\)\'\"]+)',p.read_text()):
  if ref.startswith(('data:','https:','#','%23')):continue
  if not (p.parent/urlsplit(ref).path).is_file():errors.append(f'{p.relative_to(ROOT)}: missing CSS resource {ref}')
for p in (ROOT/'assets').glob('*.js'):
 result=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
 if result.returncode:errors.append(result.stderr)
sitemap=ET.parse(ROOT/'sitemap.xml');locations=sitemap.findall('.//{*}loc')
for location in locations:
 target=ROOT/location.text.replace(BASE,'',1)/'index.html'
 if target not in pages:errors.append('Sitemap has missing page '+location.text)
for p,page in pages.items():
 if 'noindex' not in page.robots:
  expected=BASE+str(p.relative_to(ROOT)).replace('index.html','')
  if expected not in [l.text for l in locations]:errors.append('Sitemap omits '+expected)
print(json.dumps({'documents':len(pages),'local_references':refs,'anchors':anchors,'indexed_pages':len(titles),'sitemap_entries':len(locations),'errors':errors},ensure_ascii=False,indent=2))
sys.exit(bool(errors))
