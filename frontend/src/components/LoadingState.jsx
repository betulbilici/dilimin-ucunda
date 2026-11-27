import { useEffect, useState } from "react";
import "./LoadingState.css";

export default function LoadingState() {
  const [uzunSurdu, setUzunSurdu] = useState(false);

  useEffect(() => {
    const zamanlayici = window.setTimeout(() => {
      setUzunSurdu(true);
    }, 6000);
    return () => {
      window.clearTimeout(zamanlayici);
    };
  }, []);

  return (
    <section
      className="yukleniyor-durumu"
      role="status"
      aria-live="polite"
      aria-label="Aday kelimeler aranıyor"
    >
      <p className="yukleniyor-metni">
        Kelimeler aranıyor ve anlam incelikleri karşılaştırılıyor...
      </p>

      {uzunSurdu && (
        <p className="yukleniyor-uyku-notu">
          Sunucu uyku modundan uyanıyorsa ilk istek 20–40 saniye sürebilir,
          lütfen bekleyin.
        </p>
      )}

      <div className="iskelet-listesi" aria-hidden="true">
        {[1, 2, 3].map((item) => (
          <div key={item} className="iskelet-karti">
            <div className="iskelet-ust">
              <span className="iskelet-parca iskelet-kelime" />
              <span className="iskelet-parca iskelet-rozet" />
            </div>
            <span className="iskelet-parca iskelet-satir" />
            <span className="iskelet-parca iskelet-satir iskelet-satir--kisa" />
            <div className="iskelet-parca iskelet-kutu" />
          </div>
        ))}
      </div>
    </section>
  );
}
