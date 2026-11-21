const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function durumHataMesaji(status) {
  if (status === 422) {
    return "Tarif en az 10, en fazla 500 karakter olmalıdır.";
  }
  if (status === 502) {
    return "Yapay zeka servisinden geçerli bir yanıt alınamadı. Lütfen tekrar deneyin.";
  }
  if (status >= 500) {
    return "Sunucuda geçici bir hata oluştu. Lütfen biraz sonra tekrar deneyin.";
  }
  return "İstek işlenirken beklenmeyen bir hata oluştu.";
}

export async function kelimeAra(tarif, { signal } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/ara`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tarif }),
      signal,
    });
  } catch (err) {
    if (err && err.name === "AbortError") {
      throw err;
    }
    throw new Error(
      `Sunucuya bağlanılamadı. Backend'in ${API_BASE_URL} adresinde çalıştığından emin olun.`
    );
  }

  const veri = await response.json().catch(() => null);

  if (!response.ok) {
    const detay =
      veri && typeof veri.detail === "string" && veri.detail.trim()
        ? veri.detail.trim()
        : durumHataMesaji(response.status);
    throw new Error(detay);
  }

  return {
    niyet: veri && typeof veri.niyet === "string" ? veri.niyet : "",
    adaylar: veri && Array.isArray(veri.adaylar) ? veri.adaylar : [],
  };
}
