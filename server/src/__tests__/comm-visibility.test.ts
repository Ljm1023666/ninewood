import { describe, it, expect } from 'vitest';
import { canViewDemand } from '../services/comm.service.js';

const baseDemand = {
  userId: 'owner',
  status: 'PENDING',
  acceptedProviderId: null as string | null,
  isPublic: false,
  circleId: 'circle-1',
};

describe('canViewDemand circle visibility', () => {
  it('hides circle-only demand from anonymous viewers', () => {
    expect(canViewDemand(baseDemand, null)).toBe(false);
  });

  it('hides circle-only demand from non-members', () => {
    expect(canViewDemand(baseDemand, 'stranger', { isCircleMember: false })).toBe(false);
  });

  it('shows circle-only demand to members', () => {
    expect(canViewDemand(baseDemand, 'member', { isCircleMember: true })).toBe(true);
  });

  it('shows circle-only demand to owner', () => {
    expect(canViewDemand({ ...baseDemand, userId: 'owner' }, 'owner')).toBe(true);
  });

  it('shows public demand to everyone when not in progress', () => {
    expect(
      canViewDemand({ ...baseDemand, isPublic: true, circleId: null }, 'anyone'),
    ).toBe(true);
  });
});
