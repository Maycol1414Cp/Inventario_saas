from flask import Blueprint, jsonify, request
from flask_login import current_user

from ..models import Cliente, db
from ..services.auth_service import get_current_role, hash_password
from ..views.cliente_view import cliente_detail, cliente_item

cliente_bp = Blueprint("cliente", __name__)


def is_super_admin():
    return current_user.is_authenticated and get_current_role(current_user) == "super_usuario"


def can_access_cliente(cliente_id):
    if not current_user.is_authenticated:
        return False
    role = get_current_role(current_user)
    if role == "super_usuario":
        return True
    return role == "cliente" and current_user.id_cliente == cliente_id


@cliente_bp.get("/api/clientes")
def list_clientes():
    if not is_super_admin():
        return jsonify({"error": "No autorizado"}), 403

    clientes = Cliente.query.order_by(Cliente.nombre).all()
    return jsonify({"clientes": [cliente_item(c) for c in clientes]})


@cliente_bp.get("/api/clientes/<int:cliente_id>")
def get_cliente(cliente_id):
    if not can_access_cliente(cliente_id):
        return jsonify({"error": "No autorizado"}), 403

    cliente = Cliente.query.get_or_404(cliente_id)
    return jsonify({"cliente": cliente_detail(cliente)})


@cliente_bp.post("/api/clientes")
def create_cliente():
    if not is_super_admin():
        return jsonify({"error": "No autorizado"}), 403

    payload = request.get_json(silent=True) or {}
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

    if Cliente.query.filter_by(email=email).first():
        return jsonify({"error": "Email ya registrado"}), 409

    cliente = Cliente(
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
    if not can_access_cliente(cliente_id):
        return jsonify({"error": "No autorizado"}), 403

    cliente = Cliente.query.get_or_404(cliente_id)
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
        if email and email != cliente.email:
            return jsonify({"error": "No puedes modificar el email"}), 400
    if password:
        cliente.password = hash_password(password)

    db.session.commit()
    return jsonify({"cliente": cliente_detail(cliente)})


@cliente_bp.patch("/api/clientes/<int:cliente_id>/deactivate")
def deactivate_cliente(cliente_id):
    if not can_access_cliente(cliente_id):
        return jsonify({"error": "No autorizado"}), 403

    cliente = Cliente.query.get_or_404(cliente_id)
    cliente.estado = "inactivo"
    db.session.commit()
    return jsonify({"message": "Cliente dado de baja"})


@cliente_bp.patch("/api/clientes/<int:cliente_id>/activate")
def activate_cliente(cliente_id):
    if not is_super_admin():
        return jsonify({"error": "No autorizado"}), 403

    cliente = Cliente.query.get_or_404(cliente_id)
    cliente.estado = "activo"
    db.session.commit()
    return jsonify({"message": "Cliente activado"})


@cliente_bp.delete("/api/clientes/<int:cliente_id>")
def delete_cliente(cliente_id):
    if not is_super_admin():
        return jsonify({"error": "No autorizado"}), 403

    cliente = Cliente.query.get_or_404(cliente_id)
    cliente.estado = "inactivo"
    db.session.commit()
    return jsonify({"message": "Cliente inactivado"})
