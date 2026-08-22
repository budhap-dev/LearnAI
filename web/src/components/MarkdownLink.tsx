import type { AnchorHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { TermChip } from './TermChip';

/**
 * Links inside lesson notes. Anything starting with "#/" is an in-app route (HashRouter),
 * so it goes through <Link>; everything else is an ordinary anchor opening in a new tab.
 * Glossary chips (class "term-chip", injected by rehypeGlossary) render a hover definition.
 */
export function MarkdownLink({ href = '', children, className, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const isChip = typeof className === 'string' && className.split(/\s+/).includes('term-chip');
  if (isChip) {
    const slug = href.split('term=')[1] ?? '';
    return <TermChip slug={slug}>{children}</TermChip>;
  }
  if (href.startsWith('#/')) {
    return <Link to={href.slice(1)} className={className}>{children}</Link>;
  }
  const external = /^https?:/.test(href);
  return (
    <a href={href} className={className} {...rest} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
      {children}
    </a>
  );
}
