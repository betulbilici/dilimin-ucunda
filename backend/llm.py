"""Gemini API üzerinden Türkçe ters sözlük adayları üreten modül."""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import Literal

from google import genai
from google.genai import types
from pydantic import BaseModel, Field, ValidationError, field_validator

logger = logging.getLogger("uvicorn.error")

Kategori = Literal["duygu", "eylem", "soyut kavram"]


class YapilandirmaHatasi(RuntimeError):
    """Ortam değişkenleri veya model yapılandırması eksik olduğunda fırlatılır."""


class LLMYanitHatasi(RuntimeError):
    """Gemini servisi geçerli veya şemaya uygun yanıt üretemediğinde fırlatılır."""


class AdayKelime(BaseModel):
    kelime: str
    kategori: Kategori
    kisa_anlam: str
    ornek_cumle: str
    farklilik: str
    yakinlik_skoru: int = Field(ge=0, le=100)

    @field_validator("kelime", "kisa_anlam", "ornek_cumle", "farklilik")
    @classmethod
    def _bos_olamaz(cls, deger: str) -> str:
        temiz = deger.strip()
        if not temiz:
            raise ValueError("Metin alanı boş olamaz.")
        return temiz

    @field_validator("kelime")
    @classmethod
    def _tek_sozcuk_olmali(cls, deger: str) -> str:
        if len(deger.split()) > 1:
            raise ValueError("kelime alanı tek bir sözcük olmalıdır.")
        return deger


class LLMAramaYaniti(BaseModel):
    niyet: str
    adaylar: list[AdayKelime] = Field(min_length=3, max_length=5)

    @field_validator("niyet")
    @classmethod
    def _niyet_bos_olamaz(cls, deger: str) -> str:
        temiz = deger.strip()
        if not temiz:
            raise ValueError("niyet alanı boş olamaz.")
        return temiz

    @field_validator("adaylar")
    @classmethod
    def _skora_gore_sirala(cls, deger: list[AdayKelime]) -> list[AdayKelime]:
        return sorted(deger, key=lambda aday: aday.yakinlik_skoru, reverse=True)


