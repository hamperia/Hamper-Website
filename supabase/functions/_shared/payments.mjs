const providerFlags = {
  razorpay: 'RAZORPAY_ENABLED',
  payu: 'PAYU_ENABLED'
};

// Fail closed: a provider can be used only when both global and provider flags are explicit.
export function isPaymentProviderEnabled(provider, env) {
  const providerFlag = providerFlags[provider];
  return Boolean(providerFlag && env.get('PAYMENTS_ENABLED') === 'true' && env.get(providerFlag) === 'true');
}
