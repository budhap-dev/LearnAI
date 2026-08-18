import type { AnchorHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';

/**
 * Links inside lesson notes. Anything starting with "#/" is an in-app route (HashRouter),
 * so it goes through <Link>; everything else is an ordinary anchor opening in a new tab.
 */
export function MarkdownLink({ href = '', children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (href.startsWith('#/')) {
    return <Link to={href.slice(1)}>{children}</Link>;
  }
  const external = /^https?:/.test(href);
  return (
    <a href={href} {...rest} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
      {children}
    </a>
  );
}
