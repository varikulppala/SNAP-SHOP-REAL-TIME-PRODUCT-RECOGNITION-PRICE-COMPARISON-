import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import PriceTable from "@/components/PriceTable";
import StoreMap from "@/components/StoreMap";
import { useAuth } from "@/src/context/AuthContext";
import { apiClient } from "@/src/lib/api";
import { STORE_CATEGORIES, getSubcategoriesForCategory } from "@/src/data/categories";
import { compressDataUrlForUpload } from "@/src/lib/imageCompress";

export default function UploadPage() {
  const { token, logout } = useAuth();
  const [category, setCategory] = useState("all");
  const [subcategory, setSubcategory] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionNotice, setSessionNotice] = useState(null);
  const [result, setResult] = useState(null);
  const [stores, setStores] = useState(null);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesError, setStoresError] = useState(null);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!imageBase64 || coords) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }),
      () => {}
    );
  }, [imageBase64, coords]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setImageBase64(reader.result);
      setResult(null);
      setStores(null);
      setStoresError(null);
    };
    reader.readAsDataURL(file);
  };

  const fetchNearbyStores = async (storeKeyword, storeCat, storeSub) => {
    if (!storeKeyword.trim()) return;
    setStoresLoading(true);
    setStoresError(null);
    try {
      let currentCoords = coords;
      if (!currentCoords && typeof navigator !== "undefined" && navigator.geolocation) {
        currentCoords = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
              });
            },
            (err) => {
              reject(err);
            }
          );
        });
        setCoords(currentCoords);
      }

      if (currentCoords) {
        const params = new URLSearchParams({
          lat: currentCoords.lat,
          lng: currentCoords.lng,
          productName: storeKeyword.trim()
        });
        if (storeCat && storeCat !== "all") {
          params.set("category", storeCat);
          if (storeSub) {
            params.set("subcategory", storeSub);
          }
        }
        const storesResp = await apiClient(`/stores/nearby?${params.toString()}`);
        setStores(storesResp.stores || []);
      } else {
        setStoresError(
          "Location permission is required to show nearby store prices."
        );
      }
    } catch (e) {
      setStoresError(e.message || "Failed to load nearby stores for this product.");
    } finally {
      setStoresLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!imageBase64) {
      setError("Please select an image first.");
      return;
    }
    setError(null);
    setSessionNotice(null);
    setStores(null);
    setStoresError(null);
    setLoading(true);
    try {
      let toSend = imageBase64;
      try {
        toSend = await compressDataUrlForUpload(imageBase64);
      } catch (compressErr) {
        console.warn("Image compress skipped:", compressErr);
      }
      const data = await apiClient("/product/detect", {
        method: "POST",
        body: { imageBase64: toSend, category, subcategory },
        ...(token ? { token } : {})
      });
      if (data.session?.tokenExpired) {
        logout();
        setSessionNotice(
          "Your session had expired, so you were signed out. Results still loaded. Log in again to save to History."
        );
      }
      setResult(data);

      const searchKeyword =
        data?.detection?.price_search_query ||
        data?.product?.name ||
        data?.detection?.product_name ||
        "";
      if (searchKeyword.trim()) {
        void fetchNearbyStores(
          searchKeyword.trim(),
          data.storeCategory ?? category,
          data.storeSubcategory ?? subcategory
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasPrices = result?.prices && result.prices.length > 0;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">
            Upload Product
          </h1>
          <p className="text-xs text-slate-500 max-w-md text-right">
            Choose category, upload a photo — we detect the product, load Shopping
            links, and nearby stores. Log in to save searches to History.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-xl p-4 bg-white">
              <p className="text-sm font-medium text-slate-700 mb-2">
                Select a product photo
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-xs"
              />
              <p className="text-xs text-slate-400 mt-2">
                For webcam capture, take a photo and upload from your device.
              </p>
            </div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Category (nearby store types and saved product category)
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white max-w-md"
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
            <label className="block text-xs font-medium text-slate-600 mb-1 mt-2">
              Subcategory (optional — refines Shopping hints & Places types)
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white max-w-md disabled:opacity-50"
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
              type="button"
              onClick={handleAnalyze}
              disabled={loading}
              className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium disabled:opacity-60"
            >
              {loading ? "Analyzing photo…" : "Analyze photo & load prices"}
            </button>
            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-2 py-1">
                {error}
              </p>
            )}
            {sessionNotice && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                {sessionNotice}
              </p>
            )}
          </div>
          <div className="space-y-3">
            <div className="border rounded-xl bg-white overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                Preview
              </div>
              <div className="aspect-video flex items-center justify-center">
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <p className="text-xs text-slate-400">
                    No image selected yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        {result && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Detection result
            </h2>
            <ProductCard
              product={result.product}
              detection={result.detection}
              productImage={imagePreview}
            />

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">
                Online price comparison
              </h3>
              {!hasPrices ? (
                <div className="border rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  No live prices returned (check SerpAPI key or try another angle on
                  the product). Platform search links may still appear below if
                  configured.
                </div>
              ) : (
                <PriceTable prices={result.prices} />
              )}
            </div>

            <div id="nearby-stores" className="space-y-4 scroll-mt-4">
              <h3 className="text-sm font-semibold text-slate-800">
                Shops near you (with location)
              </h3>
              {storesLoading && (
                <p className="text-xs text-slate-500">Loading nearby shops…</p>
              )}
              {storesError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-2 py-1">
                  {storesError}
                </p>
              )}
              {stores && stores.length > 0 && !storesLoading && (
                <>
                  <StoreMap stores={stores} userLocation={coords} />
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
                          <h4 className="font-semibold text-slate-800">{store.name}</h4>
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
                            {store.price != null && (
                              <p className="text-slate-700 font-medium">
                                ₹{store.price.toFixed(2)}
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
              {!storesLoading &&
                !storesError &&
                (!stores || stores.length === 0) && (
                  <p className="text-xs text-slate-500">
                    No nearby shops yet — allow location or try again after the map
                    loads.
                  </p>
                )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
