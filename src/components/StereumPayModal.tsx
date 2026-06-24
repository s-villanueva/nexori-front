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
      // En la pestaña de facturas, el id de la factura se envía como orderId
      const invoiceId = invoice?.id || "";

      const response = await api.post("/api/v1/stereum/charge", {
        orderId: invoiceId,
      });

      if (response) {
        setPaymentData(response as StereumResponse);
      } else {
        throw new Error("No se recibió respuesta del servidor.");
      }
    } catch (err) {
      console.error("Error al procesar Stereum Pay:", err);
      setError("Stereum Pay Gateway se encuentra temporalmente offline o la factura no pudo procesarse.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Formatear fecha de expiración
  const formatExpiration = (time: number) => {
    if (!time) return "N/A";
    // Si expiration_time viene en segundos, multiplicamos por 1000
    const date = new Date(time < 99999999999 ? time * 1000 : time);
    return date.toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-surface-container-high text-on-surface shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">payments</span>
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
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm font-semibold text-on-surface-variant">Generando solicitud de pago en la blockchain...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error">
                <span className="material-symbols-outlined text-3xl">wifi_off</span>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">{error}</p>
                <p className="text-xs text-on-surface-variant mt-2 px-4">Por favor intente más tarde o use otro método de pago.</p>
              </div>
              <button 
                onClick={onClose}
                className="mt-4 rounded-xl bg-white/5 px-6 py-2.5 text-xs font-bold hover:bg-white/10 transition"
              >
                Cerrar Ventana
              </button>
            </div>
          )}

          {paymentData && !loading && !error && (
            <div className="flex flex-col items-center space-y-5">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Escanea el código QR para pagar</p>
              
              {/* QR Image Rendering */}
              <div className="rounded-2xl bg-white p-4 shadow-md border border-white/10 flex justify-center items-center">
                {paymentData.qr_base64 ? (
                  <img 
                    src={`data:image/png;base64,${paymentData.qr_base64}`} 
                    alt="Stereum QR Code" 
                    className="h-48 w-48 object-contain"
                  />
                ) : (
                  <div className="h-48 w-48 flex items-center justify-center bg-surface text-on-surface-variant text-xs">
                    Sin código QR disponible
                  </div>
                )}
              </div>

              {/* Transaction Info */}
              <div className="w-full rounded-2xl bg-surface-container-low/80 p-5 text-left space-y-3 text-xs border border-outline/10">
                <div className="flex justify-between items-center py-1.5 border-b border-outline/5">
                  <span className="text-on-surface-variant font-medium">ID Cargo Stereum:</span>
                  <span className="font-mono text-on-surface font-semibold select-all text-[11px] truncate max-w-[200px]">{paymentData.id}</span>
                </div>
                
                <div className="flex justify-between items-center py-1.5 border-b border-outline/5">
                  <span className="text-on-surface-variant font-medium">Monto Total:</span>
                  <span className="font-bold text-primary text-sm">{paymentData.amount} {paymentData.currency}</span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-outline/5">
                  <span className="text-on-surface-variant font-medium">Red de Pago:</span>
                  <span className="font-bold text-on-surface uppercase">{paymentData.network}</span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-outline/5">
                  <span className="text-on-surface-variant font-medium">Red Principal (MainNet):</span>
                  <span className={`font-bold ${paymentData.on_main_net === "true" || paymentData.on_main_net === "si" || paymentData.on_main_net === "yes" || paymentData.on_main_net === "true" ? "text-tertiary" : "text-amber-600"} uppercase`}>
                    {paymentData.on_main_net ? String(paymentData.on_main_net).toUpperCase() : "NO"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-outline/5">
                  <span className="text-on-surface-variant font-medium">Estado:</span>
                  <span className="font-bold text-secondary uppercase tracking-wide px-2 py-0.5 rounded bg-secondary/10">{paymentData.transaction_status}</span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-outline/5">
                  <span className="text-on-surface-variant font-medium">Expiración:</span>
                  <span className="font-semibold text-on-surface">{formatExpiration(paymentData.expiration_time)}</span>
                </div>

                <div className="pt-2 flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase text-on-surface-variant tracking-wider font-bold">Cuenta de Recaudación (Collecting Account):</span>
                  <span className="font-mono text-[11px] text-on-surface bg-surface-container-high px-3 py-2 rounded-xl border border-outline/10 break-all select-all block">
                    {paymentData.collecting_account}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full pt-2 flex flex-col sm:flex-row gap-3">
                {paymentData.payment_link && (
                  <a 
                    href={paymentData.payment_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-on-primary hover:brightness-110 transition shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    Abrir enlace de Pago
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-surface-container px-5 py-3 text-xs font-bold text-on-surface hover:bg-surface-container-high transition border border-outline/10"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}