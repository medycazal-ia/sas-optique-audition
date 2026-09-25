/**
 * "Une garantie expirée est signalée avant toute promesse de prise en
 * charge gratuite" (critère d'acceptation V1 du module SAV). Retourne
 * `null` quand la durée de garantie n'est pas renseignée sur le produit —
 * jamais une promesse implicite de couverture ou d'expiration.
 */
export function garantieExpiree(garantieMois: number | null, remiseA: Date | null): boolean | null {
  if (garantieMois === null || !remiseA) return null;
  const expiration = new Date(remiseA);
  expiration.setMonth(expiration.getMonth() + garantieMois);
  return Date.now() > expiration.getTime();
}
