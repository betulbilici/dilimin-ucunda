import { useEffect, useRef } from "react";
import "./SearchBox.css";

const ORNEK_TARIFLER = [
  {
    etiket: "Hem beğenip hem buruk hissetmek",
    metin:
      "Başkasının başarısını görünce hem beğenmek hem de kendisi için biraz buruk hissetmek",
  },
  {
    etiket: "Dolambaçlı yoldan ima etmek",
    metin:
      "Söylenmesi gereken bir şeyi doğrudan söylemeyip dolambaçlı ifadelerle ima etmek",
  },
  {
    etiket: "Tatlı ama acıtan geçmiş özlemi",
    metin:
      "Eski bir şarkıyı duyunca geçmişe karşı hissedilen tatlı ama hafif acıtan özlem",
  },
];

export default function SearchBox({
  tarif,
  onTarifChange,
  onAra,
  yukleniyor,
  otomatikOdak = false,
  onKapat,
}) {
  const textareaRef = useRef(null);
  const kirpilmisUzunluk = tarif.trim().length;

  useEffect(() => {
    if (otomatikOdak) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [otomatikOdak]);

  let uzunlukNotu = "10 – 500 karakter arası";
  let uzunlukDurumu = "normal";
  if (kirpilmisUzunluk > 0 && kirpilmisUzunluk < 10) {
    uzunlukNotu = "En az 10 karakter yazın";
    uzunlukDurumu = "uyari";
  } else if (kirpilmisUzunluk > 500) {
    uzunlukNotu = "En fazla 500 karakter olabilir";
    uzunlukDurumu = "hata";
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!yukleniyor) {
      onAra();
    }
  }

  function handleKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (!yukleniyor) {
        onAra();
      }
    } else if (event.key === "Escape" && onKapat) {
      event.preventDefault();
      onKapat();
    }
  }

  function handleOrnekSec(metin) {
    onTarifChange(metin);
    textareaRef.current?.focus();
  }

  function handleTemizle() {
    onTarifChange("");
    textareaRef.current?.focus();
  }

  return (
    <section
      className="arama-kutusu-sarici"
      aria-labelledby="tarif-etiket"
      onKeyDown={(e) => {
        if (e.key === "Escape" && onKapat) {
          e.preventDefault();
          onKapat();
        }
      }}
    >
      <form className="arama-formu" onSubmit={handleSubmit} noValidate>
        <div className="arama-etiket-satiri">
          <label id="tarif-etiket" htmlFor="tarif-alani" className="arama-etiket">
            Aklındaki anlamı, hissi veya durumu tarif et
          </label>
          <div className="arama-ust-sag">
            <span className="klavye-ipucu" aria-hidden="true">
              Ctrl + Enter ile ara
            </span>
            {onKapat && (
              <button
                type="button"
                className="arama-kapat-buton"
                onClick={onKapat}
              >
                Kapat
              </button>
            )}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          id="tarif-alani"
          className="tarif-girisi"
          rows={4}
          value={tarif}
          onChange={(e) => onTarifChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Örn: Uzun zamandır görmediğin bir yeri ilk kez görür gibi yabancılamak ama aynı zamanda tanıdık hissetmek..."
          aria-describedby="tarif-yardim"
        />

        <div className="arama-alt-satir">
          <p
            id="tarif-yardim"
            className={`karakter-sayaci karakter-sayaci--${uzunlukDurumu}`}
          >
            <span>{kirpilmisUzunluk} / 500 karakter</span>
            <span aria-hidden="true">·</span>
            <span>{uzunlukNotu}</span>
          </p>

          <div className="arama-aksiyonlari">
            {tarif.length > 0 && (
              <button
                type="button"
                className="temizle-butonu"
                onClick={handleTemizle}
                disabled={yukleniyor}
              >
                Temizle
              </button>
            )}
            <button
              type="submit"
              className="ara-butonu"
              disabled={yukleniyor}
              aria-busy={yukleniyor}
            >
              {yukleniyor ? "Aranıyor..." : "Ara"}
            </button>
          </div>
        </div>
      </form>

      <div className="ornekler-alani" aria-label="Örnek tarifler">
        <span className="ornekler-baslik">Örnek tarifler:</span>
        <div className="ornekler-listesi">
          {ORNEK_TARIFLER.map((ornek) => (
            <button
              key={ornek.etiket}
              type="button"
              className="ornek-buton"
              onClick={() => handleOrnekSec(ornek.metin)}
              disabled={yukleniyor}
            >
              {ornek.etiket}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
