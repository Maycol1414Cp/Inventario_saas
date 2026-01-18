import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";

import SectionCard from "../SectionCard";
import {
  fetchPlans,
  getOnboardingStatus,
  startMicroempresaOnboarding,
  submitMicroempresaPayment,
} from "../../controllers/subscriptionController";

const storage = {
  get: (k, fallback = "") => localStorage.getItem(k) || fallback,
  set: (k, v) => localStorage.setItem(k, String(v ?? "")),
  del: (k) => localStorage.removeItem(k),
};

// keys onboarding
const KEY_SIGNUP_ID = "onb_signup_id";
const KEY_TENANT_ID = "onb_tenant_id";
const KEY_EMAIL = "onb_email";
const KEY_PLAN_ID = "onb_plan_id";
const KEY_PLAN_NAME = "onb_plan_name";
const KEY_PLAN_PRICE = "onb_plan_price";

// tipo tienda + draft
const KEY_TIPO_TIENDA = "onb_tipo_tienda";
const KEY_FORM_DRAFT = "onb_form_draft";

// placeholders para “virtual”
const VIRTUAL_DIRECCION = "Sin tienda física (virtual)";
const VIRTUAL_HORARIO = "Atención online";

// helpers
const getInt = (key) => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : null;
};

const clearOnboardingStorage = () => {
  [
    KEY_SIGNUP_ID,
    KEY_TENANT_ID,
    KEY_EMAIL,
    KEY_PLAN_ID,
    KEY_PLAN_NAME,
    KEY_PLAN_PRICE,
    KEY_TIPO_TIENDA,
    KEY_FORM_DRAFT,
  ].forEach((k) => localStorage.removeItem(k));
};

const initialForm = {
  tipo_tienda: "fisica", // "fisica" | "virtual"
  nombre: "",
  logo_url: "",
  direccion: "",
  horario_inicio: "",
  horario_fin: "",
  nombre_propietario: "",
  apellido_paterno_propietario: "",
  apellido_materno_propietario: "",
  email: "",
  password: "",
};

