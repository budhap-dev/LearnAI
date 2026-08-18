import { useEffect, useState } from 'react';
import { read, type Progress } from './progress';

/** Re-renders whenever progress changes anywhere on the page. */
export function useProgress(): Progress {
  const [progress, setProgress] = useState<Progress>(() => read());
  useEffect(() => {
    const update = () => setProgress(read());
    window.addEventListener('progress-changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('progress-changed', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return progress;
}
