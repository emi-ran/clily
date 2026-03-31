# Clily

[English](README.md) | Türkçe

`clily`, doğal dille yazdığın isteği tek bir shell komutuna dönüştürür, komutu yerel güvenlik kurallarından geçirir ve sonra çalıştırıp çalıştırmamayı sana bırakır.

NPM paket adı: `@emiran/clily`
CLI komutu: `clily`

## Neden Clily?

- Normal cümlelerle terminal komutu üretir
- Model ile terminal arasına yerel güvenlik katmanı koyar
- Komutu çalıştırmadan önce önizleme gösterir
- Son komut sonucu ve yerel geçmişi bağlam olarak kullanabilir
- Windows, macOS ve Linux'ta çalışır

## Özellikler

- Gemini, Groq, OpenAI ve OpenRouter provider desteği
- İnteraktif setup wizard
- Güvenlik modları: `safe`, `balanced`, `auto`
- Yerel `allowlist`, `warnlist`, `denylist`
- Şifrelenmiş yerel API key saklama
- Setup sırasında provider API key doğrulama
- CLI üzerinden config yönetimi
- `clily config doctor` ile config sağlık kontrolü
- Daha okunur terminal önizlemesi ve onay akışı

## Platform Desteği

- Windows: PowerShell ve CMD
- macOS: bash ve zsh
- Linux: bash ve zsh

Clily aktif shell'i algılar ve modele shell'e uygun komut istemeye çalışır.

## Kurulum

```bash
npm install -g @emiran/clily
```

## Hızlı Başlangıç

İlk önce setup çalıştır:

```bash
clily --setup
```

Setup kayıtlı provider key ve modellerini yeniden kullanır, API key'i seçilen provider ile doğrular ve mümkünse canlı model listesi getirir.

Sonra deneyebilirsin:

```bash
clily "git status göster"
clily "ruby kurulu mu"
clily "çalışan docker containerlarını listele"
```

Yerel kurallar izin veriyorsa doğrudan çalıştırmayı da kullanabilirsin:

```bash
clily "node sürümünü göster" --run
```

## Nasıl Çalışır?

1. Doğal dilde isteğini yazarsın.
2. Clily seçili modele tek bir shell komutu ürettirir.
3. Üretilen komut yerel güvenlik kurallarından geçer.
4. Komut, risk ve gerekçe ile birlikte önizleme gösterilir.
5. Moduna göre `Run` veya `Cancel` seçersin.

## Güvenlik Modeli

Clily üç yerel kural grubu kullanır:

- `allowlist`: güvenilen komutlar
- `warnlist`: onay istemesi gereken komutlar
- `denylist`: engellenmesi gereken komutlar

Güvenlik modları:

- `safe`: her zaman sor
- `balanced`: güvenilenleri otomatik çalıştır, diğerlerini sor
- `auto`: yerelde bloklanmadıysa direkt çalıştır

Örnek kural yönetimi:

```bash
clily safety allow list
clily safety allow add "git status"
clily safety warn add "docker rm *"
clily safety deny add "rm -rf *"
```

## Konfigürasyon

Yararlı komutlar:

```bash
clily config show
clily config path
clily config doctor
clily config set mode auto
clily config set provider.name groq
clily config set provider.model openai/gpt-oss-20b
clily config set provider.apiKey YOUR_KEY
```

`clily config doctor` şu kontrolleri yapar:

- config var mı
- şifrelenmiş secret storage var mı
- config geçerli mi
- yanlışlıkla plaintext API key yazılmış mı
- seçili provider için şifrelenmiş API key var mı

## Gizlilik ve Secret Storage

- API key'ler `config.json` içinde tutulmaz
- provider key'leri ayrı şifrelenmiş yerel dosyada tutulur
- secret benzeri değerler modele gitmeden önce maskelenebilir
- shell history açılabilir, sınırlanabilir veya kapatılabilir
- son komut sonucu yerel bağlam olarak tekrar kullanılabilir

Not: şifrelenmiş yerel saklama plaintext config'den daha iyidir, ama henüz OS keychain değildir.

## Provider'lar

### Gemini

- komut üretiminde `@ai-sdk/google`, canlı model listelemede `@google/genai` kullanır
- setup sırasında Gemini modellerini listeler
- structured output bozulursa güvenli fallback uygular

### Groq

- `@ai-sdk/groq` kullanır
- setup sırasında Groq modellerini listeler
- şu an en iyi sonuç genelde `openai/gpt-oss-20b` ve `openai/gpt-oss-120b` ile alınır

### OpenAI

- `@ai-sdk/openai` kullanır
- setup sırasında OpenAI modellerini listeler
- varsayılan olarak `gpt-4o-mini` ile gelir

### OpenRouter

- `@openrouter/ai-sdk-provider` kullanır
- setup sırasında OpenRouter modellerini listeler
- diğer provider'larla aynı komut üretim akışını kullanır

## Dökümanlar

- [English README](README.md)
- [Contributing Guide](CONTRIBUTING.md)

## Geliştirme

Lokal geliştirme için:

```bash
npm install
npm run check
npm run build
npm run test
npm run dev -- --setup
```

Paket ön kontrolü:

```bash
npm pack
```

## Katkı

Issue ve pull request açabilirsin.

- bug ve feature request için GitHub Issues kullan
- kod katkısı için pull request aç
- PR açmadan önce şunları çalıştır:

```bash
npm run check
npm run build
npm run test
```

Daha fazla bilgi: [CONTRIBUTING.md](CONTRIBUTING.md)

## Destek

Bir şey yanlış veya kafa karıştırıcı görünüyorsa:

- bug veya beklenmeyen davranış için issue aç
- döküman veya setup problemi için issue aç
- mümkünse platform, shell, provider ve çalıştırdığın komutu ekle

## Lisans

[MIT](LICENSE)