export default function MicroempresaSignupWizard() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ ids robustos (evita Boolean("null") / "undefined")
  const signupIdNum = getInt(KEY_SIGNUP_ID);
  const tenantIdNum = getInt(KEY_TENANT_ID);

  // seleccion plan
  const selectedPlanId = storage.get(KEY_PLAN_ID, "");
  const selectedPlanName = storage.get(KEY_PLAN_NAME, "");
  const selectedPlanPrice = storage.get(KEY_PLAN_PRICE, "");

  const isEditMode = Boolean(signupIdNum);

  // form paso 1 (con draft)
  const [form, setForm] = useState(() => {
    const savedEmail = storage.get(KEY_EMAIL, "");
    const savedTipo = storage.get(KEY_TIPO_TIENDA, "fisica");

    let draft = {};
    try {
      const raw = storage.get(KEY_FORM_DRAFT, "");
      draft = raw ? JSON.parse(raw) : {};
    } catch {
      draft = {};
    }

    return {
      ...initialForm,
      ...draft,
      // nunca recuperamos password desde storage
      password: "",
      tipo_tienda: draft.tipo_tienda || savedTipo || "fisica",
      email: draft.email || savedEmail || "",
    };
  });

  // planes paso 2
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);

  // estado general
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // status
  const [statusLoading, setStatusLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const onChange = (e) => {
    const { name, value } = e.target;

    setForm((p) => {
      const next = { ...p, [name]: value };

      // si cambia a virtual, limpiamos campos físicos del UI
      if (name === "tipo_tienda" && value === "virtual") {
        next.direccion = "";
        next.horario_inicio = "";
        next.horario_fin = "";
      }

      // ✅ guardamos draft PERO NUNCA password
      const draftToStore = { ...next, password: "" };
      storage.set(KEY_FORM_DRAFT, JSON.stringify(draftToStore));
      storage.set(KEY_TIPO_TIENDA, next.tipo_tienda);
      if (name === "email") storage.set(KEY_EMAIL, value);

      return next;
    });
  };

  const validateSchedule = () => {
    if (!form.horario_inicio || !form.horario_fin) return false;
    return form.horario_inicio < form.horario_fin;
  };

  // QR payload
  const qrValue = useMemo(() => {
    const payload = {
      app: "microempresa-saas",
      tenant_id: tenantIdNum || null,
      signup_id: signupIdNum || null,
      plan_id: selectedPlanId || null,
      plan: selectedPlanName || null,
      amount: selectedPlanPrice || null,
      email: storage.get(KEY_EMAIL, form.email).trim() || null,
      ts: new Date().toISOString(),
    };
    return JSON.stringify(payload);
  }, [
    tenantIdNum,
    signupIdNum,
    selectedPlanId,
    selectedPlanName,
    selectedPlanPrice,
    form.email,
  ]);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    setMessage("");
    try {
      const { response, data } = await fetchPlans();
      if (!response.ok) {
        setMessage(data.error || "No se pudo cargar planes.");
        return;
      }
      setPlans(data.plans || []);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    const isPlanStep = location.pathname.includes("/registro/microempresa/plan");
    if (isPlanStep && plans.length === 0 && !plansLoading) {
      loadPlans();
    }
  }, [location.pathname, plans.length, plansLoading, loadPlans]);

  const refreshStatus = async () => {
    if (!signupIdNum) return;
    setStatusLoading(true);
    try {
      const { response, data } = await getOnboardingStatus(signupIdNum);
      if (response.ok) setStatus(data);
    } finally {
      setStatusLoading(false);
    }
  };

  // ✅ BLOQUEO REAL: no dejar entrar a /espera si NO hay comprobante
  useEffect(() => {
    const isWait = location.pathname.includes("/registro/microempresa/espera");
    if (!isWait) return;

    if (!signupIdNum) {
      navigate("/registro/microempresa/datos", { replace: true });
      return;
    }

    (async () => {
      setStatusLoading(true);
      setMessage("");
      try {
        const { response, data } = await getOnboardingStatus(signupIdNum);
        if (!response.ok) {
          // si el signup_id ya no existe en BD, reseteamos y mandamos al paso 1
          const err = (data?.error || "").toLowerCase();
          if (err.includes("signup_id no encontrado")) {
            clearOnboardingStorage();
            navigate("/registro/microempresa/datos", { replace: true });
            return;
          }

          setMessage(data.error || "No se pudo consultar el estado.");
          navigate("/registro/microempresa/datos", { replace: true });
          return;
        }

        setStatus(data);

        const tienePlan = Boolean(data.id_plan);
        const tieneComprobante = Boolean(data.tiene_comprobante);
        const estado = (data.estado || "").toLowerCase();

        if (!tieneComprobante || estado === "borrador" || estado === "plan_seleccionado") {
          if (!tienePlan) navigate("/registro/microempresa/plan", { replace: true });
          else navigate("/registro/microempresa/pago", { replace: true });
        }
      } finally {
        setStatusLoading(false);
      }
    })();
  }, [location.pathname, signupIdNum, navigate]);

  // =========================
  // PASO 1: crear/editar onboarding
  // =========================
  const handleStart = async (e) => {
    e.preventDefault();
    setMessage("");

    const tipo = form.tipo_tienda;

    // solo validamos dirección/horario si es física
    if (tipo === "fisica") {
      if (!form.direccion.trim()) {
        setMessage("Dirección requerida para tienda física.");
        return;
      }
      if (!validateSchedule()) {
        setMessage("Horario inválido: el fin debe ser mayor al inicio.");
        return;
      }
    }

    // password obligatorio solo al crear
    if (!isEditMode && !form.password) {
      setMessage("Password requerido.");
      return;
    }

    setLoading(true);
    try {
      const direccionFinal =
        tipo === "virtual" ? VIRTUAL_DIRECCION : form.direccion.trim();

      const horarioFinal =
        tipo === "virtual"
          ? VIRTUAL_HORARIO
          : `${form.horario_inicio} - ${form.horario_fin}`;

      const payloadBase = {
        tipo_tienda: tipo,
        nombre: form.nombre.trim(),
        logo_url: (form.logo_url || "").trim(),
        direccion: direccionFinal,
        horario_atencion: horarioFinal,
        nombre_propietario: form.nombre_propietario.trim(),
        apellido_paterno_propietario: form.apellido_paterno_propietario.trim(),
        apellido_materno_propietario: form.apellido_materno_propietario.trim(),
        email: form.email.trim(),
        password: form.password || "",
      };

      const payload = {
        ...(signupIdNum ? { signup_id: signupIdNum } : {}),
        ...payloadBase,
      };

      const first = await startMicroempresaOnboarding(payload);

      // ✅ si el signup_id es viejo (BD reiniciada), auto-resetea y reintenta
      if (!first.response.ok) {
        const err = (first.data?.error || "").toLowerCase();
        if (err.includes("signup_id no encontrado")) {
          // limpiamos solo ids + planes; dejamos draft para no perder datos
          storage.del(KEY_SIGNUP_ID);
          storage.del(KEY_TENANT_ID);
          storage.del(KEY_PLAN_ID);
          storage.del(KEY_PLAN_NAME);
          storage.del(KEY_PLAN_PRICE);

          const retry = await startMicroempresaOnboarding(payloadBase);
          if (!retry.response.ok) {
            setMessage(retry.data.error || "No se pudo guardar los datos.");
            return;
          }

          storage.set(KEY_SIGNUP_ID, retry.data.signup_id || "");
          storage.set(KEY_TENANT_ID, retry.data.tenant_id || "");
          storage.set(KEY_EMAIL, payloadBase.email);
          storage.set(KEY_TIPO_TIENDA, tipo);
          storage.set(KEY_FORM_DRAFT, JSON.stringify({ ...form, password: "" }));

          setMessage(retry.data.message || "Listo. Ahora selecciona un plan.");
          navigate("/registro/microempresa/plan");
          return;
        }

        setMessage(first.data.error || "No se pudo guardar los datos.");
        return;
      }

      const { data } = first;

      storage.set(KEY_SIGNUP_ID, data.signup_id || "");
      storage.set(KEY_TENANT_ID, data.tenant_id || "");
      storage.set(KEY_EMAIL, payloadBase.email);
      storage.set(KEY_TIPO_TIENDA, tipo);
      storage.set(KEY_FORM_DRAFT, JSON.stringify({ ...form, password: "" }));

      setMessage(data.message || "Listo. Ahora selecciona un plan.");
      navigate("/registro/microempresa/plan");
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    clearOnboardingStorage();
    setPlans([]);
    setMessage("");
    setStatus(null);
    setForm({ ...initialForm, email: "" });
    navigate("/registro/microempresa/datos", { replace: true });
  };

  // =========================
  // PASO 2: elegir plan
  // =========================
  const selectPlan = (plan) => {
    storage.set(KEY_PLAN_ID, plan.id_plan);
    storage.set(KEY_PLAN_NAME, plan.nombre);
    storage.set(KEY_PLAN_PRICE, plan.precio);
    setMessage("");
  };

  const continueToPayment = () => {
    if (!storage.get(KEY_PLAN_ID, "")) {
      setMessage("Selecciona un plan para continuar.");
      return;
    }
    navigate("/registro/microempresa/pago");
  };

  // =========================
  // PASO 3: subir comprobante
  // =========================
  const [file, setFile] = useState(null);

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!signupIdNum) {
      setMessage("No hay registro iniciado (signup_id). Vuelve al paso 1.");
      return;
    }
    if (!selectedPlanId) {
      setMessage("Selecciona un plan (paso 2).");
      return;
    }
    if (!file) {
      setMessage("Sube un comprobante (PDF/JPG/PNG).");
      return;
    }

    setLoading(true);
    try {
      const { response, data } = await submitMicroempresaPayment({
        signup_id: signupIdNum,
        id_plan: selectedPlanId,
        file,
      });

      if (!response.ok) {
        const err = (data?.error || "").toLowerCase();
        if (err.includes("signup_id no encontrado")) {
          setMessage("Tu registro expiró o se reinició la base de datos. Vuelve a empezar.");
          return;
        }
        setMessage(data.error || "No se pudo enviar el comprobante.");
        return;
      }

      setMessage(data.message || "Enviado. Tu cuenta quedará en espera de validación.");
      navigate("/registro/microempresa/espera");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="datos" replace />} />

      {/* PASO 1 */}
      <Route
        path="datos"
        element={
          <div className="container">
            <SectionCard
              title={`Registro Microempresa - Paso 1${isEditMode ? " (editar)" : ""}`}
              description="Completa los datos básicos de la microempresa."
            >
              <form className="card" onSubmit={handleStart}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                  <button type="button" className="ghost-button" onClick={resetWizard}>
                    Empezar de nuevo
                  </button>
                  {isEditMode && (
                    <span className="muted" style={{ alignSelf: "center" }}>
                      signup_id: <strong>{signupIdNum}</strong>
                    </span>
                  )}
                </div>

                {/* tipo tienda */}
                <div className="radio-group" style={{ marginBottom: 10 }}>
                  <span>Tipo de tienda</span>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="tipo_tienda"
                      value="fisica"
                      checked={form.tipo_tienda === "fisica"}
                      onChange={onChange}
                    />
                    Física
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="tipo_tienda"
                      value="virtual"
                      checked={form.tipo_tienda === "virtual"}
                      onChange={onChange}
                    />
                    Virtual
                  </label>
                </div>

                <label>
                  Nombre de microempresa
                  <input name="nombre" value={form.nombre} onChange={onChange} required />
                </label>

                <label>
                  Logo URL (opcional)
                  <input name="logo_url" type="url" value={form.logo_url} onChange={onChange} />
                </label>

                {form.tipo_tienda === "fisica" ? (
                  <>
                    <label>
                      Dirección
                      <input name="direccion" value={form.direccion} onChange={onChange} required />
                    </label>

                    <label>
                      Horario inicio
                      <input
                        name="horario_inicio"
                        type="time"
                        value={form.horario_inicio}
                        onChange={onChange}
                        required
                      />
                    </label>

                    <label>
                      Horario fin
                      <input
                        name="horario_fin"
                        type="time"
                        value={form.horario_fin}
                        onChange={onChange}
                        required
                      />
                    </label>
                  </>
                ) : (
                  <p className="muted" style={{ marginTop: 0 }}>
                    Como tu tienda es <strong>virtual</strong>, no necesitas dirección ni horarios.
                    Luego podrás añadir una tienda física desde tu perfil.
                  </p>
                )}

                <label>
                  Nombre del propietario
                  <input name="nombre_propietario" value={form.nombre_propietario} onChange={onChange} required />
                </label>

                <label>
                  Apellido paterno del propietario
                  <input
                    name="apellido_paterno_propietario"
                    value={form.apellido_paterno_propietario}
                    onChange={onChange}
                    required
                  />
                </label>

                <label>
                  Apellido materno del propietario
                  <input
                    name="apellido_materno_propietario"
                    value={form.apellido_materno_propietario}
                    onChange={onChange}
                    required
                  />
                </label>

                <label>
                  Email
                  <input name="email" type="email" value={form.email} onChange={onChange} required />
                </label>

                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={onChange}
                    required={!isEditMode}
                  />
                </label>

                <button type="submit" disabled={loading}>
                  {loading
                    ? "Guardando..."
                    : isEditMode
                    ? "Guardar cambios y continuar"
                    : "Continuar (elegir plan)"}
                </button>

                {message && (
                  <p
                    className={
                      message.toLowerCase().includes("no") ||
                      message.toLowerCase().includes("error")
                        ? "error"
                        : "muted"
                    }
                  >
                    {message}
                  </p>
                )}

                <div style={{ marginTop: 12 }}>
                  <Link className="link-button" to="/">
                    Volver al login
                  </Link>
                </div>
              </form>
            </SectionCard>
          </div>
        }
      />

      {/* PASO 2 */}
      <Route
        path="plan"
        element={
          <div className="container">
            <SectionCard title="Registro Microempresa - Paso 2" description="Selecciona el plan.">
              <div className="card">
                {!signupIdNum && (
                  <p className="error">
                    No hay registro iniciado. Vuelve al paso 1.
                    <div style={{ marginTop: 10 }}>
                      <Link className="link-button" to="/registro/microempresa/datos">
                        Ir al paso 1
                      </Link>
                    </div>
                  </p>
                )}

                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <button type="button" className="ghost-button" onClick={loadPlans} disabled={plansLoading}>
                    {plansLoading ? "Cargando..." : "Recargar planes"}
                  </button>

                  <Link className="link-button" to="/registro/microempresa/datos">
                    Volver
                  </Link>
                </div>

                {plans.length === 0 ? (
                  <p className="muted">{plansLoading ? "Cargando..." : "No hay planes activos."}</p>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {plans
                      .filter((p) => (p.estado || "").toLowerCase() === "activo")
                      .map((p) => {
                        const active = String(p.id_plan) === String(selectedPlanId);
                        const feats = Array.isArray(p.caracteristicas)
                          ? p.caracteristicas
                          : Array.isArray(p.features)
                          ? p.features
                          : [];

                        return (
                          <div
                            key={p.id_plan}
                            className="plan-card"
                            style={{
                              border: active ? "2px solid rgba(124,58,237,0.7)" : "1px solid rgba(0,0,0,0.08)",
                              borderRadius: 14,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                padding: 14,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                background: "linear-gradient(90deg, rgba(30,64,175,0.9), rgba(124,58,237,0.9))",
                                color: "white",
                              }}
                            >
                              <div style={{ fontWeight: 900, fontSize: 26 }}>{p.nombre}</div>
                              <div style={{ fontSize: 18 }}>
                                Bs <strong>{p.precio}</strong>
                              </div>
                            </div>

                            <div style={{ padding: 14, background: "white" }}>
                              {feats.length > 0 ? (
                                <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
                                  {feats.map((f, idx) => (
                                    <li key={idx}>{f}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="muted" style={{ marginTop: 0 }}>
                                  Sin características registradas.
                                </p>
                              )}

                              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                                <button
                                  type="button"
                                  className={active ? "ghost-button" : "link-button"}
                                  onClick={() => selectPlan(p)}
                                >
                                  {active ? "Seleccionado" : "Elegir"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                <button type="button" style={{ marginTop: 12 }} onClick={continueToPayment} disabled={!signupIdNum}>
                  Continuar (pago + comprobante)
                </button>

                {message && <p className="error">{message}</p>}
              </div>
            </SectionCard>
          </div>
        }
      />

      {/* PASO 3 */}
      <Route
        path="pago"
        element={
          <div className="container">
            <SectionCard title="Registro Microempresa - Paso 3" description="Escanea el QR y sube tu comprobante.">
              <div className="card">
                {!signupIdNum || !selectedPlanId ? (
                  <p className="error">
                    Falta información. Vuelve al paso 1 y 2.
                    <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                      <Link className="link-button" to="/registro/microempresa/datos">
                        Paso 1
                      </Link>
                      <Link className="link-button" to="/registro/microempresa/plan">
                        Paso 2
                      </Link>
                    </div>
                  </p>
                ) : (
                  <>
                    <div className="muted" style={{ marginBottom: 10 }}>
                      Plan: <strong>{selectedPlanName}</strong> — Monto: <strong>{selectedPlanPrice}</strong>
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                      <div style={{ background: "white", padding: 12, borderRadius: 8 }}>
                        <QRCodeCanvas value={qrValue} size={220} />
                      </div>
                    </div>

                    <form onSubmit={handleSubmitPayment}>
                      <label>
                        Subir comprobante (PDF/JPG/PNG)
                        <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                      </label>

                      <button type="submit" disabled={loading}>
                        {loading ? "Enviando..." : "Enviar comprobante"}
                      </button>

                      {message && (
                        <p
                          className={
                            message.toLowerCase().includes("no") ||
                            message.toLowerCase().includes("error")
                              ? "error"
                              : "muted"
                          }
                        >
                          {message}
                        </p>
                      )}
                    </form>

                    <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                      <Link className="link-button" to="/registro/microempresa/plan">
                        Volver a planes
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </SectionCard>
          </div>
        }
      />

      {/* PASO 4 */}
      <Route
        path="espera"
        element={
          <div className="container">
            <SectionCard title="Cuenta en espera" description="Tu comprobante fue enviado. Un superusuario debe validar la cuenta.">
              <div className="card">
                {!signupIdNum ? (
                  <p className="error">No hay registro iniciado (signup_id).</p>
                ) : (
                  <>
                    <p className="muted">
                      ID de registro: <strong>{signupIdNum}</strong>
                    </p>

                    <button type="button" className="ghost-button" onClick={refreshStatus} disabled={statusLoading}>
                      {statusLoading ? "Consultando..." : "Consultar estado"}
                    </button>

                    {status && (
                      <div style={{ marginTop: 10 }}>
                        <div className="muted">
                          Estado: <strong>{status.estado || "pendiente"}</strong>
                        </div>
                        {status.message && <div className="muted">{status.message}</div>}
                      </div>
                    )}

                    {message && <p className="error">{message}</p>}

                    <div style={{ marginTop: 12 }}>
                      <Link className="link-button" to="/">
                        Ir al login
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </SectionCard>
          </div>
        }
      />
    </Routes>
  );
}
