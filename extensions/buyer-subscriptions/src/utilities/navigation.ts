export function getSubscriptionIdFromPath(pathname: string) {
  const parts = pathname.split('/');

  const subscriptionsTextIndex = parts.lastIndexOf('subscriptions');

  if (!subscriptionsTextIndex || !parts?.[subscriptionsTextIndex + 1]) {
    // Replace these error throws with NotFound
    throw new Error(`Not found`);
  }

  const id = parts[subscriptionsTextIndex + 1];

  if (isNaN(Number(id))) {
    throw new Error(`Invalid subscription id`);
  }

  return id;
}

/**
 * Whether the path is the edit page of a subscription,
 * i.e. `/subscriptions/<id>/edit`.
 */
export function isEditSubscriptionPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  const subscriptionsTextIndex = parts.lastIndexOf('subscriptions');

  return (
    subscriptionsTextIndex !== -1 &&
    parts[subscriptionsTextIndex + 2] === 'edit'
  );
}
