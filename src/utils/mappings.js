/**
 * Maps a user's transaction type to the exchange's equivalent type.
 * e.g., If a user sends crypto out (TRANSFER_OUT), the exchange receives it (TRANSFER_IN).
 */
export const getEquivalentExchangeType = (userType) => {
  const typeMap = {
    'TRANSFER_OUT': 'TRANSFER_IN',
    'TRANSFER_IN': 'TRANSFER_OUT',
  };
  return typeMap[userType] || userType; // BUY and SELL remain the same
};

/**
 * Normalizes common asset aliases to their standard ticker symbol.
 */
export const normalizeAsset = (asset) => {
  const normalized = asset.toUpperCase().trim();
  const aliases = {
    'BITCOIN': 'BTC',
    'ETHEREUM': 'ETH',
    'TETHER': 'USDT',
  };
  return aliases[normalized] || normalized;
};