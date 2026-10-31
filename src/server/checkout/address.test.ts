import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchAddress, parseFeatures, plausibleLine1, verifyAddress } from './address';

const feature = (over: Record<string, unknown> = {}) => ({
  properties: { type: 'housenumber', name: '10 Rue Léon Blum', housenumber: '10', postcode: '92100', city: 'Boulogne-Billancourt', score: 0.92, ...over },
});

describe('adresse de livraison', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('réponse du service : seules les adresses au numéro près sont gardées', () => {
    expect(parseFeatures({ features: [feature(), feature({ type: 'street' }), { properties: { type: 'housenumber' } }] })).toHaveLength(1);
    expect(parseFeatures(null)).toEqual([]);
    expect(parseFeatures({ features: 'x' })).toEqual([]);
  });

  it('correspondance : même numéro, même code postal, ressemblance suffisante', () => {
    const [f] = parseFeatures({ features: [feature()] });
    expect(matchAddress({ line1: '10 rue leon blum', zipCode: '92100' }, [f!])).toEqual(f);
    expect(matchAddress({ line1: '12 rue leon blum', zipCode: '92100' }, [f!])).toBeNull(); // autre numéro
    expect(matchAddress({ line1: '10 rue leon blum', zipCode: '75011' }, [f!])).toBeNull(); // autre code postal
    expect(matchAddress({ line1: 'rue leon blum', zipCode: '92100' }, [f!])).toBeNull(); // sans numéro
    expect(matchAddress({ line1: '10', zipCode: '92100' }, parseFeatures({ features: [feature({ score: 0.3 })] }))).toBeNull(); // trop vague
    expect(matchAddress({ line1: '10 bis rue leon blum', zipCode: '92100' }, parseFeatures({ features: [feature({ housenumber: '10bis' })] }))).not.toBeNull();
  });

  it('service injoignable : numéro et nom de rue exigés', () => {
    expect(plausibleLine1('10 rue Léon Blum')).toBe(true);
    expect(plausibleLine1('10 bis, avenue Foch')).toBe(true);
    expect(plausibleLine1('10')).toBe(false);
    expect(plausibleLine1('rue Léon Blum')).toBe(false);
  });

  it('vérification : écriture officielle gardée ; introuvable refusé ; panne tolérée si plausible', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ features: [feature()] }))));
    expect(await verifyAddress({ line1: '10 rue leon blum', zipCode: '92100' }))
      .toEqual({ status: 'verifiee', line1: '10 Rue Léon Blum', zipCode: '92100', city: 'Boulogne-Billancourt' });
    expect(await verifyAddress({ line1: '10', zipCode: '92100' })).toEqual({ status: 'introuvable' });

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('réseau'); }));
    expect(await verifyAddress({ line1: '10 rue Léon Blum', zipCode: '92100' })).toEqual({ status: 'non-verifiee' });
    expect(await verifyAddress({ line1: '10', zipCode: '92100' })).toEqual({ status: 'introuvable' });

    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    expect(await verifyAddress({ line1: '10 rue Léon Blum', zipCode: '92100' })).toEqual({ status: 'non-verifiee' });
  });
});
