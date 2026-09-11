import Link from "next/link";
import { demoProducts } from "@/src/data/demoProducts";

export default function DemoProductsGrid() {
  return (
    <section className="mt-10 space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">
        Example products
      </h2>
      <p className="text-xs text-slate-500">
        Click any card to open online prices or nearby stores.
      </p>
      <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-4">
        {demoProducts.map((p) => (
          <div
            key={p.name}
            className="border rounded-xl bg-white shadow-sm overflow-hidden flex flex-col"
          >
            <div className="h-28 w-full bg-slate-50 flex items-center justify-center p-3 text-center">
              <span className="text-sm font-medium text-slate-700 line-clamp-3">
                {p.name}
              </span>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
              <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                {p.name}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <Link
                  href={`/results?product=${encodeURIComponent(p.name)}`}
                  className="px-2 py-1 rounded-full bg-primary text-white"
                >
                  Online prices
                </Link>
                <Link
                  href="/stores"
                  className="px-2 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Nearby stores
                </Link>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(p.name).catch(() => {});
                  }
                }}
                className="mt-2 text-[11px] text-primary underline-offset-2 hover:underline text-left"
              >
                Copy name
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

