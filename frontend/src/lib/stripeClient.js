let stripeScriptPromise;

/** Load Stripe.js only when the server says an on-session authentication is needed. */
export async function getStripeClient() {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!key) throw new Error('Ověření platby není v tomto prostředí nastavené.');

  if (!window.Stripe) {
    stripeScriptPromise ||= new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-snm-stripe-js]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.dataset.snmStripeJs = 'true';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Ověření přes Stripe se nepodařilo načíst.'));
      document.head.appendChild(script);
    }).catch((error) => {
      stripeScriptPromise = null;
      throw error;
    });
    await stripeScriptPromise;
  }

  return window.Stripe(key);
}
