import {useEffect, useState} from 'preact/hooks';

/**
 * Returns the current navigation entry and re-renders when it changes.
 */
export function useNavigationCurrentEntry() {
  const [currentEntry, setCurrentEntry] = useState(
    () => navigation.currentEntry,
  );

  useEffect(() => {
    function handleChange() {
      setCurrentEntry(navigation.currentEntry);
    }

    navigation.addEventListener('currententrychange', handleChange);

    return () => {
      navigation.removeEventListener('currententrychange', handleChange);
    };
  }, []);

  return currentEntry;
}
