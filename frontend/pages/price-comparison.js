import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { apiClient } from "@/src/lib/api";
import {
  STORE_CATEGORIES as QUICK_SEARCH_CATEGORIES,
  getSubcategoriesForCategory
} from "@/src/data/categories";

const QUICK_SEARCH_SORTS = [
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating_desc", label: "Rating: high to low" },
  { value: "reviews_desc", label: "Most reviews" }
];

function buildSearchParams(q, category, subcategory, sort) {
  const params = new URLSearchParams({ q: q.trim(), sort: sort || "price_asc" });
  if (category && category !== "all") {
    params.set("category", category);
    if (subcategory) {
      params.set("subcategory", subcategory);
    }
  }
  return params;
}

function sortResultsDescription(sort) {
  switch (sort) {
    case "price_desc":
      return "sorted by highest price";
    case "rating_desc":
      return "sorted by rating";
    case "reviews_desc":
      return "sorted by review count";
    case "price_asc":
    default:
      return "sorted by lowest price";
  }
}

export default function PriceComparisonPage() {
  const router = useRouter();
  const initialQuery =
    typeof router.query.product === "string" ? router.query.product : "";
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("all");
  const [subcategory, setSubcategory] = useState("");
  const [sort, setSort] = useState("price_asc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);

  const normalizedCategory = useCallback((raw) => {
    if (typeof raw !== "string") return "all";
    const v = raw.trim();
    return QUICK_SEARCH_CATEGORIES.some((c) => c.value === v) ? v : "all";
  }, []);

  const normalizedSort = useCallback((raw) => {
    if (typeof raw !== "string") return "price_asc";
    const v = raw.trim();
    return QUICK_SEARCH_SORTS.some((s) => s.value === v) ? v : "price_asc";
  }, []);

  const normalizedSubcategory = useCallback((parentCat, rawSub) => {
    if (parentCat === "all") return "";
    const subs = getSubcategoriesForCategory(parentCat);
    const v = typeof rawSub === "string" ? rawSub.trim() : "";
    return subs.some((s) => s.value === v) ? v : "";
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    const rawCat = router.query.category;
    const cat = normalizedCategory(Array.isArray(rawCat) ? rawCat[0] : rawCat);
    setCategory(cat);

    const rawSub = router.query.subcategory;
    const subStr = Array.isArray(rawSub) ? rawSub[0] : rawSub;
    setSubcategory(normalizedSubcategory(cat, subStr));

    const rawSort = router.query.sort;
    const sortVal = normalizedSort(Array.isArray(rawSort) ? rawSort[0] : rawSort);
    setSort(sortVal);

    const rawProduct = router.query.product;
    const productStr = Array.isArray(rawProduct) ? rawProduct[0] : rawProduct;
    if (productStr && typeof productStr === "string") {
      const q = productStr.trim();
      if (q) {
        setQuery(q);
        setError(null);
        setLoading(true);
        setProducts([]);
        const sub = normalizedSubcategory(cat, subStr);
        const params = buildSearchParams(q, cat, sub, sortVal);
        apiClient(`/products/search?${params.toString()}`)
          .then((data) => setProducts(data.products || []))
          .catch((err) => setError(err.message))
          .finally(() => setLoading(false));
      }
    }
  }, [
    router.isReady,
    router.query.product,
    router.query.category,
    router.query.subcategory,
    router.query.sort,
    normalizedCategory,
    normalizedSubcategory,
    normalizedSort
  ]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setError(null);
    const nextQuery = {
      product: query.trim(),
      ...(category !== "all" ? { category } : {}),
      ...(category !== "all" && subcategory ? { subcategory } : {}),
      ...(sort !== "price_asc" ? { sort } : {})
    };
    await router.replace({ pathname: "/price-comparison", query: nextQuery }, undefined, {
      shallow: true
    });
  };


  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Quick Search
        </h1>
        <form
          onSubmit={handleSearch}
          className="bg-white border rounded-xl shadow-sm p-4 space-y-3"
        >
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Product or shop name
          </label>
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder=""
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Category (narrows Google Shopping results)
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSubcategory("");
            }}
          >
            {QUICK_SEARCH_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Subcategory (optional, refines Shopping & store types)
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white disabled:opacity-50"
            value={subcategory}
            disabled={category === "all"}
            onChange={(e) => setSubcategory(e.target.value)}
          >
            {getSubcategoriesForCategory(category).map((s) => (
              <option key={s.value || "general"} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Sort results
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {QUICK_SEARCH_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Searching..." : "Search prices"}
          </button>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-2 py-1">
              {error}
            </p>
          )}
        </form>

        {products.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-800">
              Results for &ldquo;{query}&rdquo; ({sortResultsDescription(sort)})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product, index) => (
                <div
                  key={`${product.title}-${index}`}
                  className="border rounded-xl bg-white shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="h-40 bg-slate-100 flex items-center justify-center">
                    {(product.image || product.thumbnail) ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={product.image || product.thumbnail}
                        alt={product.title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">No image</span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-slate-800 line-clamp-2 text-sm">
                      {product.title}
                    </h3>
                    {product.prices && Object.keys(product.prices).filter((k) => product.prices[k] != null).length > 0 ? (
                      <div className="mt-2 space-y-1 text-xs">
                        {Object.entries(product.prices)
                          .filter(([, v]) => v != null)
                          .sort(([, a], [, b]) => a - b)
                          .map(([platform, price]) => (
                            <div key={platform} className="flex justify-between items-center">
                              <span className="text-slate-600">{platform}</span>
                              <span className="font-medium text-slate-800">
                                ₹{Number(price).toFixed(2)}
                                {product.ratings?.[platform] != null && (
                                  <span className="ml-1 text-slate-500 font-normal">
                                    ★ {Number(product.ratings[platform]).toFixed(1)}
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        {(() => {
                          const vals = Object.values(product.prices).filter((v) => v != null && v > 0);
                          if (vals.length === 0) return null;
                          return (
                            <p className="text-[10px] text-slate-500 mt-1">
                              Lowest: ₹{Math.min(...vals).toFixed(2)}
                            </p>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="mt-2 space-y-1 text-xs">
                        {(product.rating > 0 || product.reviews > 0) && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Reviews</span>
                            <span className="text-slate-700">
                              {product.rating > 0 && `★ ${Number(product.rating).toFixed(1)}`}
                              {product.rating > 0 && product.reviews > 0 && " · "}
                              {product.reviews > 0 && `${product.reviews} reviews`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-4 space-y-2">
                      <p className="text-[10px] font-medium text-slate-600">Compare on platforms</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: "amazon", label: "Amazon", rating: product.ratings?.Amazon, className: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100", link: product.amazon_link },
                          { key: "flipkart", label: "Flipkart", rating: product.ratings?.Flipkart, className: "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100", link: product.flipkart_link },
                          { key: "jiomart", label: "JioMart", rating: product.ratings?.JioMart, className: "bg-green-50 text-green-800 border-green-200 hover:bg-green-100", link: product.jiomart_link },
                          { key: "bigbasket", label: "BigBasket", rating: product.ratings?.BigBasket, className: "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100", link: product.bigbasket_link },
                          { key: "blinkit", label: "Blinkit", rating: product.ratings?.Blinkit, className: "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100", link: product.blinkit_link },
                          { key: "dmart", label: "DMart", rating: product.ratings?.DMart, className: "bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100", link: product.dmart_link },
                        ].filter((p) => p.link).map(({ key, label, rating, className, link }) => (
                          <a
                            key={key}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex-1 min-w-[85px] px-2 py-2 rounded-lg text-[11px] font-medium text-center border ${className} block`}
                          >
                            <span className="block font-semibold">{label}</span>
                            {rating != null && <span className="block text-[10px] mt-0.5 text-slate-600">★ {Number(rating).toFixed(1)}</span>}
                          </a>
                        ))}
                      </div>
                      {product.link && (
                        <a
                          href={product.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full mt-2 px-4 py-2.5 rounded-lg bg-primary text-white text-xs font-medium text-center hover:opacity-90"
                        >
                          Buy Product (Google Shopping)
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && products.length === 0 && query && (
          <p className="text-sm text-slate-500">
            No products found. Try a different search term.
          </p>
        )}
      </div>
    </Layout>
  );
}
