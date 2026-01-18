def cliente_item(cliente):
    return {
        "id": cliente.id_cliente,
        "nombre": cliente.nombre,
        "apellido_paterno": cliente.apellido_paterno,
        "apellido_materno": cliente.apellido_materno,
        "razon_social": cliente.razon_social,
        "es_generico": cliente.es_generico,
        "email": cliente.email,
        "estado": cliente.estado,
    }


def cliente_detail(cliente):
    return cliente.to_dict()
