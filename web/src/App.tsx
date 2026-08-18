import { Suspense, lazy } from 'react';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './routes/Home';
import { Syllabus } from './routes/Syllabus';
import { Explore } from './routes/Explore';

// The lesson page pulls in the markdown renderer and syntax highlighter, which are by far the
// heaviest dependencies. Loading it lazily keeps the home and syllabus pages small.
const Lesson = lazy(() => import('./routes/Lesson').then((m) => ({ default: m.Lesson })));

const lazyRoute = (node: React.ReactNode, label: string) => (
  <Suspense fallback={<p className="muted">Loading {label}…</p>}>{node}</Suspense>
);

/**
 * A data router (createHashRouter) so useBlocker works (the in-progress quiz warning), while
 * hash routing keeps deep links working on a static host with no rewrite rules.
 */
const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'syllabus', element: <Syllabus /> },
      { path: 'explore', element: <Explore /> },
      { path: 'explore/:id', element: <Explore /> },
      { path: 'lesson/:id', element: lazyRoute(<Lesson />, 'lesson') },
      { path: '*', element: <Home /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
