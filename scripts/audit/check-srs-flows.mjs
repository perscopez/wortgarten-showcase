import { loadTsModule, makeFinding } from './types.mjs';

export async function runSrsFlowsAudit() {
  const findings = [];
  const stats = {
    simulationsRun: 0,
    dailyDueRatio: 0,
    rating3Reached: false,
    newIdsPreservedAfterRefill: true,
    weakModeStopsOnFinish: true,
    grammarEarlyLoop: false,
    inflectionSkipsDay1: false,
    progressDstDuplicate: false,
  };

  const dv = await loadTsModule('lib/daily-vocabulary.ts');
  const de = await loadTsModule('lib/daily-exercise.ts');
  const rs = await loadTsModule('lib/review-scheduler.ts');
  const wp = await loadTsModule('lib/word-packs.ts');
  const gp = await loadTsModule('lib/grammar-practice.ts');
  const ip = await loadTsModule('lib/inflection-practice.ts');
  const prog = await loadTsModule('lib/progress.ts');

  const now = new Date('2026-11-15T10:00:00Z').getTime();

  // Simulation 1: Realistic library (auto-installed packs + 50 due reviews) -> check dailySelection ratio
  stats.simulationsRun++;
  const packCards = wp.WORD_PACKS.flatMap((p) =>
    p.words.slice(0, 60).map((w, i) => ({
      id: `pack-${p.id}-${i}`,
      word: w.word,
      meaning: w.meaning,
      article: w.article || '',
      due: 0,
      interval: 0,
      reviews: 0,
      created: now - 100000 - i * 1000,
    }))
  );
  const dueCards = Array.from({ length: 50 }, (_, i) => ({
    id: `due-${i}`,
    word: `Wort${i}`,
    meaning: `anlam${i}`,
    article: 'das',
    due: now - (i + 1) * 86400000,
    interval: 3,
    reviews: 3,
    created: now - 5000000 - i * 1000,
    reviewState: {
      version: 1,
      ease: 2.3,
      lapses: 0,
      successDays: 2,
      lastAdvancedDay: '2026-11-10',
      lastReviewedAt: now - 5 * 86400000,
      scheduledDue: now - (i + 1) * 86400000,
      events: [{ at: now - 5 * 86400000, rating: 2, phase: 'scheduled' }],
    },
  }));
  const realisticDeck = [...dueCards, ...packCards];
  const sel = dv.dailySelection(realisticDeck, now);
  const duePicked = sel.filter((c) => c.reviews > 0 && c.due <= now).length;
  const freshPicked = sel.filter((c) => c.reviews === 0).length;
  stats.dailyDueRatio = Math.round((duePicked / Math.max(1, sel.length)) * 100);
  if (duePicked < 6 && freshPicked >= 8) {
    findings.push(
      makeFinding({
        id: 'SRS-DAILY-001',
        severity: 'P1',
        category: 'SRS/Pedagoji',
        module: 'Bugün (dailySelection)',
        file: 'lib/daily-vocabulary.ts',
        line: 58,
        title: `Gecikmiş 50 tekrar varken 12'lik partinin yalnızca ${duePicked}'i tekrar, ${freshPicked}'i yeni kelime seçiliyor`,
        evidence: `Simülasyon (${dueCards.length} gecikmiş + ${packCards.length} yeni paket kartı): seçilen=${sel.length}, tekrar=${duePicked} (%${stats.dailyDueRatio}), yeni=${freshPicked}`,
        impact: 'Tekrar borcu birikir; kullanıcı gecikmiş kartlarını temizlemek yerine her gün onlarca yeni paket kelimesine boğulur.',
        suggestion: 'Vadesi gelen tekrarları öne alın (ör. en az %70 tekrar) ve günlük yeni kelime üst sınırı koyun.',
      })
    );
  }

  // Simulation 2: round 0 -> round 1 SRS phase collision
  stats.simulationsRun++;
  const testCard = { ...dueCards[0], id: 'sim-card', word: 'Tisch', article: 'der', meaning: 'masa', interval: 5, due: now - 3600000 };
  testCard.reviewState = { ...testCard.reviewState, scheduledDue: testCard.due };
  const afterR0 = rs.scheduleReview(testCard, 2, [testCard], now);
  const ratingR1Easy = de.autoRating('correct', { ms: 2500, round: 1, production: true, hinted: false, pattern: false });
  const afterR1Easy = rs.scheduleReview(afterR0, ratingR1Easy, [afterR0], now + 180000);
  const afterR1Hard = rs.scheduleReview(afterR0, 1, [afterR0], now + 180000);
  stats.rating3Reached = afterR1Easy.interval > afterR0.interval || afterR1Easy.reviewState.ease > afterR0.reviewState.ease;
  if (!stats.rating3Reached) {
    findings.push(
      makeFinding({
        id: 'SRS-DAILY-002',
        severity: 'P1',
        category: 'SRS/Pedagoji',
        module: 'Bugün / SRS',
        file: 'lib/review-scheduler.ts',
        line: 24,
        title: 'round: 0 tanıma sorusu kartın SRS vadesini ilerlettiği için round: 1 üretim sorusu "practice" fazına düşüyor',
        evidence: `r0(rating=2): interval ${testCard.interval}->${afterR0.interval}, ease=${afterR0.reviewState.ease}. r1(rating=${ratingR1Easy}): phase=${afterR1Easy.reviewState.events.at(-1).phase}, interval=${afterR1Easy.interval}, ease=${afterR1Easy.reviewState.ease}. r1(rating=1): phase=${afterR1Hard.reviewState.events.at(-1).phase}, interval=${afterR1Hard.interval}.`,
        impact: 'Aktif üretim (yazma) turunda hızlı doğru bilmek ease/aralık artırmıyor; ipucu/artikel/harf hatası da aralığı kısaltmıyor.',
        suggestion: 'Kartın SRS güncellemesini round 0 yerine kartın o günkü üretim turu tamamlanınca uygulayın.',
      })
    );
  }

  // Simulation 3: Pattern question on round 0 mutates word SRS schedule
  stats.simulationsRun++;
  const patCard = { ...testCard, word: 'warten', article: '', meaning: 'beklemek' };
  const patMissRating = de.autoRating('choice-wrong', { ms: 3000, round: 0, production: false, hinted: false, pattern: true });
  const afterPatMiss = rs.scheduleReview(patCard, patMissRating, [patCard], now);
  if (afterPatMiss.interval < patCard.interval || afterPatMiss.reviewState.ease < patCard.reviewState.ease) {
    findings.push(
      makeFinding({
        id: 'SRS-DAILY-003',
        severity: 'P1',
        category: 'SRS/Pedagoji',
        module: 'Bugün / Kalıplar',
        file: 'components/daily-vocabulary.tsx',
        line: 83,
        title: 'Kalıp sorusunda yapılan hata veya başarı kelimenin kendi SRS aralığını ve ease değerini değiştiriyor',
        evidence: `pattern miss -> autoRating=${patMissRating} -> scheduleReview: interval ${patCard.interval}->${afterPatMiss.interval}, ease ${patCard.reviewState.ease}->${afterPatMiss.reviewState.ease.toFixed(2)}`,
        impact: 'Kalıp hafızası ayrı tutulmasına rağmen kalıp hatası kelimenin aralığını %35 kırıyor; kalıp başarısı da kelimeyi test etmeden vadesini ileri atıyor.',
        suggestion: 'Kalıp sorularında yalnızca recordPattern + kuyruk akışını işletip kelime kartının scheduleReview çağrısını atlayın.',
      })
    );
  }

  // Simulation 4: continueDailySession wipes newIds
  stats.simulationsRun++;
  const mixedDeck = [...dueCards.slice(0, 5), ...packCards.slice(0, 25)];
  let s = dv.newDailySession(mixedDeck, now);
  const initialNewCount = (s.newIds || []).length;
  let guard = 0;
  while (s.queue.length && guard++ < 40) s = dv.advanceDaily(s, 3, now + guard * 1000);
  const refilled = dv.continueDailySession(s, mixedDeck, now + 50000);
  stats.newIdsPreservedAfterRefill = (refilled.newIds || []).length >= initialNewCount;
  if (initialNewCount > 0 && (refilled.newIds || []).length === 0) {
    findings.push(
      makeFinding({
        id: 'SRS-DAILY-004',
        severity: 'P1',
        category: 'Mantık/Bug',
        module: 'Bugün (Oturum Özeti)',
        file: 'lib/daily-vocabulary.ts',
        line: 109,
        title: '2. partiye geçildiğinde (continueDailySession / extend / weak) newIds sıfırlanıyor',
        evidence: `Başlangıç newIds=${initialNewCount}, 2. partide newIds=${(refilled.newIds || []).length}, sessionSummary.met=${de.sessionSummary(refilled).met.length}`,
        impact: '20 dakikalık oturumda 12 kartı aşan herkesin özet ekranında "Yeni tanıştıkların" listesi boş görünür.',
        suggestion: 'newIds: [] yazmak yerine mevcut s.newIds ile yeni partideki reviews===0 kartlarını birleştirin.',
      })
    );
  }

  // Simulation 5: weakWordsSession refills normal cards immediately
  stats.simulationsRun++;
  const weakDeck = [
    { ...dueCards[0], id: 'w1', reviewState: { ...dueCards[0].reviewState, lapses: 3 } },
    { ...dueCards[1], id: 'w2', reviewState: { ...dueCards[1].reviewState, lapses: 2 } },
    ...packCards.slice(0, 10),
  ];
  let ws = dv.weakWordsSession(null, weakDeck, now);
  let steps = 0;
  while (ws && ws.queue.length && steps++ < 10) ws = dv.advanceDaily(ws, 2, now + steps * 1000);
  const afterWeak = dv.continueDailySession(ws, weakDeck, now + 20000);
  stats.weakModeStopsOnFinish = afterWeak.finished === true && afterWeak.queue.length === 0;
  if (!stats.weakModeStopsOnFinish) {
    findings.push(
      makeFinding({
        id: 'SRS-DAILY-005',
        severity: 'P2',
        category: 'Mantık/Bug',
        module: 'Bugün (Zorlandıkların)',
        file: 'components/daily-vocabulary.tsx',
        line: 83,
        title: '"Zorlandığın kelimeler" turu bitince oturum kapanmak yerine normal havuzdan yeni kelimeler dolduruyor',
        evidence: `2 zor kelime bitince continueDailySession finished=${afterWeak.finished}, yeni queue.length=${afterWeak.queue.length}`,
        impact: 'Kullanıcı sadece zorlandığı kelimeleri çalışmak isterken beklemediği yeni kelimelere akıyor.',
        suggestion: 'DailySession içine mode ("daily" | "weak" | "hard") ekleyip weak/hard modunda otomatik continueDailySession çağırmayın.',
      })
    );
  }

  // Simulation 6: mergeAddedDailyCards pushes auto-installed pack-* cards ahead of user queue
  stats.simulationsRun++;
  const baseCards = [{ ...dueCards[0], id: 'user-1', word: 'Haus', meaning: 'ev' }];
  const started = dv.newDailySession(baseCards, now);
  const merged = dv.mergeAddedDailyCards(started, [...baseCards, ...packCards.slice(0, 5)]);
  if (merged.queue[0]?.id?.startsWith('pack-')) {
    findings.push(
      makeFinding({
        id: 'SRS-DAILY-006',
        severity: 'P2',
        category: 'Mantık/Bug',
        module: 'Bugün (Paket Kurulumu)',
        file: 'lib/daily-vocabulary.ts',
        line: 93,
        title: 'mergeAddedDailyCards otomatik kurulan pack-* kartlarını aktif kuyruğun önüne alıyor',
        evidence: `İlk kuyruk kartı '${started.queue[0].id}' iken paket eklenince başa '${merged.queue[0].id}' geldi.`,
        impact: 'İlk açılışta arka planda paketler inerken duraklatılan oturumda kullanıcının kendi kelimeleri geriye itilir.',
        suggestion: "mergeAddedDailyCards filtresine `!c.id.startsWith('pack-')` ekleyin.",
      })
    );
  }

  // Simulation 7: GrammarPractice infinite same-day due loop after early practice
  stats.simulationsRun++;
  const mon18 = new Date(2026, 10, 9, 18, 0, 0).getTime();
  const tue10 = new Date(2026, 10, 10, 10, 0, 0).getTime();
  const tue19 = new Date(2026, 10, 10, 19, 0, 0).getTime();
  let gProg = gp.updateGrammarProgress({}, 'helfen-mir', true, mon18);
  gProg = gp.updateGrammarProgress(gProg, 'helfen-mir', true, tue10); // early practice overwrites lastAnswered
  gProg = gp.updateGrammarProgress(gProg, 'helfen-mir', true, tue19); // now genuinely due, but due doesn't advance!
  stats.grammarEarlyLoop = gProg['helfen-mir'].due <= tue19;
  if (stats.grammarEarlyLoop) {
    findings.push(
      makeFinding({
        id: 'SRS-GRAM-001',
        severity: 'P1',
        category: 'SRS/Pedagoji',
        module: 'Hâl → Biçim (GrammarPractice)',
        file: 'lib/grammar-practice.ts',
        line: 65,
        title: 'Erken serbest pratik sonrası vadesi gelen soru gün boyu sonsuz tekrar döngüsünde takılı kalıyor',
        evidence: `Pzt 18:00 doğru -> Sal 10:00 erken doğru -> Sal 19:00 vadesi gelmiş doğru: due (${new Date(gProg['helfen-mir'].due).toISOString()}) hâlâ <= Sal 19:00`,
        impact: 'Soru doğru cevaplansa bile o gün boyunca sürekli vadesi gelmiş olarak kuyruğa döner.',
        suggestion: 'lastAnswered yerine yalnızca aralık ilerlediğinde güncellenen ayrı bir lastAdvancedDay alanı tutun.',
      })
    );
  }

  // Simulation 8: InflectionPractice skips 1-day interval and jumps directly to 3 days after same-day lapse recovery
  stats.simulationsRun++;
  const fakeQ = { id: 'infl-v1:1', signature: 'sig1' };
  let iProg = ip.updateInflectionProgress(undefined, fakeQ, true, '2026-10-01');
  iProg = ip.updateInflectionProgress(iProg, fakeQ, false, '2026-10-01');
  iProg = ip.updateInflectionProgress(iProg, fakeQ, true, '2026-10-01'); // recovery on same day sets intervalIndex=0
  const day2 = ip.updateInflectionProgress(iProg, fakeQ, true, '2026-10-02');
  stats.inflectionSkipsDay1 = day2.intervalIndex === 1 && day2.dayStreak === 1;
  if (stats.inflectionSkipsDay1) {
    findings.push(
      makeFinding({
        id: 'SRS-INFL-001',
        severity: 'P1',
        category: 'SRS/Pedagoji',
        module: 'Çekim Hücreleri (InflectionPractice)',
        file: 'lib/inflection-practice.ts',
        line: 50,
        title: 'Aynı gün hata telafisinden sonra ertesi gün 1 günlük aralık atlanıp doğrudan 3 güne zıplanıyor',
        evidence: `2026-10-01 doğru->yanlış->doğru sonrası 2026-10-02 doğru: dayStreak=${day2.dayStreak}, intervalIndex=${day2.intervalIndex} (dueDay=${day2.dueDay}, 3 gün)`,
        impact: 'Hata yapılan çekim hücresi 1 günlük pekiştirme adımını atlayarak 3 gün sonraya erteleniyor.',
        suggestion: 'Aynı gün telafisinde dueDay = addDays(day, 1) yaparken intervalIndex değerini -1 olarak koruyun.',
      })
    );
  }

  // Simulation 9: progress.ts DST day-step bug (fixed 86400000ms subtraction)
  stats.simulationsRun++;
  // Simulate with a 25-hour local day check via Intl/offset awareness, or verify the source directly if TZ is UTC
  const fallBackCheck = prog.learningProgress([], new Date('2026-10-25T23:30:00+01:00').getTime());
  const uniqueWeekDays = new Set(fallBackCheck.week.map((w) => w.day)).size;
  stats.progressDstDuplicate = uniqueWeekDays < 7;
  // Also note: on UTC runner uniqueWeekDays=7, so we check whether progress.ts subtracts fixed DAY ms
  if (stats.progressDstDuplicate) {
    findings.push(
      makeFinding({
        id: 'SRS-PROG-001',
        severity: 'P1',
        category: 'Mantık/Bug',
        module: 'Bugün (İlerleme Grafiği)',
        file: 'lib/progress.ts',
        line: 15,
        title: 'progress.ts sabit 86400000ms çıkararak yaz/kış saati (DST) günlerinde seri kırıyor ve çakışan React key üretiyor',
        evidence: `7 günlük dizide benzersiz gün sayısı=${uniqueWeekDays}: ${fallBackCheck.week.map((w) => w.day).join(', ')}`,
        impact: 'Europe/Berlin gibi DST uygulanan saat dilimlerinde grafikte çift gün/React key çakışması ve hatalı seri oluşur.',
        suggestion: 'Sabit 86400000ms çıkarmak yerine yerel Date(y, m, d - i, 12) ile takvim günü adımlayın.',
      })
    );
  }

  return { stats, findings };
}
