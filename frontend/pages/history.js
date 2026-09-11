import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import PriceTable from "@/components/PriceTable";
import { useAuth } from "@/src/context/AuthContext";
import { apiClient } from "@/src/lib/api";

export default function HistoryPage() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient("/auth/me", { token });
        setHistory(data.history || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  if (!user) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto mt-8 bg-white border rounded-2xl shadow-sm p-6 text-sm text-slate-600">
          Please login to view your detection history.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Your History
        </h1>
        {loading && (
          <p className="text-xs text-slate-500">Loading history...</p>
        )}
        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-2 py-1">
            {error}
          </p>
        )}
        {history.length === 0 && !loading && (
          <p className="text-sm text-slate-500">
            No detection history yet. Upload a product to get started.
          </p>
        )}
        <div className="space-y-4">
          {history.map((entry, idx) => (
            <div
              key={`${entry.productName}-${idx}-${entry.searchedAt}`}
              className="border rounded-xl bg-white shadow-sm p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {entry.searchedAt
                    ? new Date(entry.searchedAt).toLocaleString()
                    : ""}
                </p>
              </div>
              <ProductCard
                product={{
                  name: entry.productName,
                  brand: entry.brand,
                  category: "general"
                }}
                detection={null}
              />
              {entry.prices && entry.prices.length > 0 && (
                <PriceTable prices={entry.prices} />
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

