export default function ProductCard({ product, detection, productImage }) {
  if (!product && !detection) return null;

  const title = product?.name || detection?.product_name || "Detected product";
  const brand = product?.brand || detection?.brand;
  const confidence = detection?.confidence;

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {productImage && (
          <div className="sm:w-40 h-32 sm:h-auto flex-shrink-0 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productImage}
              alt={title}
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <div className="p-4 flex flex-col flex-1 justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-lg text-slate-800">{title}</h3>
              {brand && (
                <p className="text-sm text-slate-500">
                  Brand: <span className="font-medium">{brand}</span>
                </p>
              )}
              {detection?.web_best_guess && (
                <p className="text-xs text-slate-400 mt-1">
                  Vision web match:{" "}
                  <span className="text-slate-600">{detection.web_best_guess}</span>
                </p>
              )}
              {detection?.price_search_query && (
                <p className="text-xs text-slate-500 mt-2">
                  Online prices searched for:{" "}
                  <span className="font-medium text-slate-700">
                    {detection.price_search_query}
                  </span>
                </p>
              )}
            </div>
            {confidence != null && (
              <span className="px-2 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 flex-shrink-0">
                Confidence: {(confidence * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

