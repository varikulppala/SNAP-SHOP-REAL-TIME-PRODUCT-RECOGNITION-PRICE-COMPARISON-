import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import PriceTable from "@/components/PriceTable";
import { apiClient } from "@/src/lib/api";

export default function ResultsPage() {
  const router = useRouter();
  const initialProduct =
    typeof router.query.product === "string" ? router.query.product : "";
  const [productName, setProductName] = useState(initialProduct);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prices, setPrices] = useState(null);

  const handleFetch = async (e) => {
    e.preventDefault();
    if (!productName.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const encoded = encodeURIComponent(productName.trim());
      const data = await apiClient(`/prices/${encoded}`);
      setPrices(data.prices || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Results</h1>
        <form
          onSubmit={handleFetch}
          className="bg-white border rounded-xl shadow-sm p-4 space-y-3"
        >
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Product or shop name
          </label>
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder=""
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Loading..." : "Load prices"}
          </button>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-2 py-1">
              {error}
            </p>
          )}
        </form>
        {productName && (
          <ProductCard
            product={{ name: productName, brand: "", category: "general" }}
            detection={null}
          />
        )}
        {prices && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-800">
              Quick Search
            </h2>
            <PriceTable prices={prices} />
          </div>
        )}
      </div>
    </Layout>
  );
}

