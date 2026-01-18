import os
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from .extensions import db, login_manager
from .services.auth_service import load_user

# Módulo 1
from .controllers.auth.auth_controller import auth_bp
from .controllers.auth.password_reset_controller import password_reset_bp
from .controllers.dashboard_controller import dashboard_bp
from .controllers.admin_controller import admin_bp
from .controllers.microempresa_controller import microempresa_bp
from .controllers.cliente_controller import cliente_bp

# Módulo 2
from .controllers.plan_controller import plan_bp
from .controllers.onboarding_controller import onboarding_bp
from .controllers.subscription_review_controller import subscription_review_bp


def create_app():
    load_dotenv()

    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

    # CORS (para cookies de sesión)
    frontend_origin = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
    origins = [o.strip() for o in frontend_origin.split(",") if o.strip()]
    # extra por si corres en 3001
    if "http://localhost:3001" not in origins:
        origins.append("http://localhost:3001")
    CORS(app, supports_credentials=True, origins=origins)

    # Uploads
    upload_folder = os.environ.get("UPLOAD_FOLDER")
    if not upload_folder:
        backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        upload_folder = os.path.join(backend_root, "uploads")
    app.config["UPLOAD_FOLDER"] = os.path.abspath(upload_folder)
    app.config["MAX_CONTENT_LENGTH"] = int(os.environ.get("MAX_CONTENT_LENGTH", str(10 * 1024 * 1024)))

    app.config["ONBOARDING_TOKEN_EXPIRE_MINUTES"] = int(os.environ.get("ONBOARDING_TOKEN_EXPIRE_MINUTES", "120"))
    app.config["SUBSCRIPTION_DEFAULT_DAYS"] = int(os.environ.get("SUBSCRIPTION_DEFAULT_DAYS", "30"))

    # Mail (módulo 1)
    app.config["MAIL_HOST"] = os.environ.get("MAIL_HOST")
    app.config["MAIL_PORT"] = int(os.environ.get("MAIL_PORT", "587"))
    app.config["MAIL_USE_TLS"] = os.environ.get("MAIL_USE_TLS", "1")
    app.config["MAIL_USER"] = os.environ.get("MAIL_USER")
    app.config["MAIL_PASS"] = os.environ.get("MAIL_PASS")
    app.config["MAIL_FROM"] = os.environ.get("MAIL_FROM")
    app.config["RESET_TOKEN_EXPIRE_MINUTES"] = int(os.environ.get("RESET_TOKEN_EXPIRE_MINUTES", "15"))

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.user_loader(load_user)

    # Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(password_reset_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(microempresa_bp)
    app.register_blueprint(cliente_bp)

    app.register_blueprint(plan_bp)
    app.register_blueprint(onboarding_bp)
    app.register_blueprint(subscription_review_bp)

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app
