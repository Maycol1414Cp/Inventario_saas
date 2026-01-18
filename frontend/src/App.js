import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";


import ForgotPasswordView from "./views/ForgotPasswordView";
import ResetPasswordView from "./views/ResetPasswordView";

// (modulo 2)
import MicroempresaSignupWizard from "./views/registro/MicroempresaSignupWizard";
import SuperUsuarioPendientes from "./views/dashboards/SuperUsuarioPendientes";

//Planes (super admin)
import SuperUsuarioPlanes from "./views/dashboards/SuperUsuarioPlanes";

import SuperUsuarioPlanCreate from "./views/dashboards/SuperUsuarioPlanCreate";
// Gestión de clientes (microempresa)
import GestionClientes from "./views/dashboards/MicroempresaClientes";



import {
  fetchMe,
  guestLogin,
  login,
  logout,
  register,
  switchRole,
} from "./controllers/authController";
import { fetchDashboard } from "./controllers/dashboardController";
import {
  activateAdmin,
  activateCliente,
  activateMicroempresa,
  deactivateAdmin,
  deactivateCliente,
  deactivateMicroempresa,
  updateAdmin,
  updateCliente,
  updateMicroempresa,
} from "./controllers/userController";

import DataList from "./views/DataList";
import DashboardLayout from "./views/DashboardLayout";
import LoginView from "./views/LoginView";
import ProfileSummaryView from "./views/ProfileSummaryView";
import ProfileView from "./views/ProfileView";
import SectionCard from "./views/SectionCard";

import ClienteDashboard from "./views/dashboards/ClienteDashboard";
import MicroempresaDashboard from "./views/dashboards/MicroempresaDashboard";
import SuperUsuarioDashboard from "./views/dashboards/SuperUsuarioDashboard";
import SuperUsuarioClientes from "./views/dashboards/SuperUsuarioClientes";
import SuperUsuarioMicroempresas from "./views/dashboards/SuperUsuarioMicroempresas";
import SuperUsuarioAdmins from "./views/dashboards/SuperUsuarioAdmins";

const emptyForm = {
  username: "",
  password: "",
  nombre: "",
  apellido_paterno: "",
  apellido_materno: "",
  logo_url: "",
  direccion: "",
  horario_inicio: "",
  horario_fin: "",
  nombre_propietario: "",
  apellido_paterno_propietario: "",
  apellido_materno_propietario: "",
  email: "",
  razon_social: "",
  es_empresa: "false",
  tipo_tienda: "fisica",
};

const roleMenus = {
  super_usuario: [
    { path: "/dashboard", label: "Inicio" },
    // ✅ NUEVO: planes
    { path: "/planes", label: "Planes" },
    // ✅ NUEVO: pendientes / en espera
    { path: "/microempresas-pendientes", label: "Microempresas en espera" },
    { path: "/microempresas", label: "Microempresas" },
    { path: "/clientes", label: "Clientes" },
    { path: "/superusuarios", label: "Superusuarios" },
  ],
  microempresa: [
    { path: "/dashboard", label: "Inicio" },
    { path: "/productos", label: "Productos" },
    { path: "/gestion-clientes", label: "Gestión de clientes" },
    { path: "/mi-empresa", label: "Mi empresa" },
  ],
  cliente: [
    { path: "/dashboard", label: "Inicio" },
    { path: "/microempresas", label: "Microempresas" },
  ],
};

