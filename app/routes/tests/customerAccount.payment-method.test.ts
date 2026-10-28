import {mockShopifyServer} from '#/test-utils';
import {action, loader} from '../customerAccount.payment-method';
import CustomerPortalPaymentMethodQuery from '~/graphql/CustomerPortalPaymentMethodQuery';
import CustomerPaymentMethodSendUpdateEmailMutation from '~/graphql/CustomerPaymentMethodSendUpdateEmailMutation';

const {graphQL, mockGraphQL, mockCustomerAccount} = mockShopifyServer();

const CUSTOMER_ID = 'gid://shopify/Customer/2';
const CONTRACT_ID = 'gid://shopify/SubscriptionContract/10';
const SHOP = 'shop2.myshopify.io';

function contractResponse({
  customerId = CUSTOMER_ID,
  instrument = {
    __typename: 'CustomerCreditCard',
    brand: 'visa',
    lastDigits: '4242',
    expiryMonth: 5,
    expiryYear: 2027,
    expiresSoon: false,
  } as object | null,
  revokedAt = null as string | null,
  paymentMethod = true,
} = {}) {
  return {
    CustomerPortalPaymentMethod: {
      data: {
        shop: {name: 'BIBS', contactEmail: 'shop@example.com'},
        subscriptionContract: {
          id: CONTRACT_ID,
          customer: {id: customerId, email: 'customer@example.com'},
          customerPaymentMethod: paymentMethod
            ? {
                id: 'gid://shopify/CustomerPaymentMethod/abc',
                revokedAt,
                instrument,
              }
            : null,
        },
      },
    },
  };
}

function loaderArgs(search: string) {
  return {
    request: new Request(
      `https://app.example.com/customerAccount/payment-method${search}`,
    ),
    params: {},
    context: {},
  };
}

function actionArgs(body: object, search = '') {
  return {
    request: new Request(
      `https://app.example.com/customerAccount/payment-method${search}`,
      {method: 'POST', body: JSON.stringify(body)},
    ),
    params: {},
    context: {},
  };
}

