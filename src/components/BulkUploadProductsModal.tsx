import { useState, useRef, useCallback, useEffect } from "react";
import { api } from "../api/client";
import * as XLSX from "xlsx";

interface ParsedRow {
  [key: string]: string | number;
}

interface Categoria {
  id: string;
  nombre: string;
}

interface BulkUploadProductsModalProps {
  idEmpresa: string | number;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export function BulkUploadProductsModal({
  idEmpresa,
  onClose,
  onSuccess,
}: BulkUploadProductsModalProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [parseError, setParseError] = useState("");
  
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadCategories() {
      setLoadingCategories(true);
      try {
        const res = await api.get("/api/v1/categorias");
        if (res && Array.isArray(res)) {
          setCategorias(res);
          if (res.length > 0) {
            setSelectedCategoryId(res[0].id);
          }
        }
      } catch (err) {
        console.error("Error al cargar categorías:", err);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  const parseFile = useCallback((f: File) => {
    setParseError("");
    setPreview([]);
    setHeaders([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: ParsedRow[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (rows.length === 0) {
          setParseError("El archivo no contiene filas de datos.");
          return;
        }

        setHeaders(Object.keys(rows[0]));
        setPreview(rows.slice(0, 5)); // preview de las primeras 5 filas
      } catch {
        setParseError("No se pudo leer el archivo. Asegúrate de que sea un CSV o XLSX válido.");
      }
    };
    reader.readAsBinaryString(f);
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      const valid = ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
      const extValid = f.name.endsWith(".csv") || f.name.endsWith(".xlsx") || f.name.endsWith(".xls");

      if (!valid.includes(f.type) && !extValid) {
        setParseError("Solo se permiten archivos .csv o .xlsx");
        return;
      }

      setFile(f);
      setUploadState("idle");
      setErrorMsg("");
      parseFile(f);
    },
    [parseFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleUpload = async () => {
    if (!file || !selectedCategoryId) return;
    setUploadState("uploading");
    setErrorMsg("");

    try {
      let fileToSend: File;

      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        const blob = new Blob([csv], { type: "text/csv" });
        fileToSend = new File([blob], file.name.replace(/\.xlsx?$/, ".csv"), { type: "text/csv" });
      } else {
        fileToSend = file;
      }

      const formData = new FormData();
      formData.append("file", fileToSend);

      const token = localStorage.getItem("b2b_token");
      const url = `${import.meta.env.VITE_API_URL}/api/v1/products/bulk-upload?idEmpresa=${idEmpresa}&idCategoria=${selectedCategoryId}`;
      
      const response = await fetch(
        url,
        {
          method: "POST",
          body: formData,
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Error ${response.status}`);
      }

      setUploadState("success");
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err: any) {
      setUploadState("error");
      setErrorMsg(err?.message || "Error al subir el archivo.");
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview([]);
    setHeaders([]);
    setUploadState("idle");
    setErrorMsg("");
    setParseError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl rounded-3xl border border-white/10 bg-surface shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined">upload_file</span>
            </span>
            <div>
              <h2 className="text-lg font-semibold text-on-surface">Carga masiva de productos</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">Sube un archivo CSV o XLSX con tus productos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-on-surface-variant transition hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Category Dropdown */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Categoría preseleccionada para lote
            </label>
            {loadingCategories ? (
              <div className="h-10 w-full rounded-xl bg-surface-container-low animate-pulse" />
            ) : (
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary"
              >
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[10px] text-on-surface-variant">
              Todos los productos importados en este archivo se registrarán bajo la categoría seleccionada.
            </p>
          </div>

          {/* Drag & Drop Zone */}
          {!file && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center cursor-pointer transition ${
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-white/10 bg-surface-container-low hover:border-primary/40 hover:bg-surface-container-high/30"
              }`}
            >
              <span className={`material-symbols-outlined text-5xl transition ${dragging ? "text-primary" : "text-on-surface-variant"}`}>
                cloud_upload
              </span>
              <div>
                <p className="text-sm font-semibold text-on-surface">
                  {dragging ? "Suelta el archivo aquí" : "Arrastra tu archivo aquí"}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  o <span className="text-primary font-semibold underline underline-offset-2">haz clic para seleccionar</span>
                </p>
                <p className="text-xs text-on-surface-variant mt-3">
                  Formatos aceptados: <span className="font-mono text-on-surface">.csv</span>, <span className="font-mono text-on-surface">.xlsx</span>
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleInputChange}
              />
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <span className="material-symbols-outlined text-lg shrink-0">error</span>
              {parseError}
            </div>
          )}

          {/* Archivo seleccionado + Preview */}
          {file && !parseError && (
            <>
              {/* Info del archivo */}
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-surface-container-low px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">description</span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{file.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {(file.size / 1024).toFixed(1)} KB — {preview.length < 5 ? preview.length : "5+"} filas leídas
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs font-semibold text-on-surface-variant transition hover:text-red-400"
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Preview table */}
              {preview.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-base text-on-surface-variant">table_view</span>
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Vista previa — primeras {preview.length} filas
                    </p>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10 bg-surface-container-high/40">
                          {headers.map((h) => (
                            <th key={h} className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-on-surface-variant whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {preview.map((row, i) => (
                          <tr key={i} className="hover:bg-white/[0.01]">
                            {headers.map((h) => (
                              <td key={h} className="px-4 py-2.5 text-on-surface-variant max-w-[180px] truncate" title={String(row[h])}>
                                {String(row[h]) || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Upload states */}
              {uploadState === "error" && (
                <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  <span className="material-symbols-outlined text-lg shrink-0">error</span>
                  {errorMsg}
                </div>
              )}

              {uploadState === "success" && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                  <span className="material-symbols-outlined text-lg shrink-0">check_circle</span>
                  Productos importados correctamente. Actualizando lista...
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 p-6 border-t border-white/10 shrink-0">
          <p className="text-xs text-on-surface-variant">
            {file && !parseError
              ? file?.name.endsWith(".csv") ? "Se enviará el archivo CSV directamente" : "El archivo XLSX se convertirá a CSV antes de enviarse"
              : "Selecciona un archivo para continuar"}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:text-on-surface"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || !!parseError || uploadState === "uploading" || uploadState === "success"}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-on-primary transition hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
            >
              {uploadState === "uploading" ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Subiendo...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm font-bold">upload</span>
                  Confirmar carga
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}