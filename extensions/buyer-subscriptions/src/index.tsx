import '@shopify/ui-extensions/preact';
import {render} from 'preact';

import {Router} from './App';
import {ErrorBoundary} from 'foundation/ErrorBoundary';

export default async () => {
  render(<App />, document.body);
};

function App() {
  return (
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  );
}
