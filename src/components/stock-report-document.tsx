import type { StockExportDocument } from "@/lib/stock-report-export";

export function StockReportDocument({
  report,
  emptyLabel,
}: {
  report: StockExportDocument;
  emptyLabel: string;
}) {
  return (
    <article className="stock-report-document">
      <header>
        <p className="stock-report-brand">Magnificat Smart Space</p>
        <h1>{report.title}</h1>
        <dl className="stock-report-metadata">
          {report.metadata.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {report.notes.map((note) => (
          <p className="stock-report-note" key={note}>
            {note}
          </p>
        ))}
      </header>
      {report.tables.map((table) => (
        <section key={table.kind}>
          <h2>{table.title}</h2>
          {table.rows.length === 0 ? (
            <p>{emptyLabel}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  {table.headers.map((label, index) => (
                    <th key={index} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, column) => (
                      <td key={column}>
                        {typeof cell === "number"
                          ? cell.toLocaleString(undefined, {
                              maximumFractionDigits: 4,
                            })
                          : cell || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </article>
  );
}
