import {useCallback, useState} from 'preact/hooks';

type UseApi<Data, Variables> = [
  (query: string, variables?: Variables) => Promise<Data | undefined>,
  {
    data: Data | undefined;
    loading: boolean;
    error: Error | undefined;
    refetchLoading: boolean;
  },
];

/**
 * Hook for use in components that need to query the Customer API
 * This hook takes care of:
 *    1) Getting the API `endpoint` from context
 *    2) Querying for an access token from customer-account-web before any API interactions
 *
 * @return Tuple of the query function and its result
 */
export function useGraphqlApi<Data, Variables = undefined>(): UseApi<
  Data,
  Variables
> {
  const apiVersion = '2026-10';
  const [loading, setLoading] = useState(true);
  const [firstFetchComplete, setFirstFetchComplete] = useState(false);
  const [error, setError] = useState<Error>();
  const [data, setData] = useState<Data>();

  const customerApiFetch = useCallback(
    async (query: string, variables?: Variables) => {
      setLoading(true);

      try {
        const resp = await fetch(
          `shopify:customer-accounts/customer/api/${apiVersion}/graphql`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({query, variables}),
          },
        );

        if (!resp.ok) {
          throw new Error(
            `Customer Account API request failed with status ${resp.status}: ${await resp.text()}`,
          );
        }

        const {data, errors}: {data: Data; errors?: unknown[]} =
          await resp.json();

        if (errors?.length) {
          console.error('Customer Account API returned errors:', errors);
        }

        setData(data);
        setError(undefined);

        return data;
      } catch (err) {
        console.error('Customer Account API request failed:', err);
        setError(err as Error);

        return;
      } finally {
        setLoading(false);
        setFirstFetchComplete(true);
      }
    },
    [],
  );

  return [
    customerApiFetch,
    {data, loading, error, refetchLoading: firstFetchComplete && loading},
  ];
}
