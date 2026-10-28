import {useCallback, useEffect, useState} from 'preact/hooks';
import {useAppFetch, useExtensionApi} from 'foundation/Api';

import type {DraftLine, SaveErrorCode, SubscriptionEditData} from '../types';

const SUBSCRIPTION_EDIT_PATH = '/customerAccount/subscription-edit';

export type LoadError =
  | {kind: 'not_editable'; code?: string}
  | {kind: 'failed'};

export type SaveResult = {ok: true} | {ok: false; code?: SaveErrorCode};

interface SaveInput {
  sellingPlanId: string;
  lines: DraftLine[];
}

/**
 * Loads what the customer can change on a subscription from the app, and
 * saves their changes. `id` is the numeric subscription contract id.
 */
export function useSubscriptionEditData(id: string) {
  const appFetch = useAppFetch();
  const {localization} = useExtensionApi();
  const locale = localization.extensionLanguage.current.isoCode;

  const [data, setData] = useState<SubscriptionEditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);

  const query = new URLSearchParams({contractId: id, locale}).toString();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const response = await appFetch(`${SUBSCRIPTION_EDIT_PATH}?${query}`);
        const body = await response.json();

        if (cancelled) return;

        if (response.status === 422) {
          setError({kind: 'not_editable', code: body?.code});
        } else if (!response.ok) {
          setError({kind: 'failed'});
        } else {
          setData(body as SubscriptionEditData);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to load subscription edit options:', err);

        if (!cancelled) {
          setError({kind: 'failed'});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [appFetch, query]);

  const save = useCallback(
    async ({sellingPlanId, lines}: SaveInput): Promise<SaveResult> => {
      try {
        const response = await appFetch(`${SUBSCRIPTION_EDIT_PATH}?${query}`, {
          method: 'POST',
          body: JSON.stringify({
            contractId: id,
            sellingPlanId,
            lines: lines.map((line) => ({
              ...(line.id ? {id: line.id} : {}),
              variantId: line.variantId,
              quantity: line.quantity,
            })),
          }),
        });

        if (response.ok) {
          return {ok: true};
        }

        const body = await response.json().catch(() => ({}));
        return {ok: false, code: body?.code};
      } catch (err) {
        console.error('Failed to save subscription changes:', err);
        return {ok: false};
      }
    },
    [appFetch, id, query],
  );

  return {data, loading, error, save};
}
