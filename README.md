# Dilimin Ucunda — Yapay Zekâ Destekli Türkçe Ters Sözlük

Kullanıcının adını hatırlayamadığı bir Türkçe sözcüğü anlamını, hissini veya durumunu tarif ederek bulmasını sağlayan tek sayfalık ters sözlük web uygulamasıdır. Tariften önce kullanıcının niyetini yorumlar, ardından 3–5 aday sözcüğü yakınlık skoru, örnek cümlesi, diğer adaylardan farkı ve yerel sözlük doğrulamasıyla birlikte hem kart listesi hem de saf SVG anlam haritası olarak sunar.

## Özellikler

- **Yapılandırılmış LLM Çıktısı:** `google-genai` SDK'sının `response_mime_type="application/json"` ve `response_schema` özelliğiyle her aday için sözlük biçimi, kategori (`duygu`, `eylem`, `soyut kavram`), kısa anlam, örnek cümle, somut farklılık ve `0–100` yakınlık skoru üretir.
- **Yerel Türkçe Sözlük Doğrulaması:** Türkçe `İ/i` ve `I/ı` dönüşümlerini doğru uygulayarak adayları yerel `backend/kelimeler.txt` listesine karşı doğrular; bulunamazsa basit ek kırpma ve ünsüz yumuşaması tersine çevirme ile köke inmeyi dener.
- **Etkileşimli Saf SVG Anlam Haritası:** Merkezde anlaşılan niyeti, çevresinde yakınlık skoruna göre merkeze doğrusal uzaklıkta ve eşit açılarda dağılmış düğümleri gösterir. Renk körlüğü için kategori bazlı şekil/çerçeve ayrımı ve kartlarla çift yönlü vurgulama içerir.
- **Duyarlı ve Erişilebilir Arayüz:** Geniş ekranda kart listesi + sabit anlam haritası yan yana, dar ekranda sekme görünümünde açılır; klavye odak halkaları ve `Ctrl + Enter` kısayolu desteklenir.

## Teknoloji Yığını

- **Backend:** Python 3.11+, FastAPI, Pydantic, resmi `google-genai` SDK
- **Frontend:** React 18, Vite 6, düz CSS (CSS değişkenleri), saf inline SVG
- **Durum / Depolama:** Veritabanı yok; her arama sonucu yalnızca bellek içinde tutulur ve `GEMINI_API_KEY` asla istemciye gönderilmez.

## Kurulum ve `.env` Ayarı

### 1. Ortam Değişkenleri

Proje kökünde `.env.example` dosyasını kopyalayıp kendi `.env` dosyanızı oluşturun:

```powershell
Copy-Item .env.example .env
```

`.env` içindeki değerleri doldurun:

```env
GEMINI_API_KEY=buraya_gemini_api_anahtarinizi_yazin
GEMINI_MODEL=gemini-3.5-flash-lite
```

> **Not:** `GEMINI_MODEL` koda gömülmez; doğrudan `.env` içinden okunur. Canlı ortamda başka bir frontend adresinden istek alacaksanız isteğe bağlı `CORS_ORIGIN` değişkenini ekleyebilirsiniz.

### 2. Backend Bağımlılıkları

```powershell
pip install -r backend/requirements.txt
```

### 3. Yerel Kelime Listesi (`backend/kelimeler.txt`)

TDK'nın resmi ve açık bir sözlük API'si bulunmadığından doğrulama yerel `backend/kelimeler.txt` dosyası üzerinden yapılır. İhtiyaç hâlinde açık kaynak Türkçe kelime listeleriyle güncelleyebilirsiniz:

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/mertemin/turkish-word-list/master/words.txt" -OutFile "backend/kelimeler.txt"
```

Dosya silinirse veya boşsa uygulama hata vermeden çalışmayı sürdürür ve adaylarda `"dogrulandi": null` döner.

### 4. Frontend Bağımlılıkları

```powershell
cd frontend
npm install
```

## Yerelde Çalıştırma

İki ayrı terminal açın:

```powershell
# Terminal 1 (proje kök dizini)
python -m uvicorn backend.main:app --reload

# Terminal 2
cd frontend
npm run dev
```

- Backend API: `http://127.0.0.1:8000`
- Frontend Arayüz: `http://localhost:5173`

## GitHub Pages ile Yayınlama

GitHub Pages yalnızca statik dosyaları (`frontend/dist`) barındırır; `GEMINI_API_KEY` güvenliği için Python backend ayrı bir Python sunucusunda (ör. Render veya Railway) çalıştırılmalıdır.

1. **Backend'i Render'da tek tıkla yayınlayın:** Depodaki [`render.yaml`](render.yaml) Blueprint dosyası hazır gelir. Render panelinden **New + → Blueprint** seçip bu depoyu bağlayın; açılan ekranda yalnızca `GEMINI_API_KEY` değerini girin (`GEMINI_MODEL=gemini-3.5-flash-lite`, `CORS_ORIGIN=https://betulbilici.github.io` ve `/api/saglik` sağlık kontrolü otomatik tanımlanır).
   *(Başka bir platform kullanacaksanız `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` komutuyla çalıştırıp `GEMINI_API_KEY`, `GEMINI_MODEL` ve `CORS_ORIGIN=https://betulbilici.github.io` değişkenlerini ekleyin.)*
