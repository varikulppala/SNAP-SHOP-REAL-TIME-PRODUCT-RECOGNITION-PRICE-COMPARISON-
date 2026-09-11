import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import StoreMap from "@/components/StoreMap";
import { apiClient } from "@/src/lib/api";

export default function StoresPage() {
  const [coords, setCoords] = useState(null);
  const [productName, setProductName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stores, setStores] = useState(null);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      () => {
        // ignore errors; user can still search with default
      }
    );
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!coords) {
      setError("Location permission is required to search nearby stores.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: coords.lat,
        lng: coords.lng
      });
      if (productName.trim()) {
        params.append("productName", productName.trim());
      }
      const data = await apiClient(`/stores/nearby?${params.toString()}`);
      setStores(data.stores || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Nearby Stores
        </h1>
        <form
          onSubmit={handleSearch}
          className="bg-white border rounded-xl shadow-sm p-4 space-y-3"
        >
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Product or shop name (optional)
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
            {loading ? "Searching stores..." : "Search nearby stores"}
          </button>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-2 py-1">
              {error}
            </p>
          )}
        </form>
        {stores && <StoreMap stores={stores} userLocation={coords} />}
      </div>
    </Layout>
  );
}

