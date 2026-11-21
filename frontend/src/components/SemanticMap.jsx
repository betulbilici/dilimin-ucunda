import "./SemanticMap.css";

const VIEW_W = 620;
const VIEW_H = 540;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const MERKEZ_R = 66;
const MIN_YARICAP = 128;
const MAX_YARICAP = 205;
const ORTA_YARICAP = Math.round((MIN_YARICAP + MAX_YARICAP) / 2);
const DUGUM_YUKSEKLIK = 54;

const KATEGORI_HARITA = {
  duygu: {
    sinif: "duygu",
    etiket: "duygu",
    rx: 27,
    kesik: undefined,
    sekil: "daire",
  },
  eylem: {
    sinif: "eylem",
    etiket: "eylem",
    rx: 7,
    kesik: undefined,
    sekil: "ucgen",
  },
  "soyut kavram": {
    sinif: "soyut",
    etiket: "soyut kavram",
    rx: 14,
    kesik: "5 3",
    sekil: "elmas",
  },
};

function metniSatirla(metin, maxKarakter = 18, maxSatir = 3) {
  const temiz = (metin || "").trim();
  if (!temiz) {
    return ["Tarifiniz"];
  }

  const kelimeler = temiz.split(/\s+/);
  const satirlar = [];
  let guncel = "";

  for (let i = 0; i < kelimeler.length; i += 1) {
    const kelime = kelimeler[i];
    const aday = guncel ? `${guncel} ${kelime}` : kelime;

    if (aday.length <= maxKarakter) {
      guncel = aday;
      continue;
    }

    if (guncel) {
      satirlar.push(guncel);
      guncel =
        kelime.length > maxKarakter
          ? `${kelime.slice(0, maxKarakter - 1)}…`
          : kelime;
    } else {
      satirlar.push(`${kelime.slice(0, maxKarakter - 1)}…`);
      guncel = "";
    }

    if (satirlar.length === maxSatir) {
      const son = satirlar[maxSatir - 1];
      if (!son.endsWith("…")) {
        satirlar[maxSatir - 1] =
          son.length >= maxKarakter
            ? `${son.slice(0, maxKarakter - 1)}…`
            : `${son}…`;
      }
      return satirlar;
    }
  }

  if (guncel && satirlar.length < maxSatir) {
    satirlar.push(guncel);
  }

  return satirlar.length > 0 ? satirlar : ["Tarifiniz"];
}

function DugumSekli({ sekil, x, y }) {
  if (sekil === "ucgen") {
    return (
      <polygon
        points={`${x},${y - 5} ${x + 5},${y + 4} ${x - 5},${y + 4}`}
        fill="currentColor"
        aria-hidden="true"
      />
    );
  }
  if (sekil === "elmas") {
    return (
      <polygon
        points={`${x},${y - 5.5} ${x + 5.5},${y} ${x},${y + 5.5} ${x - 5.5},${y}`}
        fill="currentColor"
        aria-hidden="true"
      />
    );
  }
  return <circle cx={x} cy={y} r={4.5} fill="currentColor" aria-hidden="true" />;
}

