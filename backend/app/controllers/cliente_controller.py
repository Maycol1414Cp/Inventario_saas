from flask import Blueprint, jsonify, request
from flask_login import current_user

from ..models import Cliente, db
from ..services.auth_service import get_current_role, hash_password
from ..views.cliente_view import cliente_detail, cliente_item

cliente_bp = Blueprint("cliente", __name__)


def is_super_admin():
    return current_user.is_authenticated and get_current_role(current_user) == "super_usuario"


def is_microempresa():
    return current_user.is_authenticated and get_current_role(current_user) == "microempresa"


def _tenant_id_backend():
    """
    ✅ NUEVO (REGLA DE ORO)
    tenant_id SIEMPRE se obtiene desde backend:
    - Si el usuario actual es microempresa, retorna current_user.tenant_id
    - En cualquier otro caso, retorna None (evita que se use incorrectamente)
    """
    if is_microempresa():
        return getattr(current_user, "tenant_id", None)
    return None


def can_access_cliente_obj(cliente: Cliente):
    """
    ✅ NUEVO (control de acceso multi-tenant)
    - super_usuario: acceso total
    - microempresa: acceso solo si cliente.tenant_id == current_user.tenant_id
    - cliente: acceso solo a su propio registro
    """
    if not current_user.is_authenticated:
        return False

    role = get_current_role(current_user)

    if role == "super_usuario":
        return True

    if role == "microempresa":
        return cliente.tenant_id == getattr(current_user, "tenant_id", None)

    return role == "cliente" and getattr(current_user, "id_cliente", None) == cliente.id_cliente


@cliente_bp.get("/api/clientes")
def list_clientes():
    """
    ✅ CAMBIO
    - super_usuario: lista todos
    - microempresa: lista SOLO clientes de su tenant
    """
    if not current_user.is_authenticated:
        return jsonify({"error": "No autorizado"}), 403

    role = get_current_role(current_user)

    if role == "super_usuario":
        clientes = Cliente.query.order_by(Cliente.nombre).all()
        return jsonify({"clientes": [cliente_item(c) for c in clientes]})

    if role == "microempresa":
        tenant_id = _tenant_id_backend()
        if tenant_id is None:
            return jsonify({"error": "Tenant inválido"}), 400

        clientes = (
            Cliente.query
            .filter_by(tenant_id=tenant_id)
            .order_by(Cliente.nombre)
            .all()
        )
        return jsonify({"clientes": [cliente_item(c) for c in clientes]})

    return jsonify({"error": "No autorizado"}), 403


@cliente_bp.get("/api/clientes/<int:cliente_id>")
def get_cliente(cliente_id):
    """
    ✅ CAMBIO
    - Primero obtienes el cliente
    - Luego validas acceso por rol/tenant
    """
    cliente = Cliente.query.get_or_404(cliente_id)

    if not can_access_cliente_obj(cliente):
        return jsonify({"error": "No autorizado"}), 403

    return jsonify({"cliente": cliente_detail(cliente)})


@cliente_bp.post("/api/clientes")
def create_cliente():
    """
    ✅ CAMBIO (tenant_id solo backend)
    - microempresa: crea clientes SOLO dentro de su tenant (tenant_id = current_user.tenant_id)
      *Se ignora cualquier tenant_id que llegue en payload.*
    - super_usuario: si quieres que pueda crear clientes, debes decidir cómo asigna tenant_id:
        Opción A) endpoint anidado /api/microempresas/<tenant_id>/clientes
        Opción B) permitir payload.tenant_id SOLO para super_usuario
    """
    if not current_user.is_authenticated:
        return jsonify({"error": "No autorizado"}), 403

    role = get_current_role(current_user)

    if role not in {"super_usuario", "microempresa"}:
        return jsonify({"error": "No autorizado"}), 403

    payload = request.get_json(silent=True) or {}

    # ✅ tenant_id definido por backend
    if role == "microempresa":
        tenant_id = _tenant_id_backend()
        if tenant_id is None:
            return jsonify({"error": "Tenant inválido"}), 400
    else:
        # super_usuario: aquí decide tu política (ver comentario arriba)
        tenant_id = payload.get("tenant_id")
        if not tenant_id:
            return jsonify({"error": "tenant_id requerido para super_usuario"}), 400

    nombre = (payload.get("nombre") or "").strip()
    apellido_paterno = (payload.get("apellido_paterno") or "").strip()
    apellido_materno = (payload.get("apellido_materno") or "").strip()
    razon_social = (payload.get("razon_social") or "").strip()
    email = (payload.get("email") or "").strip()
    password = payload.get("password") or ""
    es_empresa = payload.get("es_empresa")
    es_generico = payload.get("es_generico", False)

    if not all([nombre, apellido_paterno, apellido_materno, email, password]):
        return jsonify({"error": "Todos los campos son requeridos"}), 400
    if not isinstance(es_empresa, bool):
        return jsonify({"error": "es_empresa debe ser boolean"}), 400
    if es_empresa and not razon_social:
        return jsonify({"error": "Razón social requerida"}), 400
    if es_generico is not None and not isinstance(es_generico, bool):
        return jsonify({"error": "es_generico debe ser boolean"}), 400

    # ✅ CAMBIO: email duplicado por tenant (no global)
    if Cliente.query.filter_by(tenant_id=tenant_id, email=email).first():
        return jsonify({"error": "Email ya registrado en esta microempresa"}), 409

    cliente = Cliente(
        tenant_id=tenant_id,
        nombre=nombre,
        apellido_paterno=apellido_paterno,
        apellido_materno=apellido_materno,
        razon_social=razon_social or None,
        es_generico=bool(es_generico),
        email=email,
        password=hash_password(password),
        estado="activo",
    )

    db.session.add(cliente)
    db.session.commit()
    return jsonify({"cliente": cliente_detail(cliente)}), 201


