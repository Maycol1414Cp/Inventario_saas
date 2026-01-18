import { Link } from "react-router-dom";

const roleLabels = {
  super_usuario: "Super usuario",
  microempresa: "Microempresa",
  cliente: "Cliente",
};

const LoginView = ({
  form,
  mode,
  registerRole,
  roleOptions,
  message,
  onChange,
  onSubmit,
  onSelectRole,
  onBackFromRoleSelect,
  onOpenRegister,
  onBackToLogin,
  onGuestLogin,
}) => {
  const isEmpresa = form.es_empresa === "true";

  return (
    <div className="container">
      <h1>Acceso al sistema</h1>

      {roleOptions.length > 0 ? (
        <div className="card role-picker">
          <h2>Selecciona el tipo de usuario</h2>
          <div className="role-options">
            {roleOptions.map((option) => (
              <button key={option} type="button" onClick={() => onSelectRole(option)}>
                {roleLabels[option] || option}
              </button>
            ))}
          </div>
          {message && <p className="error">{message}</p>}
          <button type="button" className="link-button" onClick={onBackFromRoleSelect}>
            Volver
          </button>
        </div>
      ) : mode === "register" ? (
        <form className="card" onSubmit={onSubmit}>
          <div className="form-title">Registro {roleLabels[registerRole] || ""}</div>

          {/* ✅ Microempresa ya NO se registra aquí */}
          {registerRole === "microempresa" && (
            <div className="muted" style={{ marginBottom: 10 }}>
              El registro de microempresa ahora es por pasos (plan + QR + comprobante).
              <div style={{ marginTop: 10 }}>
                <Link className="link-button" to="/registro/microempresa">
                  Ir al registro de microempresa
                </Link>
              </div>
            </div>
          )}

          {registerRole === "super_usuario" && (
            <>
              <label>
                Nombre
                <input name="nombre" value={form.nombre} onChange={onChange} required />
              </label>
              <label>
                Apellido paterno
                <input
                  name="apellido_paterno"
                  value={form.apellido_paterno}
                  onChange={onChange}
                  required
                />
              </label>
              <label>
                Apellido materno
                <input
                  name="apellido_materno"
                  value={form.apellido_materno}
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
                  required
                />
              </label>
              <button type="submit">Registrar</button>
            </>
          )}

          {registerRole === "cliente" && (
            <>
              <label>
                Nombre
                <input name="nombre" value={form.nombre} onChange={onChange} required />
              </label>
              <label>
                Apellido paterno
                <input
                  name="apellido_paterno"
                  value={form.apellido_paterno}
                  onChange={onChange}
                  required
                />
              </label>
              <label>
                Apellido materno
                <input
                  name="apellido_materno"
                  value={form.apellido_materno}
                  onChange={onChange}
                  required
                />
              </label>

              <div className="radio-group">
                <span>Tipo de cliente</span>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="es_empresa"
                    value="false"
                    checked={!isEmpresa}
                    onChange={onChange}
                  />
                  Persona
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="es_empresa"
                    value="true"
                    checked={isEmpresa}
                    onChange={onChange}
                  />
                  Empresa
                </label>
              </div>

              {isEmpresa && (
                <label>
                  Razón social
                  <input
                    name="razon_social"
                    value={form.razon_social}
                    onChange={onChange}
                    required
                  />
                </label>
              )}

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
                  required
                />
              </label>

              <button type="submit">Registrar</button>
            </>
          )}

          {message && <p className="error">{message}</p>}

          <button type="button" className="link-button" onClick={onBackToLogin}>
            Volver al login
          </button>
        </form>
      ) : (
        <form className="card" onSubmit={onSubmit}>
          <label>
            Usuario
            <input name="username" value={form.username} onChange={onChange} required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              required
            />
          </label>

          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <Link className="link-button" to="/forgot-password">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit">Entrar</button>

          <button type="button" className="ghost-button" onClick={onGuestLogin}>
            Ingresar como invitado
          </button>

          {message && <p className="error">{message}</p>}

          <p className="register-text">¿No tienes cuenta? Regístrate:</p>
          <div className="register-links">
            <button
              type="button"
              className="link-button"
              onClick={() => onOpenRegister("super_usuario")}
            >
              Superusuarios
            </button>

            {/* ✅ NUEVO: microempresa por wizard */}
            <Link className="link-button" to="/registro/microempresa">
              Microempresa (por plan)
            </Link>

            <button
              type="button"
              className="link-button"
              onClick={() => onOpenRegister("cliente")}
            >
              Clientes
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default LoginView;
