import httpx


# Servicio local que mantiene MedPsy cargado mediante @qvac/sdk.
QVAC_URL = "http://127.0.0.1:11500/generate"

def generate_with_qvac(prompt: str) -> str:
    """
    EnvÃ­a un prompt al modelo local de QVAC
    y devuelve solamente el texto generado.
    """

    payload = {
        "prompt": prompt,
    }

    # Todo ocurre en localhost.
    response = httpx.post(
        QVAC_URL,
        json=payload,
        timeout=httpx.Timeout(180.0, connect=5.0),
    )

    # Si QVAC responde con error HTTP, Python lo mostrarÃ¡.
    response.raise_for_status()

    data = response.json()

    text = data.get("output_text")
    if not isinstance(text, str) or not text.strip():
        raise ValueError("QVAC returned no text")
    return text.strip()
