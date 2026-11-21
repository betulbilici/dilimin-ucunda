import "./EmptyState.css";

export default function EmptyState({ niyet }) {
  return (
    <section className="bos-durum" role="status">
      <h2 className="bos-baslik">Uygun aday kelime bulunamadı</h2>
      <p className="bos-aciklama">
        Girdiğiniz tarifle tam örtüşen güncel bir Türkçe sözcük önerilemedi.
        Duyguyu, eylemi veya bağlamı birkaç sözcükle biraz daha netleştirip
        tekrar arayabilirsiniz.
      </p>
      {niyet && (
        <p className="bos-niyet">
          <strong>Anlaşılan niyet:</strong> {niyet}
        </p>
      )}
    </section>
  );
}
