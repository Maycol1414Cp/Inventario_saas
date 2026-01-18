from flask import Blueprint, jsonify, session
from flask_login import current_user

from ..models import AdminSu, Cliente, Microempresa, Producto
from ..services.auth_service import guest_payload, serialize_user

dashboard_bp = Blueprint("dashboard", __name__)


def resolve_identity():
    if current_user.is_authenticated:
        return serialize_user(current_user)
    if session.get("guest"):
        return guest_payload(), "cliente"
    return None, None


@dashboard_bp.get("/api/dashboard")
def dashboard():
    user_data, user_role = resolve_identity()

    if user_role == "super_usuario":
        microempresas = Microempresa.query.order_by(Microempresa.nombre).all()
        clientes = Cliente.query.order_by(Cliente.nombre).all()
        admins = AdminSu.query.order_by(AdminSu.apellido_paterno, AdminSu.nombre).all()

        return jsonify(
            {
                "role": user_role,
                "counts": {
                    "microempresas": len(microempresas),
                    "clientes": len(clientes),
                },
                "admins": [
                    {
                        "id_su": admin.id_su,
                        "nombre": admin.nombre,
                        "apellido_paterno": admin.apellido_paterno,
                        "apellido_materno": admin.apellido_materno,
                        "email": admin.email,
                        "estado": admin.estado,
                    }
                    for admin in admins
                ],
                "microempresas": [
                    {
                        "tenant_id": m.tenant_id,
                        "nombre": m.nombre,
                        "email": m.email,
                        "estado": m.estado,
                        # ✅ NUEVO
                        "tipo_tienda": getattr(m, "tipo_tienda", None),
                        # (opcional) si quieres ver también en la lista:
                        "direccion": m.direccion,
                        "horario_atencion": m.horario_atencion,
                    }
                    for m in microempresas
                ],
                "clientes": [
                    {
                        "id": c.id_cliente,
                        "nombre": c.nombre,
                        "apellido_paterno": c.apellido_paterno,
                        "apellido_materno": c.apellido_materno,
                        "razon_social": c.razon_social,
                        "es_generico": c.es_generico,
                        "email": c.email,
                        "estado": c.estado,
                    }
                    for c in clientes
                ],
            }
        )

    if user_role == "microempresa":
        tenant_id = user_data.get("tenant_id") if isinstance(user_data, dict) else None
        productos_count = 0
        if tenant_id is not None:
            productos_count = Producto.query.filter_by(tenant_id=tenant_id).count()

        # ✅ aquí ya llega tipo_tienda porque user_data viene de to_dict()
        return jsonify(
            {
                "role": user_role,
                "microempresa": user_data,
                "counts": {"productos": productos_count},
            }
        )

    if user_role == "cliente":
        microempresas = Microempresa.query.order_by(Microempresa.nombre).all()
        return jsonify(
            {
                "role": user_role,
                "microempresas": [
                    {
                        "tenant_id": m.tenant_id,
                        "nombre": m.nombre,
                        "email": m.email,
                        # ✅ NUEVO
                        "tipo_tienda": getattr(m, "tipo_tienda", None),
                        # (opcional)
                        "estado": m.estado,
                    }
                    for m in microempresas
                ],
            }
        )

    return jsonify({"role": None}), 401
