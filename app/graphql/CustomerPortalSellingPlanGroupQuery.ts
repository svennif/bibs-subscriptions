// Products are paged in small batches to stay under the Admin API query cost
// limit, since each product includes its variants. With `marketPricing`,
// variant prices come from the market of `country`, in that market's currency.
const CustomerPortalSellingPlanGroup = `#graphql
  query CustomerPortalSellingPlanGroup(
    $groupId: ID!
    $productsAfter: String
    $country: CountryCode
    $marketPricing: Boolean!
  ) {
    sellingPlanGroup(id: $groupId) {
      id
      sellingPlans(first: 20) {
        nodes {
          id
          name
          deliveryPolicy {
            ... on SellingPlanRecurringDeliveryPolicy {
              interval
              intervalCount
            }
          }
          billingPolicy {
            ... on SellingPlanRecurringBillingPolicy {
              interval
              intervalCount
              minCycles
              maxCycles
            }
          }
          pricingPolicies {
            ... on SellingPlanFixedPricingPolicy {
              adjustmentType
              adjustmentValue {
                ... on SellingPlanPricingPolicyPercentageValue {
                  percentage
                }
                ... on MoneyV2 {
                  amount
                }
              }
            }
          }
        }
      }
      products(first: 10, after: $productsAfter) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ...CustomerPortalProductFields
          variants(first: 25) {
            nodes {
              ...CustomerPortalVariantFields
            }
          }
        }
      }
      productVariants(first: 50) {
        nodes {
          ...CustomerPortalVariantFields
          product {
            ...CustomerPortalProductFields
          }
        }
      }
    }
  }

  fragment CustomerPortalProductFields on Product {
    id
    title
    featuredMedia {
      preview {
        image {
          url
        }
      }
    }
    options {
      name
      values
    }
  }

  fragment CustomerPortalVariantFields on ProductVariant {
    id
    title
    price
    contextualPricing(context: {country: $country})
      @include(if: $marketPricing) {
      price {
        amount
        currencyCode
      }
    }
    availableForSale
    selectedOptions {
      name
      value
    }
    media(first: 1) {
      nodes {
        preview {
          image {
            url
          }
        }
      }
    }
  }
`;

export default CustomerPortalSellingPlanGroup;
