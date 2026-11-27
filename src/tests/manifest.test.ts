import { describe, expect, it } from 'vitest';
import { buildManifest } from '../scorm/manifest';
import { escapeXml, safeFileName, safeIdentifier } from '../scorm/names';

const files = ['index.html', 'player.js', 'player.css', 'content.json', 'media/m1.png'];
const parse = (xml: string) => {
  const d = new DOMParser().parseFromString(xml, 'application/xml');
  expect(d.querySelector('parsererror')).toBeNull();
  return d;
};

describe('buildManifest 2004', () => {
  const xml = buildManifest({
    version: '2004',
    title: 'Quiz <1> & more',
    id: '123 abc',
    files,
    passingScore: 80,
  });
  const d = parse(xml);
  it('declares 2004 4th Edition schema and namespaces', () => {
    expect(d.querySelector('schemaversion')?.textContent).toBe('2004 4th Edition');
    expect(xml).toContain('xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"');
    expect(xml).toContain('xmlns:imsss="http://www.imsglobal.org/xsd/imsss"');
  });
  it('has one SCO resource that lists every file', () => {
    const res = d.getElementsByTagName('resource');
    expect(res).toHaveLength(1);
    expect(res[0]?.getAttribute('adlcp:scormType')).toBe('sco');
    expect(res[0]?.getAttribute('href')).toBe('index.html');
    const hrefs = Array.from(res[0]!.getElementsByTagName('file')).map((f) =>
      f.getAttribute('href'),
    );
    expect(hrefs).toEqual(files);
  });
  it('links organization item to resource and escapes the title', () => {
    expect(d.querySelector('item')?.getAttribute('identifierref')).toBe('RES-1');
    expect(d.querySelector('organization > title')?.textContent).toBe('Quiz <1> & more');
    expect(d.documentElement.getAttribute('identifier')).toMatch(/^[A-Za-z_][\w.-]*$/);
  });
});

describe('buildManifest 1.2', () => {
  const xml = buildManifest({ version: '1.2', title: 'Quiz', id: 'x', files, passingScore: 70 });
  const d = parse(xml);
  it('declares SCORM 1.2 schema and mastery score', () => {
    expect(d.querySelector('schemaversion')?.textContent).toBe('1.2');
    expect(xml).toContain('imscp_rootv1p1p2');
    expect(d.getElementsByTagName('adlcp:masteryscore')[0]?.textContent).toBe('70');
  });
  it('uses lower-case scormtype and lists files', () => {
    const r = d.getElementsByTagName('resource')[0]!;
    expect(r.getAttribute('adlcp:scormtype')).toBe('sco');
    expect(r.getElementsByTagName('file')).toHaveLength(files.length);
  });
});

describe('names', () => {
  it('sanitizes zip filenames', () => {
    expect(safeFileName('My Quiz: Ch. 1/2?')).toBe('My-Quiz-Ch.-12.zip');
    expect(safeFileName('Café Ünï')).toBe('Cafe-Uni.zip');
    expect(safeFileName('///')).toBe('activity.zip');
    expect(safeFileName('../../etc')).toBe('etc.zip');
  });
  it('makes valid identifiers', () => {
    expect(safeIdentifier('123 abc!')).toBe('ID_123_abc_');
    expect(safeIdentifier('ok-id_1')).toBe('ok-id_1');
  });
  it('escapes xml', () => {
    expect(escapeXml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;');
  });
});
