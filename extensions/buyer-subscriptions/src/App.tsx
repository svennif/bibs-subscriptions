import {SubscriptionList} from './SubscriptionList';
import {getSubscriptionIdFromPath, isEditSubscriptionPath} from 'utilities';
import {SubscriptionDetails} from './SubscriptionDetails';
import {EditSubscription} from './EditSubscription';
import {useNavigationCurrentEntry} from 'foundation/Api';

export function Router() {
  const currentEntry = useNavigationCurrentEntry();

  const url = currentEntry?.url ? new URL(currentEntry.url) : null;

  if (url?.pathname.includes('subscriptions')) {
    const id = getSubscriptionIdFromPath(url.pathname);

    if (isEditSubscriptionPath(url.pathname)) {
      return <EditSubscription id={id} />;
    }

    return <SubscriptionDetails id={id} />;
  }
  return <SubscriptionList />;
}
