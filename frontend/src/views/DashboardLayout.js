import { NavLink, useLocation } from "react-router-dom";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/planes": "Planes",
  "/planes/nuevo": "Crear plan",
  "/microempresas-pendientes": "Microempresas en espera",
  "/microempresas": "Microempresas",
  "/clientes": "Clientes",
  "/mi-empresa": "Mi empresa",
  "/perfil": "Perfil",
};


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
  const title = pageTitles[location.pathname] || "Dashboard";
  const switchRoles = availableRoles.filter((role) => role !== currentRole);

  return (
    <div className={`app-shell ${themeClass || ""}`.trim()}>
      <aside className="sidebar">
        <div className="brand">Microempresa</div>
        <nav className="menu">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `menu-item${isActive ? " active" : ""}`}
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
                <img className="avatar-image" src={avatarUrl} alt={displayName} />
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
                      <button key={role} type="button" onClick={() => onSwitchRole(role)}>
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
