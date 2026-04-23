/**
 * Unit tests for checkListingFeeAvailability(seller_id)
 *
 * The function queries `listing_fees` for an active fee where:
 *   - status = 'active'
 *   - listings_used < max_listings
 *   - expires_at is null or in the future
 *
 * Returns:
 *   { available: true, fee }
 *   { available: false, fee: null, reason: '...' }
 */

'use strict';

// ---------------------------------------------------------------------------
// Inline implementation extracted from dashboard-seller.js so the tests run
// without a browser / Supabase connection.  The function is re-implemented
// here accepting an injected `db` client so we can mock it in tests.
// ---------------------------------------------------------------------------

async function checkListingFeeAvailability(seller_id, db) {
  const { data: fees, error } = await db
    .from('listing_fees')
    .select('*')
    .eq('seller_id', seller_id)
    .eq('status', 'active')
    .order('expires_at', { ascending: true });

  if (error) {
    return { available: false, fee: null, reason: 'Could not check listing fee availability.' };
  }

  if (!fees || fees.length === 0) {
    return { available: false, fee: null, reason: 'No active listing fee found. Please purchase a listing tier.' };
  }

  const now = new Date();

  for (const fee of fees) {
    // Check expiry first
    if (fee.expires_at && new Date(fee.expires_at) < now) {
      await db.from('listing_fees').update({ status: 'expired' }).eq('id', fee.id);
      continue;
    }

    // Check slots remaining
    if (fee.listings_used >= fee.max_listings) {
      continue;
    }

    return { available: true, fee };
  }

  return {
    available: false,
    fee: null,
    reason: 'Your listing fee has expired or all listing slots are exhausted. Please purchase a new tier.'
  };
}

// ---------------------------------------------------------------------------
// Helper: build a minimal chainable Supabase mock that resolves to { data, error }
// ---------------------------------------------------------------------------