_SISTEM_PROMPTU = """Sen Türkçeye derinlemesine hâkim, titiz bir sözlükbilimcisin.
Görevin, kullanıcının anlamını veya hissini tarif ettiği ancak adını hatırlayamadığı Türkçe sözcükleri bulmaktır.

Çalışma kuralların:
1. Önce kullanıcının tarifinden tam olarak neyi aradığını tek cümleyle yorumlayıp `niyet` alanını çıkar; ardından yalnızca bu niyete uygun adayları üret.
2. Yalnızca Türkçede gerçekten var olan, güncel ve yerleşik Türkçe sözcükler öner. Uydurma sözcük, Türkçeye yerleşmemiş yabancı kelime veya günümüzde neredeyse hiç kullanılmayan aşırı arkaik kelimeler asla verme.
3. Her `kelime` kesinlikle boşluksuz TEK BİR SÖZCÜK olmalıdır. "gıpta etmek", "haset etmek", "sitem etmek" gibi yardımcı fiille kurulan iki kelimelik birleşik ifadeler ASLA yazma; bunların yerine tek sözcüklük kök/isim biçimini yaz ("gıpta", "haset", "sitem"). Yalnızca tek sözcükten oluşan fiilleri `-mak/-mek` mastar biçiminde yaz ("imrenmek", "özenmek").
4. Sırf sayıyı doldurmak için zayıf veya emin olmadığın adaylar ekleme; en az 3, en çok 5 isabetli aday ver.
5. Her aday için 0-100 arası tam sayı `yakinlik_skoru` belirle. Tüm adayların skorları birbirinden farklı olsun; tarife en uygun aday en yüksek skoru alsın ve adaylar yüksek skordan düşük skora sıralansın.
6. `farklilik` alanında genel sözlük tanımı tekrarlama; bu sözcüğün listedeki diğer adaylardan hangi somut anlam, duygu tonu, yoğunluk veya kullanım bağlamı inceliğiyle ayrıldığını açıkça belirt.
7. `kategori` alanı yalnızca `"duygu"`, `"eylem"` veya `"soyut kavram"` değerlerinden biri olabilir.
8. `ornek_cumle` doğal, günlük konuşma veya yazı diline uygun olmalıdır.

Örnek 1:
Kullanıcı tarifi: Yapması gereken önemli bir işi bilerek son ana bırakmak, sürekli başka şeylerle uğraşıp zamanı geçirmek
Beklenen JSON:
{
  "niyet": "Kullanıcı, önemli bir sorumluluğu erteleyip başka işlerle vakit öldürme davranışını karşılayan fiili arıyor.",
  "adaylar": [
    {
      "kelime": "savsaklamak",
      "kategori": "eylem",
      "kisa_anlam": "Yapılması gereken bir işi önemsemeyip bile bile geciktirmek veya üstünkörü bırakmak.",
      "ornek_cumle": "Raporu günlerdir savsakladığı için son akşam sabaha kadar çalışmak zorunda kaldı.",
      "farklilik": "Diğer adaylardan farklı olarak yalnızca zamanı ötelemeyi değil, göreve karşı belirgin bir gevşeklik ve ihmalkârlık tutumunu vurgular.",
      "yakinlik_skoru": 94
    },
    {
      "kelime": "ertelemek",
      "kategori": "eylem",
      "kisa_anlam": "Bir işin yapılmasını daha sonraki bir zamana bırakmak.",
      "ornek_cumle": "Yağmur dinmeyince hafta sonu pikniğini önümüzdeki aya erteledik.",
      "farklilik": "Savsaklamaktan daha nötrdür; ihmal veya kaçınma barındırmadan planlı bir ötelemeyi de anlatabilir.",
      "yakinlik_skoru": 85
    },
    {
      "kelime": "oyalanmak",
      "kategori": "eylem",
      "kisa_anlam": "Asıl işe başlamak yerine önemsiz veya geçici uğraşlarla vakit geçirmek.",
      "ornek_cumle": "Masasının üstünü toplamakla oyalanıp bir türlü derse oturamadı.",
      "farklilik": "Doğrudan işi geciktirme niyetinden çok, dikkati dağıtan yan uğraşlarla zaman harcama hâline odaklanır.",
      "yakinlik_skoru": 76
    },
    {
      "kelime": "geçiştirmek",
      "kategori": "eylem",
      "kisa_anlam": "Üzerinde durulması gereken bir konuyu veya işi yüzeysel biçimde savuşturmak.",
      "ornek_cumle": "Zor soruları kısa bir gülümsemeyle geçiştirip konuyu değiştirdi.",
      "farklilik": "İşi sonraya bırakmaktan ziyade, baştan savma bir tepkiyle sorumluluktan veya derinlikten kaçmayı ifade eder.",
      "yakinlik_skoru": 64
    }
  ]
}

Örnek 2:
Kullanıcı tarifi: Zor bir dönemde yanında olan birine karşı hissedilen, kolay kolay unutulmayan derin bağlılık ve iyilik bilme duygusu
Beklenen JSON:
{
  "niyet": "Kullanıcı, geçmişte gördüğü desteği unutmayıp karşı tarafa sadakatle iyilik borcu hissetme kavramını arıyor.",
  "adaylar": [
    {
      "kelime": "vefa",
      "kategori": "soyut kavram",
      "kisa_anlam": "Sevgi, dostluk ve görülen iyiliği zaman geçse de unutmama, bağlılığını sürdürme erdemi.",
      "ornek_cumle": "Yıllar sonra bile eski öğretmenini arayıp sorması büyük bir vefa örneğiydi.",
      "farklilik": "Minnet ve şükrandan farklı olarak tek seferlik bir teşekkür duygusundan çok, zamana direnen kalıcı bağlılığı ve hatırlamayı öne çıkarır.",
      "yakinlik_skoru": 95
    },
    {
      "kelime": "minnet",
      "kategori": "duygu",
      "kisa_anlam": "Yapılan bir iyiliğe karşı kendini borçlu ve gönülden bağlı hissetme duygusu.",
      "ornek_cumle": "O zor günlerde el uzatan komşusuna hâlâ derin bir minnet duyuyor.",
      "farklilik": "Vefaya göre daha içsel bir iyilik borcu hissini anlatır; eyleme dökülen sadakatten çok duyulan gönül borcuna odaklanır.",
      "yakinlik_skoru": 87
    },
    {
      "kelime": "şükran",
      "kategori": "duygu",
      "kisa_anlam": "Görülen iyilik veya destek karşısında duyulan saygılı teşekkür ve gönül hoşnutluğu.",
      "ornek_cumle": "Ekip arkadaşlarına emekleri için şükran duygularını iletti.",
      "farklilik": "Minnetten daha resmî ve takdir odaklıdır; borçluluk hissinden çok içten teşekkür ve saygı tonu taşır.",
      "yakinlik_skoru": 77
    },
    {
      "kelime": "sadakat",
      "kategori": "soyut kavram",
      "kisa_anlam": "Bir kişiye, söze veya değere güçlükler karşısında bile bağlı kalma tutumu.",
      "ornek_cumle": "Zorlu süreçte bile ekibe gösterdiği sadakat herkesin güvenini kazandı.",
      "farklilik": "Geçmişte yapılan bir iyiliğe karşılık vermekten ziyade, verilen söze ve ilişkiye sarsılmaz biçimde bağlı kalmayı vurgular.",
      "yakinlik_skoru": 68
    }
  ]
}"""


