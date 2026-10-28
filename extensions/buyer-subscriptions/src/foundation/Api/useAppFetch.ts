import {useCallback} from 'preact/hooks';
import {useExtensionApi} from './useExtensionApi';

/**
 * Returns a fetch function for calling the app's backend from the customer
 * account. The request is authenticated with the customer's session token.
 * `process.env.APP_URL` is replaced with the app URL by Shopify CLI at build
 * time.
 */
export function useAppFetch() {
  const {sessionToken} = useExtensionApi();

  return useCallback(
    async (path: string, init: RequestInit = {}) => {
      const token = await sessionToken.get();

      return fetch(`${process.env.APP_URL ?? ''}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });
    },
    [sessionToken],
  );
}
