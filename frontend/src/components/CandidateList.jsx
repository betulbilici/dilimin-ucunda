import CandidateCard from "./CandidateCard";
import "./CandidateList.css";

export default function CandidateList({
  adaylar,
  vurguluKelime,
  seciliKelime,
  onSec,
  onVurgula,
  kartRefAyarla,
}) {
  return (
    <section className="liste-bolumu" aria-label="Aday kelimeler">
      <ul className="aday-listesi">
        {adaylar.map((aday) => (
          <li key={aday.kelime} className="aday-listesi-ogesi">
            <CandidateCard
              aday={aday}
              vurgulu={vurguluKelime === aday.kelime}
              secili={seciliKelime === aday.kelime}
              onSec={onSec}
              onVurgula={onVurgula}
              kartRef={(el) => kartRefAyarla?.(aday.kelime, el)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
