import { Loader2 } from 'lucide-react';
import BrandMark from './BrandMark.jsx';

export default function LoadingScreen({ message = 'Loading' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-sand-50 px-6 text-center">
      <BrandMark className="h-14 w-14" />
      <div className="flex items-center gap-2 text-sm font-medium text-primary-600">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{message}</span>
      </div>
    </div>
  );
}
