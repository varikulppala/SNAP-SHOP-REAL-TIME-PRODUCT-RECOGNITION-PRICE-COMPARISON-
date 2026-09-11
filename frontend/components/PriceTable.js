export default function PriceTable({ prices }) {
  if (!prices || prices.length === 0) {
    return (
      <div className="border rounded-xl bg-white p-4 text-sm text-slate-500">
        No prices available yet.
      </div>
    );
  }

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-4 py-2 text-left">Platform</th>
            <th className="px-4 py-2 text-right">Price (₹)</th>
            <th className="px-4 py-2 text-right">Rating</th>
            <th className="px-4 py-2 text-right">Link</th>
          </tr>
        </thead>
        <tbody>
          {prices.map((item, idx) => (
            <tr key={`${item.platform}-${idx}-${item.link || ""}`} className="border-t">
              <td className="px-4 py-2 font-medium">{item.platform}</td>
              <td className="px-4 py-2 text-right">
                {item.price != null ? item.price.toFixed(2) : "-"}
              </td>
              <td className="px-4 py-2 text-right">
                {item.rating != null ? item.rating.toFixed(1) : "-"}
              </td>
              <td className="px-4 py-2 text-right">
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