describe('customer account payment method route', () => {
  beforeEach(() => {
    graphQL.mockClear();
    mockCustomerAccount({sub: CUSTOMER_ID, dest: SHOP});
  });

  describe('loader', () => {
    it('returns a display summary of the contract payment method', async () => {
      mockGraphQL(contractResponse());

      const response = await loader(loaderArgs('?contractId=10'));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        paymentMethod: {
          type: 'CREDIT_CARD',
          revoked: false,
          brand: 'visa',
          lastDigits: '4242',
          expiryMonth: 5,
          expiryYear: 2027,
          expiresSoon: false,
        },
      });
      expect(graphQL).toHavePerformedGraphQLOperation(
        CustomerPortalPaymentMethodQuery,
        {variables: {contractId: CONTRACT_ID}},
      );
    });

    it('never exposes the payment method id', async () => {
      mockGraphQL(contractResponse());

      const response = await loader(loaderArgs('?contractId=10'));

      expect(JSON.stringify(await response.json())).not.toContain(
        'CustomerPaymentMethod/abc',
      );
    });

    it('marks revoked payment methods', async () => {
      mockGraphQL(contractResponse({revokedAt: '2026-10-01T00:00:00Z'}));

      const response = await loader(loaderArgs('?contractId=10'));

      expect((await response.json()).paymentMethod.revoked).toBe(true);
    });

    it('summarizes PayPal, Shop Pay and bank account payment methods', async () => {
      mockGraphQL(
        contractResponse({
          instrument: {
            __typename: 'CustomerPaypalBillingAgreement',
            paypalAccountEmail: 'pay@example.com',
          },
        }),
      );
      expect(
        (await (await loader(loaderArgs('?contractId=10'))).json())
          .paymentMethod,
      ).toEqual({
        type: 'PAYPAL',
        revoked: false,
        paypalAccountEmail: 'pay@example.com',
      });

      mockCustomerAccount({sub: CUSTOMER_ID, dest: SHOP});
      mockGraphQL(
        contractResponse({
          instrument: {
            __typename: 'BankAccount',
            bankName: 'Danske Bank',
            lastDigits: '1234',
          },
        }),
      );
      expect(
        (await (await loader(loaderArgs('?contractId=10'))).json())
          .paymentMethod,
      ).toEqual({
        type: 'BANK_ACCOUNT',
        revoked: false,
        bankName: 'Danske Bank',
        lastDigits: '1234',
      });

      mockCustomerAccount({sub: CUSTOMER_ID, dest: SHOP});
      mockGraphQL(
        contractResponse({
          instrument: {
            __typename: 'CustomerShopPayAgreement',
            lastDigits: '1111',
            expiryMonth: 1,
            expiryYear: 2028,
            expiresSoon: true,
          },
        }),
      );
      expect(
        (await (await loader(loaderArgs('?contractId=10'))).json())
          .paymentMethod,
      ).toEqual({
        type: 'SHOP_PAY',
        revoked: false,
        lastDigits: '1111',
        expiryMonth: 1,
        expiryYear: 2028,
        expiresSoon: true,
      });
    });

    it('returns null when the contract has no payment method', async () => {
      mockGraphQL(contractResponse({paymentMethod: false}));

      const response = await loader(loaderArgs('?contractId=10'));

      expect(await response.json()).toEqual({paymentMethod: null});
    });

    it("returns 404 for another customer's contract", async () => {
      mockGraphQL(contractResponse({customerId: 'gid://shopify/Customer/999'}));

      const response = await loader(loaderArgs('?contractId=10'));

      expect(response.status).toBe(404);
    });

    it('returns 400 without a contract id', async () => {
      const response = await loader(loaderArgs(''));

      expect(response.status).toBe(400);
    });
  });

  describe('action', () => {
    it('sends the update email for the contract payment method', async () => {
      mockGraphQL({
        ...contractResponse(),
        CustomerPaymentMethodSendUpdateEmail: {
          data: {
            customerPaymentMethodSendUpdateEmail: {
              customer: {id: CUSTOMER_ID},
              userErrors: [],
            },
          },
        },
      });

      const response = await action(
        actionArgs({contractId: '10'}, '?locale=en'),
      );

      expect(response.status).toBe(200);
      expect(graphQL).toHavePerformedGraphQLOperation(
        CustomerPaymentMethodSendUpdateEmailMutation,
        {
          variables: {
            customerPaymentMethodId: 'gid://shopify/CustomerPaymentMethod/abc',
            emailInput: {
              from: 'shop@example.com',
              to: 'customer@example.com',
              subject: 'Update your payment method for BIBS',
            },
          },
        },
      );
    });

    it("does not send an email for another customer's contract", async () => {
      mockGraphQL(contractResponse({customerId: 'gid://shopify/Customer/999'}));

      const response = await action(actionArgs({contractId: '10'}));

      expect(response.status).toBe(404);
      expect(graphQL).not.toHavePerformedGraphQLOperation(
        CustomerPaymentMethodSendUpdateEmailMutation,
      );
    });

    it('returns 422 when Shopify rejects the email', async () => {
      mockGraphQL({
        ...contractResponse(),
        CustomerPaymentMethodSendUpdateEmail: {
          data: {
            customerPaymentMethodSendUpdateEmail: {
              customer: null,
              userErrors: [{field: null, message: 'Access denied'}],
            },
          },
        },
      });

      const response = await action(actionArgs({contractId: '10'}));

      expect(response.status).toBe(422);
    });

    it('returns 422 when the contract has no payment method', async () => {
      mockGraphQL(contractResponse({paymentMethod: false}));

      const response = await action(actionArgs({contractId: '10'}));

      expect(response.status).toBe(422);
    });

    it('returns 400 without a contract id', async () => {
      const response = await action(actionArgs({}));

      expect(response.status).toBe(400);
    });
  });
});
