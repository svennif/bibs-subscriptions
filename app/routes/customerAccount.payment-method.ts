import type {ActionFunctionArgs, LoaderFunctionArgs} from '@remix-run/node';

import {json} from '@remix-run/node';
import {composeGid} from '@shopify/admin-graphql-api-utilities';
import i18n from '~/i18n/i18next.server';
import {
  findCustomerContract,
  toPortalPaymentMethod,
} from '~/services/CustomerPortalPaymentMethodService';
import {sendPaymentMethodUpdateEmail} from '~/services/SendPaymentMethodUpdateEmailService';
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

/**
 * Returns a display summary of the payment method on one of the logged in
 * customer's subscription contracts.
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
    const result = await findCustomerContract(
      admin.graphql,
      contractId,
      customerId,
    );

    if (result.status === 'not_found') {
      return cors(json({error: 'Not found'}, {status: 404}));
    }

    return cors(json({paymentMethod: toPortalPaymentMethod(result.contract)}));
  } catch (err) {
    logger.error({err}, 'Customer payment method lookup failed', {
      shop: shopDomain,
      customer: customerId,
    });

    return cors(json({error: 'Unable to load payment method'}, {status: 500}));
  }
}

/**
 * Emails the logged in customer a secure link to update the payment method on
 * one of their subscription contracts. Shopify hosts the update form, so the
 * app never handles card details.
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
    const result = await findCustomerContract(
      admin.graphql,
      contractId,
      customerId,
    );

    if (result.status === 'not_found') {
      return cors(json({error: 'Not found'}, {status: 404}));
    }

    const {contract, shop} = result;
    const customerPaymentMethodId = contract.customerPaymentMethod?.id;
    const customerEmail = contract.customer?.email;

    if (!customerPaymentMethodId || !customerEmail || !shop.contactEmail) {
      return cors(
        json({error: 'Missing payment method or email'}, {status: 422}),
      );
    }

    // The locale comes from the request's `locale` search param
    const t = await i18n.getFixedT(request, 'app.contracts');

    const sendEmailResponse = await sendPaymentMethodUpdateEmail(
      admin.graphql,
      customerPaymentMethodId,
      {
        from: shop.contactEmail,
        to: customerEmail,
        subject: t('paymentMethodDetails.emailModal.subjectMessage', {
          shopName: shop.name,
        }),
      },
    );

    if (!sendEmailResponse?.customer || sendEmailResponse.userErrors?.length) {
      logger.error(
        {userErrors: sendEmailResponse?.userErrors},
        'Failed to send payment method update email',
        {shop: shopDomain, customer: customerId},
      );

      return cors(json({error: 'Unable to send email'}, {status: 422}));
    }

    return cors(json({status: 'success'}));
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));

    logger.error({err: error}, 'Customer payment method update email failed', {
      shop: shopDomain,
      customer: customerId,
    });

    return cors(json({error: error.message}, {status: 500}));
  }
}
