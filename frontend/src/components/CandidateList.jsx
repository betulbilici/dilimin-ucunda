import CandidateCard from "./CandidateCard";
import "./CandidateList.css";

export default function CandidateList({ niyet, adaylar }) {
  return (
    <section className="sonuclar-bolumu" aria-labelledby="sonuclar-baslik">
      <div className="niyet-seridi">
        <div className="niyet-ust">
          <h2 id="sonuclar-baslik" className="niyet-etiket">
            Anlaşılan niyet
          </h2>
          <span className="sonuc-sayaci">{adaylar.length} aday kelime</span>
        </div>
        {niyet && <p className="niyet-metni">{niyet}</p>}
      </div>

      <ul className="aday-listesi">
        {adaylar.map((aday) => (
          <li key={aday.kelime} className="aday-listesi-ogesi">
            <CandidateCard aday={aday} />
          </li>
        ))}
      </ul>
    </section>
  );
}
