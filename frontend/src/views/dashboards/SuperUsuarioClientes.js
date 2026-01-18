import SectionCard from "../SectionCard";

const buildFullName = (item) =>
  [item?.nombre, item?.apellido_paterno, item?.apellido_materno]
    .filter(Boolean)
    .join(" ");

const SuperUsuarioClientes = ({ items, onDeactivate, onActivate }) => (
  <SectionCard title="Clientes">
    <div className="data-list">
      {items.length === 0 && <p className="muted">Sin clientes registrados.</p>}
      {items.map((item) => (
        <div className="data-row" key={item.id}>
          <div>
            <div>{buildFullName(item)}</div>
            <div className="muted">{item.razon_social || "-"}</div>
            <div className="muted">{item.email}</div>
          </div>
          <div className="row-actions">
            <span className="muted">{item.estado}</span>
            {item.estado === "activo" && (
              <button
                type="button"
                className="danger-button"
                onClick={() => onDeactivate(item.id)}
              >
                Inactivar
              </button>
            )}
            {item.estado === "inactivo" && (
              <button
                type="button"
                className="ghost-button"
                onClick={() => onActivate(item.id)}
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

export default SuperUsuarioClientes;