2. **GitHub Pages kaynağını açın:** Depoda `Settings -> Pages -> Build and deployment -> Source` ayarını **GitHub Actions** yapın.
3. **API adresini tanımlayın:** `Settings -> Secrets and variables -> Actions -> Variables` altında `VITE_API_URL` değişkenini canlı backend adresiniz (ör. `https://dilimin-ucunda-api.onrender.com`) olarak ekleyin.
4. **Dağıtımı tetikleyin:** `main` dalına push attığınızda [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) otomatik olarak `frontend` derlemesini alıp GitHub Pages'e yayınlar.

## 8 Test Tarifi ve Beklenen Davranış

| # | Senaryo | Örnek Girdi | Beklenen Davranış |
|---|---------|-------------|-------------------|
| 1 | **Kolay (net tarif)** | `"Başkasının başarısını görünce hem beğenmek hem de kendisi için biraz buruk hissetmek"` | `200 OK`; 3–5 güncel aday (`imrenmek`, `gıpta`, `özenmek` vb.), yüksek ve farklı skorlar, somut `farklilik` açıklamaları; haritada merkeze yakın yerleşim. |
| 2 | **Çok belirsiz** | `"İçimde tuhaf ama tam adını koyamadığım bir şeyler oluyor gibi"` | `200 OK`; model önce geniş niyeti özetler, daha orta/düşük skorlu (yaklaşık 45–75) genel duygu veya soyut kavram adayları önerir; düğümler haritada dış halkaya doğru yerleşir. |
| 3 | **Tek kelimelik** | `"özlem"` | `422 Unprocessable Entity` (`"Tarif çok kısa (en az 10 karakter olmalı)..."`); LLM çağrısı yapılmaz, arayüz Türkçe hata kutusu gösterir. *(10+ harfli tek sözcükte ör. `"sorumluluk"` -> `200 OK` ile yakın anlamlı adaylar döner.)* |
| 4 | **Yanlış yazılmış** | `"baskasinin basarisini gorunce hem beyenmek hem icinin biraz burkulmasi"` | `200 OK`; yazım ve Türkçe karakter eksikleri tolere edilir, niyet doğru çıkarılır ve önerilen adaylar doğru Türkçe yazımla döner. |
| 5 | **Türkçe olmayan** | `"Feeling both admiration and slight envy for someone else's success"` | `200 OK`; Türkçe sözlükbilimci sistem prompt'u nedeniyle anlamı yorumlayıp Türkçe `niyet` ve yalnızca Türkçe aday sözcükler üretir. |
| 6 | **Çok uzun (>500 karakter)** | 501+ karakterlik uzun açıklama | `422 Unprocessable Entity` (`"Tarif çok uzun (en fazla 500 karakter olabilir)..."`); arama kutusu sayacında kırmızı uyarı ve Türkçe hata mesajı gösterilir. |
| 7 | **Boş / yalnızca boşluk** | `""` veya `"          "` | `422 Unprocessable Entity` (`"Tarif alanı boş bırakılamaz..."`); backend doğrulaması isteği durdurur, LLM'e istek atılmaz. |
| 8 | **Uygunsuz içerik** | Hakaret, nefret söylemi veya zararlı eylem tarifi içeren girdi | Gemini güvenlik filtresi isteği engellerse boş/geçersiz çıktı 1 yeniden deneme sonrası `502 Bad Gateway` ve Türkçe hata mesajıyla döner; dilbilimsel bağlamda güvenli kalabilen olumsuz duygu tariflerinde yalnızca nesnel sözlük adayları üretilir. |

## Tasarım Kararları ve Sınırlılıklar

- **Neden yerel kelime listesi doğrulaması?** TDK'nın resmi ve kararlı bir açık API'si olmadığı için canlı web kazımaya bağımlı kalmak gecikmeye ve kesintilere yol açar. Yerel liste (`backend/kelimeler.txt`) çevrimdışı, milisaniyeler içinde doğrulama sağlar; dosya eksikse `dogrulandi: null` ile uygulamanın çalışmasını kesmez.
- **Basit ek kırpma ve Türkçe morfoloji sınırı:** Türkçe sondan eklemeli zengin bir dil olduğu için kural tabanlı basit ek kırpma ve ünsüz yumuşaması tersine çevirme yaygın kökleri yakalar; ancak ünlü düşmesi, düzensiz kök değişimleri veya sözlükte yer almayan yerleşik türetmeler `dogrulandi: false` olarak işaretlenebilir. Bu nedenle doğrulanamayan aday silinmez, yalnızca arayüzde uyarı rozetiyle kullanıcıya bildirilir.
- **LLM çıktılarının hâlâ hata yapabilmesi:** `response_schema`, Pydantic doğrulaması, few-shot örnekler ve birleşik fiil yasağı biçim ve yapısal tutarlılığı ciddi ölçüde artırsa da model yine de nadir durumlarda kullanıcının niyetini dar veya yanlış yorumlayabilir, yakınlık skorlarını sübjektif belirleyebilir, nadiren güncel olmayan sözcük ya da zayıf örnek cümle önerebilir.
- **Durumsuzluk, zaman aşımı ve güvenlik:** Veritabanı kullanılmadığı için arama geçmişi sayfa yenilenince sıfırlanır. Gemini çağrılarında askıda kalmayı önlemek için 25 saniyelik zaman aşımı ve 1 yeniden deneme uygulanır; API anahtarı yalnızca backend ortamında saklanır.