export default function App() {
  const [form, setForm] = useState(emptyForm);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [mode, setMode] = useState("login");
  const [registerRole, setRegisterRole] = useState(null);
  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [roleOptions, setRoleOptions] = useState([]);
  const [pendingLogin, setPendingLogin] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [profileForm, setProfileForm] = useState(emptyForm);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const buildFullName = (userData) => {
    if (!userData) return "";
    return [userData.nombre, userData.apellido_paterno, userData.apellido_materno]
      .filter(Boolean)
      .join(" ");
  };

  const displayName =
    role === "microempresa"
      ? user?.nombre || "Usuario"
      : buildFullName(user) || user?.username || "Usuario";

  const initials = displayName.slice(0, 2).toUpperCase();
  const avatarUrl = role === "microempresa" ? user?.logo_url : null;
  const menuItems = useMemo(() => roleMenus[role] || [], [role]);

  const loadMe = async () => {
    const { data } = await fetchMe();
    setUser(data.user);
    setRole(data.role);
    setAvailableRoles(data.available_roles || []);
  };

  const loadDashboard = async () => {
    if (!user) {
      setDashboardData(null);
      return;
    }
    const { data } = await fetchDashboard();
    setDashboardData(data);
  };

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [user, role]);

  useEffect(() => {
    if (!user) {
      setProfileForm(emptyForm);
      return;
    }

    if (role === "super_usuario") {
      setProfileForm((prev) => ({
        ...prev,
        nombre: user.nombre || "",
        apellido_paterno: user.apellido_paterno || "",
        apellido_materno: user.apellido_materno || "",
        email: user.email || "",
        password: "",
      }));
      return;
    }

    if (role === "microempresa") {
  const horario = user.horario_atencion || "";

  // ✅ solo parseamos si es formato HH:MM - HH:MM
  const timeRangeRe = /^\s*\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\s*$/;
  const isTimeRange = timeRangeRe.test(horario);

  const [inicio, fin] = isTimeRange
    ? horario.split("-").map((part) => part.trim())
    : ["", ""];

  const direccion = user.direccion || "";
  const looksVirtual =
    !isTimeRange ||
    /virtual/i.test(direccion) ||
    /atenci[oó]n\s*online/i.test(horario) ||
    /sin\s*tienda\s*f[ií]sica/i.test(direccion);

  setProfileForm((prev) => ({
    ...prev,
    tipo_tienda: looksVirtual ? "virtual" : "fisica",
    nombre: user.nombre || "",
    logo_url: user.logo_url || "",
    // ✅ si es virtual, dejamos vacío para que el user lo complete si cambia a física
    direccion: looksVirtual ? "" : (user.direccion || ""),
    horario_inicio: looksVirtual ? "" : (inicio || ""),
    horario_fin: looksVirtual ? "" : (fin || ""),
    nombre_propietario: user.nombre_propietario || "",
    apellido_paterno_propietario: user.apellido_paterno_propietario || "",
    apellido_materno_propietario: user.apellido_materno_propietario || "",
    email: user.email || "",
    password: "",
  }));
  return;
}


    if (role === "cliente") {
      const razonSocial = user.razon_social || "";
      setProfileForm((prev) => ({
        ...prev,
        nombre: user.nombre || "",
        apellido_paterno: user.apellido_paterno || "",
        apellido_materno: user.apellido_materno || "",
        razon_social: razonSocial,
        email: user.email || "",
        es_empresa: razonSocial ? "true" : "false",
        password: "",
      }));
    }
  }, [user, role]);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleProfileChange = (event) => {
    setProfileForm({ ...profileForm, [event.target.name]: event.target.value });
  };

  const resetAuthState = () => {
    setMessage("");
    setRoleOptions([]);
    setPendingLogin(null);
  };

  const handleLogin = async () => {
    const { response, data } = await login({
      username: form.username,
      password: form.password,
    });

    if (!response.ok) {
      setMessage(data.error || "Ocurrió un error");
      return;
    }

    if (data.select_role) {
      setRoleOptions(data.roles || []);
      setPendingLogin({ username: form.username, password: form.password });
      return;
    }

    setUser(data.user);
    setRole(data.role);
    setAvailableRoles(data.available_roles || []);
    setForm(emptyForm);
    setMenuOpen(false);
    resetAuthState();
  };

  const handleRegister = async () => {
    // ⚠️ IMPORTANTE:
    // Microempresa ya NO se registra por este form (ahora se hace por wizard del modulo 2).
    // Este handleRegister queda para super_usuario / cliente.
    if (registerRole === "microempresa") {
      setMessage(
        "El registro de microempresa ahora se hace por pasos. Usa el botón 'Microempresa (por plan)'."
      );
      return;
    }

    const registerPayload = { role: registerRole, password: form.password };

    if (registerRole === "super_usuario") {
      Object.assign(registerPayload, {
        nombre: form.nombre,
        apellido_paterno: form.apellido_paterno,
        apellido_materno: form.apellido_materno,
        email: form.email,
      });
    }

    if (registerRole === "cliente") {
      Object.assign(registerPayload, {
        nombre: form.nombre,
        apellido_paterno: form.apellido_paterno,
        apellido_materno: form.apellido_materno,
        razon_social: form.razon_social,
        email: form.email,
        es_empresa: form.es_empresa === "true",
      });
    }

    const { response, data } = await register(registerPayload);
    if (!response.ok) {
      setMessage(data.error || "Ocurrió un error");
      return;
    }

    setUser(data.user);
    setRole(data.role);
    setAvailableRoles(data.available_roles || []);
    setForm(emptyForm);
    setMenuOpen(false);
    setMode("login");
    setRegisterRole(null);
    resetAuthState();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (mode === "login") {
      await handleLogin();
      return;
    }

    await handleRegister();
  };

  const handleRoleLogin = async (selectedRole) => {
    if (!pendingLogin) return;

    const { response, data } = await login({
      username: pendingLogin.username,
      password: pendingLogin.password,
      role: selectedRole,
    });

    if (!response.ok) {
      setMessage(data.error || "Ocurrió un error");
      return;
    }

    setUser(data.user);
    setRole(data.role);
    setAvailableRoles(data.available_roles || []);
    setForm(emptyForm);
    setMenuOpen(false);
    resetAuthState();
  };

  const handleGuestLogin = async () => {
    const { response, data } = await guestLogin();
    if (!response.ok) {
      setMessage(data.error || "Ocurrió un error");
      return;
    }
    setUser(data.user);
    setRole(data.role);
    setAvailableRoles(data.available_roles || []);
    setForm(emptyForm);
    setMenuOpen(false);
    resetAuthState();
  };

  const handleSwitchRole = async (selectedRole) => {
    const { response, data } = await switchRole(selectedRole);
    if (!response.ok) {
      setMessage(data.error || "Ocurrió un error");
      return;
    }
    setUser(data.user);
    setRole(data.role);
    setAvailableRoles(data.available_roles || []);
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setRole(null);
    setAvailableRoles([]);
    setMenuOpen(false);
    setMode("login");
    setRegisterRole(null);
    setForm(emptyForm);
    resetAuthState();
    setDashboardData(null);
    setProfileForm(emptyForm);
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileMessage("");
    setProfileSaving(true);

    try {
      let responseData;

      if (role === "super_usuario") {
        const payload = {
          nombre: profileForm.nombre,
          apellido_paterno: profileForm.apellido_paterno,
          apellido_materno: profileForm.apellido_materno,
        };
        if (profileForm.password) payload.password = profileForm.password;

        const { response, data } = await updateAdmin(user.id_su, payload);
        if (!response.ok) {
          setProfileMessage(data.error || "Ocurrió un error");
          return;
        }
        responseData = data.admin;
        setUser((prev) => ({ ...prev, ...responseData }));
      }

      if (role === "microempresa") {
  const VIRTUAL_DIRECCION = "Sin tienda física (virtual)";
  const VIRTUAL_HORARIO = "Atención online";

  const tipo = profileForm.tipo_tienda || "fisica";

  if (tipo === "fisica") {
    if (!profileForm.horario_inicio || !profileForm.horario_fin) {
      setProfileMessage("Debes seleccionar un rango de horario válido");
      return;
    }
    if (profileForm.horario_inicio >= profileForm.horario_fin) {
      setProfileMessage("El horario de fin debe ser mayor al de inicio");
      return;
    }
    if (!profileForm.direccion?.trim()) {
      setProfileMessage("Dirección requerida para tienda física");
      return;
    }
  }

  const payload = {
    nombre: profileForm.nombre,
    logo_url: profileForm.logo_url,

    // ✅ si es virtual: placeholders, si es física: valores reales
    direccion: tipo === "virtual" ? VIRTUAL_DIRECCION : profileForm.direccion,
    horario_atencion:
      tipo === "virtual"
        ? VIRTUAL_HORARIO
        : `${profileForm.horario_inicio} - ${profileForm.horario_fin}`,

    nombre_propietario: profileForm.nombre_propietario,
    apellido_paterno_propietario: profileForm.apellido_paterno_propietario,
    apellido_materno_propietario: profileForm.apellido_materno_propietario,

    // opcional mandar tipo_tienda (si backend luego lo soporta)
    tipo_tienda: tipo,
  };

  if (profileForm.password) payload.password = profileForm.password;

  const { response, data } = await updateMicroempresa(user.tenant_id, payload);
  if (!response.ok) {
    setProfileMessage(data.error || "Ocurrió un error");
    return;
  }

  responseData = data.microempresa;
  setUser((prev) => ({ ...prev, ...responseData }));
}


      if (role === "cliente") {
        const isEmpresa = profileForm.es_empresa === "true";
        if (isEmpresa && !profileForm.razon_social) {
          setProfileMessage("Razón social requerida");
          return;
        }
        const payload = {
          nombre: profileForm.nombre,
          apellido_paterno: profileForm.apellido_paterno,
          apellido_materno: profileForm.apellido_materno,
          razon_social: isEmpresa ? profileForm.razon_social : "",
          es_empresa: isEmpresa,
        };
        if (profileForm.password) payload.password = profileForm.password;

        const { response, data } = await updateCliente(user.id_cliente, payload);
        if (!response.ok) {
          setProfileMessage(data.error || "Ocurrió un error");
          return;
        }
        responseData = data.cliente;
        setUser((prev) => ({ ...prev, ...responseData }));
      }

      if (responseData) setProfileMessage("Datos actualizados correctamente");
    } finally {
      setProfileSaving(false);
    }
  };

  const openRegister = (selectedRole) => {
    setMode("register");
    setRegisterRole(selectedRole);
    setForm(emptyForm);
    resetAuthState();
  };

  const handleDeactivateMicroempresa = async (tenantId) => {
    const { response, data } = await deactivateMicroempresa(tenantId);
    if (!response.ok) {
      setMessage(data.error || "Ocurrió un error");
      return;
    }
    await loadDashboard();
  };

  const handleDeactivateCliente = async (clienteId) => {
    const { response, data } = await deactivateCliente(clienteId);
    if (!response.ok) {
      setMessage(data.error || "Ocurrió un error");
      return;
    }
    await loadDashboard();
  };

  const handleDeactivateAdmin = async (adminId) => {
    const { response, data } = await deactivateAdmin(adminId);
    if (!response.ok) {
      setMessage(data.error || "Ocurrió un error");
      return;
    }
    await loadDashboard();
  };

  const handleActivateMicroempresa = async (tenantId) => {
    const { response, data } = await activateMicroempresa(tenantId);
    if (!response.ok) {
      setMessage(data.error || "Ocurrió un error");
      return;
    }
    await loadDashboard();
  };

  const handleActivateCliente = async (clienteId) => {
    const { response, data } = await activateCliente(clienteId);
    if (!response.ok) {
      setMessage(data.error || "Ocurrió un error");
      return;
    }
    await loadDashboard();
  };

  const handleActivateAdmin = async (adminId) => {
    const { response, data } = await activateAdmin(adminId);
    if (!response.ok) {
      setMessage(data.error || "Ocurrió un error");
      return;
    }
    await loadDashboard();
  };

  const dashboardRoutes = () => {
    if (role === "super_usuario") {
      return (
        <>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <SuperUsuarioDashboard
                displayName={displayName}
                dashboardData={dashboardData}
              />
            }
          />
          <Route path="/planes" element={<SuperUsuarioPlanes />} />
          <Route path="/planes/nuevo" element={<SuperUsuarioPlanCreate />} />

          {/* ✅ NUEVO: planes */}
          <Route path="/planes" element={<SuperUsuarioPlanes />} />

          {/* ✅ NUEVO: pendientes */}
          <Route
            path="/microempresas-pendientes"
            element={
              <SuperUsuarioPendientes
                dashboardData={dashboardData}
                onApprove={handleActivateMicroempresa}
                onReject={handleDeactivateMicroempresa}
                reloadDashboard={loadDashboard}
              />
            }
          />

          <Route
            path="/microempresas"
            element={
              <SuperUsuarioMicroempresas
                items={dashboardData?.microempresas || []}
                onDeactivate={handleDeactivateMicroempresa}
                onActivate={handleActivateMicroempresa}
              />
            }
          />
          <Route
            path="/clientes"
            element={
              <SuperUsuarioClientes
                items={dashboardData?.clientes || []}
                microempresas={dashboardData?.microempresas || []}
                onDeactivate={handleDeactivateCliente}
                onActivate={handleActivateCliente}
                onUpdate={async (id, payload) => {
                  const { response, data } = await updateCliente(id, payload);
                  if (!response.ok) {
                    setMessage(data.error || "Ocurrió un error");
                    return;
                  }
                  await loadDashboard();
                }}
              />
            }
          />
          <Route
            path="/superusuarios"
            element={
              <SuperUsuarioAdmins
                items={dashboardData?.admins || []}
                onDeactivate={handleDeactivateAdmin}
                onActivate={handleActivateAdmin}
                currentAdminId={user?.id_su}
              />
            }
          />
        </>
      );
    }

    if (role === "microempresa") {
      return (
        <>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <MicroempresaDashboard
                displayName={displayName}
                dashboardData={dashboardData}
              />
            }
          />
          {/*gestión de clientes */}
          <Route
            path="/gestion-clientes"
            element={<GestionClientes />}
          />
          <Route
            path="/mi-empresa"
            element={
              <MicroempresaDashboard
                displayName={displayName}
                dashboardData={dashboardData}
              />
            }
          />
          <Route
            path="/productos"
            element={
              <SectionCard title="Productos">
                <p className="muted">Vista de productos en diseño.</p>
              </SectionCard>
            }
          />
        </>
      );
    }

    if (role === "cliente") {
      return (
        <>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ClienteDashboard
                displayName={displayName}
                dashboardData={dashboardData}
              />
            }
          />
          <Route
            path="/microempresas"
            element={
              <SectionCard title="Microempresas">
                <DataList
                  items={(dashboardData?.microempresas || []).map((item) => ({
                    id: item.tenant_id,
                    label: item.nombre,
                    meta: item.email,
                  }))}
                  emptyLabel="No hay microempresas registradas."
                />
              </SectionCard>
            }
          />
        </>
      );
    }

    return null;
  };

  return (
    <BrowserRouter>
      {user ? (
        <DashboardLayout
          menuItems={menuItems}
          displayName={displayName}
          initials={initials}
          avatarUrl={avatarUrl}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          onLogout={handleLogout}
          availableRoles={availableRoles}
          currentRole={role}
          onSwitchRole={handleSwitchRole}
          themeClass={`theme-${role}`}
        >
          <Routes>
            {dashboardRoutes()}

            <Route
              path="/perfil"
              element={
                role === "cliente" && !user?.id_cliente ? (
                  <SectionCard title="Perfil">
                    <p className="muted">
                      El perfil no está disponible en modo invitado.
                    </p>
                  </SectionCard>
                ) : (
                  <ProfileSummaryView
                    role={role}
                    user={user}
                    canEdit={role !== "cliente" || Boolean(user?.id_cliente)}
                  />
                )
              }
            />

            <Route
              path="/perfil/editar"
              element={
                role === "cliente" && !user?.id_cliente ? (
                  <SectionCard title="Perfil">
                    <p className="muted">
                      El perfil no está disponible en modo invitado.
                    </p>
                  </SectionCard>
                ) : role === "super_usuario" ||
                  role === "microempresa" ||
                  role === "cliente" ? (
                  <ProfileView
                    role={role}
                    form={profileForm}
                    message={profileMessage}
                    onChange={handleProfileChange}
                    onSubmit={handleProfileSubmit}
                    isSaving={profileSaving}
                  />
                ) : (
                  <SectionCard title="Perfil">
                    <p className="muted">
                      La edición no está disponible para este rol.
                    </p>
                  </SectionCard>
                )
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </DashboardLayout>
      ) : (
        // ✅ RUTAS PÚBLICAS
        <Routes>
          <Route
            path="/"
            element={
              <LoginView
                form={form}
                mode={mode}
                registerRole={registerRole}
                roleOptions={roleOptions}
                message={message}
                onChange={handleChange}
                onSubmit={handleSubmit}
                onSelectRole={handleRoleLogin}
                onBackFromRoleSelect={() => {
                  setRoleOptions([]);
                  setPendingLogin(null);
                }}
                onOpenRegister={openRegister}
                onBackToLogin={() => {
                  setMode("login");
                  setRegisterRole(null);
                  setForm(emptyForm);
                  resetAuthState();
                }}
                onGuestLogin={handleGuestLogin}
              />
            }
          />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/forgot-password" element={<ForgotPasswordView />} />
          <Route path="/reset-password" element={<ResetPasswordView />} />

          {/* ✅ NUEVO: wizard microempresa */}
          <Route
            path="/registro/microempresa/*"
            element={<MicroempresaSignupWizard />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
