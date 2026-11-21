"""Yerel Türkçe kelime listesi üzerinden sözcük doğrulama yardımcıları."""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path

VARSAYILAN_KELIME_DOSYASI = Path(__file__).resolve().parent / "kelimeler.txt"

_TURKCE_BUYUK_KUCUK = str.maketrans(
    {
        "İ": "i",
        "I": "ı",
        "Â": "â",
        "Î": "î",
        "Û": "û",
    }
)

_SAPKA_DONUSUM = str.maketrans(
    {
        "â": "a",
        "î": "i",
        "û": "u",
    }
)

_SERTLESME_TERS = {
    "b": "p",
    "c": "ç",
    "d": "t",
    "ğ": "k",
}

_FIILIMSI_EKLERI = (
    "lanma",
    "lenme",
    "laşma",
    "leşme",
    "ma",
    "me",
    "ış",
    "iş",
    "uş",
    "üş",
)

# En uzundan en kısaya doğru denenerek aşırı kırpmayı önler.
_EKLER = (
    "sızlık",
    "sizlik",
    "suzluk",
    "süzlük",
    "lanmak",
    "lenmek",
    "laşmak",
    "leşmek",
    "lanma",
    "lenme",
    "laşma",
    "leşme",
    "cılık",
    "cilik",
    "culuk",
    "cülük",
    "çılık",
    "çilik",
    "çuluk",
    "çülük",
    "mak",
    "mek",
    "lık",
    "lik",
    "luk",
    "lük",
    "sız",
    "siz",
    "suz",
    "süz",
    "lar",
    "ler",
    "dan",
    "den",
    "tan",
    "ten",
    "sal",
    "sel",
    "gın",
    "gin",
    "gun",
    "gün",
    "kın",
    "kin",
    "kun",
    "kün",
    "gan",
    "gen",
    "kan",
    "ken",
    "cı",
    "ci",
    "cu",
    "cü",
    "çı",
    "çi",
    "çu",
    "çü",
    "lı",
    "li",
    "lu",
    "lü",
    "ca",
    "ce",
    "ça",
    "çe",
    "ma",
    "me",
    "ış",
    "iş",
    "uş",
    "üş",
    "ım",
    "im",
    "um",
    "üm",
    "da",
    "de",
    "ta",
    "te",
    "ın",
    "in",
    "un",
    "ün",
    "la",
    "le",
)

_LISTE_ONBELLEGI: dict[Path, tuple[int, frozenset[str] | None]] = {}


def turkce_kucult(metin: str) -> str:
    """Türkçe büyük/küçük harf kuralına (İ->i, I->ı) uygun şekilde küçültür."""
    norm = unicodedata.normalize("NFC", metin)
    kucuk = norm.translate(_TURKCE_BUYUK_KUCUK).lower()
    return kucuk.replace("\u0307", "").strip()


def _sapka_kaldir(kelime: str) -> str:
    return kelime.translate(_SAPKA_DONUSUM)


def kelime_listesini_yukle(dosya_yolu: Path | None = None) -> frozenset[str] | None:
    """Yerel kelime dosyasını yükler; dosya yoksa veya boşsa None döner."""
    hedef = (dosya_yolu or VARSAYILAN_KELIME_DOSYASI).resolve()
    try:
        durum = hedef.stat()
    except OSError:
        _LISTE_ONBELLEGI.pop(hedef, None)
        return None

    onbellek = _LISTE_ONBELLEGI.get(hedef)
    if onbellek is not None and onbellek[0] == durum.st_mtime_ns:
        return onbellek[1]

    kelimeler: set[str] = set()
    try:
        with hedef.open("r", encoding="utf-8") as f:
            for satir in f:
                temiz = satir.strip()
                if not temiz or temiz.startswith("#"):
                    continue
                kucuk = turkce_kucult(temiz)
                if kucuk:
                    kelimeler.add(kucuk)
    except OSError:
        _LISTE_ONBELLEGI.pop(hedef, None)
        return None

    sonuc = frozenset(kelimeler) if kelimeler else None
    _LISTE_ONBELLEGI[hedef] = (durum.st_mtime_ns, sonuc)
    return sonuc


def _yumusama_adaylari(kok: str) -> list[str]:
    adaylar = [kok]
    if kok and kok[-1] in _SERTLESME_TERS:
        adaylar.append(kok[:-1] + _SERTLESME_TERS[kok[-1]])
    return adaylar


