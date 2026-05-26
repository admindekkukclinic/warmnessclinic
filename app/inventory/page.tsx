"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  quantity: number;
  created_at?: string;
};

export default function InventoryPage() {

  const [products, setProducts] = useState<Product[]>([]);
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch products
  const getProducts = async () => {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    }

    return data ?? [];
  };

  const fetchProducts = async () => {
    const data = await getProducts();

    if (data) {
      setProducts(data);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      const data = await getProducts();

      if (data && isMounted) {
        setProducts(data);
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Add product
  const addProduct = async () => {

    if (!productName || !quantity) return;

    await supabase.from("inventory").insert([
      {
        name: productName,
        quantity: Number.parseInt(quantity, 10),
      },
    ]);

    setProductName("");
    setQuantity("");

    fetchProducts();
  };

  // Delete product
  const deleteProduct = async (id: string) => {

    await supabase
      .from("inventory")
      .delete()
      .eq("id", id);

    fetchProducts();
  };

  // Edit product
  const editProduct = async (
    id: string,
    currentQuantity: number
  ) => {

    const newQuantity = prompt(
      "Enter new quantity",
      currentQuantity.toString()
    );

    if (!newQuantity) return;

    const { error } = await supabase
      .from("inventory")
      .update({
        quantity: Number.parseInt(newQuantity, 10),
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    fetchProducts();
  };

  // Search
  const filteredProducts = products.filter((product) =>
    product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const totalItems = products.reduce(
    (sum, product) => sum + product.quantity,
    0
  );
  const lowStockCount = products.filter(
    (product) => product.quantity <= 5
  ).length;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 p-8 text-white shadow-xl shadow-blue-900/15">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
              Clinic Supplies
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Inventory Management
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
              Track dental materials, monitor low stock, and keep supplies ready
              for daily operations.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-100">
                Products
              </p>
              <p className="mt-2 text-3xl font-bold">{products.length}</p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-100">
                Total Units
              </p>
              <p className="mt-2 text-3xl font-bold">{totalItems}</p>
            </div>

            <div className="col-span-2 rounded-2xl border border-orange-200/25 bg-orange-400/15 px-5 py-4 backdrop-blur sm:col-span-1">
              <p className="text-xs font-medium uppercase tracking-wide text-orange-100">
                Low Stock
              </p>
              <p className="mt-2 text-3xl font-bold">{lowStockCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Supply List
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Add new items and update quantities as stock changes.
              </p>
            </div>

            <div className="relative w-full xl:max-w-sm">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Find
              </span>
              <input
                type="text"
                placeholder="Search products"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-16 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_160px_auto]">
            <input
              type="text"
              placeholder="Product name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <input
              type="number"
              min="0"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <button
              onClick={addProduct}
              className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              Add Product
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Product</th>
                <th className="px-6 py-4 font-semibold">Quantity</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 text-right font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const isLowStock = product.quantity <= 5;

                return (
                  <tr
                    key={product.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">
                          {product.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Dental inventory item
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span className="text-lg font-semibold text-slate-900">
                        {product.quantity}
                      </span>
                      <span className="ml-1 text-sm text-slate-500">units</span>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={
                          isLowStock
                            ? "inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200"
                            : "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"
                        }
                      >
                        {isLowStock ? "Low Stock" : "Normal"}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            editProduct(
                              product.id,
                              product.quantity
                            )
                          }
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            deleteProduct(product.id)
                          }
                          className="rounded-xl border border-red-100 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
              +
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              No products found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Add a new product or adjust your search term.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
