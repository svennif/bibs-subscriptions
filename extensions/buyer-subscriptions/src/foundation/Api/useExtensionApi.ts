import type {Api} from '@shopify/ui-extensions/customer-account.page.render';

export type FullPageExtensionApi = Api;

/**
 * Returns the global `shopify` extension API. Wrapped in a function so that
 * components have a single place to read it from, and so tests can mock it.
 */
export function useExtensionApi(): FullPageExtensionApi {
  return (globalThis as unknown as {shopify: FullPageExtensionApi}).shopify;
}
