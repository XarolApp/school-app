import { useEffect, useState } from 'react';
import { fetchPrices } from '../api';
import { useAuth } from '../components/AuthContext';
import { useReferral } from './referral';

// One request shared by every screen that shows a price; the daily price only
// changes at midnight, so a minute of reuse is plenty.
let cached = null;
function load() {
  if (cached && Date.now() - cached.at < 60_000) return cached.promise;
  const promise = fetchPrices();
  cached = { at: Date.now(), promise };
  promise.catch(() => { if (cached?.promise === promise) cached = null; });
  return promise;
}

/** Prices come only from the server (GET /api/prices); never render a guess. */
export function usePrices() {
  const [prices, setPrices] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    load().then((value) => { if (alive) setPrices(value); }).catch((err) => { if (alive) setError(err); });
    return () => { alive = false; };
  }, []);
  return { prices, error, loading: !prices && !error };
}

/**
 * What one plan costs this person right now: today's price, any invitation
 * discount the server confirmed, and whether a trial is still on offer.
 * `priceCzk` is null until the server has answered.
 */
export function useOffer(planId) {
  const { prices, error } = usePrices();
  const { profile } = useAuth();
  const referral = useReferral();
  const isSeason = planId !== 'monthly';
  // For monthly this is what is charged today: the full 249 Kč, or the single
  // payment for the days to the deadline when less than a month is left.
  const listCzk = (isSeason ? prices?.season?.priceCzk : prices?.monthly?.firstChargeCzk) ?? null;
  const discountCzk = isSeason && referral.valid && prices?.referral?.available ? prices.referral.discountCzk : 0;
  return {
    prices,
    error,
    ready: Boolean(prices),
    onSale: prices ? prices.onSale : true,
    listCzk,
    discountCzk,
    priceCzk: listCzk === null ? null : listCzk - discountCzk,
    seasonFalling: Boolean(prices?.season?.falling),
    isSpring: Boolean(prices?.season?.isSpring),
    monthlyAvailable: Boolean(prices?.monthly?.available),
    extendAvailable: Boolean(prices?.extend?.available),
    monthlyTotalCzk: prices?.monthly?.totalCzk ?? null,
    monthlySingleCharge: Boolean(prices?.monthly?.singleCharge),
    referralCode: referral.valid ? referral.code : null,
    trialAvailable: isSeason && Boolean(prices?.season?.trialAvailable) && profile?.trialEligible !== false,
  };
}
