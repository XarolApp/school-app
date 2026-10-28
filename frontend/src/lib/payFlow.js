import { getStripeClient } from './stripeClient';

/**
 * Finishes a payment the server started with the saved card. When the bank asks
 * for authentication (3-D Secure) the server answers `requires_action` with a
 * client secret and Stripe opens its own challenge; activation itself always
 * comes from the webhook, so callers poll the profile afterwards.
 */
export async function completeOnSession(result) {
  if (result?.status !== 'requires_action' || !result.clientSecret) return;
  const stripeClient = await getStripeClient();
  const { error } = await stripeClient.handleNextAction({ clientSecret: result.clientSecret });
  if (error) throw new Error(error.message || 'Ověření platby se nepodařilo.');
}

/** The name of a card for a button or sentence: "Visa •••• 4242". */
export function cardLabel(card) {
  if (!card) return '';
  const brand = card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : 'Karta';
  return `${brand} •••• ${card.last4}`;
}
