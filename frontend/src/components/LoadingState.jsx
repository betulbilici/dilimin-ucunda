import "./LoadingState.css";

export default function LoadingState() {
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
