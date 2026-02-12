import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from app.config import settings
from app.limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter()


class ContactForm(BaseModel):
    name: str
    email: EmailStr
    message: str


@router.post("/contact")
@limiter.limit("3/minute")
async def submit_contact(request: Request, form: ContactForm):
    if not settings.resend_api_key or not settings.contact_email:
        raise HTTPException(status_code=503, detail="Contact form is not configured")

    if len(form.name) > 200 or len(form.message) > 5000:
        raise HTTPException(status_code=400, detail="Name or message too long")

    import resend

    resend.api_key = settings.resend_api_key

    try:
        resend.Emails.send({
            "from": "BankRead Contact <onboarding@resend.dev>",
            "to": [settings.contact_email],
            "reply_to": form.email,
            "subject": f"BankRead Contact: {form.name}",
            "text": f"Name: {form.name}\nEmail: {form.email}\n\n{form.message}",
        })
    except Exception:
        logger.exception("Failed to send contact email")
        raise HTTPException(status_code=500, detail="Failed to send message")

    return {"status": "sent"}