def _ek_kirp_adaylari(kelime: str) -> list[str]:
    """Tek kelimeler için olası kök adaylarını ek kırpmayla üretir."""
    if not kelime or any(ch.isspace() for ch in kelime):
        return []

    bulunanlar: list[str] = []
    gorulenler: set[str] = set()

    def ekle(aday: str) -> None:
        if aday not in gorulenler:
            gorulenler.add(aday)
            bulunanlar.append(aday)

    ilk_kokler: list[str] = []
    for ek in _EKLER:
        if kelime.endswith(ek) and len(kelime) - len(ek) >= 3:
            kok = kelime[: -len(ek)]
            for varyant in _yumusama_adaylari(kok):
                ekle(varyant)
                ilk_kokler.append(varyant)
            if ek in _FIILIMSI_EKLERI:
                ekle(kok + "mak")
                ekle(kok + "mek")

    # İkinci kademe basit ek kırpma (ör. "yabancılık" -> "yabancı" -> "yaban")
    for ara_kok in ilk_kokler:
        for ek in _EKLER:
            if ara_kok.endswith(ek) and len(ara_kok) - len(ek) >= 3:
                ikinci_kok = ara_kok[: -len(ek)]
                for varyant in _yumusama_adaylari(ikinci_kok):
                    ekle(varyant)
                if ek in _FIILIMSI_EKLERI:
                    ekle(ikinci_kok + "mak")
                    ekle(ikinci_kok + "mek")

    return bulunanlar


def kelime_dogrula(kelime: str, dosya_yolu: Path | None = None) -> bool | None:
    """Kelimenin yerel Türkçe sözlükte bulunup bulunmadığını doğrular.

    Sözlük dosyası yoksa None, doğrulanırsa True, bulunamazsa False döner.
    """
    kelimeler = kelime_listesini_yukle(dosya_yolu)
    if kelimeler is None:
        return None

    temiz = turkce_kucult(kelime)
    if not temiz:
        return False

    if temiz in kelimeler or _sapka_kaldir(temiz) in kelimeler:
        return True

    for aday in _ek_kirp_adaylari(temiz):
        if aday in kelimeler or _sapka_kaldir(aday) in kelimeler:
            return True

    return False


def _tek_duzenleme_mi(a: str, b: str) -> bool:
    """İki dizge arasındaki Damerau-Levenshtein mesafesinin tam 1 olup olmadığını kontrol eder."""
    if a == b:
        return False
    la, lb = len(a), len(b)
    if abs(la - lb) > 1:
        return False

    if la == lb:
        farklar = [i for i in range(la) if a[i] != b[i]]
        if len(farklar) == 1:
            return True
        if len(farklar) == 2:
            i, j = farklar
            return j == i + 1 and a[i] == b[j] and a[j] == b[i]
        return False

    kisa, uzun = (a, b) if la < lb else (b, a)
    i = 0
    j = 0
    fark_var = False
    while i < len(kisa) and j < len(uzun):
        if kisa[i] == uzun[j]:
            i += 1
            j += 1
        else:
            if fark_var:
                return False
            fark_var = True
            j += 1
    return True


def ornekten_yazim_duzelt(
    kelime: str,
    ornek_cumle: str,
    dosya_yolu: Path | None = None,
) -> str | None:
    """Doğrulanamayan tek kelimede örnek cümle desteğiyle 1 harflik yazım hatasını düzeltir."""
    kelimeler = kelime_listesini_yukle(dosya_yolu)
    if kelimeler is None:
        return None

    temiz = turkce_kucult(kelime)
    if len(temiz) < 4 or any(ch.isspace() for ch in temiz):
        return None

    sozcukler = re.findall(r"[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]+", ornek_cumle or "")
    for ham_sozcuk in sozcukler:
        sozcuk = turkce_kucult(ham_sozcuk)
        if len(sozcuk) < 3:
            continue

        for uzunluk in (len(temiz) - 1, len(temiz), len(temiz) + 1):
            if 3 <= uzunluk <= len(sozcuk):
                on_ek = sozcuk[:uzunluk]
                for kok in _yumusama_adaylari(on_ek):
                    if kok in kelimeler and _tek_duzenleme_mi(temiz, kok):
                        return kok

        if temiz.endswith(("mak", "mek")):
            for uzunluk in (len(temiz) - 4, len(temiz) - 3, len(temiz) - 2):
                if 3 <= uzunluk <= len(sozcuk):
                    on_ek = sozcuk[:uzunluk]
                    for taban in _yumusama_adaylari(on_ek):
                        for ek in ("mak", "mek"):
                            mastar = taban + ek
                            if mastar in kelimeler and _tek_duzenleme_mi(temiz, mastar):
                                return mastar

    return None
