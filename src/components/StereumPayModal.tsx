import { useState, useEffect } from "react";
import { api } from "../api/client";

interface StereumPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any; // Factura seleccionada para pagar
}

interface StereumResponse {
  amount: number;
  currency: string;
  network: string;
  id: string;
  qr_base64: string;
  payment_link: string;
  transaction_status: string;
  on_main_net: string;
  collecting_account: string;
  expiration_time: number;
}

export function StereumPayModal({ isOpen, onClose, invoice }: StereumPayModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<StereumResponse | null>(null);

  useEffect(() => {
    if (isOpen && invoice) {
      initiatePayment();
    } else {
      // Limpiar estados al cerrar
      setPaymentData(null);
      setError(null);
    }
  }, [isOpen, invoice]);

  const initiatePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      // Extraemos el id de orden asociado a la factura. 
      // Si la factura tiene estructura anidada o el ID directo, lo capturamos de manera segura.
      const orderId = invoice?.idOrden?.id || invoice?.id || "";

      const response = await api.post("/api/v1/stereum/charge", {
        orderId: orderId,
      });

      if (response) {
        setPaymentData(response as StereumResponse);
      } else {
        throw new Error("No se recibió respuesta del servidor.");
      }
    } catch (err) {
      console.error("Error al procesar Stereum Pay:", err);
      setError("Stereum Pay Gateway se encuentra temporalmente offline.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-surface-container-high text-on-surface shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">payments</span>
            <h3 className="font-display text-lg font-bold">Stereum Pay Gateway</h3>
          </div>
          <button 
            onClick={onClose} 
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm font-semibold text-on-surface-variant">Generando solicitud de pago en la blockchain...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
                <span className="material-symbols-outlined text-2xl">wifi_off</span>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">{error}</p>
                <p className="text-xs text-on-surface-variant mt-1 px-4">Por favor intente más tarde o use otro método de pago.</p>
              </div>
              <button 
                onClick={onClose}
                className="mt-2 rounded-xl bg-white/5 px-5 py-2 text-xs font-bold hover:bg-white/10 transition"
              >
                Cerrar Ventana
              </button>
            </div>
          )}

          {paymentData && !loading && !error && (
            <div className="flex flex-col items-center space-y-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Escanea el código QR para pagar</p>
              
              {/* QR Image Rendering */}
              <div className="rounded-2xl bg-white p-3 shadow-md border border-white/10">
                <img 
                  src={`data:image/png;base64,${paymentData.qr_base64}`} 
                  alt="Stereum QR Code" 
                  className="h-44 w-44 object-contain"
                />
              </div>

              {/* Transaction Info */}
              <div className="w-full rounded-2xl bg-black/20 p-4 text-left space-y-2 text-xs border border-white/5">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-medium">Monto Total:</span>
                  <span className="font-bold text-primary text-sm">{paymentData.amount} {paymentData.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-medium">Red de Pago:</span>
                  <span className="font-bold text-on-surface uppercase">{paymentData.network}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-medium">Estado:</span>
                  <span className="font-bold text-secondary uppercase tracking-wide">{paymentData.transaction_status}</span>
                </div>
                <div className="pt-2 border-t border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-on-surface-variant tracking-wider font-bold">Cuenta de Origen/Destino:</span>
                  <span className="font-mono text-[11px] text-on-surface-variant truncate block selection:bg-primary/20">{paymentData.collecting_account}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full pt-2 flex gap-3">
                <a 
                  href={paymentData.payment_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-on-primary hover:brightness-110 transition"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  Abrir enlace de Pago
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}