@cliente_bp.put("/api/clientes/<int:cliente_id>")
def update_cliente(cliente_id):
    """
    ✅ CAMBIO
    - microempresa solo puede modificar clientes de su tenant
    """
    cliente = Cliente.query.get_or_404(cliente_id)

    if not can_access_cliente_obj(cliente):
        return jsonify({"error": "No autorizado"}), 403

    payload = request.get_json(silent=True) or {}

    nombre = payload.get("nombre")
    apellido_paterno = payload.get("apellido_paterno")
    apellido_materno = payload.get("apellido_materno")
    razon_social = payload.get("razon_social")
    email = payload.get("email")
    password = payload.get("password")
    es_empresa = payload.get("es_empresa")
    existing_is_empresa = cliente.razon_social is not None

    if nombre is not None:
        cliente.nombre = nombre.strip()
    if apellido_paterno is not None:
        cliente.apellido_paterno = apellido_paterno.strip()
    if apellido_materno is not None:
        cliente.apellido_materno = apellido_materno.strip()

    if es_empresa is not None:
        if not isinstance(es_empresa, bool):
            return jsonify({"error": "es_empresa debe ser boolean"}), 400
        if es_empresa != existing_is_empresa:
            return jsonify({"error": "No puedes cambiar el tipo de cliente"}), 400

    if razon_social is not None:
        razon_social = razon_social.strip()
        if existing_is_empresa:
            if not razon_social:
                return jsonify({"error": "Razón social requerida"}), 400
            cliente.razon_social = razon_social
        elif razon_social:
            return jsonify({"error": "No puedes asignar razón social a persona"}), 400

    if email is not None:
        email = email.strip()

        if not email:
            return jsonify({"error": "Email requerido"}), 400

        # permitir cambiar email si es distinto
        if email != cliente.email:
            # validar unicidad por tenant (no global)
            exists = (
                Cliente.query
                .filter(Cliente.tenant_id == cliente.tenant_id, Cliente.email == email)
                .first()
            )
            if exists:
                return jsonify({"error": "Email ya registrado en esta microempresa"}), 409

            cliente.email = email

    if password:
        cliente.password = hash_password(password)

    db.session.commit()
    return jsonify({"cliente": cliente_detail(cliente)})


@cliente_bp.patch("/api/clientes/<int:cliente_id>/deactivate")
def deactivate_cliente(cliente_id):
    """
    ✅ CAMBIO
    - microempresa solo puede desactivar clientes de su tenant
    """
    cliente = Cliente.query.get_or_404(cliente_id)

    if not can_access_cliente_obj(cliente):
        return jsonify({"error": "No autorizado"}), 403

    cliente.estado = "inactivo"
    db.session.commit()
    return jsonify({"message": "Cliente dado de baja"})


@cliente_bp.patch("/api/clientes/<int:cliente_id>/activate")
def activate_cliente(cliente_id):
    """
    ✅ CAMBIO
    - super_usuario o microempresa del mismo tenant
    """
    cliente = Cliente.query.get_or_404(cliente_id)

    if not (is_super_admin() or (is_microempresa() and cliente.tenant_id == _tenant_id_backend())):
        return jsonify({"error": "No autorizado"}), 403

    cliente.estado = "activo"
    db.session.commit()
    return jsonify({"message": "Cliente activado"})


@cliente_bp.delete("/api/clientes/<int:cliente_id>")
def delete_cliente(cliente_id):
    """
    ✅ CAMBIO
    Soft-delete (inactivar) permitido para:
    - super_usuario
    - microempresa del mismo tenant
    """
    cliente = Cliente.query.get_or_404(cliente_id)

    if not (is_super_admin() or (is_microempresa() and cliente.tenant_id == _tenant_id_backend())):
        return jsonify({"error": "No autorizado"}), 403

    cliente.estado = "inactivo"
    db.session.commit()
    return jsonify({"message": "Cliente inactivado"})
