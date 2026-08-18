import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Warns before leaving an in-progress exam or quiz. Covers both routes out:
 *  - in-app navigation (header links, back button) via the router's blocker + a confirm;
 *  - tab close / refresh / external navigation via beforeunload.
 *
 * `active` should be true only while there is real progress to lose (started, not finished).
 */
export function useUnsavedWarning(
  active: boolean,
  message = 'You have an exam or quiz in progress. If you leave now, your answers will be lost.',
): void {
  const blocker = useBlocker(active);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm(message)) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker, message]);

  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // required by some browsers to trigger the native prompt
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}
