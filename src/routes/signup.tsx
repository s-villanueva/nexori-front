import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AuthShell, BrandHeader, SecurityFooter } from "../components/auth-shell";
import { api } from "../api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Corporate Onboarding | Nexori" },
      { name: "description", content: "Request access to Nexori — enterprise orchestration portal." },
    ],
  }),
  component: SignupPage,
});

interface ExistingCompany {
  id: string;
  nombre: string;
  dominio?: string;
  nit?: string;
  razonSocial?: string;
}

interface ExistingBranch {
  id: string;
  nombre: string;
  direccion?: string;
}

function scorePassword(pw: string) {
  let s = 0;
  if (pw.length >= 12) s += 2;
  else if (pw.length >= 8) s += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  return Math.min(s, 5);
}

function SignupPage() {
  const navigate = useNavigate();
  
  // Wizard Step State
  const [step, setStep] = useState(1);

  // Step 1: User Fields
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    terms: false,
  });

  // Step 2: Company Inputs
  const [companyInput, setCompanyInput] = useState("");
  const [companyDetails, setCompanyDetails] = useState({
    dominio: "",
    nit: "",
    razonSocial: "",
  });

  // Step 3: Branch Inputs
  const [branchInput, setBranchInput] = useState("");
  const [branchDetails, setBranchDetails] = useState({
    direccion: "",
    latitude: -16.5000,
    longitude: -68.1500,
  });

  const [existingCompanies, setExistingCompanies] = useState<ExistingCompany[]>([]);
  const [existingBranches, setExistingBranches] = useState<ExistingBranch[]>([]);
  
  const [selectedCompany, setSelectedCompany] = useState<ExistingCompany | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<ExistingBranch | null>(null);

  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Password score
  const score = useMemo(() => scorePassword(form.password), [form.password]);
  const meter = [
    { w: "10%", color: "var(--error)", label: "Weak" },
    { w: "25%", color: "var(--error)", label: "Weak" },
    { w: "50%", color: "#f5b748", label: "Fair" },
    { w: "70%", color: "var(--tertiary)", label: "Strong" },
    { w: "90%", color: "var(--tertiary)", label: "Strong" },
    { w: "100%", color: "var(--primary)", label: "Excellent" },
  ][score];

  // Fetch companies on mount
  useEffect(() => {
    async function loadCompanies() {
      try {
        let res = await api.get("/api/v1/empresas");
        const list = Array.isArray(res) ? res : res?.content || [];
        setExistingCompanies(list);
      } catch (err) {
        try {
          let res = await api.get("/api/v1/empresas/paged");
          const list = Array.isArray(res) ? res : res?.content || [];
          setExistingCompanies(list);
        } catch (e) {
          console.error("Failed to load companies", e);
        }
      }
    }
    loadCompanies();
  }, []);

  // Fetch branches (warehouses) when company is selected
  useEffect(() => {
    async function loadBranches() {
      if (!selectedCompany) {
        setExistingBranches([]);
        setSelectedBranch(null);
        return;
      }
      try {
        let res = await api.get(`/api/v1/almacenes/mostrar?idEmpresa=${selectedCompany.id}`);
        const list = Array.isArray(res) ? res : res?.content || [];
        setExistingBranches(list);
      } catch (err) {
        console.error("Failed to load branches", err);
        setExistingBranches([]);
      }
    }
    loadBranches();
  }, [selectedCompany]);

  // Company suggestions filtering
  const companyMatches = useMemo(() => {
    if (!companyInput || selectedCompany?.nombre === companyInput) return [];
    return existingCompanies.filter(c => 
      c.nombre.toLowerCase().includes(companyInput.toLowerCase())
    );
  }, [companyInput, existingCompanies, selectedCompany]);

  // Branch suggestions filtering
  const branchMatches = useMemo(() => {
    if (!branchInput || selectedBranch?.nombre === branchInput) return [];
    return existingBranches.filter(b => 
      b.nombre.toLowerCase().includes(branchInput.toLowerCase())
    );
  }, [branchInput, existingBranches, selectedBranch]);

  // Status checks
  const isExistingCompany = selectedCompany !== null && selectedCompany.nombre === companyInput;
  const isExistingBranch = selectedBranch !== null && selectedBranch.nombre === branchInput;

  // Autofill if existing company is selected
  useEffect(() => {
    if (isExistingCompany && selectedCompany) {
      setCompanyDetails({
        dominio: selectedCompany.dominio || "",
        nit: selectedCompany.nit || "",
        razonSocial: selectedCompany.razonSocial || "",
      });
    }
  }, [isExistingCompany, selectedCompany]);

  // Autofill if existing branch is selected
  useEffect(() => {
    if (isExistingBranch && selectedBranch) {
      setBranchDetails(prev => ({
        ...prev,
        direccion: selectedBranch.direccion || "",
      }));
    }
  }, [isExistingBranch, selectedBranch]);

  // Step validation
  const isStep1Valid = form.name.trim() && form.email.trim() && form.password.length >= 12;
  const isStep2Valid = companyInput.trim() && (isExistingCompany || companyDetails.nit.trim());
  const isStep3Valid = branchInput.trim() && branchDetails.direccion.trim();
  const isStep4Valid = form.terms && !submitting;

  const handleNext = () => {
    if (step === 1 && isStep1Valid) setStep(2);
    else if (step === 2 && isStep2Valid) setStep(3);
    else if (step === 3 && isStep3Valid) setStep(4);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep1Valid || !isStep2Valid || !isStep3Valid || !isStep4Valid) return;
    setSubmitting(true);

    try {
      const registerPayload = {
        nombre: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        activo: true,
        
        // Empresa fields
        id_empresa: selectedCompany ? selectedCompany.id : null,
        nombre_empresa: companyInput.trim(),
        dominio: companyDetails.dominio.trim() || `${companyInput.toLowerCase().replace(/\s+/g, "")}.com`,
        nit: companyDetails.nit.trim(),
        razon_social: companyDetails.razonSocial.trim() || companyInput.trim(),
        
        // Sucursal fields
        id_sucursal: selectedBranch ? selectedBranch.id : null,
        nombreSucursal: branchInput.trim(),
        direccion: branchDetails.direccion.trim(),
        
        // Coordinates Point mapping
        coordenadas: {
          x: Number(branchDetails.latitude),
          y: Number(branchDetails.longitude)
        },

        // Rol mapping
        id_rol: null
      };

      toast.info("Enviando registro de Nexori...");

      await api.post("/api/v1/usuarios/register", registerPayload);

      toast.success("¡Registro completado con éxito! Por favor inicie sesión.");
      navigate({ to: "/" }); // Navigates to landing page where they can click login
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al completar el registro. Verifique sus datos.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell maxWidth={580}>
      <div className="glass-card w-full rounded-xl p-6 md:p-8 shadow-2xl space-y-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <img src="/logo.png" alt="Logo" className="max-h-14 max-w-[240px] object-contain rounded-lg" />
          <h2 className="text-lg text-on-surface font-semibold mt-1">Registro de Comprador (BUYER)</h2>
          
          {/* Step Progress Tracker */}
          <div className="w-full flex items-center justify-between gap-2 max-w-sm mt-3">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
                <div 
                  className={`h-2.5 w-full rounded-full transition-all duration-300 ${
                    s === step 
                      ? "bg-[#BA7517]" 
                      : s < step 
                        ? "bg-[#0F6E56]" 
                        : "bg-[#CBD6D4]"
                  }`} 
                />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                  s === step ? "text-[#BA7517]" : s < step ? "text-[#0F6E56]" : "text-[#3B534E]/60"
                }`}>
                  {s === 1 ? "Personal" : s === 2 ? "Empresa" : s === 3 ? "Sucursal" : "Fin"}
                </span>
              </div>
            ))}
          </div>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-5 text-left">
          
          {/* STEP 1: Personal Credentials */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300">
              <h3 className="text-sm font-bold text-[#0F6E56] uppercase tracking-wider border-b border-neutral-100 pb-2">
                Paso 1: Datos Personales
              </h3>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nombre Completo">
                  <input className="ps-input" placeholder="Juan Pérez" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </Field>
                <Field label="Correo Electrónico">
                  <input className="ps-input" type="email" placeholder="j.perez@empresa.com" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </Field>
              </div>

              <Field label="Contraseña Segura">
                <div className="relative">
                  <input
                    className="ps-input pr-10"
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary">
                    <span className="material-symbols-outlined">{showPw ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-variant">
                  <div className="h-full transition-all duration-500"
                    style={{ width: meter.w, background: meter.color }} />
                </div>
                <p className="mt-1 flex justify-between text-[10px] font-medium text-on-surface-variant">
                  <span>Mín. 12 caracteres</span>
                  <span style={{ color: meter.color }} className="uppercase">Seguridad: {meter.label}</span>
                </p>
              </Field>
            </div>
          )}

          {/* STEP 2: Company Details */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300">
              <h3 className="text-sm font-bold text-[#0F6E56] uppercase tracking-wider border-b border-neutral-100 pb-2">
                Paso 2: Información de la Empresa
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nombre de la Empresa">
                  <div className="relative">
                    <input
                      className="ps-input w-full"
                      placeholder="Ej. Nova Corp"
                      value={companyInput}
                      onChange={(e) => {
                        setCompanyInput(e.target.value);
                        if (selectedCompany && selectedCompany.nombre !== e.target.value) {
                          setSelectedCompany(null);
                        }
                      }}
                      required
                    />
                    
                    {/* suggestions */}
                    {companyMatches.length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto rounded-xl border border-[#CBD6D4] bg-white shadow-lg">
                        {companyMatches.map(co => (
                          <button
                            key={co.id}
                            type="button"
                            onClick={() => {
                              setSelectedCompany(co);
                              setCompanyInput(co.nombre);
                            }}
                            className="w-full px-4 py-2 text-left text-xs text-[#122A25] hover:bg-[#EAEFEF] transition-colors cursor-pointer border-b border-neutral-100 last:border-0"
                          >
                            {co.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>

                <Field label="NIT (Nº Identificación Tributaria)">
                  <input
                    className="ps-input"
                    placeholder="Escriba el NIT"
                    value={companyDetails.nit}
                    onChange={(e) => setCompanyDetails({ ...companyDetails, nit: e.target.value })}
                    disabled={isExistingCompany}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Dominio Web">
                  <input
                    className="ps-input"
                    placeholder="ejemplo.com"
                    value={companyDetails.dominio}
                    onChange={(e) => setCompanyDetails({ ...companyDetails, dominio: e.target.value })}
                    disabled={isExistingCompany}
                  />
                </Field>

                <Field label="Razón Social">
                  <input
                    className="ps-input"
                    placeholder="Razón Social Legal"
                    value={companyDetails.razonSocial}
                    onChange={(e) => setCompanyDetails({ ...companyDetails, razonSocial: e.target.value })}
                    disabled={isExistingCompany}
                  />
                </Field>
              </div>

              <div className="mt-1">
                {companyInput.trim() && (
                  isExistingCompany ? (
                    <span className="text-[10px] text-[#0F6E56] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      Empresa existente seleccionada
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#BA7517] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">sparkles</span>
                      Empresa nueva (se registrará legalmente)
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Branch details */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300">
              <h3 className="text-sm font-bold text-[#0F6E56] uppercase tracking-wider border-b border-neutral-100 pb-2">
                Paso 3: Sucursal y Geolocalización
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nombre de Sucursal">
                  <div className="relative">
                    <input
                      className="ps-input w-full"
                      placeholder="Ej. La Paz Oficina"
                      value={branchInput}
                      onChange={(e) => {
                        setBranchInput(e.target.value);
                        if (selectedBranch && selectedBranch.nombre !== e.target.value) {
                          setSelectedBranch(null);
                        }
                      }}
                      required
                    />

                    {/* suggestions */}
                    {branchMatches.length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto rounded-xl border border-[#CBD6D4] bg-white shadow-lg">
                        {branchMatches.map(br => (
                          <button
                            key={br.id}
                            type="button"
                            onClick={() => {
                              setSelectedBranch(br);
                              setBranchInput(br.nombre);
                            }}
                            className="w-full px-4 py-2 text-left text-xs text-[#122A25] hover:bg-[#EAEFEF] transition-colors cursor-pointer border-b border-neutral-100 last:border-0"
                          >
                            {br.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>

                <Field label="Dirección Física">
                  <input
                    className="ps-input"
                    placeholder="Calle, Edificio y Número"
                    value={branchDetails.direccion}
                    onChange={(e) => setBranchDetails({ ...branchDetails, direccion: e.target.value })}
                    disabled={isExistingBranch}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Latitud">
                  <input
                    type="number"
                    step="any"
                    className="ps-input"
                    value={branchDetails.latitude}
                    onChange={(e) => setBranchDetails({ ...branchDetails, latitude: Number(e.target.value) })}
                    disabled={isExistingBranch}
                    required
                  />
                </Field>

                <Field label="Longitud">
                  <input
                    type="number"
                    step="any"
                    className="ps-input"
                    value={branchDetails.longitude}
                    onChange={(e) => setBranchDetails({ ...branchDetails, longitude: Number(e.target.value) })}
                    disabled={isExistingBranch}
                    required
                  />
                </Field>
              </div>

              <div className="mt-1">
                {branchInput.trim() && (
                  isExistingBranch ? (
                    <span className="text-[10px] text-[#0F6E56] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      Sucursal existente seleccionada
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#BA7517] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">sparkles</span>
                      Nueva Sucursal (se creará geolocalizada)
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Review and Submit */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300">
              <h3 className="text-sm font-bold text-[#0F6E56] uppercase tracking-wider border-b border-neutral-100 pb-2">
                Paso 4: Revisión y Confirmación
              </h3>
              
              <div className="bg-[#EAEFEF] border border-[#CBD6D4] rounded-2xl p-4 space-y-3.5 text-xs text-[#3B534E]">
                <div>
                  <span className="font-bold text-[#122A25] block uppercase tracking-wider text-[9px] text-[#0F6E56]">Representante Legal</span>
                  <span className="font-semibold">{form.name} ({form.email})</span>
                </div>
                <div className="h-px bg-[#CBD6D4]/50" />
                <div>
                  <span className="font-bold text-[#122A25] block uppercase tracking-wider text-[9px] text-[#0F6E56]">Empresa a Registrar</span>
                  <span className="font-semibold block">{companyInput}</span>
                  <span className="text-[10px] block opacity-85">NIT: {companyDetails.nit} | Web: {companyDetails.dominio}</span>
                </div>
                <div className="h-px bg-[#CBD6D4]/50" />
                <div>
                  <span className="font-bold text-[#122A25] block uppercase tracking-wider text-[9px] text-[#0F6E56]">Sucursal / Almacén Inicial</span>
                  <span className="font-semibold block">{branchInput}</span>
                  <span className="text-[10px] block opacity-85">{branchDetails.direccion}</span>
                  <span className="text-[10px] block opacity-85">Ubicación: {branchDetails.latitude}, {branchDetails.longitude}</span>
                </div>
              </div>

              <label className="mt-2 flex items-start gap-2 text-[12px] text-on-surface-variant">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-[#CBD6D4] bg-white text-[#0F6E56] focus:ring-[#0F6E56]"
                  checked={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.checked })}
                  required
                />
                <span>
                  Confirmo que todos los datos legales son correctos y acepto los <a href="#" className="text-[#0F6E56] hover:underline font-semibold">Términos de Servicio</a> de Nexori.
                </span>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4 border-t border-[#CBD6D4]/40 pt-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-xl border border-[#CBD6D4] hover:border-[#0F6E56] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#3B534E] hover:text-[#0F6E56] transition bg-white cursor-pointer"
              >
                Atrás
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={
                  (step === 1 && !isStep1Valid) ||
                  (step === 2 && !isStep2Valid) ||
                  (step === 3 && !isStep3Valid)
                }
                className="rounded-xl bg-[#0F6E56] hover:bg-[#0A4A3A] disabled:opacity-50 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition flex items-center gap-2 cursor-pointer shadow-sm ml-auto"
              >
                Siguiente
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={!isStep4Valid} 
                className="rounded-xl bg-[#BA7517] hover:bg-[#A36310] disabled:opacity-50 px-8 py-3 text-xs font-bold uppercase tracking-wider text-white transition flex items-center gap-2 cursor-pointer shadow-md ml-auto"
              >
                <span>{submitting ? "Registrando..." : "Confirmar y Registrar"}</span>
                <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
              </button>
            )}
          </div>

          <p className="text-center text-[12px] text-on-surface-variant pt-2">
            ¿Ya tiene una cuenta?{" "}
            <Link to="/login" className="font-bold text-[#0F6E56] hover:underline">Iniciar Sesión</Link>
          </p>
        </form>
      </div>

      <SecurityFooter />
    </AuthShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 w-full text-left">
      <label className="ps-label px-1 text-xs font-bold text-[#3B534E] uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
