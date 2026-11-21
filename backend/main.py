"""Dilimin Ucunda - FastAPI arka uç giriş noktası."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator

try:
    from .llm import AdayKelime, LLMYanitHatasi, YapilandirmaHatasi, adaylari_uret
    from .verify import kelime_dogrula
except ImportError:
    from llm import AdayKelime, LLMYanitHatasi, YapilandirmaHatasi, adaylari_uret
    from verify import kelime_dogrula

app = FastAPI(title="Dilimin Ucunda API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class AramaIstegi(BaseModel):
    tarif: str

    @field_validator("tarif")
    @classmethod
    def _tarif_dogrula(cls, deger: str) -> str:
        temiz = deger.strip()
        if not temiz:
            raise ValueError(
                "Tarif alanı boş bırakılamaz. Lütfen aradığınız kelimeyi en az 10 karakterle tarif edin."
            )
        if len(temiz) < 10:
            raise ValueError(
                "Tarif çok kısa (en az 10 karakter olmalı). Lütfen anlamı veya hissi biraz daha ayrıntılı yazın."
            )
        if len(temiz) > 500:
            raise ValueError(
                "Tarif çok uzun (en fazla 500 karakter olabilir). Lütfen açıklamanızı biraz kısaltın."
            )
        return temiz


class DogrulanmisAday(AdayKelime):
    dogrulandi: bool | None


class AramaYaniti(BaseModel):
    niyet: str
    adaylar: list[DogrulanmisAday]


def _turkce_dogrulama_mesaji(hata: dict) -> str:
    tip = hata.get("type", "")
    mesaj = str(hata.get("msg", ""))
    if mesaj.startswith("Value error, "):
        return mesaj.removeprefix("Value error, ")
    if tip == "missing":
        return "İstek gövdesinde 'tarif' alanı zorunludur."
    if tip == "json_invalid":
        return "Geçersiz JSON biçimi gönderildi."
    if tip == "string_type":
        return "'tarif' alanı metin (string) olmalıdır."
    if tip in {"model_type", "model_attributes_type"}:
        return "İstek gövdesi geçerli bir JSON nesnesi olmalıdır."
    return "Gönderilen arama tarifi geçersiz; lütfen 10-500 karakter arasında bir metin girin."


@app.exception_handler(RequestValidationError)
async def dogrulama_hatasi_yakala(_istek, exc: RequestValidationError) -> JSONResponse:
    hatalar = exc.errors()
    mesaj = (
        _turkce_dogrulama_mesaji(hatalar[0])
        if hatalar
        else "Geçersiz istek verisi."
    )
    return JSONResponse(status_code=422, content={"detail": mesaj})


@app.post("/api/ara", response_model=AramaYaniti)
def ara(istek: AramaIstegi) -> AramaYaniti:
    try:
        sonuc = adaylari_uret(istek.tarif)
    except YapilandirmaHatasi as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except LLMYanitHatasi as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    dogrulanmis_adaylar = [
        DogrulanmisAday(
            **aday.model_dump(),
            dogrulandi=kelime_dogrula(aday.kelime),
        )
        for aday in sonuc.adaylar
    ]
    return AramaYaniti(niyet=sonuc.niyet, adaylar=dogrulanmis_adaylar)
