import "./ErrorState.css";

export default function ErrorState({ mesaj, onTekrarDene }) {
  return (
    <section className="hata-kutusu" role="alert">
      <div className="hata-icerik">
        <h2 className="hata-baslik">Arama tamamlanamadı</h2>
        <p className="hata-mesaj">{mesaj}</p>
      </div>
      {onTekrarDene && (
        <button
          type="button"
          className="tekrar-dene-butonu"
          onClick={onTekrarDene}
        >
          Tekrar dene
        </button>
      )}
    </section>
  );
}
