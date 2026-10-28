import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from './jsonld';

describe('sérialisation des données structurées', () => {
  it('aucune balise ne peut fermer le <script>', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>', d: '<!-- x -->', e: 'a & b' });
    expect(out).not.toMatch(/[<>&]/);
    expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>', d: '<!-- x -->', e: 'a & b' });
  });

  it('séparateurs de ligne Unicode échappés', () => {
    const out = serializeJsonLd({ t: `a${String.fromCharCode(0x2028)}b${String.fromCharCode(0x2029)}c` });
    expect(out).toContain('\\u2028');
    expect(out).toContain('\\u2029');
    expect(JSON.parse(out).t).toHaveLength(5);
  });
});
