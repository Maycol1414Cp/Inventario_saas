import SectionCard from "../SectionCard";

const prettyTipo = (t) => {
  const v = String(t || "").toLowerCase();
  if (v === "fisica") return "Física";
  if (v === "virtual") return "Virtual";
  return t || "-";
};

const prettyHorario = (h) => {
  const v = String(h || "").trim();
  if (!v) return "-";
  if (v.toLowerCase() === "no aplica" || v.toLowerCase() === "no disponible") return "No aplica";
  return v;
};

const prettyDireccion = (d) => {
  const v = String(d || "").trim();
  if (!v) return "-";
  if (v.toLowerCase() === "no aplica" || v.toLowerCase() === "no disponible") return "No aplica";
  return v;
};

const SuperUsuarioMicroempresas = ({ items, onDeactivate, onActivate }) => (
  <SectionCard title="Microempresas">
    <div className="data-list">
      {items.length === 0 && <p className="muted">Sin microempresas registradas.</p>}

      {items.map((item) => (
        <div className="data-row" key={item.tenant_id}>
          <div>
            <div style={{ fontWeight: 700 }}>{item.nombre}</div>
            <div className="muted">{item.email}</div>

            {/* ✅ NUEVO */}
            <div className="muted">Tipo: {prettyTipo(item.tipo_tienda)}</div>

            {/* opcional */}
            <div className="muted">Dirección: {prettyDireccion(item.direccion)}</div>
            <div className="muted">Horario: {prettyHorario(item.horario_atencion)}</div>
          </div>

          <div className="row-actions">
            <span className="muted">{item.estado}</span>

            {item.estado === "activo" && (
              <button
                type="button"
                className="danger-button"
                onClick={() => onDeactivate(item.tenant_id)}
              >
                Inactivar
              </button>
            )}

            {item.estado === "inactivo" && (
              <button
                type="button"
                className="ghost-button"
                onClick={() => onActivate(item.tenant_id)}
              >
                Activar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  </SectionCard>
);

export default SuperUsuarioMicroempresas;
