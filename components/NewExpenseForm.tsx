"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function getToday() {
  return new Date().toLocaleDateString("sv", { timeZone: "America/Argentina/Buenos_Aires" });
}

export default function NewExpenseForm() {
  const router = useRouter();
  const supabase = createClient();

  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [expenseDate, setExpenseDate] = useState(getToday());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const priceNum = parseFloat(price);
  const quantityNum = parseInt(quantity);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!product.trim()) {
      setError("Ingresá el nombre del producto.");
      return;
    }
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      setError("Ingresá un precio válido.");
      return;
    }
    if (!quantity || isNaN(quantityNum) || quantityNum <= 0) {
      setError("Ingresá una cantidad válida.");
      return;
    }
    if (!expenseDate) {
      setError("Ingresá la fecha.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: err } = await supabase.from("expenses").insert({
      employee_id: user!.id,
      product: product.trim(),
      price: priceNum,
      quantity: quantityNum,
      expense_date: expenseDate,
    });

    setLoading(false);

    if (err) {
      setError("Error al guardar el insumo.");
      return;
    }

    setProduct("");
    setPrice("");
    setQuantity("1");
    setExpenseDate(getToday());
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="label">Producto</label>
        <input
          type="text"
          className="input-field"
          placeholder="Ej: Shampoo para autos"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Precio unitario ($)</label>
          <input
            type="text"
            inputMode="decimal"
            className="input-field"
            placeholder="Ej: 5000"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </div>
        <div>
          <label className="label">Cantidad</label>
          <input
            type="text"
            inputMode="numeric"
            className="input-field"
            placeholder="Ej: 2"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      </div>

      <div>
        <label className="label">Fecha</label>
        <input
          type="date"
          className="input-field"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          required
        />
      </div>

      {!isNaN(priceNum) && priceNum > 0 && !isNaN(quantityNum) && quantityNum > 0 && (
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Total = ${(priceNum * quantityNum).toLocaleString("es-AR")}
        </p>
      )}

      {error && (
        <p
          className="text-sm text-center py-2 px-3 rounded-lg"
          style={{ color: "var(--danger)", background: "rgba(239,68,68,0.1)" }}
        >
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Guardando..." : "+ Agregar insumo"}
      </button>
    </form>
  );
}
