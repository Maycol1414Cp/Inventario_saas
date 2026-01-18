import os
import smtplib
from email.message import EmailMessage


def send_email(to_email: str, subject: str, body: str):
    host = os.environ.get("MAIL_HOST")
    port = int(os.environ.get("MAIL_PORT", "587"))
    user = os.environ.get("MAIL_USER")
    password = os.environ.get("MAIL_PASS")
    mail_from = os.environ.get("MAIL_FROM", user)

    if not host or not user or not password:
        raise RuntimeError("Faltan variables MAIL_HOST/MAIL_USER/MAIL_PASS en el .env")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = mail_from
    msg["To"] = to_email
    msg.set_content(body)

    with smtplib.SMTP(host, port) as server:
        server.ehlo()
        use_tls = os.environ.get("MAIL_USE_TLS", "1") == "1"
        if use_tls:
            server.starttls()
            server.ehlo()
        server.login(user, password)
        server.send_message(msg)


def send_password_reset_email(to_email: str, token: str):
    subject = "Recuperación de contraseña - Microempresa SaaS"
    body = (
        "Hola,\n\n"
        "Recibimos una solicitud para recuperar tu contraseña.\n"
        f"Tu token es: {token}\n\n"
        "Este token expira en 15 minutos.\n"
        "Si tú no solicitaste este cambio, ignora este correo.\n\n"
        "Saludos,\n"
        "Equipo Microempresa SaaS"
    )
    send_email(to_email, subject, body)
