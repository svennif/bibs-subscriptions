import {mockShopifyServer} from '#/test-utils';
import {action, loader} from '../customerAccount.subscription-edit';
import CustomerPortalSellingPlanGroupQuery from '~/graphql/CustomerPortalSellingPlanGroupQuery';
import SubscriptionContractDraftCommitMutation from '~/graphql/SubscriptionContractDraftCommitMutation';
import SubscriptionContractDraftUpdateMutation from '~/graphql/SubscriptionContractDraftUpdateMutation';
import SubscriptionContractUpdateMutation from '~/graphql/SubscriptionContractUpdateMutation';
import SubscriptionDraftUpdateLineMutation from '~/graphql/SubscriptionDraftUpdateLineMutation';

const {graphQL, mockGraphQL, mockCustomerAccount} = mockShopifyServer();

const CUSTOMER_ID = 'gid://shopify/Customer/2';
const CONTRACT_ID = 'gid://shopify/SubscriptionContract/10';
const SHOP = 'shop2.myshopify.io';
const LINE_ID = 'gid://shopify/SubscriptionLine/a';
const PLAN_4 = 'gid://shopify/SellingPlan/4';
const PLAN_6 = 'gid://shopify/SellingPlan/6';
const GROUP_ID = 'gid://shopify/SellingPlanGroup/1';
const DRAFT_ID = 'gid://shopify/SubscriptionContractDraft/1';

function variantNode(
  id: string,
  size: string,
  availableForSale = true,
  marketPrice?: {amount: string; currencyCode: string},
) {
  return {
    id: `gid://shopify/ProductVariant/${id}`,
    title: `Round / ${size}`,
    price: '57.00',
    ...(marketPrice && {contextualPricing: {price: marketPrice}}),
    availableForSale,
    selectedOptions: [
      {name: 'Shape', value: 'Round'},
      {name: 'Size', value: size},
    ],
    media: {nodes: [{preview: {image: {url: `https://cdn/${id}.png`}}}]},
  };
}

function plan(id: string, weeks: number, percentage: number) {
  return {
    id,
    name: `Deliver every ${weeks} weeks, ${percentage}% off`,
    deliveryPolicy: {interval: 'WEEK', intervalCount: weeks},
    billingPolicy: {
      interval: 'WEEK',
      intervalCount: weeks,
      minCycles: null,
      maxCycles: null,
    },
    pricingPolicies: [
      {adjustmentType: 'PERCENTAGE', adjustmentValue: {percentage}},
    ],
  };
}

function responses({
  customerId = CUSTOMER_ID,
  status = 'ACTIVE',
  currencyCode = 'DKK',
  shopCurrencyCode = 'DKK',
  deliveryCountry = null as string | null,
  variants = [variantNode('1', '1'), variantNode('2', '2')] as object[],
} = {}) {
  return {
    CustomerPortalSubscriptionEdit: {
      data: {
        shop: {currencyCode: shopCurrencyCode},
        subscriptionContract: {
          id: CONTRACT_ID,
          status,
          currencyCode,
          customer: {id: customerId},
          deliveryMethod: deliveryCountry
            ? {address: {countryCodeV2: deliveryCountry}}
            : null,
          lines: {
            nodes: [
              {
                id: LINE_ID,
                productId: 'gid://shopify/Product/papaya',
                variantId: 'gid://shopify/ProductVariant/1',
                quantity: 3,
                title: 'Colour - Papaya',
                variantTitle: 'Round / 1',
                variantImage: {url: 'https://cdn/line.png'},
                currentPrice: {amount: '45.6'},
                sellingPlanId: PLAN_4,
                sellingPlanName: 'Deliver every 4 weeks, 20% off',
                pricingPolicy: {basePrice: {amount: '57.0'}},
              },
            ],
          },
        },
      },
    },
    CustomerPortalVariantSellingPlanGroups: {
      data: {
        productVariant: {
          id: 'gid://shopify/ProductVariant/1',
          sellingPlanGroups: {
            nodes: [
              {
                id: 'gid://shopify/SellingPlanGroup/other',
                sellingPlans: {nodes: [{id: 'gid://shopify/SellingPlan/x'}]},
              },
              {
                id: GROUP_ID,
                sellingPlans: {nodes: [{id: PLAN_4}, {id: PLAN_6}]},
              },
            ],
          },
        },
      },
    },
    CustomerPortalSellingPlanGroup: {
      data: {
        sellingPlanGroup: {
          id: GROUP_ID,
          sellingPlans: {nodes: [plan(PLAN_4, 4, 20), plan(PLAN_6, 6, 15)]},
          products: {
            pageInfo: {hasNextPage: false, endCursor: null},
            nodes: [
              {
                id: 'gid://shopify/Product/papaya',
                title: 'Colour - Papaya',
                featuredMedia: {preview: {image: {url: 'https://cdn/p.png'}}},
                options: [
                  {name: 'Shape', values: ['Round', 'Anatomical']},
                  {name: 'Size', values: ['1', '2', '3']},
                ],
                variants: {nodes: variants},
              },
            ],
          },
          productVariants: {nodes: []},
        },
      },
    },
    SubscriptionContractUpdate: {
      data: {
        subscriptionContractUpdate: {draft: {id: DRAFT_ID}, userErrors: []},
      },
    },
    SubscriptionDraftLineUpdate: {
      data: {
        subscriptionDraftLineUpdate: {
          lineUpdated: {id: LINE_ID},
          userErrors: [],
        },
      },
    },
    SubscriptionDraftUpdate: {
      data: {
        subscriptionDraftUpdate: {draft: {id: DRAFT_ID}, userErrors: []},
      },
    },
    SubscriptionContractDraftDiscounts: {
      data: {subscriptionDraft: {discounts: {edges: []}}},
    },
    SubscriptionDraftCommit: {
      data: {
        subscriptionDraftCommit: {contract: {id: CONTRACT_ID}, userErrors: []},
      },
    },
  };
}

