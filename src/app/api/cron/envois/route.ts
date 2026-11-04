// Envois automatiques quotidiens, appelés par Vercel Cron (vercel.json) avec l'en-tête « Authorization: Bearer
// <CRON_SECRET> ». Sans secret configuré, ou avec un mauvais secret : refusé (rien n'est envoyé).
import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { runAutomations } from '@/server/emails/automations';
import { siteOrigin } from '@/server/http/origin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ status: 'interdit' }, { status: 401 });
  try {
    return NextResponse.json({ status: 'ok', ...(await runAutomations(await siteOrigin())) });
  } catch {
    console.error('envois automatiques : passage impossible');
    return NextResponse.json({ status: 'erreur' }, { status: 500 });
  }
}
