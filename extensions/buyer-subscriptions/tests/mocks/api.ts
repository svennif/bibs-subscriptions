import {createMockI18n} from '../../../shared/mocks/i18n';
import translations from '../../locales/en.default.json';
import orderActionTranslations from '../../../order-action-extension/locales/en.default.json';
import {vi} from 'vitest';

/**
 * Mocks the hooks for using the customer graphql and extension APIs.
 * IMPORTANT: IMPORT THIS BEFORE A TESTED COMPONENT IN A TEST FILE OR IT WILL NOT GET CALLED
 * */
export function mockApis() {
  const mockUseExtensionApi = vi.hoisted(() => {
    return vi.fn();
  });

  const mockUseGraphqlApi = vi.hoisted(() => {
    return vi.fn();
  });

  const mockUseAppRequest = vi.hoisted(() => {
    return vi.fn();
  });

  vi.mock('foundation/Api', async (importOriginal) => {
    const original = (await importOriginal()) as any;

    return {
      ...original,
      useExtensionApi: mockUseExtensionApi.mockReturnValue({
        i18n: vi.fn(),
        toast: {
          show: vi.fn(),
        },
        sessionToken: {
          get: vi.fn(),
        },
        localization: {
          extensionLanguage: {
            current: {
              isoCode: 'en',
            },
            value: {
              isoCode: 'en',
            },
          },
        },
      }),
      useGraphqlApi: mockUseGraphqlApi.mockReturnValue([
        vi.fn(),
        {
          data: {},
          loading: false,
          error: undefined,
          refetchLoading: false,
        },
      ]),
      useAppRequest: mockUseAppRequest.mockReturnValue(vi.fn()),
    };
  });

  function mockCustomerApiGraphQL({
    data,
    loading,
    error,
    refetchLoading,
  }: {
    data?: Object;
    loading?: boolean;
    error?: Error;
    refetchLoading?: boolean;
  }) {
    mockUseGraphqlApi.mockReturnValue([
      vi.fn().mockResolvedValue(data),
      {
        data,
        loading: loading ?? false,
        error,
        refetchLoading: refetchLoading ?? false,
      },
    ]);
  }

  function mockExtensionApi(options?: {
    mocks: {
      showToast?: () => void;
    };
  }) {
    mockUseExtensionApi.mockReturnValue({
      i18n: createMockI18n({...translations, ...orderActionTranslations}),
      toast: {
        show: options?.mocks.showToast ?? vi.fn(),
      },
      sessionToken: {
        get: vi.fn(),
      },
      localization: {
        extensionLanguage: {
          current: {
            isoCode: 'en',
          },
          value: {
            isoCode: 'en',
          },
        },
      },
    });
  }

  function mockAppRequest(spy: () => void) {
    mockUseAppRequest.mockReturnValue(spy);
  }

  return {
    customerGraphQL: mockUseGraphqlApi,
    mockCustomerApiGraphQL,
    mockExtensionApi,
    mockAppRequest,
  };
}
