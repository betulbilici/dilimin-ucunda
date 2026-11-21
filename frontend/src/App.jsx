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
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [sonuc, setSonuc] = useState(null);
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
      kartRefleri.current[yeniSecim]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
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
        setSeciliKelime(null);
        setUzerindekiKelime(null);
      }
    } catch (err) {
      if (err && err.name === "AbortError") {
        return;
      }
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

  return (
    <div
      className={`uygulama-kapsayici ${
        sonucVar ? "uygulama-kapsayici--genis" : ""
      }`}
    >
      <header className="ust-baslik">
        <p className="uygulama-etiketi">Türkçe Ters Sözlük</p>
        <h1 className="uygulama-basligi">Dilimin Ucunda</h1>
        <p className="uygulama-altbaslik">
          Aklındaki Türkçe kelimeyi anlamı veya hissiyle tarif et, yakın
          adayları anlam incelikleriyle keşfet.
        </p>
      </header>

      <main className="ana-icerik">
        <div className="arama-bolumu">
          <SearchBox
            tarif={tarif}
            onTarifChange={setTarif}
            onAra={aramayiBaslat}
            yukleniyor={yukleniyor}
          />
        </div>

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
                    tarif={tarif}
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
