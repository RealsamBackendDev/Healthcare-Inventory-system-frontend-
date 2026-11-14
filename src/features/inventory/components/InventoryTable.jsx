import { ChevronRight } from 'lucide-react';
import StockStatusBadge from './StockStatusBadge.jsx';
import { formatQuantity } from '../../../utils/format.js';

const ProductLine = ({ item }) => (
  <div className="min-w-0">
    <p className="truncate text-sm font-semibold text-primary-900">{item.name}</p>
    <p className="truncate text-xs text-primary-500">
      {item.code}
      {item.strength ? ` · ${item.strength}` : ''}
      {item.dosageForm ? ` · ${item.dosageForm}` : ''}
    </p>
  </div>
);

export default function InventoryTable({ items, loading, onSelect, selectedId }) {
  if (loading) {
    return (
      <div className="divide-y divide-sand-100">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-4 sm:px-5">
            <div className="h-4 flex-1 animate-pulse rounded bg-sand-200" />
            <div className="h-4 w-16 animate-pulse rounded bg-sand-200" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-left text-[11px] uppercase tracking-wide text-primary-500">
              <th className="px-5 py-3 font-semibold">Drug</th>
              <th className="px-3 py-3 text-right font-semibold">Usable</th>
              <th className="px-3 py-3 text-right font-semibold">Blocked</th>
              <th className="px-3 py-3 text-right font-semibold">Expired</th>
              <th className="px-3 py-3 text-right font-semibold">Minimum</th>
              <th className="px-3 py-3 text-right font-semibold">Batches</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {items.map((item) => (
              <tr
                key={item.drugId}
                onClick={() => onSelect(item.drugId)}
                className={`cursor-pointer transition hover:bg-primary-50/50 ${
                  selectedId === item.drugId ? 'bg-primary-50/70' : ''
                }`}
              >
                <td className="max-w-[22rem] px-5 py-3">
                  <ProductLine item={item} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-primary-900">
                  {formatQuantity(item.usableQuantity)}
                  <span className="ml-1 text-[11px] font-medium text-primary-500">
                    {item.unitOfMeasure}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-primary-600">
                  {formatQuantity(item.blockedQuantity)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-maroon-600">
                  {formatQuantity(item.expiredQuantity)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-primary-600">
                  {formatQuantity(item.minimumStockLevel)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-primary-600">
                  {item.batchCount}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <StockStatusBadge status={item.stockStatus} />
                </td>
                <td className="px-3 py-3 text-right">
                  <ChevronRight className="ml-auto h-4 w-4 text-primary-400" aria-hidden="true" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-sand-100 md:hidden">
        {items.map((item) => (
          <li key={item.drugId}>
            <button
              type="button"
              onClick={() => onSelect(item.drugId)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-primary-50/60 ${
                selectedId === item.drugId ? 'bg-primary-50/70' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <ProductLine item={item} />
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <StockStatusBadge status={item.stockStatus} />
                  <span className="text-[11px] text-primary-500">
                    min {formatQuantity(item.minimumStockLevel)} {item.unitOfMeasure}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-primary-900">
                  {formatQuantity(item.usableQuantity)}
                </p>
                <p className="text-[11px] text-primary-500">{item.unitOfMeasure}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
