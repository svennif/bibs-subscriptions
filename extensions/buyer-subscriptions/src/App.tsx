import {SubscriptionList} from './SubscriptionList';
import {getSubscriptionIdFromPath} from 'utilities';
import {SubscriptionDetails} from './SubscriptionDetails';
import {useNavigationCurrentEntry} from 'foundation/Api';

export function Router() {
  const currentEntry = useNavigationCurrentEntry();

  const url = currentEntry?.url ? new URL(currentEntry.url) : null;

  if (url?.pathname.includes('subscriptions')) {
    const id = getSubscriptionIdFromPath(url.pathname);

    return <SubscriptionDetails id={id} />;
  }
  return <SubscriptionList />;
}
