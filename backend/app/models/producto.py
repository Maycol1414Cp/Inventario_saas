from .base import db


class Producto(db.Model):
    __tablename__ = "producto"

    id_producto = db.Column(db.BigInteger, primary_key=True)
    tenant_id = db.Column(
        db.BigInteger, db.ForeignKey("microempresa.tenant_id"), nullable=False
    )
    nombre = db.Column(db.String(150), nullable=False)
    descripcion = db.Column(db.Text)
    precio_unitario = db.Column(db.Numeric(10, 2), nullable=False)
    stock = db.Column(db.Integer, nullable=False, default=0)
    stock_minimo = db.Column(db.Integer, nullable=False, default=0)
    estado = db.Column(db.String(20), nullable=False, default="activo")
