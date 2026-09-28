export function cleanPersonalisation(input) {
  if (input == null) return {};
  if (typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid personalisation');
  const result = {};
  for (const [key, limit] of Object.entries({ recipient: 80, message: 250, company: 100, logo: 500, preferences: 250 })) {
    const value = input[key];
    if (value === undefined || value === '') continue;
    if (typeof value !== 'string' || value.length > limit) throw new Error('Invalid personalisation');
    result[key] = value.trim();
  }
  if (result.logo || result.preferences) throw new Error('Custom branding and changes require a quotation before payment.');
  return result;
}
