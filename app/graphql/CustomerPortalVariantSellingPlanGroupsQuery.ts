const CustomerPortalVariantSellingPlanGroups = `#graphql
  query CustomerPortalVariantSellingPlanGroups($variantId: ID!) {
    productVariant(id: $variantId) {
      id
      sellingPlanGroups(first: 20) {
        nodes {
          id
          sellingPlans(first: 20) {
            nodes {
              id
            }
          }
        }
      }
    }
  }
`;

export default CustomerPortalVariantSellingPlanGroups;