function loaderArgs(search: string) {
  return {
    request: new Request(
      `https://app.example.com/customerAccount/subscription-edit${search}`,
    ),
    params: {},
    context: {},
  };
}

function actionArgs(body: object) {
  return {
    request: new Request(
      'https://app.example.com/customerAccount/subscription-edit',
      {method: 'POST', body: JSON.stringify(body)},
    ),
    params: {},
    context: {},
  };
}

describe('customer account subscription edit route', () => {
  beforeEach(() => {
    graphQL.mockClear();
    mockCustomerAccount({sub: CUSTOMER_ID, dest: SHOP});
  });

  describe('loader', () => {
    it('returns the lines, plans and eligible products', async () => {
      mockGraphQL(responses());

      const response = await loader(loaderArgs('?contractId=10'));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.contract).toEqual({
        id: CONTRACT_ID,
        status: 'ACTIVE',
        currencyCode: 'DKK',
        sellingPlanId: PLAN_4,
      });
      expect(body.minQuantity).toBe(3);
      expect(body.sellingPlans).toEqual([
        {
          id: PLAN_4,
          name: 'Deliver every 4 weeks, 20% off',
          deliveryInterval: 'WEEK',
          deliveryIntervalCount: 4,
          adjustment: {type: 'PERCENTAGE', value: 20},
        },
        expect.objectContaining({
          id: PLAN_6,
          adjustment: {type: 'PERCENTAGE', value: 15},
        }),
      ]);
      expect(body.lines).toEqual([
        {
          id: LINE_ID,
          productId: 'gid://shopify/Product/papaya',
          variantId: 'gid://shopify/ProductVariant/1',
          quantity: 3,
          title: 'Colour - Papaya',
          variantTitle: 'Round / 1',
          imageUrl: 'https://cdn/line.png',
          unitPrice: '45.6',
          basePrice: '57.0',
        },
      ]);
      expect(body.products).toEqual([
        {
          id: 'gid://shopify/Product/papaya',
          title: 'Colour - Papaya',
          imageUrl: 'https://cdn/p.png',
          // Only option values that an eligible variant has
          options: [
            {name: 'Shape', values: ['Round']},
            {name: 'Size', values: ['1', '2']},
          ],
          variants: [
            expect.objectContaining({
              id: 'gid://shopify/ProductVariant/1',
              price: '57.00',
              imageUrl: 'https://cdn/1.png',
            }),
            expect.objectContaining({id: 'gid://shopify/ProductVariant/2'}),
          ],
        },
      ]);
    });

    it("returns 404 for another customer's contract", async () => {
      mockGraphQL(responses({customerId: 'gid://shopify/Customer/999'}));

      const response = await loader(loaderArgs('?contractId=10'));

      expect(response.status).toBe(404);
    });

    it('returns 422 for cancelled contracts', async () => {
      mockGraphQL(responses({status: 'CANCELLED'}));

      const response = await loader(loaderArgs('?contractId=10'));

      expect(response.status).toBe(422);
      expect((await response.json()).code).toBe('NOT_EDITABLE');
    });

    it('returns 422 for contracts in another currency', async () => {
      mockGraphQL(responses({currencyCode: 'EUR'}));

      const response = await loader(loaderArgs('?contractId=10'));

      expect((await response.json()).code).toBe('CURRENCY_NOT_SUPPORTED');
    });

    it("prices variants with the delivery country's market in the contract currency", async () => {
      mockGraphQL(
        responses({
          shopCurrencyCode: 'EUR',
          deliveryCountry: 'DK',
          variants: [
            variantNode('1', '1', true, {amount: '29.0', currencyCode: 'DKK'}),
            // Priced in another currency for this market, so not offered
            variantNode('2', '2', true, {amount: '4.0', currencyCode: 'EUR'}),
          ],
        }),
      );

      const response = await loader(loaderArgs('?contractId=10'));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.products[0].variants).toEqual([
        expect.objectContaining({
          id: 'gid://shopify/ProductVariant/1',
          price: '29.0',
        }),
      ]);
      expect(graphQL).toHavePerformedGraphQLOperation(
        CustomerPortalSellingPlanGroupQuery,
        {variables: {country: 'DK', marketPricing: true}},
      );
    });

    it('returns 400 without a contract id', async () => {
      const response = await loader(loaderArgs(''));

      expect(response.status).toBe(400);
    });
  });

  describe('action', () => {
    it('swaps a variant and changes the plan in one draft', async () => {
      mockGraphQL(responses());

      const response = await action(
        actionArgs({
          contractId: '10',
          sellingPlanId: PLAN_6,
          lines: [
            {
              id: LINE_ID,
              variantId: 'gid://shopify/ProductVariant/2',
              quantity: 3,
            },
          ],
        }),
      );

      expect(response.status).toBe(200);
      expect(graphQL).toHavePerformedGraphQLOperation(
        SubscriptionContractUpdateMutation,
        {variables: {contractId: CONTRACT_ID}},
      );
      expect(graphQL).toHavePerformedGraphQLOperation(
        SubscriptionDraftUpdateLineMutation,
        {
          variables: {
            draftId: DRAFT_ID,
            lineId: LINE_ID,
            input: {
              productVariantId: 'gid://shopify/ProductVariant/2',
              quantity: 3,
              currentPrice: 48.45,
              sellingPlanId: PLAN_6,
              sellingPlanName: 'Deliver every 6 weeks, 15% off',
            },
          },
        },
      );
      expect(graphQL).toHavePerformedGraphQLOperation(
        SubscriptionContractDraftUpdateMutation,
        {
          variables: {
            draftId: DRAFT_ID,
            input: {
              deliveryPolicy: {interval: 'WEEK', intervalCount: 6},
              billingPolicy: {interval: 'WEEK', intervalCount: 6},
            },
          },
        },
      );
      expect(graphQL).toHavePerformedGraphQLOperation(
        SubscriptionContractDraftCommitMutation,
      );
    });

    it('reprices a swapped variant at the market price in the contract currency', async () => {
      mockGraphQL(
        responses({
          shopCurrencyCode: 'EUR',
          deliveryCountry: 'DK',
          variants: [
            variantNode('1', '1', true, {amount: '57.0', currencyCode: 'DKK'}),
            variantNode('2', '2', true, {amount: '60.0', currencyCode: 'DKK'}),
          ],
        }),
      );

      const response = await action(
        actionArgs({
          contractId: '10',
          sellingPlanId: PLAN_4,
          lines: [
            {
              id: LINE_ID,
              variantId: 'gid://shopify/ProductVariant/2',
              quantity: 3,
            },
          ],
        }),
      );

      expect(response.status).toBe(200);
      expect(graphQL).toHavePerformedGraphQLOperation(
        SubscriptionDraftUpdateLineMutation,
        {
          variables: {
            input: {
              productVariantId: 'gid://shopify/ProductVariant/2',
              currentPrice: 48,
              pricingPolicy: {basePrice: 60},
            },
          },
        },
      );
    });

    it('does not create a draft when nothing changed', async () => {
      mockGraphQL(responses());

      const response = await action(
        actionArgs({
          contractId: '10',
          sellingPlanId: PLAN_4,
          lines: [
            {
              id: LINE_ID,
              variantId: 'gid://shopify/ProductVariant/1',
              quantity: 3,
            },
          ],
        }),
      );

      expect(response.status).toBe(200);
      expect(graphQL).not.toHavePerformedGraphQLOperation(
        SubscriptionContractUpdateMutation,
      );
    });

    it('rejects edits below the minimum without touching the contract', async () => {
      mockGraphQL(responses());

      const response = await action(
        actionArgs({
          contractId: '10',
          sellingPlanId: PLAN_4,
          lines: [
            {
              id: LINE_ID,
              variantId: 'gid://shopify/ProductVariant/1',
              quantity: 2,
            },
          ],
        }),
      );

      expect(response.status).toBe(422);
      expect((await response.json()).code).toBe('BELOW_MINIMUM');
      expect(graphQL).not.toHavePerformedGraphQLOperation(
        SubscriptionContractUpdateMutation,
      );
    });

    it("does not edit another customer's contract", async () => {
      mockGraphQL(responses({customerId: 'gid://shopify/Customer/999'}));

      const response = await action(
        actionArgs({contractId: '10', sellingPlanId: PLAN_4, lines: []}),
      );

      expect(response.status).toBe(404);
      expect(graphQL).not.toHavePerformedGraphQLOperation(
        SubscriptionContractUpdateMutation,
      );
    });

    it('returns 422 when Shopify rejects the update', async () => {
      mockGraphQL({
        ...responses(),
        SubscriptionDraftLineUpdate: {
          data: {
            subscriptionDraftLineUpdate: {
              lineUpdated: null,
              userErrors: [{field: ['lineId'], message: 'Invalid line'}],
            },
          },
        },
      });

      const response = await action(
        actionArgs({
          contractId: '10',
          sellingPlanId: PLAN_4,
          lines: [
            {
              id: LINE_ID,
              variantId: 'gid://shopify/ProductVariant/1',
              quantity: 4,
            },
          ],
        }),
      );

      expect(response.status).toBe(422);
      expect((await response.json()).code).toBe('UPDATE_FAILED');
      expect(graphQL).not.toHavePerformedGraphQLOperation(
        SubscriptionContractDraftCommitMutation,
      );
    });
  });
});
