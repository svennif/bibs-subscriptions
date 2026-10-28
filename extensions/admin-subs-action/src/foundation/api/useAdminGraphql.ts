import {useState} from 'react';
import {useExtensionApi} from './useExtensionApi';
import type {StandardApi} from '@shopify/ui-extensions/admin';
import {useExtensionTarget} from 'foundation/AdminExtensionContext';

// GraphQLError isn't exported by @shopify/ui-extensions, so derive it from the
// public query API.
export type GraphQLError = NonNullable<
  Awaited<
    ReturnType<
      StandardApi<'admin.product-purchase-option.action.render'>['query']
    >
  >['errors']
>[number];

type AdminGraphql<TData, TVariables> = [
  (query: string, variables: TVariables) => Promise<{data?: TData}>,
  {loading: boolean; errors: GraphQLError[]},
];

export function useAdminGraphql<TData, TVariables>(): AdminGraphql<
  TData,
  TVariables
> {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<GraphQLError[]>([]);
  const extensionTarget = useExtensionTarget();

  const {query: adminGraphqlQuery} = useExtensionApi({
    extensionTarget,
  });

  async function adminGraphql<TData, TVariables>(
    query: string,
    variables: TVariables,
  ): Promise<{data?: TData}> {
    setLoading(true);

    const {data, errors} = await adminGraphqlQuery<TData, TVariables>(query, {
      variables,
    });

    setErrors(errors ?? []);
    setLoading(false);

    return {data};
  }

  return [adminGraphql, {loading, errors: errors ?? []}];
}
