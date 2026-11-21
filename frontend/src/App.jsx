import { useEffect, useRef, useState } from "react";
import { kelimeAra } from "./api";
import CandidateList from "./components/CandidateList";
import EmptyState from "./components/EmptyState";
import ErrorState from "./components/ErrorState";
import LoadingState from "./components/LoadingState";
import SearchBox from "./components/SearchBox";
import "./App.css";

export default function App() {
  const [tarif, setTarif] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [sonuc, setSonuc] = useState(null);
  const istekKontrolRef = useRef(null);

  useEffect(() => {
    return () => {
      istekKontrolRef.current?.abort();
    };
  }, []);

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

  return (
    <div className="uygulama-kapsayici">
      <header className="ust-baslik">
        <p className="uygulama-etiketi">Türkçe Ters Sözlük</p>
        <h1 className="uygulama-basligi">Dilimin Ucunda</h1>
        <p className="uygulama-altbaslik">
          Aklındaki Türkçe kelimeyi anlamı veya hissiyle tarif et, yakın
          adayları anlam incelikleriyle keşfet.
        </p>
      </header>

      <main className="ana-icerik">
        <SearchBox
          tarif={tarif}
          onTarifChange={setTarif}
          onAra={aramayiBaslat}
          yukleniyor={yukleniyor}
        />

        <div className="sonuc-alani">
          {yukleniyor && <LoadingState />}
          {!yukleniyor && hata && (
            <ErrorState mesaj={hata} onTekrarDene={aramayiBaslat} />
          )}
          {!yukleniyor && !hata && sonuc && sonuc.adaylar.length === 0 && (
            <EmptyState niyet={sonuc.niyet} />
          )}
          {!yukleniyor && !hata && sonuc && sonuc.adaylar.length > 0 && (
            <CandidateList niyet={sonuc.niyet} adaylar={sonuc.adaylar} />
          )}
        </div>
      </main>
    </div>
  );
}
