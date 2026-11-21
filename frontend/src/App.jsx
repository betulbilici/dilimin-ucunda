import { useEffect, useRef, useState } from "react";
import { kelimeAra } from "./api";
import CandidateList from "./components/CandidateList";
import EmptyState from "./components/EmptyState";
import ErrorState from "./components/ErrorState";
import LoadingState from "./components/LoadingState";
import SearchBox from "./components/SearchBox";
import SemanticMap from "./components/SemanticMap";
import "./App.css";

export default function App() {
  const [tarif, setTarif] = useState("");
  const [sonArananTarif, setSonArananTarif] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [sonuc, setSonuc] = useState(null);
  const [aramaAcik, setAramaAcik] = useState(true);
  const [seciliKelime, setSeciliKelime] = useState(null);
  const [uzerindekiKelime, setUzerindekiKelime] = useState(null);
  const [aktifSekme, setAktifSekme] = useState("liste");

  const istekKontrolRef = useRef(null);
  const kartRefleri = useRef({});

  useEffect(() => {
    return () => {
      istekKontrolRef.current?.abort();
    };
  }, []);

  function kartRefAyarla(kelime, el) {
    if (el) {
      kartRefleri.current[kelime] = el;
    } else {
      delete kartRefleri.current[kelime];
    }
  }

  function kartSec(kelime) {
    setSeciliKelime((onceki) => (onceki === kelime ? null : kelime));
  }

  function haritadanSec(kelime) {
    const yeniSecim = seciliKelime === kelime ? null : kelime;
    setSeciliKelime(yeniSecim);

    if (yeniSecim && window.innerWidth > 960) {
      const el = kartRefleri.current[yeniSecim];
      if (el) {
        const rect = el.getBoundingClientRect();
        const gorunur = rect.top >= 0 && rect.bottom <= window.innerHeight;
        if (!gorunur) {
          el.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }
    }
  }

  function listeyeGit() {
    setAktifSekme("liste");
    if (seciliKelime) {
      window.setTimeout(() => {
        kartRefleri.current[seciliKelime]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 40);
    }
  }

  async function aramayiBaslat() {
    istekKontrolRef.current?.abort();
    const controller = new AbortController();
    istekKontrolRef.current = controller;

    setYukleniyor(true);
    setHata("");

    try {
      const veri = await kelimeAra(tarif, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setSonuc(veri);
        setSonArananTarif(tarif.trim());
        setSeciliKelime(null);
        setUzerindekiKelime(null);
        if (veri.adaylar.length > 0) {
          setAramaAcik(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          setAramaAcik(true);
        }
      }
    } catch (err) {
      if (err && err.name === "AbortError") {
        return;
      }
      setAramaAcik(true);
      setHata(
        err instanceof Error && err.message
          ? err.message
          : "Arama sırasında beklenmeyen bir hata oluştu."
      );
    } finally {
      if (istekKontrolRef.current === controller) {
        setYukleniyor(false);
      }
    }
  }

  const vurguluKelime = uzerindekiKelime || seciliKelime;
  const sonucVar = !yukleniyor && !hata && sonuc && sonuc.adaylar.length > 0;
  const kompaktMod = sonucVar || (yukleniyor && sonuc && sonuc.adaylar.length > 0);

  return (
    <div
      className={`uygulama-kapsayici ${
        sonucVar ? "uygulama-kapsayici--genis" : ""
      }`}
    >
      {kompaktMod ? (
        <header className="sonuc-ust-cubugu">
          <div className="sonuc-ust-sol">
            <span className="kompakt-marka">Dilimin Ucunda</span>
            {sonArananTarif && (
              <p className="kompakt-tarif" title={sonArananTarif}>
                “{sonArananTarif}”
              </p>
            )}
          </div>
          {sonucVar && (
            <button
              type="button"
              className="yeni-tarif-buton"
              aria-expanded={aramaAcik}
              onClick={() => setAramaAcik((onceki) => !onceki)}
            >
              {aramaAcik ? "Aramayı gizle" : "Yeni tarif"}
            </button>
          )}
        </header>
      ) : (
        <header className="ust-baslik">
          <p className="uygulama-etiketi">Türkçe Ters Sözlük</p>
          <h1 className="uygulama-basligi">Dilimin Ucunda</h1>
          <p className="uygulama-altbaslik">
            Aklındaki Türkçe kelimeyi anlamı veya hissiyle tarif et, yakın
            adayları anlam incelikleriyle keşfet.
          </p>
        </header>
      )}

      <main className="ana-icerik">
        {(!kompaktMod || aramaAcik) && (
          <div className="arama-bolumu">
            <SearchBox
              tarif={tarif}
              onTarifChange={setTarif}
              onAra={aramayiBaslat}
              yukleniyor={yukleniyor}
              otomatikOdak={sonucVar && aramaAcik}
              onKapat={sonucVar ? () => setAramaAcik(false) : undefined}
            />
          </div>
        )}

        <div className="sonuc-alani">
          {yukleniyor && (
            <div className="durum-sarici">
              <LoadingState />
            </div>
          )}
          {!yukleniyor && hata && (
            <div className="durum-sarici">
              <ErrorState mesaj={hata} onTekrarDene={aramayiBaslat} />
            </div>
          )}
          {!yukleniyor && !hata && sonuc && sonuc.adaylar.length === 0 && (
            <div className="durum-sarici">
              <EmptyState niyet={sonuc.niyet} />
            </div>
          )}

          {sonucVar && (
            <div className="sonuclar-kapsayici">
              <div className="niyet-seridi" aria-labelledby="sonuclar-baslik">
                <div className="niyet-ust">
                  <h2 id="sonuclar-baslik" className="niyet-etiket">
                    Anlaşılan niyet
                  </h2>
                  <span className="sonuc-sayaci">
                    {sonuc.adaylar.length} aday kelime
                  </span>
                </div>
                {sonuc.niyet && <p className="niyet-metni">{sonuc.niyet}</p>}
              </div>

              <div
                className="gorunum-sekmeleri"
                role="tablist"
                aria-label="Sonuç görünümü"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={aktifSekme === "liste"}
                  className={`sekme-buton ${
                    aktifSekme === "liste" ? "sekme-buton--aktif" : ""
                  }`}
                  onClick={() => setAktifSekme("liste")}
                >
                  Kart Listesi
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={aktifSekme === "harita"}
                  className={`sekme-buton ${
                    aktifSekme === "harita" ? "sekme-buton--aktif" : ""
                  }`}
                  onClick={() => setAktifSekme("harita")}
                >
                  Anlam Haritası
                </button>
              </div>

              <div className="sonuc-izgarasi">
                <div
                  className={`izgara-panel ${
                    aktifSekme !== "liste" ? "izgara-panel--gizli" : ""
                  }`}
                >
                  <CandidateList
                    adaylar={sonuc.adaylar}
                    vurguluKelime={vurguluKelime}
                    seciliKelime={seciliKelime}
                    onSec={kartSec}
                    onVurgula={setUzerindekiKelime}
                    kartRefAyarla={kartRefAyarla}
                  />
                </div>

                <div
                  className={`izgara-panel izgara-panel--harita ${
                    aktifSekme !== "harita" ? "izgara-panel--gizli" : ""
                  }`}
                >
                  <SemanticMap
                    niyet={sonuc.niyet}
                    tarif={sonArananTarif || tarif}
                    adaylar={sonuc.adaylar}
                    vurguluKelime={vurguluKelime}
                    seciliKelime={seciliKelime}
                    onVurgula={setUzerindekiKelime}
                    onSec={haritadanSec}
                    onListeyeGit={listeyeGit}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