function buildDbMock({ data = null, error = null, updateError = null } = {}) {
  // Tracks calls so we can assert on them
  const calls = { update: [] };

  // A chainable builder that always resolves to the configured { data, error }
  function makeChain(resolvedData, resolvedError) {
    const chain = {
      select: () => chain,
      eq:     () => chain,
      order:  () => chain,
      update: (payload) => {
        calls.update.push(payload);
        // Return a new chain for the update path
        return makeUpdateChain(updateError);
      },
      // Awaiting the chain resolves the query
      then: (resolve) => resolve({ data: resolvedData, error: resolvedError }),
    };
    return chain;
  }

  function makeUpdateChain(err) {
    const chain = {
      eq:   () => chain,
      then: (resolve) => resolve({ data: null, error: err }),
    };
    return chain;
  }

  const db = {
    from: (table) => {
      if (table === 'listing_fees') {
        return makeChain(data, error);
      }
      return makeChain(null, null);
    },
    _calls: calls,
  };

  return db;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const SELLER_ID = 'seller-uuid-001';

describe('checkListingFeeAvailability', () => {

  // -------------------------------------------------------------------------
  // 1. Active fee with slots remaining → available: true
  // -------------------------------------------------------------------------
  test('returns available:true when there is an active fee with slots remaining', async () => {
    const activeFee = {
      id:            'fee-001',
      seller_id:     SELLER_ID,
      tier:          'standard',
      amount_paid:   249,
      max_listings:  10,
      listings_used: 3,
      status:        'active',
      expires_at:    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    };

    const db = buildDbMock({ data: [activeFee] });
    const result = await checkListingFeeAvailability(SELLER_ID, db);

    expect(result.available).toBe(true);
    expect(result.fee).toEqual(activeFee);
  });

  test('returns available:true when expires_at is null (no expiry)', async () => {
    const activeFee = {
      id:            'fee-002',
      seller_id:     SELLER_ID,
      tier:          'basic',
      amount_paid:   99,
      max_listings:  3,
      listings_used: 0,
      status:        'active',
      expires_at:    null,
    };

    const db = buildDbMock({ data: [activeFee] });
    const result = await checkListingFeeAvailability(SELLER_ID, db);

    expect(result.available).toBe(true);
    expect(result.fee).toEqual(activeFee);
  });

  // -------------------------------------------------------------------------
  // 2. Fee where listings_used >= max_listings → available: false, reason includes "exhausted"
  // -------------------------------------------------------------------------
  test('returns available:false with exhausted reason when listings_used equals max_listings', async () => {
    const exhaustedFee = {
      id:            'fee-003',
      seller_id:     SELLER_ID,
      tier:          'basic',
      amount_paid:   99,
      max_listings:  3,
      listings_used: 3,   // fully used
      status:        'active',
      expires_at:    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const db = buildDbMock({ data: [exhaustedFee] });
    const result = await checkListingFeeAvailability(SELLER_ID, db);

    expect(result.available).toBe(false);
    expect(result.fee).toBeNull();
    expect(result.reason.toLowerCase()).toContain('exhausted');
  });

  test('returns available:false with exhausted reason when listings_used exceeds max_listings', async () => {
    const overUsedFee = {
      id:            'fee-004',
      seller_id:     SELLER_ID,
      tier:          'premium',
      amount_paid:   499,
      max_listings:  25,
      listings_used: 26,  // over limit (edge case)
      status:        'active',
      expires_at:    null,
    };

    const db = buildDbMock({ data: [overUsedFee] });
    const result = await checkListingFeeAvailability(SELLER_ID, db);

    expect(result.available).toBe(false);
    expect(result.fee).toBeNull();
    expect(result.reason.toLowerCase()).toContain('exhausted');
  });

  // -------------------------------------------------------------------------
  // 3. Fee where expires_at is in the past → available: false, reason includes "expired"
  // -------------------------------------------------------------------------
  test('returns available:false with expired reason when expires_at is in the past', async () => {
    const expiredFee = {
      id:            'fee-005',
      seller_id:     SELLER_ID,
      tier:          'basic',
      amount_paid:   99,
      max_listings:  3,
      listings_used: 1,
      status:        'active',
      expires_at:    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
    };

    const db = buildDbMock({ data: [expiredFee] });
    const result = await checkListingFeeAvailability(SELLER_ID, db);

    expect(result.available).toBe(false);
    expect(result.fee).toBeNull();
    expect(result.reason.toLowerCase()).toContain('expired');
  });

  test('marks the expired fee as expired in the DB', async () => {
    const expiredFee = {
      id:            'fee-006',
      seller_id:     SELLER_ID,
      tier:          'standard',
      amount_paid:   249,
      max_listings:  10,
      listings_used: 2,
      status:        'active',
      expires_at:    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    };

    const db = buildDbMock({ data: [expiredFee] });
    await checkListingFeeAvailability(SELLER_ID, db);

    // The function should have called update({ status: 'expired' }) on the fee
    expect(db._calls.update).toContainEqual({ status: 'expired' });
  });

  // -------------------------------------------------------------------------
  // 4. No fee rows for seller → available: false
  // -------------------------------------------------------------------------
  test('returns available:false when there are no fee rows for the seller', async () => {
    const db = buildDbMock({ data: [] });
    const result = await checkListingFeeAvailability(SELLER_ID, db);

    expect(result.available).toBe(false);
    expect(result.fee).toBeNull();
  });

  test('returns available:false when data is null (no rows returned)', async () => {
    const db = buildDbMock({ data: null });
    const result = await checkListingFeeAvailability(SELLER_ID, db);

    expect(result.available).toBe(false);
    expect(result.fee).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 5. DB error → available: false
  // -------------------------------------------------------------------------
  test('returns available:false when the DB query returns an error', async () => {
    const db = buildDbMock({ error: { message: 'connection refused' } });
    const result = await checkListingFeeAvailability(SELLER_ID, db);

    expect(result.available).toBe(false);
    expect(result.fee).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 6. Multiple fees — picks the first valid one, skips expired/exhausted
  // -------------------------------------------------------------------------
  test('skips expired fees and returns the first valid fee when multiple fees exist', async () => {
    const expiredFee = {
      id:            'fee-007',
      seller_id:     SELLER_ID,
      tier:          'basic',
      amount_paid:   99,
      max_listings:  3,
      listings_used: 1,
      status:        'active',
      expires_at:    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // expired
    };
    const validFee = {
      id:            'fee-008',
      seller_id:     SELLER_ID,
      tier:          'standard',
      amount_paid:   249,
      max_listings:  10,
      listings_used: 4,
      status:        'active',
      expires_at:    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // future
    };

    const db = buildDbMock({ data: [expiredFee, validFee] });
    const result = await checkListingFeeAvailability(SELLER_ID, db);

    expect(result.available).toBe(true);
    expect(result.fee).toEqual(validFee);
  });

  test('skips exhausted fees and returns the first valid fee when multiple fees exist', async () => {
    const exhaustedFee = {
      id:            'fee-009',
      seller_id:     SELLER_ID,
      tier:          'basic',
      amount_paid:   99,
      max_listings:  3,
      listings_used: 3, // exhausted
      status:        'active',
      expires_at:    null,
    };
    const validFee = {
      id:            'fee-010',
      seller_id:     SELLER_ID,
      tier:          'premium',
      amount_paid:   499,
      max_listings:  25,
      listings_used: 0,
      status:        'active',
      expires_at:    null,
    };

    const db = buildDbMock({ data: [exhaustedFee, validFee] });
    const result = await checkListingFeeAvailability(SELLER_ID, db);

    expect(result.available).toBe(true);
    expect(result.fee).toEqual(validFee);
  });
});
