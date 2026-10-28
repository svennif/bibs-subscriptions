const CustomerPortalSubscriptionEdit = `#graphql
  query CustomerPortalSubscriptionEdit($contractId: ID!) {
    shop {
      currencyCode
    }
    subscriptionContract(id: $contractId) {
      id
      status
      currencyCode
      customer {
        id
      }
      deliveryMethod {
        ... on SubscriptionDeliveryMethodShipping {
          address {
            countryCodeV2
          }
        }
        ... on SubscriptionDeliveryMethodLocalDelivery {
          address {
            countryCodeV2
          }
        }
        ... on SubscriptionDeliveryMethodPickup {
          pickupOption {
            location {
              address {
                countryCode
              }
            }
          }
        }
      }
      lines(first: 50) {
        nodes {
          id
          productId
          variantId
          quantity
          title
          variantTitle
          variantImage {
            url
          }
          currentPrice {
            amount
          }
          sellingPlanId
          sellingPlanName
          pricingPolicy {
            basePrice {
              amount
            }
          }
        }
      }
    }
  }
`;

export default CustomerPortalSubscriptionEdit;
