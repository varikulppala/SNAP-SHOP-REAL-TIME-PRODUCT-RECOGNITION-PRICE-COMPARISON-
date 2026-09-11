import { useState } from "react";
import Layout from "@/components/Layout";
import NearbyStoreMap from "@/components/NearbyStoreMap";
import { apiClient } from "@/src/lib/api";
import { STORE_CATEGORIES, getSubcategoriesForCategory } from "@/src/data/categories";

export default function NearbyStoresPage() {
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("all");
  const [subcategory, setSubcategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stores, setStores] = useState([]);
  const [coords, setCoords] = useState(null);

  const handleFindStores = async (e) => {
    e.preventDefault();
    if (!product.trim()) {
      setError("Please enter a product or shop name");
      return;
    }
    setError(null);
    setLoading(true);
    setStores([]);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      const { latitude, longitude } = position.coords;
      setCoords({ lat: latitude, lng: longitude });

      const params = new URLSearchParams({
        product: product.trim(),
        lat: latitude,
        lng: longitude
      });
      if (category && category !== "all") {
        params.set("category", category);
        if (subcategory) {
          params.set("subcategory", subcategory);
        }
      }
      const data = await apiClient(`/stores/nearby?${params.toString()}`);
      setStores(data.stores || []);
    } catch (err) {
      if (err?.code === 1 || err?.name === "GeolocationPositionError") {
        setError("Location permission denied. Please allow location access.");
      } else {
        setError(err?.message || "Failed to find nearby stores");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Find Nearby Stores
        </h1>

        <form
          onSubmit={handleFindStores}
          className="bg-white border rounded-xl shadow-sm p-4 space-y-3"
        >
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Product or shop name
          </label>
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder=""
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          />
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Store category (Google Places types)
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSubcategory("");
            }}
          >
            {STORE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Subcategory (optional)
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
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Finding stores..." : "Find Nearby Stores"}
          </button>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-2 py-1">
              {error}
            </p>
          )}
        </form>

        {stores.length > 0 && (
          <>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-800">
                Stores for &ldquo;{product}&rdquo;
                {category !== "all" && (
                  <span className="font-normal text-slate-600">
                    {" "}
                    ·{" "}
                    {STORE_CATEGORIES.find((c) => c.value === category)?.label ||
                      category}
                    {subcategory ? (
                      <>
                        {" "}
                        ·{" "}
                        {getSubcategoriesForCategory(category).find((s) => s.value === subcategory)
                          ?.label || subcategory}
                      </>
                    ) : null}
                  </span>
                )}
              </h2>
              <NearbyStoreMap stores={stores} userLocation={coords} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map((store) => {
                const lat = store.location?.lat;
                const lng = store.location?.lng;
                const dirUrl =
                  lat != null && lng != null
                    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
                    : null;

                return (
                  <div
                    key={`${store.name}-${lat}-${lng}`}
                    className="border rounded-xl bg-white shadow-sm p-4 flex flex-col"
                  >
                    <h3 className="font-semibold text-slate-800">{store.name}</h3>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      {store.rating != null && (
                        <p>★ Rating: {store.rating.toFixed(1)}</p>
                      )}
                      {store.address && (
                        <p className="text-xs">{store.address}</p>
                      )}
                      {store.distance != null && (
                        <p className="text-xs">
                          {store.distance.toFixed(1)} km away
                        </p>
                      )}
                    </div>
                    {dirUrl && (
                      <a
                        href={dirUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-block px-4 py-2 rounded-lg bg-primary text-white text-xs font-medium text-center hover:opacity-90"
                      >
                        Get Directions
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