def _env_yukle() -> None:
    """Proje kökü ve backend dizinindeki .env dosyalarını standart kütüphaneyle yükler."""
    proje_koku = Path(__file__).resolve().parent.parent
    aday_dosyalar = [
        proje_koku / ".env",
        Path(__file__).resolve().parent / ".env",
    ]
    for env_yolu in aday_dosyalar:
        if not env_yolu.is_file():
            continue
        try:
            icerik = env_yolu.read_text(encoding="utf-8")
        except OSError:
            continue
        for ham_satir in icerik.splitlines():
            satir = ham_satir.strip()
            if not satir or satir.startswith("#"):
                continue
            if satir.startswith("export "):
                satir = satir[7:].strip()
            anahtar, ayirici, deger = satir.partition("=")
            if not ayirici:
                continue
            anahtar = anahtar.strip()
            deger = deger.strip()
            if len(deger) >= 2 and deger[0] == deger[-1] and deger[0] in {'"', "'"}:
                deger = deger[1:-1]
            if anahtar:
                os.environ.setdefault(anahtar, deger)


def _kullanici_hata_mesaji(exc: Exception | None) -> str:
    """Yakalanan hataya göre kullanıcıya gösterilebilir Türkçe mesaj seçer."""
    metin = str(exc or "").upper()
    if (
        isinstance(exc, TimeoutError)
        or "TIMEOUT" in metin
        or "TIMED OUT" in metin
        or "DEADLINE_EXCEEDED" in metin
    ):
        return "Yapay zeka servisi zaman aşımına uğradı. Lütfen tekrar deneyin."
    if "503" in metin or "UNAVAILABLE" in metin:
        return (
            "Seçili yapay zeka modeli şu an yoğun (503). Lütfen biraz sonra tekrar "
            "deneyin veya .env dosyasındaki GEMINI_MODEL değerini değiştirin."
        )
    if "429" in metin or "RESOURCE_EXHAUSTED" in metin:
        return (
            "Yapay zeka API kullanım kotası aşıldı (429). "
            "Lütfen bir süre bekleyip tekrar deneyin."
        )
    if "404" in metin or "NOT_FOUND" in metin:
        return (
            "Yapılandırılan GEMINI_MODEL bulunamadı (404). "
            "Lütfen .env dosyasındaki model adını kontrol edin."
        )
    return "Yapay zeka servisinden geçerli bir yanıt alınamadı. Lütfen birkaç saniye sonra tekrar deneyin."


def _kisa_dogrulama_ozeti(exc: Exception) -> str:
    if isinstance(exc, ValidationError):
        hatalar = exc.errors()
        if hatalar:
            ilk = hatalar[0]
            alan = ".".join(str(parca) for parca in ilk.get("loc", ()))
            mesaj = str(ilk.get("msg", "geçersiz değer"))
            return f"{alan}: {mesaj}" if alan else mesaj
    return str(exc)


def adaylari_uret(tarif: str) -> LLMAramaYaniti:
    """Verilen Türkçe tarife göre Gemini API'den yapılandırılmış kelime adayları üretir."""
    _env_yukle()

    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    model_adi = (os.getenv("GEMINI_MODEL") or "").strip()
    if not api_key or not model_adi:
        raise YapilandirmaHatasi(
            "Sunucu yapılandırması eksik: .env dosyasında GEMINI_API_KEY ve GEMINI_MODEL tanımlı olmalıdır."
        )

    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=25_000),
    )
    son_hata: Exception | None = None
    onceki_dogrulama_hatasi: str | None = None

    for deneme in range(2):
        icerik = f"Kullanıcı tarifi: {tarif}"
        if deneme == 1 and onceki_dogrulama_hatasi:
            icerik = (
                f"{icerik}\n\n"
                f"Not: Önceki yanıtta biçim/kural hatası oluştu ({onceki_dogrulama_hatasi}). "
                "Her 'kelime' boşluksuz TEK SÖZCÜK olmalı (ör. 'gıpta etmek' yerine 'gıpta') "
                "ve tüm şema kurallarına eksiksiz uyulmalıdır."
            )

        config = types.GenerateContentConfig(
            system_instruction=_SISTEM_PROMPTU,
            response_mime_type="application/json",
            response_schema=LLMAramaYaniti,
            temperature=0.3 if deneme == 0 else 0.15,
        )
        try:
            response = client.models.generate_content(
                model=model_adi,
                contents=icerik,
                config=config,
            )
            ham_metin = getattr(response, "text", None)
            if not ham_metin or not ham_metin.strip():
                raise ValueError("Model boş yanıt döndürdü.")
            return LLMAramaYaniti.model_validate_json(ham_metin)
        except Exception as exc:
            son_hata = exc
            guvenli_ozet = str(exc).replace(api_key, "***")
            logger.warning(
                "Gemini çağrısı başarısız (deneme=%d, model=%s): %s: %s",
                deneme + 1,
                model_adi,
                type(exc).__name__,
                guvenli_ozet,
            )
            if isinstance(exc, (ValidationError, ValueError)):
                onceki_dogrulama_hatasi = _kisa_dogrulama_ozeti(exc)
            else:
                onceki_dogrulama_hatasi = None
                hata_metni = guvenli_ozet.upper()
                if deneme == 0 and ("503" in hata_metni or "UNAVAILABLE" in hata_metni):
                    time.sleep(1.0)

    raise LLMYanitHatasi(_kullanici_hata_mesaji(son_hata)) from son_hata
