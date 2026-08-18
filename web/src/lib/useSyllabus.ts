import { useEffect, useState } from 'react';
import { loadSyllabus, type Syllabus } from './lessons';

export function useSyllabus(): Syllabus | null {
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  useEffect(() => {
    let alive = true;
    loadSyllabus().then((s) => alive && setSyllabus(s));
    return () => {
      alive = false;
    };
  }, []);
  return syllabus;
}
