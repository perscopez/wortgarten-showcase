import { walkFiles, readText, lineOfIndex, makeFinding } from './types.mjs';

export async function runUiCssAudit() {
  const findings = [];
  const stats = {
    cssFilesChecked: 0,
    invalidCssSyntax: 0,
    stickyZCollisions: 0,
    cascadeOverrides: 0,
    jsxFilesChecked: 0,
    swOfflineGaps: 0,
  };

  const globals = readText('app/globals.css');
  const academic = readText('app/academic.css');
  stats.cssFilesChecked = 2;

  // 1. Invalid CSS syntax: hex alpha appended directly to var(--...)
  for (const [file, css] of [
    ['app/globals.css', globals],
    ['app/academic.css', academic],
  ]) {
    const badVarRe = /var\(--[a-zA-Z0-9_-]+\)[0-9a-fA-F]{2}\b/g;
    let m;
    let idx = 0;
    while ((m = badVarRe.exec(css)) !== null) {
      stats.invalidCssSyntax++;
      findings.push(
        makeFinding({
          id: `CSS-SYN-${String(++idx).padStart(3, '0')}`,
          severity: 'P1',
          category: 'UI/CSS/Mobil',
          module: 'Stil / Animasyon',
          file,
          line: lineOfIndex(css, m.index),
          title: `Geçersiz CSS sözdizimi: '${m[0]}' tarayıcı tarafından yok sayılıyor`,
          evidence: css.slice(Math.max(0, m.index - 40), m.index + 60).replace(/\s+/g, ' '),
          impact: 'Yanlış çoktan seçmeli cevap sonrası doğru şıkkın nabız (.needs-tap) animasyonu tamamen çalışmıyor.',
          suggestion: 'color-mix(in srgb, var(--accent-mid) 20%, transparent) kullanın.',
        })
      );
    }
  }

  // 2. Invisible auto-advance progress bar
  const primaryBg = academic.match(/\.primary\{[^}]*background:\s*([^;}]+)/)?.[1]?.trim();
  const autoAfterBg = academic.match(/\.exercise-next\.is-auto::after\{[^}]*background:\s*([^;}]+)/)?.[1]?.trim();
  if (primaryBg && autoAfterBg && primaryBg === autoAfterBg) {
    stats.cascadeOverrides++;
    const idx = academic.indexOf('.exercise-next.is-auto::after');
    findings.push(
      makeFinding({
        id: 'CSS-VIS-001',
        severity: 'P1',
        category: 'UI/CSS/Mobil',
        module: 'Bugün / Kalıplar',
        file: 'app/academic.css',
        line: lineOfIndex(academic, idx),
        title: 'Otomatik geçiş geri sayım çubuğu butonla aynı renkte olduğu için (1:1 kontrast) tamamen görünmez',
        evidence: `.primary { background: ${primaryBg} } ve .exercise-next.is-auto::after { background: ${autoAfterBg} } (globals.css #fff9 ezilmiş)`,
        impact: 'Kullanıcı otomatik geçişin ne zaman tetikleneceğini gösteren ilerleme çubuğunu göremez.',
        suggestion: 'academic.css satır 144 içinden .exercise-next.is-auto::after seçicisini çıkarın veya #ffffffaa verin.',
      })
    );
  }

  // 3. Mobile blanket button { min-height: 44px; min-width: 44px } breaking inline .reading-word
  const mobileBtn44 = /button\{[^}]*min-height:44px[^}]*min-width:44px/.test(globals);
  const readingWordRule = academic.match(/\.reading-word\{([^}]*)\}/)?.[1] || '';
  if (mobileBtn44 && !/min-width:\s*0/.test(readingWordRule)) {
    stats.cascadeOverrides++;
    findings.push(
      makeFinding({
        id: 'CSS-MOB-001',
        severity: 'P1',
        category: 'UI/CSS/Mobil',
        module: 'Okuma (ReadingView)',
        file: 'app/globals.css',
        line: 36,
        title: 'Mobilde genel button{min-height:44px;min-width:44px} kuralı satır içi .reading-word paragraf akışını bozuyor',
        evidence: `globals.css:36 genel button kuralı min-width/min-height 44px uyguluyor; academic.css .reading-word { ${readingWordRule.slice(0, 100)} } sıfırlamıyor.`,
        impact: '900px altı ekranlarda okuma metnindeki "in", "zu", "er" gibi her kısa kelime 44x44px kutulara şişerek paragraf düzenini parçalıyor.',
        suggestion: '.reading-word içine `min-height: 0; min-width: 0;` ekleyin.',
      })
    );
  }

  // 4. globals.css:19 button:hover:not(:disabled) specificity (0,2,1) hijacking academic.css hover/active rules
  const hoverHijackIdx = globals.indexOf('button:hover:not(:disabled){filter:none;background-color:#ebeae7');
  if (hoverHijackIdx >= 0) {
    stats.cascadeOverrides++;
    findings.push(
      makeFinding({
        id: 'CSS-HOV-001',
        severity: 'P1',
        category: 'UI/CSS/Mobil',
        module: 'Tema / Etkileşim',
        file: 'app/globals.css',
        line: lineOfIndex(globals, hoverHijackIdx),
        title: 'globals.css:19 button:hover:not(:disabled) (0,2,1) seçicisi academic.css hover/aktif düğme stillerini eziyor',
        evidence: 'button:hover:not(:disabled){background-color:#ebeae7;color:var(--ink)} → .rail-link:hover, .reading-word:hover, .filter-chip.active, .tab.active, .listen-button üzerinde baskın geliyor.',
        impact: 'Pembe (rose) ve Akademik temalarda aktif/hover butonlar eski sıcak gri (#ebeae7) renge dönüyor.',
        suggestion: 'globals.css:19 içindeki genel button:hover:not(:disabled) kuralını kaldırın veya :where() içine alın.',
      })
    );
  }

  // 5. Mobile sticky header (.rail z-index:45) covering sticky .focus-bar (z-index:20)
  const railSticky = academic.match(/\.rail\{[^}]*position:sticky[^}]*top:0[^}]*z-index:(\d+)/);
  const focusBarSticky = globals.match(/\.focus-bar\{[^}]*position:sticky[^}]*top:0[^}]*z-index:(\d+)/);
  const hidesRailInFocus = /\.is-studying[^{]*\.rail\b/.test(globals + '\n' + academic);
  if (railSticky && focusBarSticky && Number(railSticky[1]) > Number(focusBarSticky[1]) && !hidesRailInFocus) {
    stats.stickyZCollisions++;
    findings.push(
      makeFinding({
        id: 'CSS-STICKY-001',
        severity: 'P1',
        category: 'UI/CSS/Mobil',
        module: 'Odak Modu (Bugün / Kalıplar / Biçim Bul)',
        file: 'app/academic.css',
        line: lineOfIndex(academic, railSticky.index),
        title: 'Mobilde odak çubuğu (.focus-bar) üst başlığın (.rail) altında kalıyor; masaüstünde .rail gizlenmiyor',
        evidence: `.rail (position:sticky; top:0; z-index:${railSticky[1]}) > .focus-bar (position:sticky; top:0; z-index:${focusBarSticky[1]}) ve .is-studying .rail kuralı yok.`,
        impact: 'Telefonda uzun sorularda aşağı kaydırınca duraklat (✕) ve süre çubuğu üst çubuğun altına girer; masaüstünde odak modunda yan menü açık kalır.',
        suggestion: '.app-shell.is-studying .rail { display: none } ekleyin (veya mobil odak modunda .focus-bar top değerini ayarlayın).',
      })
    );
  }

  // 6. Dark mode double-inversion (color-scheme:dark + html { filter: invert(.9) })
  const globalsDark = /color-scheme:\s*dark/.test(globals) && /filter:\s*invert\(\.9\)/.test(globals);
  if (globalsDark) {
    findings.push(
      makeFinding({
        id: 'CSS-DARK-001',
        severity: 'P1',
        category: 'UI/CSS/Mobil',
        module: 'Tema / Karanlık Mod',
        file: 'app/globals.css',
        line: lineOfIndex(globals, globals.indexOf('prefers-color-scheme:dark')),
        title: 'Karanlık mod filter:invert(.9) + color-scheme:dark yüzünden yerel kontrolleri çifte, <picture><img> öğelerini üçlü ters çeviriyor',
        evidence: 'globals.css:126-131 hem color-scheme:dark hem html{filter:invert(.9) hue-rotate(180deg)} kullanıyor; academic.css koyu mod kurallarını eziyor.',
        impact: 'Karanlık sistem temasında select/checkbox beyaza döner, position:fixed bozulur ve karanlık renk ezmeleri academic.css yüzünden geçersiz kalır.',
        suggestion: 'invert() hilesini kaldırıp academic.css içinde gerçek karanlık mod CSS değişkenleri tanımlayın.',
      })
    );
  }

  // 7. Duplicate CSS block in academic.css (lines 247-251 vs 253-257)
  const suggestMatches = [...academic.matchAll(/\.suggest\{display:grid;gap:8px/g)];
  if (suggestMatches.length > 1) {
    findings.push(
      makeFinding({
        id: 'CSS-DUP-001',
        severity: 'P3',
        category: 'Kod Sağlığı',
        module: 'Stil (academic.css)',
        file: 'app/academic.css',
        line: lineOfIndex(academic, suggestMatches[1].index),
        title: 'academic.css içinde .suggest / .suggest-chips / .chip-suggest bloğu birebir kopyalanmış',
        evidence: `Satır ${lineOfIndex(academic, suggestMatches[0].index)} ve satır ${lineOfIndex(academic, suggestMatches[1].index)} birebir aynı kuralları tekrarlıyor.`,
        impact: 'Gereksiz CSS şişmesi ve bakım karmaşası.',
        suggestion: 'Tekrarlanan bloğu silin.',
      })
    );
  }

  // 8. Service worker offline coverage check
  const sw = readText('public/sw.js');
  const missingOfflinePrefixes = [];
  for (const prefix of ['/pack-data/', '/dictionaries/', '/favicon.svg', '/visual-sources.html']) {
    if (!sw.includes(prefix)) missingOfflinePrefixes.push(prefix);
  }
  stats.swOfflineGaps = missingOfflinePrefixes.length;
  if (missingOfflinePrefixes.length) {
    findings.push(
      makeFinding({
        id: 'PWA-SW-001',
        severity: 'P1',
        category: 'PWA',
        module: 'Çevrimdışı (Service Worker)',
        file: 'public/sw.js',
        line: 10,
        title: `Service Worker çevrimdışı önbelleği ${missingOfflinePrefixes.join(', ')} yollarını kapsamıyor`,
        evidence: 'public/sw.js fetch handler yalnızca /_next/static/, /assets/, /vocabulary-art/ ve .(png|webmanifest) önbellekliyor.',
        impact: 'Çevrimdışı modda sözlük, paket verisi, görsel kaynak sayfası ve ziyaret edilmemiş dynamic chunk\'lar açılmaz.',
        suggestion: 'Eksik statik yolları önbelleğe ekleyin ve /_next/static/* için cache-first stratejisi kullanın.',
      })
    );
  }

  // 9. Check JSX <form> buttons without type="button"
  const jsxFiles = [...walkFiles('app', (f) => f.endsWith('.tsx')), ...walkFiles('components', (f) => f.endsWith('.tsx'))];
  stats.jsxFilesChecked = jsxFiles.length;
  let a11yIdx = 0;
  for (const file of jsxFiles) {
    const text = readText(file);
    const formRe = /<form\b[\s\S]*?<\/form>/g;
    let fm;
    while ((fm = formRe.exec(text)) !== null) {
      const block = fm[0];
      const btnRe = /<button\b([^>]*)>/g;
      let bm;
      while ((bm = btnRe.exec(block)) !== null) {
        const attrs = bm[1];
        if (!/\btype\s*=/.test(attrs) && /\bonClick\s*=/.test(attrs)) {
          findings.push(
            makeFinding({
              id: `A11Y-BTN-${String(++a11yIdx).padStart(3, '0')}`,
              severity: 'P2',
              category: 'Mantık/Bug',
              module: file,
              file,
              line: lineOfIndex(text, fm.index + bm.index),
              title: '<form> içinde type="button" belirtilmemiş onClick butonu (yanlışlıkla formu submit eder)',
              evidence: bm[0].slice(0, 120),
              impact: 'Tıklandığında hem onClick hem de formun onSubmit olayı tetiklenir.',
              suggestion: 'Submit amacı taşımayan butonlara type="button" ekleyin.',
            })
          );
        }
      }
    }
  }

  return { stats, findings };
}
