import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson, readText, loadTsModule, makeFinding } from './types.mjs';

export async function runLinguisticsAudit() {
  const findings = [];
  const stats = {
    patternsChecked: 0,
    caseHintFalsePositives: 0,
    patternQuizMismatches: 0,
    fillPunctSwallowed: 0,
    clozeTotalExamples: 0,
    clozeMissed: 0,
    clozeWrongCase: 0,
    pronunciationBroken: 0,
    slashPatternsHidden: 0,
    choicesBroken: 0,
    rectionRejected: 0,
    packPosCorrupted: 0,
  };

  const ch = await loadTsModule('lib/case-hint.ts');
  const pr = await loadTsModule('lib/pronunciation.ts');
  const pp = await loadTsModule('lib/pattern-practice.ts');
  const de = await loadTsModule('lib/daily-exercise.ts');
  const ta = await loadTsModule('lib/typed-answer.ts');
  const wp = await loadTsModule('lib/word-packs.ts');
  const bw = await loadTsModule('lib/basic-words.ts');
  const sc = await loadTsModule('lib/sentence-check.ts');
  const cmp = await loadTsModule('lib/compose.ts');
  const rec = await loadTsModule('lib/rection.ts');
  const srec = await loadTsModule('lib/saved-rection.ts');
  const ff = await loadTsModule('lib/form-finder.ts');
  const freq = await loadTsModule('lib/frequency.ts');
  const ic = await loadTsModule('lib/image-catalog.ts');
  const vi = await loadTsModule('lib/vocabulary-images.ts');
  const ra = await loadTsModule('lib/reviewed-art.ts');
  const compact = readJson('data/compact-card-data.json');
  const b1 = readJson('lib/b1-words.json');
  const rawPatternWords = readJson('lib/pattern-words.json');
  const patternWords = Array.isArray(rawPatternWords) ? rawPatternWords : rawPatternWords.words || [];

  // 1. case-hint.ts: 'über' misclassified & Dativ Plural 'den' misclassified as Akkusativ
  const ueberDativ = ch.caseHint('über dem Tisch hängen');
  const ferienDativPl = ch.caseHint('in den Ferien verreisen');
  if (ueberDativ?.governed === 'Akkusativ' || ferienDativPl?.governed === 'Akkusativ') {
    findings.push(
      makeFinding({
        id: 'LING-CASE-001',
        severity: 'P0',
        category: 'Dilbilim/Veri',
        module: 'Kalıplar / Bugün',
        file: 'lib/case-hint.ts',
        line: 6,
        title: "caseHint 'über' (Wechselpräposition) ve Dativ Plural 'in den Ferien' yapılarını yanlışlıkla Akkusativ etiketliyor",
        evidence: `caseHint('über dem Tisch hängen')=${JSON.stringify(ueberDativ)}; caseHint('in den Ferien verreisen')=${JSON.stringify(ferienDativPl)} (canlı veride pattern-case testi Dativ'i yanlış sayıyor)`,
        impact: 'Kullanıcıya yanlış Almanca hâl kuralı öğretiliyor ve doğru Dativ yanıtları hatalı sayılıyor.',
        suggestion: "'über' edatını TWO_WAY kümesine taşıyın; 'den/meinen/seinen/ihren/diesen/keinen' gibi Dativ Plural ile çakışan biçimleri salt Akkusativ listesinden çıkarın.",
      })
    );
  }

  // 2. caseHint false positives on compact-card-data.json
  const caseFalsePositives = [];
  const prepMismatches = [];
  const fillPunctLost = [];
  const slashHidden = [];
  const seenRow = new Set();

  const ZU_NON_PREPOSITION_NEXT = new Set([
    'sehr', 'viel', 'viele', 'wenig', 'groß', 'klein', 'teuer', 'spät', 'früh', 'laut', 'leise',
    'schnell', 'langsam', 'hoch', 'lang', 'kurz', 'schwer', 'leicht', 'warm', 'kalt', 'alt', 'jung',
    'gut', 'schlecht', 'müde', 'voll', 'eng', 'weit', 'nah', 'oft', 'lange',
    'tun', 'sein', 'haben', 'werden', 'machen', 'gehen', 'kommen', 'helfen', 'sehen', 'hören',
    'lesen', 'schreiben', 'lernen', 'arbeiten', 'leben', 'essen', 'trinken', 'kaufen', 'finden',
    'nehmen', 'geben', 'wissen', 'sagen', 'fragen', 'bleiben', 'fahren', 'warten', 'bezahlen',
    'verstehen', 'sprechen', 'bringen', 'halten', 'lassen', 'ziehen', 'führen', 'tragen', 'spielen',
  ]);

  for (const group of ['verbPatterns', 'adjectives', 'nouns', 'more']) {
    for (const [word, rawRows] of Object.entries(compact[group] || {})) {
      for (const [rawDe] of rawRows) {
        stats.patternsChecked++;
        const hint = ch.caseHint(rawDe);
        if (hint?.prep) {
          const tokens = rawDe.replace(/\([^)]*\)/g, ' ').toLocaleLowerCase('de').match(/[\p{L}]+/gu) || [];
          const idx = tokens.indexOf(hint.prep);
          const next = tokens[idx + 1];
          const isPostpositionNach = hint.prep === 'nach' && /meinung nach/i.test(rawDe);
          if (!next && !isPostpositionNach) {
            caseFalsePositives.push(`${word}: "${rawDe}" -> ${hint.prep} + ${hint.governed} (cümle sonu ayrılabilen fiil öneki)`);
          } else if (hint.prep === 'zu' && next && ZU_NON_PREPOSITION_NEXT.has(next)) {
            caseFalsePositives.push(`${word}: "${rawDe}" -> zu + Dativ (zarf/mastar 'zu ${next}')`);
          } else if (hint.prep === 'um' && (/um\s+.*\bzu\b/i.test(rawDe) || (next && /^(eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)$/i.test(next)))) {
            caseFalsePositives.push(`${word}: "${rawDe}" -> um + Akkusativ (um…zu / saat ifadesi)`);
          } else if (hint.prep === 'bis' && next && /^zu[mr]?$/i.test(next)) {
            caseFalsePositives.push(`${word}: "${rawDe}" -> bis + Akkusativ (bis zu/zum Dativ alır)`);
          }
        }
      }

      for (const row of pp.rowsFor(word)) {
        if (seenRow.has(row.id)) continue;
        seenRow.add(row.id);

        if (row.phrase.includes('/') && pr.turkishReadingSentence(row.phrase) === '') {
          slashHidden.push(`${word}: "${row.phrase}"`);
        }

        const decl = row.de.match(/·\s*([a-zäöüß]+)\s*\+\s*(Akkusativ|Dativ|Genitiv)/i);
        const pq = de.patternQuizOfRow(row, 'audit');
        if (decl && pq && pq.answer.toLocaleLowerCase('de') !== decl[1].toLocaleLowerCase('de')) {
          prepMismatches.push(`${word}: "${row.de}" -> boşaltılan '${pq.answer}', beyan edilen '${decl[1]} + ${decl[2]}'`);
        }

        const fq = de.fillQuizOfRow(row, word, 'audit');
        if (fq) {
          const reconstructed = [fq.before, fq.answer, fq.after].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
          const orig = row.phrase.replace(/\s+/g, ' ').trim();
          if (reconstructed !== orig) {
            fillPunctLost.push(`${word}: "${orig}" -> "${reconstructed}"`);
          }
        }
      }
    }
  }

  stats.caseHintFalsePositives = caseFalsePositives.length;
  if (caseFalsePositives.length) {
    findings.push(
      makeFinding({
        id: 'LING-CASE-002',
        severity: 'P0',
        category: 'Dilbilim/Veri',
        module: 'Kalıplar / Bugün',
        file: 'lib/case-hint.ts',
        line: 20,
        title: `caseHint canlı veride ${caseFalsePositives.length} kalıba yanlış hâl/edat etiketi basıyor (zu+Infinitiv, zarf zu, um…zu, ayrılabilen fiil öneki, bis zu)`,
        evidence: caseFalsePositives.slice(0, 10).join(' | '),
        impact: 'Kullanıcıya "zu teuer -> zu + Dativ", "ein Brand bricht aus -> aus + Dativ", "bis zum Bahnhof -> bis + Akkusativ" gibi yanlış gramer soruları üretiliyor.',
        suggestion: 'Ayrılabilen önekleri, mastar/zarf "zu", "um…zu" ve "bis zu/zum" yapılarını hariç tutun.',
      })
    );
  }

  stats.patternQuizMismatches = prepMismatches.length;
  if (prepMismatches.length) {
    findings.push(
      makeFinding({
        id: 'LING-PREP-001',
        severity: 'P1',
        category: 'Dilbilim/Veri',
        module: 'Bugün / Kalıplar',
        file: 'lib/daily-exercise.ts',
        line: 218,
        title: `patternQuizOfRow beyan edilen edat yerine ilk gördüğü edatı boşaltıyor (${prepMismatches.length} kalıp)`,
        evidence: prepMismatches.join(' | '),
        impact: '"von null auf hundert beschleunigen" için "von + Akkusativ", "bis zu 100 Euro" için "zu + Akkusativ" öğretiliyor.',
        suggestion: 'caseQuizOfRow gibi hedef edatı "· <edat> + <hâl>" notundan okuyup o edatı boşaltın.',
      })
    );
  }

  stats.fillPunctSwallowed = fillPunctLost.length;
  if (fillPunctLost.length) {
    findings.push(
      makeFinding({
        id: 'LING-FILL-001',
        severity: 'P2',
        category: 'Dilbilim/Veri',
        module: 'Bugün / Kalıplar',
        file: 'lib/daily-exercise.ts',
        line: 353,
        title: `fillQuizOfRow boşaltılan kelimenin sonundaki noktalamayı yutuyor (${fillPunctLost.length} kalıp)`,
        evidence: fillPunctLost.slice(0, 8).join(' | '),
        impact: 'Kalıp boşluk doldurma sorularında nokta/virgül/ünlem kayboluyor.',
        suggestion: 'Soyulan son noktalamayı `after` alanının başına geri ekleyin.',
      })
    );
  }

  // 3. sentence-check.ts false positives on valid German sentences
  const scDativPl = sc.sentenceNotes('Ich spreche mit meinen Freunden.', 'mit jemandem sprechen · mit + Dativ');
  const scTeil = sc.sentenceNotes('Ich nehme an einem Kurs teil.', 'an etwas teilnehmen · an + Dativ');
  const scFahren = sc.sentenceNotes('Wir wollen morgen nach Berlin fahren.', '');
  if (scDativPl.length || scTeil.length || scFahren.length) {
    findings.push(
      makeFinding({
        id: 'LING-SCHECK-001',
        severity: 'P0',
        category: 'Dilbilim/Veri',
        module: 'Kalıplar (Kendi Cümleni Kur)',
        file: 'lib/sentence-check.ts',
        line: 10,
        title: 'sentenceNotes tamamen doğru Almanca cümleleri (Dativ Plural ve fiil/ayrılabilen önek) hatalı işaretliyor',
        evidence: `mit meinen Freunden => ${JSON.stringify(scDativPl.map((n) => n.text))}; teilnehmen => ${JSON.stringify(scTeil.map((n) => n.text))}; fahren => ${JSON.stringify(scFahren.map((n) => n.text))}`,
        impact: 'Öğrenci doğru yazdığı Dativ Plural ("mit meinen Freunden") ve kendi uygulamasının örnek cümlesi ("Ich nehme an einem Kurs teil.") için yanlış gramer uyarısı alıyor.',
        suggestion: 'ACC_ONLY içinden Dativ Plural biçimlerini (meinen/seinen/ihren/keinen/diesen/deinen/unseren) çıkarın ve NOUNS listesinde fiil/önek/sıfat homograflarını (teil, fahren, folge, ruhig, wessen vb.) ayıklayın.',
      })
    );
  }

  // 4. compose.ts systematic false negatives (Perfekt, short verbs, short noun plurals, contractions)
  const cmpPerfekt = cmp.checkComposition('Ich habe lange auf den Bus gewartet.', 'auf den Bus warten');
  const cmpAnrufen = cmp.checkComposition('Er ruft mich heute Abend an.', 'jemanden anrufen');
  const cmpFilmPl = cmp.checkComposition('Wir sehen am Wochenende zwei alte Filme.', 'einen Film sehen');
  const cmpAm = cmp.checkComposition('Ich nehme am Deutschkurs teil.', 'an etwas teilnehmen');
  if (cmpPerfekt.status !== 'ok' || cmpAnrufen.status !== 'ok' || cmpFilmPl.status !== 'ok' || cmpAm.status !== 'ok') {
    findings.push(
      makeFinding({
        id: 'LING-COMPOSE-001',
        severity: 'P0',
        category: 'Dilbilim/Veri',
        module: 'Kalıplar (Kendi Cümleni Kur)',
        file: 'lib/compose.ts',
        line: 7,
        title: 'checkComposition geçerli Perfekt, ayrılabilen fiil, kısa isim çoğulu ve edat birleşimi cümlelerini reddediyor',
        evidence: `gewartet=${cmpPerfekt.status}(${cmpPerfekt.missing}); ruft…an=${cmpAnrufen.status}(${cmpAnrufen.missing}); Filme=${cmpFilmPl.status}(${cmpFilmPl.missing}); am=${cmpAm.status}(${cmpAm.missing})`,
        impact: 'Kullanıcının doğru kurduğu Perfekt, şimdiki zaman ("bin/geht/hat/ruft an") ve çoğul ("Filme/Kurse/Tage") cümleleri "eksik kelime" diye reddediliyor.',
        suggestion: 'PREFIXES içinde "zuruck" (katlanmış) ve eksik önekleri düzeltin; ge- Partizip II, yaygın düzensiz fiil tablosu, 4 harfli isim çekimleri ve am/im/vom/beim/zum/darauf çözücüleri ekleyin.',
      })
    );
  }

  // 5. saved-rection.ts rejecting curated rection.ts entries
  const rejectedRection = [];
  for (const lemma of rec.listRectionLemmas()) {
    const r = rec.getRection(lemma);
    if (!srec.safeRection(r)) rejectedRection.push(lemma);
  }
  stats.rectionRejected = rejectedRection.length;
  if (rejectedRection.length) {
    findings.push(
      makeFinding({
        id: 'LING-RECT-001',
        severity: 'P0',
        category: 'Mantık/Bug',
        module: 'Rektion / Kayıt',
        file: 'lib/saved-rection.ts',
        line: 2,
        title: `safeRection uygulamanın kendi doğrulanmış rection kayıtlarını (${rejectedRection.join(', ')}) sessizce siliyor`,
        evidence: `safeRection(getRection('${rejectedRection[0]}')) === undefined (de.pons.com izinli host listesinde yok)`,
        impact: 'İlgili kelimeler kaydedilirken, zenginleştirilirken veya içe aktarılırken rection verisi kaybolur.',
        suggestion: 'lib/saved-rection.ts:2 host beyaz listesine `de\\.pons\\.com` ekleyin.',
      })
    );
  }

  // 6. FormFinder P0 grading bugs & unsolvable Hilfsverb items
  const ffWrongArt = ff.checkFormAnswer({ answers: ['dem Mann'], target: 'Dativ · Tekil' }, 'den Mann');
  const ffWrongPron = ff.checkFormAnswer({ answers: ['geht'], target: 'er/sie/es · Präsens' }, 'ich geht');
  const sampleVerbCard = {
    id: 'v1',
    word: 'machen',
    article: '',
    partOfSpeech: 'verb',
    inflections: {
      tables: [
        {
          title: 'Fiil · temel biçimler',
          columns: ['Biçim'],
          rows: [
            { label: 'Hilfsverb', cells: [['haben']] },
            { label: 'Partizip II', cells: [['gemacht']] },
          ],
        },
      ],
    },
  };
  const ffItems = ff.buildFormItems([sampleVerbCard], { mode: 'mix', size: 10, seed: 's0' });
  const badHilfsverb = ffItems.find((i) => i.given?.form === 'haben' && (i.type === 'lemma' || i.type === 'transform'));
  if (ffWrongArt === 'correct' || ffWrongPron === 'correct' || badHilfsverb) {
    findings.push(
      makeFinding({
        id: 'LING-FF-001',
        severity: 'P0',
        category: 'Dilbilim/Veri',
        module: 'Biçim Bul (FormFinder)',
        file: 'lib/form-finder.ts',
        line: 91,
        title: 'FormFinder yanlış hâl artikelini ("den Mann" → Dativ) ve yanlış kişi zamirini ("ich geht") doğru kabul ediyor; çözümsüz Hilfsverb soruları üretiyor',
        evidence: `checkFormAnswer(dem Mann, 'den Mann')='${ffWrongArt}'; checkFormAnswer(geht, 'ich geht')='${ffWrongPron}'; badItem=${JSON.stringify(badHilfsverb ? { type: badHilfsverb.type, given: badHilfsverb.given, target: badHilfsverb.target, answers: badHilfsverb.answers } : null)}`,
        impact: 'Hâl çekimi ve kişi çekimi alıştırması yanlış cevapları doğru sayıyor; "haben → Sözlük biçimi: machen" gibi çözümsüz sorular çıkıyor.',
        suggestion: 'Yanlış artikeli/zamiri kullanıcı girdisinden soymayın; Hilfsverb satırlarını transform/lemma üretiminden çıkarın.',
      })
    );
  }

  // 7. Word-pack data corruption (capitalized nouns tagged as verb/adjective with no article in pattern-words.json)
  const badCapPos = patternWords.filter((w) => /^\p{Lu}/u.test(w.word) && !w.word.includes(' ') && w.partOfSpeech !== 'noun' && !w.article);
  const badVerbGloss = patternWords.filter((w) => ['liegen', 'hängen', 'decken', 'bauen'].includes(w.word) && !/mek|mak/.test(w.meaning));
  stats.packPosCorrupted = badCapPos.length + badVerbGloss.length;
  if (badCapPos.length || badVerbGloss.length) {
    findings.push(
      makeFinding({
        id: 'LING-PACK-001',
        severity: 'P0',
        category: 'Dilbilim/Veri',
        module: 'Kelime Paketleri (kalip-kelimeleri-v1)',
        file: 'lib/pattern-words.json',
        line: 1,
        title: `kalip-kelimeleri-v1 paketinde bozuk fiil anlamları (${badVerbGloss.length}) ve yanlış tür/artikelsiz isimler (${badCapPos.length}) var`,
        evidence: `Fiil anlam hataları: ${badVerbGloss.map((w) => `${w.word}="${w.meaning}"`).join(', ')} | Yanlış POS isimler: ${badCapPos.slice(0, 6).map((w) => `${w.word}(${w.partOfSpeech})`).join(', ')}`,
        impact: 'Otomatik kurulan paketlerde liegen="şezlong", hängen="yamaç", decken="güverte", bauen="kodes" ve Einkaufswagen=verb olarak öğretiliyor.',
        suggestion: 'lib/pattern-words.json ve lib/frequency-words.json içindeki bozuk anlam/POS kayıtlarını düzeltip mevcut cihaz kartları için onarım geçişi ekleyin.',
      })
    );
  }

  // 8. clozeFor & buildChoices audit across ALL packs + B1 + basic words
  const allPackWords = [
    ...b1.words.map((w) => ({ src: 'b1-words.json', word: w.word, example: w.example, pos: w.partOfSpeech, meaning: w.meaning, article: w.article })),
    ...bw.BASIC_WORDS.map((w) => ({ src: 'basic-words.ts', word: w.word, example: w.example, pos: w.partOfSpeech, meaning: w.meaning, article: w.article })),
    ...wp.WORD_PACKS.flatMap((p) => p.words.map((w) => ({ src: `pack:${p.id}`, word: w.word, example: w.example, pos: w.partOfSpeech, meaning: w.meaning, article: w.article }))),
  ];

  const seenCloze = new Set();
  const clozeMisses = [];
  const clozeNounMatchedLower = [];
  const brokenChoices = [];

  for (const item of allPackWords) {
    const key = `${item.word}|${item.example || ''}`;
    if (seenCloze.has(key)) continue;
    seenCloze.add(key);

    if (item.meaning) {
      const sample = de.buildChoices(
        { id: 't', word: item.word, article: item.article || '', meaning: item.meaning, partOfSpeech: item.pos, reviews: 0 },
        [{ id: 'd1', word: 'Haus', article: 'das', meaning: 'ev', partOfSpeech: 'noun', reviews: 0 }, { id: 'd2', word: 'Buch', article: 'das', meaning: 'kitap', partOfSpeech: 'noun', reviews: 0 }, { id: 'd3', word: 'Tisch', article: 'der', meaning: 'masa', partOfSpeech: 'noun', reviews: 0 }],
        'meaning',
        'audit',
      );
      const correctChoice = sample.find((c) => c.correct)?.label || '';
      const unclosedParen = (correctChoice.match(/\(/g) || []).length > (correctChoice.match(/\)/g) || []).length;
      if (unclosedParen) {
        brokenChoices.push(`${item.word}: "${item.meaning}" -> "${correctChoice}"`);
      }
    }

    if (!item.example || item.word.includes(' ')) continue;
    stats.clozeTotalExamples++;
    const c = de.clozeFor(item.example, item.word, '');
    if (!c) {
      clozeMisses.push(`${item.word} (${item.pos || '?'}): "${item.example}"`);
    } else if (/^\p{Lu}/u.test(item.word) && /^\p{Ll}/u.test(c.answer)) {
      clozeNounMatchedLower.push(`${item.word} -> "${c.answer}" in "${item.example}"`);
    }
  }

  stats.clozeMissed = clozeMisses.length;
  stats.clozeWrongCase = clozeNounMatchedLower.length;
  if (clozeNounMatchedLower.length) {
    findings.push(
      makeFinding({
        id: 'LING-CLOZE-001',
        severity: 'P1',
        category: 'Dilbilim/Veri',
        module: 'Bugün',
        file: 'lib/daily-exercise.ts',
        line: 113,
        title: `clozeFor isim kartı için küçük harfli fiil/sıfat boşaltıyor (${clozeNounMatchedLower.length} örnek)`,
        evidence: clozeNounMatchedLower.slice(0, 8).join(' | '),
        impact: '"der Wind" (rüzgar) kartında "Heute ist es windig." cümlesinden "windig" sıfatı soruluyor.',
        suggestion: 'Büyük harfle başlayan isim başlıklarında eşleşen tokenın da büyük harfle başlamasını şart koşun.',
      })
    );
  }

  if (clozeMisses.length) {
    findings.push(
      makeFinding({
        id: 'LING-CLOZE-002',
        severity: 'P2',
        category: 'Dilbilim/Veri',
        module: 'Bugün',
        file: 'lib/daily-exercise.ts',
        line: 94,
        title: `clozeFor ${stats.clozeTotalExamples} örnek cümlenin ${clozeMisses.length} tanesinde (%${Math.round((clozeMisses.length / Math.max(1, stats.clozeTotalExamples)) * 100)}) hedef kelimeyi yakalayamıyor`,
        evidence: clozeMisses.slice(0, 10).join(' | '),
        impact: 'Ayrılabilen fiiller (aufräumen/ansehen), düzensiz çekimler (annehmen/sprechen) ve umlautlu çoğullar (Gast/Gäste) cloze alıştırmasına giremiyor.',
        suggestion: 'Ayrılabilen fiil öneki tespiti, umlaut kök normalizasyonu ve kayıtlı card.inflections formlarından eşleştirme ekleyin.',
      })
    );
  }

  // 9. checkTypedAnswer fuzz
  const badArticleAccepted = ta.checkTypedAnswer('der helfen', { word: 'helfen', article: '' });
  const exactDasHeisst = ta.checkTypedAnswer('das heißt', { word: 'das heißt', article: '' });
  if (badArticleAccepted === 'correct' || exactDasHeisst !== 'correct') {
    findings.push(
      makeFinding({
        id: 'LING-TYPED-001',
        severity: 'P1',
        category: 'Dilbilim/Veri',
        module: 'Bugün / Alıştırma',
        file: 'lib/typed-answer.ts',
        line: 15,
        title: 'checkTypedAnswer artikelsiz sorularda hatalı artikeli doğru sayıyor ve "das heißt" gibi ifadelerde tam doğruyu reddediyor',
        evidence: `checkTypedAnswer('der helfen', {word:'helfen', article:''})==='${badArticleAccepted}'; checkTypedAnswer('das heißt', {word:'das heißt', article:''})==='${exactDasHeisst}'`,
        impact: '"der helfen" doğru kabul edilirken, artikelle başlayan deyimler ("das heißt") tam doğru yazıldığında yanlış sayılıyor.',
        suggestion: 'Yalnızca `want.article` doluysa `split(input)` çalıştırın.',
      })
    );
  }

  const eiSwap = ta.checkTypedAnswer('speilen', { word: 'spielen', article: '' });
  if (eiSwap === 'wrong') {
    findings.push(
      makeFinding({
        id: 'LING-TYPED-002',
        severity: 'P3',
        category: 'Dilbilim/Veri',
        module: 'Bugün / Alıştırma',
        file: 'lib/typed-answer.ts',
        line: 8,
        title: 'Bitişik harf yer değiştirmesi (ei/ie gibi) "close" yerine "wrong" sayılıyor',
        evidence: `checkTypedAnswer('speilen', {word:'spielen'}) === '${eiSwap}'`,
        impact: 'Almancada en sık klavye hatası olan ei/ie kayması tam yanlış (lapse) sayılır.',
        suggestion: 'Standart Levenshtein yerine Damerau-Levenshtein (transposition=1) kullanın.',
      })
    );
  }

  // 10. plausibleSentenceOrder
  const falseNeg = de.plausibleSentenceOrder(['Auf', 'den', 'Bus', 'warte', 'ich'], ['Ich', 'warte', 'auf', 'den', 'Bus']);
  const falsePos = de.plausibleSentenceOrder(['frisches', 'kaufe', 'Brot', 'Ich', 'heute'], ['Ich', 'kaufe', 'heute', 'frisches', 'Brot']);
  const falsePosQ = de.plausibleSentenceOrder(['heute', 'du', 'Hast', 'Zeit'], ['Hast', 'du', 'heute', 'Zeit']);
  if (!falseNeg || falsePos || falsePosQ) {
    findings.push(
      makeFinding({
        id: 'LING-ORDER-001',
        severity: 'P2',
        category: 'Dilbilim/Veri',
        module: 'Bugün (Cümle Kurma)',
        file: 'lib/daily-exercise.ts',
        line: 322,
        title: 'plausibleSentenceOrder geçerli devrik cümleleri reddederken bozuk sıfat-isim ve soru cümlesi sıralarını kabul ediyor',
        evidence: `devrik=${falseNeg}, bozukSıfat=${falsePos}, bozukSoru("heute du Hast Zeit")=${falsePosQ}`,
        impact: 'Doğal Almanca sıralaması yanlış sayılabilirken anlamsız sıralamalar "Bu sıra da doğru!" diye onaylanabiliyor.',
        suggestion: 'Soru cümlelerinde serbest yer değiştirmeyi kapatın; çok kelimeli Vorfeld ve sıfat+isim öbek bütünlüğünü koruyun.',
      })
    );
  }

  // 11. pronunciation.ts systematic errors
  const pronBroken = [
    ['verstehen', 'ş', pr.turkishReading('verstehen')],
    ['bestellen', 'ş', pr.turkishReading('bestellen')],
    ['aufstehen', 'ş', pr.turkishReading('aufstehen')],
    ['behalten', 'h', pr.turkishReading('behalten')],
    ['zuhören', 'h', pr.turkishReading('zuhören')],
    ['Freiheit', 'h', pr.turkishReading('Freiheit')],
    ['sehr', 'er', pr.turkishReading('sehr')],
    ['schnell', 'el', pr.turkishReading('schnell')],
    ['euch', 'ş', pr.turkishReading('euch')],
  ].filter(([, mustInclude, got]) => !got.includes(mustInclude));
  stats.pronunciationBroken = pronBroken.length;
  stats.slashPatternsHidden = slashHidden.length;

  if (pronBroken.length) {
    findings.push(
      makeFinding({
        id: 'LING-PRON-001',
        severity: 'P2',
        category: 'Dilbilim/Veri',
        module: 'Telaffuz (Reading)',
        file: 'lib/pronunciation.ts',
        line: 17,
        title: 'Türkçe okunuş kural motoru yaygın Almanca kelimelerde yanlış telaffuz üretiyor',
        evidence: pronBroken.map(([w, , g]) => `${w} → "${g}"`).join(', '),
        impact: 'Öğrenci "sehr→zır", "euch→oyh", "behalten→bealtın", "verstehen→fersteın" gibi yanlış telaffuzlar görüyor.',
        suggestion: 'Önek sonrası sp/st, sesli+h, eu+ch (ich-Laut) ve tek heceli -er/-el/-en istisnalarını düzeltin.',
      })
    );
  }

  if (slashHidden.length) {
    findings.push(
      makeFinding({
        id: 'LING-PRON-002',
        severity: 'P3',
        category: 'Dilbilim/Veri',
        module: 'Telaffuz (Reading)',
        file: 'lib/pronunciation.ts',
        line: 51,
        title: `turkishReadingSentence '/' veya rakam içeren ${slashHidden.length} kalıpta okunuşu tamamen gizliyor`,
        evidence: slashHidden.slice(0, 6).join(' | '),
        impact: '"jemanden/etwas" veya saat içeren kalıplarda Türkçe okunuş ipucu çıkmıyor.',
        suggestion: 'Regex içine `/` ayırıcısını ve rakamların pas-geçilmesini ekleyin.',
      })
    );
  }

  // 12. buildChoices parenthetical/comma chopping
  stats.choicesBroken = brokenChoices.length;
  if (brokenChoices.length) {
    findings.push(
      makeFinding({
        id: 'LING-CHOICE-001',
        severity: 'P2',
        category: 'Dilbilim/Veri',
        module: 'Bugün (Çoktan Seçmeli)',
        file: 'lib/daily-exercise.ts',
        line: 157,
        title: `buildChoices parantez içi virgüllerden bölerek ${brokenChoices.length} kartta kırık şık üretiyor`,
        evidence: brokenChoices.slice(0, 8).join(' | '),
        impact: 'Örneğin abnehmen → "(iş", Nebenkosten → "yan giderler (aidat", zwar → "doğru" olarak kırık şık görünüyor.',
        suggestion: 'Parantez içindeki virgülleri yok sayarak yalnızca en dış düzeydeki `;` veya `,` karakterinden bölün.',
      })
    );
  }

  // 13. frequency.ts reflexive 'sich' regex bug
  const freqSich = freq.frequencyCoverage(['sich treffen'], 300);
  const freqBare = freq.frequencyCoverage(['treffen'], 300);
  if (freqBare.hit === 1 && freqSich.hit === 0) {
    findings.push(
      makeFinding({
        id: 'LING-FREQ-001',
        severity: 'P2',
        category: 'Mantık/Bug',
        module: 'Bugün (Sık Kelime Önerileri)',
        file: 'lib/frequency.ts',
        line: 6,
        title: 'frequency.ts dönüşlü fiillerdeki "sich" önekini soyamıyor (regex artikeli zorunlu kılıyor)',
        evidence: `frequencyCoverage(['sich treffen'], 300)=${JSON.stringify(freqSich)} vs ['treffen']=${JSON.stringify(freqBare)}`,
        impact: 'Kayıtlı dönüşlü fiiller henüz eklenmemiş gibi tekrar önerilir ve kapsam oranı düşük çıkar.',
        suggestion: 'Regexi `/^(?:sich|der|die|das)\\s+/i` yapın.',
      })
    );
  }

  // 14. image-catalog.ts self-blocking concept ('ice-cream' excludes 'ice') & reviewedArtByIdentity missing overridden wortgarten assets
  const iceCream = ic.IMAGE_CONCEPTS.find((c) => c.id === 'ice-cream');
  if (iceCream) {
    const samplePage = { title: 'File:Strawberry ice cream scoop.jpg', imageinfo: [{ url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Ice_cream.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Strawberry_ice_cream_scoop.jpg', mime: 'image/jpeg', width: 800, height: 600, extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' }, Artist: { value: 'Test' }, ImageDescription: { value: 'Scoop of strawberry ice cream' } } }] };
    const filtered = vi.filterVocabularyImages(iceCream, [samplePage]);
    if (filtered.length === 0) {
      findings.push(
        makeFinding({
          id: 'LING-IMG-001',
          severity: 'P2',
          category: 'Dilbilim/Veri',
          module: 'Görseller',
          file: 'lib/image-catalog.ts',
          line: 40,
          title: "image-catalog 'ice-cream' kavramı excludeTerms:['ice'] nedeniyle kendi tüm dondurma görsellerini eliyor",
          evidence: `filterVocabularyImages(ice-cream, ['Strawberry ice cream scoop.jpg']) => []`,
          impact: 'Eis / Speiseeis için hiçbir Wikimedia dondurma fotoğrafı eşleşemez.',
          suggestion: "excludeTerms içinden yalın 'ice' kelimesini çıkarıp 'ice cube'/'iceberg'/'glacier' gibi spesifik terimler kullanın.",
        })
      );
    }
  }

  if (!ra.reviewedArtByIdentity('wortgarten-scene-treppe', '/vocabulary-art/teaching-scenes/treppe.svg')) {
    findings.push(
      makeFinding({
        id: 'LING-ART-001',
        severity: 'P1',
        category: 'Sync/Depolama',
        module: 'Görseller / Yedek Aktarımı',
        file: 'lib/reviewed-art.ts',
        line: 54,
        title: 'reviewedArtByIdentity Wikimedia fotoğrafı eklenen 21 eski wortgarten görselini çözemiyor',
        evidence: "reviewedArtByIdentity('wortgarten-scene-treppe', '/vocabulary-art/teaching-scenes/treppe.svg') === undefined",
        impact: 'Eski yedeklerden içe aktarılan kartlarda bu 21 görsel sessizce silinir.',
        suggestion: 'reviewedArtByIdentity aramasını filtrelenmemiş tam contextual listesi üzerinden yapın.',
      })
    );
  }

  // 15. TSV vs JSON drift for b1-words & pack-data existence
  const b1TsvLines = readText('data/b1-words.tsv').trim().split('\n').filter((l) => l && !l.startsWith('#'));
  const tsvDataCount = b1TsvLines.length - 1;
  if (Math.abs(tsvDataCount - b1.words.length) > 0) {
    findings.push(
      makeFinding({
        id: 'LING-DRIFT-001',
        severity: 'P3',
        category: 'Dilbilim/Veri',
        module: 'Veri Senkronizasyonu',
        file: 'data/b1-words.tsv',
        line: 1,
        title: `data/b1-words.tsv (${tsvDataCount} satır) ile lib/b1-words.json (${b1.words.length} kayıt) arasında sayı uyuşmazlığı`,
        evidence: `TSV=${tsvDataCount}, JSON=${b1.words.length}`,
        impact: 'Kaynak TSV yeniden üretildiğinde JSON verisi beklenmedik şekilde değişebilir.',
        suggestion: 'Üretim scriptini çalıştırıp TSV ve JSON dosyalarını senkronize edin.',
      })
    );
  }

  for (const pack of wp.WORD_PACKS) {
    const packFile = path.join(ROOT, 'public/pack-data', `${pack.id}.json`);
    if (!fs.existsSync(packFile)) {
      findings.push(
        makeFinding({
          id: `LING-PACK-MISSING-${pack.id}`,
          severity: 'P2',
          category: 'Dilbilim/Veri',
          module: 'Kelime Paketleri',
          file: 'lib/word-packs.ts',
          title: `'${pack.id}' paketi için public/pack-data/${pack.id}.json dosyası eksik`,
          evidence: `WORD_PACKS içinde '${pack.id}' tanımlı (${pack.words.length} kelime), fakat pack-data JSON yok.`,
          impact: 'Paket kelimeleri önceden hesaplanmış tablo/görsellerle zenginleştirilemez.',
          suggestion: `scripts/generate-pack-data.mjs ile public/pack-data/${pack.id}.json üretin.`,
        })
      );
    }
  }

  // 16. Quick Trainers (Hızlı Antrenman) integrity check
  const qt = await loadTsModule('lib/quick-trainers.ts');
  const qtIssues = [];
  const prIds = new Set();
  const prSents = new Set();
  for (const item of qt.PRAEPOSITION_BANK || []) {
    if (prIds.has(item.id)) qtIssues.push(`praep-dup-id:${item.id}`);
    prIds.add(item.id);
    const full = `${item.before} ${item.answer} ${item.after}`.trim().toLocaleLowerCase('de');
    if (prSents.has(full)) qtIssues.push(`praep-dup-sent:${item.id}`);
    prSents.add(full);
    if (new Set(item.options).size !== 4 || !item.options.includes(item.answer)) {
      qtIssues.push(`praep-opts:${item.id}`);
    }
  }
  const seenVerbs = new Set();
  for (const v of qt.KONJUGATION_BANK || []) {
    if (seenVerbs.has(v.infinitive)) qtIssues.push(`konj-dup:${v.infinitive}`);
    seenVerbs.add(v.infinitive);
    if (v.praesens[3] !== v.praesens[5] || v.praeteritum[0] !== v.praeteritum[2] || v.praeteritum[3] !== v.praeteritum[5]) {
      qtIssues.push(`konj-sym:${v.infinitive}`);
    }
    for (const tense of ['praesens', 'praeteritum', 'perfekt']) {
      for (let p = 0; p < 6; p++) {
        const f = qt.conjugateVerb(v, tense, p);
        if (!f || !f.trim()) qtIssues.push(`konj-empty:${v.infinitive}:${tense}:${p}`);
      }
    }
  }
  for (const mode of ['words', 'rection', 'patterns', 'antonyms']) {
    const boards = qt.buildVerbindenRound([], mode, 3, 5, 'audit');
    if (boards.length < 3) qtIssues.push(`verbinden-short:${mode}`);
    for (const b of boards) {
      const l = new Set(b.pairs.map((p) => p.left.toLocaleLowerCase('de')));
      const r = new Set(b.pairs.map((p) => p.right.toLocaleLowerCase('tr')));
      if (l.size !== b.pairs.length || r.size !== b.pairs.length) qtIssues.push(`verbinden-dup:${mode}:${b.id}`);
    }
  }
  stats.quickTrainerPool = qt.quickTrainerPoolStats([]);
  stats.quickTrainerIssues = qtIssues.length;
  if (qtIssues.length) {
    findings.push(
      makeFinding({
        id: 'LING-QT-001',
        severity: 'P0',
        category: 'Dilbilim/Veri',
        module: 'Hızlı Antrenman',
        file: 'lib/quick-trainers.ts',
        line: 1,
        title: `Hızlı Antrenman veri bütünlüğü ihlali (${qtIssues.length} kayıt)`,
        evidence: qtIssues.slice(0, 8).join(', '),
        impact: 'Hızlı antrenman modlarında eksik şık, boş/hatalı çekim veya belirsiz eşleştirme oluşur.',
        suggestion: 'lib/quick-trainers-data.ts ve lib/quick-trainers.ts içindeki ilgili kayıtları düzeltin.',
      })
    );
  }

  return { stats, findings };
}
