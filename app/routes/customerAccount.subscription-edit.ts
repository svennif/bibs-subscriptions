import type {ActionFunctionArgs, LoaderFunctionArgs} from '@remix-run/node';

import {json} from '@remix-run/node';
import {composeGid} from '@shopify/admin-graphql-api-utilities';
import {
  MAX_LINE_QUANTITY,
  MIN_SUBSCRIPTION_QUANTITY,
  applyEdit,
  hasOperations,
  loadEditContext,
  planEdit,
  type EditContext,
  type EditRequest,
} from '~/services/CustomerPortalSubscriptionEditService';
import {authenticate, unauthenticated} from '~/shopify.server';
import {logger} from '~/utils/logger.server';

function toContractGid(contractId: unknown) {
  if (typeof contractId !== 'string' || contractId === '') {
    return null;
  }

  return contractId.startsWith('gid://')
    ? contractId
    : composeGid('SubscriptionContract', contractId);
}

function toEditOptions(context: EditContext) {
  return {
    contract: {
      id: context.contractId,
      status: context.status,
      currencyCode: context.currencyCode,
      sellingPlanId: context.sellingPlanId,
    },
    minQuantity: MIN_SUBSCRIPTION_QUANTITY,
    maxQuantity: MAX_LINE_QUANTITY,
    sellingPlans: context.sellingPlans.map(
      ({id, name, deliveryInterval, deliveryIntervalCount, adjustment}) => ({
        id,
        name,
        deliveryInterval,
        deliveryIntervalCount,
        adjustment,
      }),
    ),
    lines: context.lines,
    products: context.products,
  };
}

/**
 * Returns what the logged in customer may change on one of their
 * subscription contracts: its lines, the plan's frequencies and the products
 * in the plan.
 */
export async function loader({request}: LoaderFunctionArgs) {
  const {sessionToken, cors} =
    await authenticate.public.customerAccount(request);
  const {sub: customerId, dest: shopDomain} = sessionToken;

  const contractId = toContractGid(
    new URL(request.url).searchParams.get('contractId'),
  );

  if (!contractId) {
    return cors(json({error: 'Missing contractId'}, {status: 400}));
  }

  try {
    const {admin} = await unauthenticated.admin(shopDomain);
    const result = await loadEditContext(admin.graphql, contractId, customerId);

    if (result.status === 'not_found') {
      return cors(json({error: 'Not found'}, {status: 404}));
    }

    if (result.status === 'not_editable') {
      return cors(
        json(
          {error: 'Subscription cannot be edited', code: result.code},
          {status: 422},
        ),
      );
    }

    return cors(json(toEditOptions(result.context)));
  } catch (err) {
    logger.error({err}, 'Customer portal subscription edit options failed', {
      shop: shopDomain,
      customer: customerId,
    });

    return cors(
      json({error: 'Unable to load subscription options'}, {status: 500}),
    );
  }
}

/**
 * Updates one of the logged in customer's subscription contracts to the
 * requested lines and selling plan. The body is the full desired state.
 */
export async function action({request}: ActionFunctionArgs) {
  const {sessionToken, cors} =
    await authenticate.public.customerAccount(request);
  const {sub: customerId, dest: shopDomain} = sessionToken;

  const body = await request.json().catch(() => ({}));
  const contractId = toContractGid(body?.contractId);

  if (!contractId) {
    return cors(json({error: 'Missing contractId'}, {status: 400}));
  }

  try {
    const {admin} = await unauthenticated.admin(shopDomain);
    const result = await loadEditContext(admin.graphql, contractId, customerId);

    if (result.status === 'not_found') {
      return cors(json({error: 'Not found'}, {status: 404}));
    }

    if (result.status === 'not_editable') {
      return cors(
        json(
          {error: 'Subscription cannot be edited', code: result.code},
          {status: 422},
        ),
      );
    }

    const editRequest: EditRequest = {
      sellingPlanId: body?.sellingPlanId,
      lines: body?.lines,
    };
    const plan = planEdit(result.context, editRequest);

    if (!plan.ok) {
      return cors(json({error: plan.message, code: plan.code}, {status: 422}));
    }

    if (!hasOperations(plan.operations)) {
      return cors(json({status: 'success'}));
    }

    const applied = await applyEdit(
      admin.graphql,
      shopDomain,
      contractId,
      plan.operations,
    );

    if (!applied) {
      return cors(
        json(
          {error: 'Unable to update subscription', code: 'UPDATE_FAILED'},
          {status: 422},
        ),
      );
    }

    return cors(json({status: 'success'}));
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));

    logger.error({err: error}, 'Customer portal subscription edit failed', {
      shop: shopDomain,
      customer: customerId,
    });

    return cors(
      json({error: error.message, code: 'UPDATE_FAILED'}, {status: 500}),
    );
  }
}
