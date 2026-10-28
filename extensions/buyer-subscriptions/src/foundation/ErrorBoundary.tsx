import {Component, type ComponentChildren} from 'preact';
import {useEffect} from 'preact/hooks';
import {useExtensionApi} from './Api';

export interface Props {
  children: ComponentChildren;
}
interface State {
  error?: Error;
}

interface ErrorContentProps {
  error: Error;
}

const ErrorContent = ({error}: ErrorContentProps) => {
  const {i18n} = useExtensionApi();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary', error);
    }
  }, [error]);

  return (
    <s-stack alignItems="center" gap="large">
      <s-text>{i18n.translate('errorBoundary.content')}</s-text>
    </s-stack>
  );
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = {error: undefined};

  componentDidCatch(error: Error) {
    this.setState({error});
  }

  render() {
    const {error} = this.state;
    const {children} = this.props;

    return error ? <ErrorContent error={error} /> : children;
  }
}
