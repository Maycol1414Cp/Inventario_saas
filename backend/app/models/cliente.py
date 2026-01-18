from flask_login import UserMixin

from .base import db


class Cliente(UserMixin, db.Model):
    __tablename__ = "cliente"

    id_cliente = db.Column(db.BigInteger, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    apellido_paterno = db.Column(db.String(100), nullable=False)
    apellido_materno = db.Column(db.String(100), nullable=False)
    razon_social = db.Column(db.String(150))
    es_generico = db.Column(db.Boolean, nullable=False, default=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.Text, nullable=False)
    estado = db.Column(db.String(20), nullable=False, default="activo")

    def get_id(self):
        return f"cliente:{self.id_cliente}"

    def to_dict(self):
        return {
            "id_cliente": self.id_cliente,
            "nombre": self.nombre,
            "apellido_paterno": self.apellido_paterno,
            "apellido_materno": self.apellido_materno,
            "razon_social": self.razon_social,
            "es_generico": self.es_generico,
            "email": self.email,
            "estado": self.estado,
        }
