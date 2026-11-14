import { Construction } from 'lucide-react';
import Card from '../ui/Card.jsx';

export default function ComingSoon({ title, description }) {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <Card className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
          <Construction className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-primary-900">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-primary-600">
          {description ||
            'This page is part of the build queue. Each screen is finished and reviewed one at a time, so nothing half-built is left in the app.'}
        </p>
        <p className="mt-6 inline-flex items-center rounded-full bg-maroon-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-maroon-600">
          In progress
        </p>
      </Card>
    </div>
  );
}
