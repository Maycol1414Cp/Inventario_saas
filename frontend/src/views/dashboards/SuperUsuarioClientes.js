import React, { useMemo, useState } from "react";
import SectionCard from "../SectionCard";

const buildFullName = (item) =>
  [item?.nombre, item?.apellido_paterno, item?.apellido_materno]
    .filter(Boolean)
    .join(" ");

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

const SuperUsuarioClientes = ({
  items,
  microempresas,
  onDeactivate,
  onActivate,
  onUpdate,
}) => {
  const [q, setQ] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    email: "",
    razon_social: "",
  });

  const normalize = (v) => (v || "").toString().toLowerCase().trim();

  const filtered = useMemo(() => {
    const query = normalize(q);

    return (items || [])
      .filter((c) => {
        if (!tenantFilter) return true;
        return String(c.tenant_id ?? "") === String(tenantFilter);
      })
      .filter((c) => {
        if (!query) return true;

        const haystack = [
          buildFullName(c),
          c.email,
          c.razon_social,
          String(c.tenant_id ?? ""),
          c.microempresa_nombre,
        ]
          .filter(Boolean)
          .map(normalize)
          .join(" ");

        return haystack.includes(query);
      });
  }, [items, q, tenantFilter]);

  const tenantNameById = useMemo(() => {
    const map = new Map();
    (microempresas || []).forEach((m) => map.set(String(m.tenant_id), m.nombre));
    return map;
  }, [microempresas]);

  const startEdit = (item) => {
    setEditingId(item.id ?? item.id_cliente);
    setForm({
      nombre: item.nombre || "",
      apellido_paterno: item.apellido_paterno || "",
      apellido_materno: item.apellido_materno || "",
      email: item.email || "",
      razon_social: item.razon_social || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      nombre: "",
      apellido_paterno: "",
      apellido_materno: "",
      email: "",
      razon_social: "",
    });
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitEdit = async (item) => {
    if (!onUpdate) return;

    const id = item.id ?? item.id_cliente;
    if (!id) return;

    const payload = {
      nombre: (form.nombre || "").trim(),
      apellido_paterno: (form.apellido_paterno || "").trim(),
      apellido_materno: (form.apellido_materno || "").trim(),
      razon_social: (form.razon_social || "").trim(),
      email: (form.email || "").trim(),
    };

    await onUpdate(id, payload);
    cancelEdit();
  };

  return (
    <SectionCard title="Clientes">
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            placeholder="Buscar por nombre, email, razón social"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 260 }}
          />

          <select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}>
            <option value="">Todas las microempresas</option>
            {(microempresas || []).map((m) => (
              <option key={m.tenant_id} value={m.tenant_id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="muted">{filtered.length} cliente(s)</div>
      </div>

      {filtered.length === 0 ? (
        <p className="muted">Sin clientes registrados.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                <th style={headCell}>Nombre</th>
                <th style={headCell}>Razón social</th>
                <th style={headCell}>Email</th>
                <th style={headCell}>Microempresa</th>
                <th style={headCell}>Estado</th>
                <th style={headCell}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((item) => {
                const id = item.id ?? item.id_cliente;
                const tenantId = item.tenant_id;

                const tenantName =
                  item.microempresa_nombre ||
                  (tenantId != null ? tenantNameById.get(String(tenantId)) : "") ||
                  "-";

                const isEditing = editingId != null && String(editingId) === String(id);

                return (
                  <tr key={id}>
                    {!isEditing ? (
                      <>
                        <td style={cell}>{buildFullName(item)}</td>
                        <td style={cell}>{item.razon_social || "-"}</td>
                        <td style={cell}>{item.email}</td>
                        <td style={cell}>
                          {tenantName} {tenantId != null ? `(#${tenantId})` : ""}
                        </td>
                        <td style={cell}>
                          <span style={estadoStyle(item.estado)}>{item.estado}</span>
                        </td>
                        <td style={cell}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                            <button type="button" onClick={() => startEdit(item)}>
                              Editar
                            </button>

                            {item.estado === "activo" ? (
                              <button
                                type="button"
                                className="danger-button"
                                onClick={() => onDeactivate(id)}
                              >
                                Inactivar
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="ghost-button"
                                onClick={() => onActivate(id)}
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
                              value={form.nombre}
                              onChange={onChange}
                            />
                            <input
                              name="apellido_paterno"
                              placeholder="Apellido paterno"
                              value={form.apellido_paterno}
                              onChange={onChange}
                            />
                            <input
                              name="apellido_materno"
                              placeholder="Apellido materno"
                              value={form.apellido_materno}
                              onChange={onChange}
                            />
                          </div>
                        </td>

                        <td style={cell}>
                          <input
                            name="razon_social"
                            placeholder="Razón social"
                            value={form.razon_social}
                            onChange={onChange}
                            style={{ width: "100%" }}
                          />
                        </td>

                        <td style={cell}>
                          <input
                            name="email"
                            placeholder="Email"
                            value={form.email}
                            onChange={onChange}
                            style={{ width: "100%" }}
                          />
                        </td>

                        <td style={cell}>
                          {tenantName} {tenantId != null ? `(#${tenantId})` : ""}
                        </td>

                        <td style={cell}>
                          <span style={estadoStyle(item.estado)}>{item.estado}</span>
                        </td>

                        <td style={cell}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                            <button type="button" onClick={() => submitEdit(item)}>
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
    </SectionCard>
  );
};

export default SuperUsuarioClientes;
