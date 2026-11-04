import { describe, expect, it } from 'vitest';
import { arrivalDue, reminderStage, reviewDue, stageToSend } from './automations-logic';

const day = (n: number) => new Date(Date.parse('2026-11-01T09:00:00Z') + n * 24 * 3600 * 1000);
const now = day(0);

describe('relances de panier', () => {
  it('J+1, J+3, J+5 après la dernière activité', () => {
    expect(reminderStage(day(-0.5), now)).toBe(0);
    expect(reminderStage(day(-1), now)).toBe(1);
    expect(reminderStage(day(-2.9), now)).toBe(1);
    expect(reminderStage(day(-3), now)).toBe(2);
    expect(reminderStage(day(-6), now)).toBe(3);
  });
  it('une seule fois par étape ; après une absence, seule l’étape la plus avancée part', () => {
    expect(stageToSend(1, 0)).toBe(1);
    expect(stageToSend(1, 1)).toBe(0);
    expect(stageToSend(3, 1)).toBe(3); // envoi quotidien manqué : pas de rafale J+3 puis J+5
    expect(stageToSend(2, 3)).toBe(0);
  });
});

describe('suivi après expédition', () => {
  it('« colis arrivé ? » : expédiée depuis N jours, pas encore marquée livrée', () => {
    expect(arrivalDue({ status: 'shipped', shippedAt: day(-3), deliveredAt: null }, now)).toBe(true);
    expect(arrivalDue({ status: 'shipped', shippedAt: day(-2), deliveredAt: null }, now)).toBe(false);
    expect(arrivalDue({ status: 'shipped', shippedAt: day(-2), deliveredAt: null }, now, 2)).toBe(true); // délai réglé
    expect(arrivalDue({ status: 'delivered', shippedAt: day(-5), deliveredAt: day(-4) }, now)).toBe(false);
  });
  it('avis : 14 jours après la livraison, ou après l’expédition + N jours sans date de livraison', () => {
    expect(reviewDue({ status: 'delivered', shippedAt: day(-20), deliveredAt: day(-14) }, now)).toBe(true);
    expect(reviewDue({ status: 'delivered', shippedAt: day(-20), deliveredAt: day(-10) }, now)).toBe(false);
    expect(reviewDue({ status: 'shipped', shippedAt: day(-17), deliveredAt: null }, now)).toBe(true);
    expect(reviewDue({ status: 'refunded', shippedAt: day(-30), deliveredAt: null }, now)).toBe(false);
  });
});
