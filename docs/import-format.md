# Kişisel kelime listeleri

Kelimelerim → Araçlar → İçe aktar, bir JSON dosyasıyla birden fazla kelimeyi alır. Dosyadaki yeni kartlara uygulama kimlik ve başlangıç tekrar takvimi verir.

```json
{
  "version": 2,
  "cards": [
    {
      "word": "ankommen",
      "meaning": "varmak; ulaşmak",
      "partOfSpeech": "verb",
      "example": "Wir kommen um acht Uhr in Berlin an.",
      "translation": "Saat sekizde Berlin'e varıyoruz.",
      "source": "https://de.wiktionary.org/wiki/ankommen",
      "patterns": [
        ["in Berlin ankommen · in + Dativ", "Berlin'e varmak"],
        ["pünktlich ankommen", "zamanında varmak"]
      ]
    }
  ]
}
```

Her kart için sözlük biçimi, Türkçe anlam, kelime türü ve eşleşen bir Almanca örnek ile Türkçe çevirisi girilir. Anlamlar kullanım sırasına göre yazılır. İsimlerde artikel ve gerçek çoğul, fiillerde uygulanabilir çekim ve edat/hâl bilgisi, sıfatlarda uygulanabilir derece ve çekim, edatlarda yönettiği hâl eklenir. Çekim ve Rektion kayıtları mevcut yedek şemasını kullanır. Doğrulanmış ve lisans bilgisi bulunan görseller eklenebilir.

`patterns` en çok 24 Almanca–Türkçe çifti kabul eder. Kalıbın Almanca kısmı, hâl notu hariç, boşluksuz tamamlanmış 2–7 kelime olmalı. Özel kalıplar günlük alıştırmalara ve Kalıplar ekranına girer. Aynı Almanca kalıbın katalogdaki karşılığından önce kişisel sürüm kullanılır.

Bir kart düzeltilirken hedef kartın mevcut kimliği kullanılır. Önizlemede doğrulanmış düzeltme için dosya içeriği seçilebilir. Varsayılan aktarım, uyumlu kartlarda daha eksiksiz içeriği ve daha yüksek tekrar sayısının tüm takvimini seçer. Tür, artikel ya da anlam eşleşmesi belirsiz olduğunda önizleme ayrı kart gösterir. Örneğin `kosten` ve `die Kosten` ayrı kalır.