export default function SemanticMap({
  niyet,
  tarif,
  adaylar,
  vurguluKelime,
  seciliKelime,
  onVurgula,
  onSec,
  onListeyeGit,
}) {
  const merkezMetni = (niyet || tarif || "").trim();
  const merkezSatirlari = metniSatirla(merkezMetni, 17, 3);
  const ilkSatirY = CY - ((merkezSatirlari.length - 1) * 16) / 2 + 9;

  const dugumler = adaylar.map((aday, index) => {
    const skor = Math.max(0, Math.min(100, Number(aday.yakinlik_skoru) || 0));
    const yaricap =
      MAX_YARICAP - (skor / 100) * (MAX_YARICAP - MIN_YARICAP);
    const aci = -Math.PI / 2 + (index * 2 * Math.PI) / adaylar.length;
    const x = CX + yaricap * Math.cos(aci);
    const y = CY + yaricap * Math.sin(aci);
    const genislik = Math.max(
      130,
      Math.min(180, aday.kelime.length * 9 + 48)
    );
    const kat = KATEGORI_HARITA[aday.kategori] || {
      sinif: "soyut",
      etiket: aday.kategori,
      rx: 14,
      kesik: "5 3",
      sekil: "elmas",
    };

    return { aday, skor, x, y, genislik, kat };
  });

  const aktifAday =
    adaylar.find((a) => a.kelime === (vurguluKelime || seciliKelime)) || null;
  const birDugumVurgulu = Boolean(vurguluKelime);

  return (
    <section className="harita-paneli" aria-labelledby="harita-baslik">
      <div className="harita-ust">
        <div>
          <h3 id="harita-baslik" className="harita-baslik">
            Anlam Haritası
          </h3>
          <p className="harita-altbaslik">
            Merkeze yakın sözcükler tarifinize daha yüksek uyum gösterir.
          </p>
        </div>
        {seciliKelime && (
          <button
            type="button"
            className="secim-temizle-buton"
            onClick={() => onSec(seciliKelime)}
          >
            Seçimi kaldır
          </button>
        )}
      </div>

      <div className="harita-svg-sarici">
        <svg
          className="anlam-haritasi-svg"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-labelledby="harita-svg-baslik harita-svg-aciklama"
        >
          <title id="harita-svg-baslik">
            Aday kelimelerin yakınlık ve kategori haritası
          </title>
          <desc id="harita-svg-aciklama">
            Merkezde aranan anlam özeti, çevresinde yakınlık skoruna göre
            konumlandırılmış {adaylar.length} Türkçe kelime adayı bulunur.
          </desc>

          {/* Yakınlık kılavuz halkaları */}
          <circle
            cx={CX}
            cy={CY}
            r={MAX_YARICAP}
            className="kilavuz-halkasi"
          />
          <circle
            cx={CX}
            cy={CY}
            r={ORTA_YARICAP}
            className="kilavuz-halkasi"
          />
          <circle
            cx={CX}
            cy={CY}
            r={MIN_YARICAP}
            className="kilavuz-halkasi kilavuz-halkasi--ic"
          />

          <text
            x={CX + MAX_YARICAP - 6}
            y={CY - 6}
            className="kilavuz-etiket"
            textAnchor="end"
          >
            daha uzak
          </text>
          <text
            x={CX + MIN_YARICAP - 4}
            y={CY - 6}
            className="kilavuz-etiket"
            textAnchor="end"
          >
            %100
          </text>

          {/* Merkezden düğümlere bağlantı çizgileri */}
          <g aria-hidden="true">
            {dugumler.map(({ aday, x, y }) => {
              const vurgulu = vurguluKelime === aday.kelime;
              const soluk = birDugumVurgulu && !vurgulu;
              return (
                <line
                  key={`cizgi-${aday.kelime}`}
                  x1={CX}
                  y1={CY}
                  x2={x}
                  y2={y}
                  className={`baglanti-cizgisi ${
                    vurgulu ? "baglanti-cizgisi--vurgulu" : ""
                  } ${soluk ? "baglanti-cizgisi--soluk" : ""}`}
                />
              );
            })}
          </g>

          {/* Merkez düğüm (kullanıcı niyeti / tarifi) */}
          <g className="merkez-dugum">
            <title>{merkezMetni}</title>
            <circle cx={CX} cy={CY} r={MERKEZ_R} className="merkez-daire" />
            <text
              x={CX}
              y={CY - 30}
              textAnchor="middle"
              className="merkez-etiket"
            >
              NİYET
            </text>
            <text
              x={CX}
              y={ilkSatirY}
              textAnchor="middle"
              className="merkez-metin"
            >
              {merkezSatirlari.map((satir, i) => (
                <tspan key={i} x={CX} dy={i === 0 ? 0 : 16}>
                  {satir}
                </tspan>
              ))}
            </text>
          </g>

          {/* Aday kelime düğümleri */}
          {dugumler.map(({ aday, skor, x, y, genislik, kat }) => {
            const vurgulu = vurguluKelime === aday.kelime;
            const secili = seciliKelime === aday.kelime;
            const soluk = birDugumVurgulu && !vurgulu;

            return (
              <g
                key={aday.kelime}
                transform={`translate(${x}, ${y})`}
                className={`harita-dugumu harita-dugumu--${kat.sinif} ${
                  vurgulu ? "harita-dugumu--vurgulu" : ""
                } ${secili ? "harita-dugumu--secili" : ""} ${
                  soluk ? "harita-dugumu--soluk" : ""
                }`}
                role="button"
                tabIndex={0}
                aria-pressed={secili}
                aria-label={`${aday.kelime}, ${kat.etiket}, yüzde ${skor} uyum${
                  aday.dogrulandi === false ? ", sözlükte doğrulanamadı" : ""
                }`}
                onMouseEnter={() => onVurgula(aday.kelime)}
                onMouseLeave={() => onVurgula(null)}
                onFocus={() => onVurgula(aday.kelime)}
                onBlur={() => onVurgula(null)}
                onClick={() => onSec(aday.kelime)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSec(aday.kelime);
                  }
                }}
              >
                <title>
                  {`${aday.kelime} (${kat.etiket}, %${skor})\n${aday.kisa_anlam}`}
                </title>

                <rect
                  x={-genislik / 2}
                  y={-DUGUM_YUKSEKLIK / 2}
                  width={genislik}
                  height={DUGUM_YUKSEKLIK}
                  rx={kat.rx}
                  strokeDasharray={kat.kesik}
                  className="harita-dugum-kutu"
                />

                <DugumSekli
                  sekil={kat.sekil}
                  x={-genislik / 2 + 16}
                  y={-7}
                />

                <text x={6} y={-2} textAnchor="middle" className="harita-kelime">
                  {aday.kelime}
                </text>

                <text x={0} y={16} textAnchor="middle" className="harita-altmeta">
                  {`${kat.etiket} · %${skor}`}
                </text>

                {aday.dogrulandi === false && (
                  <g
                    transform={`translate(${genislik / 2 - 4}, ${
                      -DUGUM_YUKSEKLIK / 2 + 4
                    })`}
                    aria-hidden="true"
                  >
                    <circle r={8} className="harita-uyari-daire" />
                    <text y={3.5} textAnchor="middle" className="harita-uyari-yazi">
                      !
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="harita-lejant" aria-label="Kategori açıklamaları">
        <span className="lejant-oge lejant-oge--duygu">
          <svg className="lejant-ikon" viewBox="0 0 12 12" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" fill="currentColor" />
          </svg>
          duygu (yuvarlak)
        </span>
        <span className="lejant-oge lejant-oge--eylem">
          <svg className="lejant-ikon" viewBox="0 0 12 12" aria-hidden="true">
            <polygon points="6,1.5 11,10.5 1,10.5" fill="currentColor" />
          </svg>
          eylem (köşeli)
        </span>
        <span className="lejant-oge lejant-oge--soyut">
          <svg className="lejant-ikon" viewBox="0 0 12 12" aria-hidden="true">
            <polygon points="6,1 11,6 6,11 1,6" fill="currentColor" />
          </svg>
          soyut kavram (kesikli)
        </span>
      </div>

      {aktifAday && (
        <div className="harita-onizleme" aria-live="polite">
          <div className="harita-onizleme-ust">
            <strong>{aktifAday.kelime}</strong>
            <span className="harita-onizleme-skor">
              %{aktifAday.yakinlik_skoru} uyum
            </span>
          </div>
          <p className="harita-onizleme-anlam">{aktifAday.kisa_anlam}</p>
          {seciliKelime === aktifAday.kelime && onListeyeGit && (
            <button
              type="button"
              className="harita-karta-git-buton"
              onClick={onListeyeGit}
            >
              Kart detayını gör
            </button>
          )}
        </div>
      )}
    </section>
  );
}
