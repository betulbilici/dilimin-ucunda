import "./CandidateCard.css";

const KATEGORI_GORUNUMU = {
  duygu: {
    sinif: "duygu",
    etiket: "duygu",
    sekil: "daire",
  },
  eylem: {
    sinif: "eylem",
    etiket: "eylem",
    sekil: "ucgen",
  },
  "soyut kavram": {
    sinif: "soyut",
    etiket: "soyut kavram",
    sekil: "elmas",
  },
};

function KategoriSekli({ sekil }) {
  if (sekil === "ucgen") {
    return (
      <svg className="kategori-sekil" viewBox="0 0 12 12" aria-hidden="true">
        <polygon points="6,1.5 11,10.5 1,10.5" fill="currentColor" />
      </svg>
    );
  }
  if (sekil === "elmas") {
    return (
      <svg className="kategori-sekil" viewBox="0 0 12 12" aria-hidden="true">
        <polygon points="6,1 11,6 6,11 1,6" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg className="kategori-sekil" viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" fill="currentColor" />
    </svg>
  );
}

export default function CandidateCard({
  aday,
  vurgulu = false,
  secili = false,
  onSec,
  onVurgula,
  kartRef,
}) {
  const kat = KATEGORI_GORUNUMU[aday.kategori] || {
    sinif: "soyut",
    etiket: aday.kategori,
    sekil: "elmas",
  };

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSec?.(aday.kelime);
    }
  }

  return (
    <article
      ref={kartRef}
      className={`aday-karti ${vurgulu ? "aday-karti--vurgulu" : ""} ${
        secili ? "aday-karti--secili" : ""
      }`}
      role="button"
      tabIndex={0}
      aria-pressed={secili}
      onClick={() => onSec?.(aday.kelime)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onVurgula?.(aday.kelime)}
      onMouseLeave={() => onVurgula?.(null)}
      onFocus={() => onVurgula?.(aday.kelime)}
      onBlur={() => onVurgula?.(null)}
    >
      <header className="aday-ust">
        <div className="aday-baslik-grubu">
          <h3 className="aday-kelime">{aday.kelime}</h3>
          {aday.dogrulandi === false && (
            <span
              className="dogrulanamadi-rozeti"
              role="note"
              title="Bu sözcük yerel Türkçe kelime listesinde doğrudan eşleştirilemedi."
            >
              sözlükte doğrulanamadı
            </span>
          )}
          {secili && (
            <span className="harita-secili-etiketi">Haritada seçili</span>
          )}
        </div>

        <div className="aday-meta">
          <span className={`kategori-rozeti kategori-rozeti--${kat.sinif}`}>
            <KategoriSekli sekil={kat.sekil} />
            <span>{kat.etiket}</span>
          </span>
          <span
            className="yakinlik-rozeti"
            aria-label={`Yakınlık skoru yüzde ${aday.yakinlik_skoru}`}
          >
            %{aday.yakinlik_skoru} uyum
          </span>
        </div>
      </header>

      <p className="aday-anlam">{aday.kisa_anlam}</p>

      <blockquote className="aday-ornek">
        <span className="aday-bolum-etiket">Örnek cümle</span>
        <p className="aday-ornek-metin">“{aday.ornek_cumle}”</p>
      </blockquote>

      <div className="aday-farklilik">
        <h4 className="aday-farklilik-baslik">Diğerlerinden farkı</h4>
        <p className="aday-farklilik-metin">{aday.farklilik}</p>
      </div>
    </article>
  );
}
