import SectionCard from "../SectionCard";

const buildFullName = (item) =>
  [item?.nombre, item?.apellido_paterno, item?.apellido_materno]
    .filter(Boolean)
    .join(" ");

const SuperUsuarioAdmins = ({ items, onDeactivate, onActivate, currentAdminId }) => (
  <SectionCard title="Superusuarios">
    <div className="data-list">
      {items.length === 0 && <p className="muted">Sin superusuarios registrados.</p>}
      {items.map((item) => (
        <div className="data-row" key={item.id_su}>
          <div>
            <div>{buildFullName(item)}</div>
            <div className="muted">{item.email}</div>
          </div>
          <div className="row-actions">
            <span className="muted">{item.estado}</span>
            {item.estado === "activo" && item.id_su !== currentAdminId && (
              <button
                type="button"
                className="danger-button"
                onClick={() => onDeactivate(item.id_su)}
              >
                Inactivar
              </button>
            )}
            {item.estado === "inactivo" && (
              <button
                type="button"
                className="ghost-button"
                onClick={() => onActivate(item.id_su)}
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

export default SuperUsuarioAdmins;
