// The extension entry point loads @preact/signals (via
// '@shopify/ui-extensions/preact'), which patches Preact's rendering. This
// guards against a Preact version that signals can't patch correctly, which
// leaves components stuck on their first render after an async state update.
import '@preact/signals';
import {act, render, screen} from '@testing-library/preact';
import {useEffect, useState} from 'preact/hooks';

function AsyncComponent() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.resolve().then(() => setLoading(false));
  }, []);

  return <div>{loading ? 'loading' : 'loaded'}</div>;
}

describe('rendering with @preact/signals installed', () => {
  it('re-renders after an async hook state update', async () => {
    render(<AsyncComponent />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText('loaded')).toBeInTheDocument();
  });
});
