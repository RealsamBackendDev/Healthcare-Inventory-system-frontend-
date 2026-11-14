import { formatQuantity } from '../../../utils/format.js';

const renderCell = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'number') {
    return formatQuantity(value);
  }
  return String(value);
};

export default function ReportTable({ columns, rows, limit = 100 }) {
  const visible = rows.slice(0, limit);

  return (
    <div className="surface overflow-hidden">
      <div className="-mx-px overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-sand-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="whitespace-nowrap px-3 py-2 font-semibold text-primary-700"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {visible.map((row, rowIndex) => (
              <tr key={rowIndex} className="align-top">
                {columns.map((column) => (
                  <td key={column.key} className="whitespace-nowrap px-3 py-1.5 text-primary-700">
                    {renderCell(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit ? (
        <p className="border-t border-sand-200 px-3 py-2 text-[11px] text-primary-500">
          Showing the first {limit} of {formatQuantity(rows.length)} rows. Download the report for
          the full set.
        </p>
      ) : null}
    </div>
  );
}
