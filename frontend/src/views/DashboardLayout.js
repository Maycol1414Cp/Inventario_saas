import { NavLink, useLocation } from "react-router-dom";

/**
 * =========================================================
 * 📌 pageTitles
 * ---------------------------------------------------------
 * 🔹 NUEVO:
 * Se agrega el título para la ruta `/gestion-clientes`
 * usada por el rol "microempresa" para administrar
 * sus propios clientes (multi-tenant).
 *
 * Esto permite que el <h1> del dashboard se actualice
 * automáticamente sin tocar la lógica del layout.
 * =========================================================
 */
const pageTitles = {
  "/dashboard": "Dashboard",
  "/planes": "Planes",
  "/planes/nuevo": "Crear plan",
  "/microempresas-pendientes": "Microempresas en espera",
  "/microempresas": "Microempresas",
  "/clientes": "Clientes",
  "/gestion-clientes": "Gestión de clientes", // ✅ NUEVO
  "/mi-empresa": "Mi empresa",
  "/perfil": "Perfil",
};

/**
 * Etiquetas visibles para el selector de roles
 */
const roleLabels = {
  super_usuario: "Super usuario",
  microempresa: "Microempresa",
  cliente: "Cliente",
};

const DashboardLayout = ({
  children,
  menuItems,
  displayName,
  initials,
  avatarUrl,
  menuOpen,
  setMenuOpen,
  onLogout,
  availableRoles,
  currentRole,
  onSwitchRole,
  themeClass,
}) => {
  const location = useLocation();

  /**
   * Título dinámico basado en la ruta actual.
   * Si la ruta no está definida en pageTitles,
   * se usa "Dashboard" como fallback.
   */
  const title = pageTitles[location.pathname] || "Dashboard";

  /**
   * Roles disponibles para cambio rápido
   * (excluye el rol actual)
   */
  const switchRoles = availableRoles.filter((role) => role !== currentRole);

  return (
    <div className={`app-shell ${themeClass || ""}`.trim()}>
      <aside className="sidebar">
        <div className="brand">
          {roleLabels[currentRole] || "Dashboard"}
        </div>

        <nav className="menu">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `menu-item${isActive ? " active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>{title}</h1>

          <div className="user-menu">
            <button
              type="button"
              className="avatar-button"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              {avatarUrl ? (
                <img
                  className="avatar-image"
                  src={avatarUrl}
                  alt={displayName}
                />
              ) : (
                <span className="avatar">{initials}</span>
              )}
              <span className="avatar-name">{displayName}</span>
            </button>

            {menuOpen && (
              <div className="dropdown">
                {switchRoles.length > 0 && (
                  <div className="dropdown-section">
                    <span className="dropdown-title">Cambiar rol</span>
                    {switchRoles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => onSwitchRole(role)}
                      >
                        {roleLabels[role] || role}
                      </button>
                    ))}
                  </div>
                )}

                <NavLink to="/perfil" className="dropdown-link">
                  Perfil
                </NavLink>

                <button type="button" onClick={onLogout}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
