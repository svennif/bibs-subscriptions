const CustomerPortalPaymentMethod = `#graphql
  query CustomerPortalPaymentMethod($contractId: ID!) {
    shop {
      name
      contactEmail
    }
    subscriptionContract(id: $contractId) {
      id
      customer {
        id
        email
      }
      customerPaymentMethod(showRevoked: true) {
        id
        revokedAt
        instrument {
          __typename
          ... on CustomerCreditCard {
            brand
            lastDigits
            expiryMonth
            expiryYear
            expiresSoon
          }
          ... on CustomerShopPayAgreement {
            lastDigits
            expiryMonth
            expiryYear
            expiresSoon
          }
          ... on CustomerPaypalBillingAgreement {
            paypalAccountEmail
          }
          ... on BankAccount {
            bankName
            lastDigits
          }
        }
      }
    }
  }
`;

export default CustomerPortalPaymentMethod;
