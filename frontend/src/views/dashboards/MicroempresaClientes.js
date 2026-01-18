// src/views/dashboards/MicroempresaClientes.js
import React, { useEffect, useMemo, useState } from "react";
import SectionCard from "../SectionCard";

/*
  MicroempresaClientes
  - Tabla con columnas (similar a superusuario).
  - Búsqueda por nombre/email/razón social.
  - Checkbox "Mostrar todos" incluye inactivos.
  - Registrar cliente: pide password SOLO aquí (backend lo hashea).
  - Editar cliente inline en tabla: NO pide password.
  - Cambiar estado (PATCH activate/deactivate) con colores y botones Activar/Inactivar.
*/

async function apiGet(path) {
  const res = await fetch(path, { method: "GET", credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

async function apiPut(path, body) {
  const res = await fetch(path, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

async function apiPatch(path) {
  const res = await fetch(path, { method: "PATCH", credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

const fullName = (c) =>
  [c?.nombre, c?.apellido_paterno, c?.apellido_materno].filter(Boolean).join(" ");

const estadoStyle = (estado) => ({
  fontWeight: 600,
  color: (estado || "").toLowerCase() === "activo" ? "green" : "red",
});

const cell = {
  padding: "10px 12px",
  textAlign: "center",
  verticalAlign: "middle",
  borderBottom: "1px solid rgba(0,0,0,0.08)",
};

const headCell = {
  ...cell,
  fontWeight: 700,
  borderBottom: "1px solid rgba(0,0,0,0.14)",
};

export default function MicroempresaClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState("");

  // Formulario SOLO para registro
  const [showRegister, setShowRegister] = useState(false);

  // Edición inline SOLO en tabla
  const [editingId, setEditingId] = useState(null);

  // Registro: incluye password
  const [registerForm, setRegisterForm] = useState({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    email: "",
    password: "",
    es_empresa: false,
    razon_social: "",
    es_generico: false,
  });

  // Edición: sin password
  const [editForm, setEditForm] = useState({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    email: "",
    es_empresa: false,
    razon_social: "",
    es_generico: false,
  });

  const normalize = (v) => (v || "").toString().toLowerCase().trim();

  const loadClientes = async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await apiGet("/api/clientes");
      const raw = data.clientes || [];
      const normalized = raw.map((c) => ({
        ...c,
        id_cliente: c.id_cliente ?? c.id,
      }));
      setClientes(normalized);
    } catch (e) {
      setMessage(e.message);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, []);

  const filteredClientes = useMemo(() => {
    const query = normalize(q);

    return (clientes || [])
      .filter((c) => (showAll ? true : normalize(c.estado) === "activo"))
      .filter((c) => {
        if (!query) return true;
        const haystack = [
          c.nombre,
          c.apellido_paterno,
          c.apellido_materno,
          c.email,
          c.razon_social,
        ]
          .filter(Boolean)
          .map(normalize)
          .join(" ");
        return haystack.includes(query);
      });
  }, [clientes, showAll, q]);

  const onToggleShowAll = (e) => setShowAll(e.target.checked);

  const resetRegisterForm = () => {
    setRegisterForm({
      nombre: "",
      apellido_paterno: "",
      apellido_materno: "",
      email: "",
      password: "",
      es_empresa: false,
      razon_social: "",
      es_generico: false,
    });
  };

  const onToggleRegister = () => {
    setMessage("");
    setEditingId(null); // si estaba editando, cancelamos edición
    setShowRegister((prev) => {
      const next = !prev;
      if (next) resetRegisterForm();
      return next;
    });
  };

  const onRegisterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRegisterForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateCommon = (payload) => {
    if (!payload.nombre || !payload.apellido_paterno || !payload.apellido_materno) {
      return "Completa nombre y apellidos";
    }
    if (!payload.email) return "Email requerido";
    if (payload.es_empresa && !payload.razon_social) return "Razón social requerida si es empresa";
    return "";
  };

  const onRegisterSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const payload = {
      nombre: (registerForm.nombre || "").trim(),
      apellido_paterno: (registerForm.apellido_paterno || "").trim(),
      apellido_materno: (registerForm.apellido_materno || "").trim(),
      email: (registerForm.email || "").trim(),
      password: registerForm.password || "",
      es_empresa: Boolean(registerForm.es_empresa),
      razon_social: registerForm.es_empresa ? (registerForm.razon_social || "").trim() : "",
      es_generico: Boolean(registerForm.es_generico),
    };

    const err = validateCommon(payload);
    if (err) return setMessage(err);
    if (!payload.password) return setMessage("Password requerido");

    try {
      await apiPost("/api/clientes", payload);
      setMessage("Cliente registrado");
      resetRegisterForm();
      setShowRegister(false);
      await loadClientes();
    } catch (e2) {
      setMessage(e2.message);
    }
  };

  const startEdit = (cliente) => {
    setMessage("");
    setShowRegister(false); // clave: al editar NO se abre registro
    setEditingId(cliente.id_cliente);

    const razonSocial = cliente.razon_social || "";
    setEditForm({
      nombre: cliente.nombre || "",
      apellido_paterno: cliente.apellido_paterno || "",
      apellido_materno: cliente.apellido_materno || "",
      email: cliente.email || "",
      es_empresa: Boolean(razonSocial),
      razon_social: razonSocial,
      es_generico: Boolean(cliente.es_generico),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setMessage("");
    setEditForm({
      nombre: "",
      apellido_paterno: "",
      apellido_materno: "",
      email: "",
      es_empresa: false,
      razon_social: "",
      es_generico: false,
    });
  };

  const onEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const submitEdit = async (cliente) => {
    setMessage("");

    const id = cliente?.id_cliente ?? cliente?.id;
    if (!id) return setMessage("No se encontró el id del cliente");

    const payload = {
      nombre: (editForm.nombre || "").trim(),
      apellido_paterno: (editForm.apellido_paterno || "").trim(),
      apellido_materno: (editForm.apellido_materno || "").trim(),
      email: (editForm.email || "").trim(),
      es_empresa: Boolean(editForm.es_empresa),
      razon_social: editForm.es_empresa ? (editForm.razon_social || "").trim() : "",
      es_generico: Boolean(editForm.es_generico),
    };

    const err = validateCommon(payload);
    if (err) return setMessage(err);

    try {
      // Importante: NO enviamos password aquí
      await apiPut(`/api/clientes/${id}`, payload);
      setMessage("Cliente actualizado");
      cancelEdit();
      await loadClientes();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const toggleEstado = async (cliente) => {
    setMessage("");

    const id = cliente?.id_cliente ?? cliente?.id;
    if (!id) return setMessage("No se encontró el id del cliente");

    try {
      const estado = (cliente.estado || "").toLowerCase();
      if (estado === "activo") {
        await apiPatch(`/api/clientes/${id}/deactivate`);
      } else {
        await apiPatch(`/api/clientes/${id}/activate`);
      }
      await loadClientes();
    } catch (e) {
      setMessage(e.message);
    }
  };

  return (
    <SectionCard title="Gestión de clientes">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={onToggleRegister}>
            {showRegister ? "Cerrar" : "Registrar cliente"}
          </button>

          <input
            placeholder="Buscar por nombre, email, razón social"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 260 }}
          />
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={showAll} onChange={onToggleShowAll} />
          Mostrar todos
        </label>
      </div>

      {message ? (
        <p className="muted" style={{ marginTop: 12 }}>
          {message}
        </p>
      ) : null}

      {showRegister && (
        <form onSubmit={onRegisterSubmit} style={{ marginTop: 16 }}>
          <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            <input
              name="nombre"
              placeholder="Nombre"
              value={registerForm.nombre}
              onChange={onRegisterChange}
            />
            <input
              name="apellido_paterno"
              placeholder="Apellido paterno"
              value={registerForm.apellido_paterno}
              onChange={onRegisterChange}
            />
            <input
              name="apellido_materno"
              placeholder="Apellido materno"
              value={registerForm.apellido_materno}
              onChange={onRegisterChange}
            />

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                name="es_empresa"
                checked={registerForm.es_empresa}
                onChange={onRegisterChange}
              />
              Es empresa
            </label>

            {registerForm.es_empresa && (
              <input
                name="razon_social"
                placeholder="Razón social"
                value={registerForm.razon_social}
                onChange={onRegisterChange}
              />
            )}

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                name="es_generico"
                checked={registerForm.es_generico}
                onChange={onRegisterChange}
              />
              Cliente genérico
            </label>

            <input
              name="email"
              placeholder="Email"
              value={registerForm.email}
              onChange={onRegisterChange}
            />

            <input
              name="password"
              placeholder="Password"
              type="password"
              value={registerForm.password}
              onChange={onRegisterChange}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit">Guardar</button>
              <button
                type="button"
                onClick={() => {
                  resetRegisterForm();
                  setShowRegister(false);
                  setMessage("");
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      <div style={{ marginTop: 16 }}>
        {loading ? (
          <p className="muted">Cargando...</p>
        ) : filteredClientes.length === 0 ? (
          <p className="muted">
            {showAll ? "No hay clientes registrados." : "No hay clientes activos."}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={headCell}>Nombre completo</th>
                  <th style={headCell}>Razón social</th>
                  <th style={headCell}>Email</th>
                  <th style={headCell}>Estado</th>
                  <th style={headCell}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredClientes.map((c) => {
                  const id = c.id_cliente;
                  const isEditing = editingId != null && String(editingId) === String(id);

                  return (
                    <tr key={id}>
                      {!isEditing ? (
                        <>
                          <td style={cell}>{fullName(c) || "-"}</td>
                          <td style={cell}>{c.razon_social || "-"}</td>
                          <td style={cell}>{c.email}</td>
                          <td style={cell}>
                            <span style={estadoStyle(c.estado)}>{c.estado}</span>
                          </td>
                          <td style={cell}>
                            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                              <button type="button" onClick={() => startEdit(c)}>
                                Editar
                              </button>

                              {c.estado === "activo" ? (
                                <button
                                  type="button"
                                  className="danger-button"
                                  onClick={() => toggleEstado(c)}
                                >
                                  Inactivar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="ghost-button"
                                  onClick={() => toggleEstado(c)}
                                >
                                  Activar
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={cell}>
                            <div style={{ display: "grid", gap: 8 }}>
                              <input
                                name="nombre"
                                placeholder="Nombre"
                                value={editForm.nombre}
                                onChange={onEditChange}
                              />
                              <input
                                name="apellido_paterno"
                                placeholder="Apellido paterno"
                                value={editForm.apellido_paterno}
                                onChange={onEditChange}
                              />
                              <input
                                name="apellido_materno"
                                placeholder="Apellido materno"
                                value={editForm.apellido_materno}
                                onChange={onEditChange}
                              />
                            </div>
                          </td>

                          <td style={cell}>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                                <input
                                  type="checkbox"
                                  name="es_empresa"
                                  checked={editForm.es_empresa}
                                  onChange={onEditChange}
                                />
                                Es empresa
                              </label>

                              {editForm.es_empresa ? (
                                <input
                                  name="razon_social"
                                  placeholder="Razón social"
                                  value={editForm.razon_social}
                                  onChange={onEditChange}
                                />
                              ) : (
                                <span className="muted">-</span>
                              )}

                              <label style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                                <input
                                  type="checkbox"
                                  name="es_generico"
                                  checked={editForm.es_generico}
                                  onChange={onEditChange}
                                />
                                Cliente genérico
                              </label>
                            </div>
                          </td>

                          <td style={cell}>
                            <input
                              name="email"
                              placeholder="Email"
                              value={editForm.email}
                              onChange={onEditChange}
                              style={{ width: "100%" }}
                            />
                          </td>

                          <td style={cell}>
                            <span style={estadoStyle(c.estado)}>{c.estado}</span>
                          </td>

                          <td style={cell}>
                            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                              <button type="button" onClick={() => submitEdit(c)}>
                                Guardar
                              </button>
                              <button type="button" className="ghost-button" onClick={cancelEdit}>
                                Cancelar
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
