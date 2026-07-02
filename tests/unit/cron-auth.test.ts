import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { requireCronAuth } from '@/server/api/cron-auth';

function reqWithAuth(auth?: string): Request {
  return new Request('https://example.com/api/cron/x', {
    headers: auth ? { authorization: auth } : {},
  });
}

describe('requireCronAuth (fail-closed)', () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => {
    delete process.env.CRON_SECRET;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it('returns 503 when CRON_SECRET is not configured — never fail-open', () => {
    const res = requireCronAuth(reqWithAuth('Bearer anything'));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
  });

  it('returns 401 for a wrong bearer token', () => {
    process.env.CRON_SECRET = 's3cret';
    const res = requireCronAuth(reqWithAuth('Bearer wrong'));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('returns 401 when the authorization header is missing', () => {
    process.env.CRON_SECRET = 's3cret';
    const res = requireCronAuth(reqWithAuth());
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('returns null (authorized) for the correct bearer token', () => {
    process.env.CRON_SECRET = 's3cret';
    expect(requireCronAuth(reqWithAuth('Bearer s3cret'))).toBeNull();
  });
});
