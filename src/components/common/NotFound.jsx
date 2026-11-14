import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import BrandMark from './BrandMark.jsx';

export default function NotFound({ message, homePath = '/dashboard' }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
      <BrandMark className="h-12 w-12" />
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-maroon-500">
        404
      </p>
      <h1 className="mt-2 text-2xl font-bold text-primary-900">Page not found</h1>
      <p className="mt-2 text-sm leading-relaxed text-primary-600">
        {message || 'The page you were looking for does not exist or has moved.'}
      </p>
      <Link
        to={homePath}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
      >
        <Home className="h-4 w-4" aria-hidden="true" />
        Back to dashboard
      </Link>
    </div>
  );
}
