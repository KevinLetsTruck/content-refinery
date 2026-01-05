"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  Filter,
  ExternalLink,
  Plus,
  Loader2,
  DollarSign,
  Tag,
  Box,
  RefreshCw,
} from "lucide-react";
import { Sidebar } from "@/components/navigation/Sidebar";

interface ProductVariant {
  id: number;
  title: string;
  price: string;
  inventory_quantity: number;
  sku: string;
}

interface Product {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  status: string;
  tags: string;
  variants: ProductVariant[];
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface Collection {
  id: number;
  title: string;
  handle: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCollections();
  }, []);

  const fetchProducts = async (collectionId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (collectionId && collectionId !== "all") {
        params.set("collection_id", collectionId);
      }

      const res = await fetch(`/api/shopify/products?${params.toString()}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setProducts(data.products || []);
    } catch {
      setError("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/shopify/collections");
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (err) {
      console.error("Failed to fetch collections:", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts(selectedCollection);
    setRefreshing(false);
  };

  const handleCollectionChange = (collectionId: string) => {
    setSelectedCollection(collectionId);
    fetchProducts(collectionId);
  };

  const filteredProducts = products.filter((product) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.title.toLowerCase().includes(query) ||
      product.product_type?.toLowerCase().includes(query) ||
      product.vendor?.toLowerCase().includes(query) ||
      product.tags?.toLowerCase().includes(query)
    );
  });

  const getPrice = (product: Product): string => {
    if (product.variants.length === 0) return "N/A";
    const prices = product.variants.map((v) => parseFloat(v.price));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (minPrice === maxPrice) {
      return `$${minPrice.toFixed(2)}`;
    }
    return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
  };

  const getTotalInventory = (product: Product): number => {
    return product.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-900/50 text-green-400";
      case "draft":
        return "bg-yellow-900/50 text-yellow-400";
      case "archived":
        return "bg-gray-700 text-gray-400";
      default:
        return "bg-gray-700 text-gray-400";
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        {/* Orange accent line */}
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />
        
        <div className="p-8 text-white">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Package className="w-8 h-8 text-[#FF4500]" />
              Products
            </h1>
            <p className="text-gray-400 mt-1">
              {products.length} products from Let&apos;s Truck store
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <a
              href="https://admin.shopify.com/store/store-letstruck/products"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-lg transition"
            >
              <ExternalLink className="w-4 h-4" />
              Shopify Admin
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg focus:border-[#FF4500] outline-none"
            />
          </div>

          {/* Collection Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select
              value={selectedCollection}
              onChange={(e) => handleCollectionChange(e.target.value)}
              className="pl-10 pr-8 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg focus:border-[#FF4500] outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Collections</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id.toString()}>
                  {collection.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF4500]" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => fetchProducts()}
              className="text-[#FF4500] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No products found</h2>
            <p className="text-gray-400">
              {searchQuery
                ? "Try a different search term"
                : "Add products in your Shopify store"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] overflow-hidden hover:border-[#3A3A3A] transition group"
              >
                {/* Image */}
                <div className="aspect-square bg-[#0D0D0D] relative overflow-hidden">
                  {product.images[0] ? (
                    <img
                      src={product.images[0].src}
                      alt={product.images[0].alt || product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-700" />
                    </div>
                  )}
                  {/* Status badge */}
                  <span
                    className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                      product.status
                    )}`}
                  >
                    {product.status}
                  </span>
                </div>

                {/* Details */}
                <div className="p-4">
                  <h3 className="font-semibold mb-1 line-clamp-2">{product.title}</h3>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {getPrice(product)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Box className="w-4 h-4" />
                      {getTotalInventory(product)} in stock
                    </span>
                  </div>

                  {product.product_type && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                      <Tag className="w-3 h-3" />
                      {product.product_type}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-[#2A2A2A]">
                    <Link
                      href={`/create?product=${product.id}`}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded text-sm font-medium transition"
                    >
                      <Plus className="w-4 h-4" />
                      Create Content
                    </Link>
                    <a
                      href={`https://store-letstruck.myshopify.com/products/${product.handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded transition"
                      title="View in store"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
        </div>
      </main>
    </div>
  );
}

