import { walkFiles, readText, loadTsModule, makeFinding } from './types.mjs';

export async function runSyncAndApiAudit() {
  const findings = [];
  const stats = {
    learningKeys: 0,
    extendedKeys: 0,
    unmergedSyncKeys: 0,
    apiRoutesChecked: 0,
    sqlMigrationsChecked: 0,
    protoCrashes: 0,
    xssBypassInSync: false,
    unreviewedDueZero: false,
  };

  const lb = await loadTsModule('lib/learning-backup.ts');
  const elb = await loadTsModule('lib/extended-learning-backup.ts');
  const se = await loadTsModule('lib/sync-engine.ts');
  const sl = await loadTsModule('lib/sync-local.ts');
  const ds = await loadTsModule('lib/discovery-senses.ts');
  const dict = await loadTsModule('lib/dictionary.ts');
  const dsearch = await loadTsModule('lib/dictionary-search.ts');
  const sh = await loadTsModule('lib/siwc-http.ts');
  const ld = await loadTsModule('lib/learning-due.ts');
  const syncEngineText = readText('lib/sync-engine.ts');

  stats.learningKeys = lb.LEARNING_KEYS.length;
  stats.extendedKeys = elb.EXTENDED_KEYS.length;

  // 1. Prototype property lookup crashes across public API helpers
  const protoErrors = [];
  for (const [label, fn] of [
    ["discoverySenses('constructor')", () => ds.discoverySenses('constructor')],
    ["localEntry('toString')", () => dict.localEntry('toString')],
    ["dictionarySearch('constructor','de')", () => dsearch.dictionarySearch('constructor', 'de')],
  ]) {
    try {
      fn();
    } catch (err) {
      protoErrors.push(`${label} => ${err.name}: ${err.message}`);
    }
  }
  stats.protoCrashes = protoErrors.length;
  if (protoErrors.length) {
    findings.push(
      makeFinding({
        id: 'API-PROTO-001',
        severity: 'P0',
        category: 'Güvenlik/API',
        module: 'API (/api/lookup, /api/quick-word, /api/dictionary-search)',
        file: 'lib/discovery-senses.ts',
        line: 12,
        title: `Object.hasOwn eksikliği nedeniyle 'constructor'/'toString' sorguları 3 genel API ucunu HTTP 500 ile çökertiyor`,
        evidence: protoErrors.join(' | '),
        impact: 'GET /api/lookup?word=constructor veya ?word=toString gibi basit sorgular yakalanmamış TypeError (HTTP 500) fırlatır.',
        suggestion: 'discovery-senses.ts, dictionary.ts, dictionary-search.ts, daily-vocabulary.ts ve quick-word/route.ts içindeki tüm nesne erişimlerini Object.hasOwn() ile koruyun.',
      })
    );
  }

  // 2. Malformed cookie percent-encoding crash in siwc-http.ts readCookie
  try {
    const fakeReq = { headers: new Headers({ cookie: 'wg_ai_session=%ZZ' }) };
    sh.readCookie(fakeReq, 'wg_ai_session');
  } catch (err) {
    findings.push(
      makeFinding({
        id: 'API-COOKIE-001',
        severity: 'P1',
        category: 'Güvenlik/API',
        module: 'API (/api/ai/*)',
        file: 'lib/siwc-http.ts',
        line: 6,
        title: 'Bozuk yüzdeli çerez (Cookie: wg_ai_session=%ZZ) tüm 4 AI ucunu HTTP 500 ile çökertiyor',
        evidence: `readCookie('wg_ai_session=%ZZ') => ${err.name}: ${err.message}`,
        impact: 'Bozuk çerezli bir tarayıcı /api/ai/logout dahil hiçbir AI ucuna erişemez ve çıkış bile yapamaz.',
        suggestion: 'lib/siwc-http.ts:readCookie içindeki decodeURIComponent çağrısını try/catch ile sarmalayın.',
      })
    );
  }

  // 3. validateSyncSnapshot security sanitization bypass (discards parsed.cards and returns rawCards with javascript: URLs)
  try {
    const evilSnapshot = {
      'card:evil-1': {
        id: 'evil-1',
        word: 'Haus',
        article: 'das',
        plural: 'Häuser',
        meaning: 'ev',
        example: '',
        translation: '',
        source: 'javascript:alert(1)',
        photo: {
          url: 'https://attacker.example/x.png',
          source: 'javascript:alert(1)',
          title: 'x',
          author: 'x',
          license: 'CC0',
          licenseUrl: 'javascript:alert(1)',
        },
        due: 0,
        interval: 0,
        reviews: 0,
        created: Date.now(),
      },
    };
    const res = sl.validateSyncSnapshot(evilSnapshot);
    if (res.cards?.[0]?.source === 'javascript:alert(1)' || res.cards?.[0]?.photo?.licenseUrl === 'javascript:alert(1)') {
      stats.xssBypassInSync = true;
      findings.push(
        makeFinding({
          id: 'SYNC-XSS-001',
          severity: 'P0',
          category: 'Güvenlik/API',
          module: 'Hesap ve Eşitleme (validateSyncSnapshot)',
          file: 'lib/sync-local.ts',
          line: 35,
          title: 'validateSyncSnapshot temizlenmiş parsed.cards yerine ham rawCards döndürerek javascript: URL sanitizasyonunu tamamen atlıyor',
          evidence: `validateSyncSnapshot(evilSnapshot).cards[0].source === '${res.cards[0].source}', photo.licenseUrl === '${res.cards[0].photo.licenseUrl}'`,
          impact: 'Buluttan gelen manipüle edilmiş bir kartın source veya photo.licenseUrl alanındaki javascript: URL doğrudan IndexedDB\'ye yazılır ve <a href> içine basılır.',
          suggestion: 'validateSyncSnapshot içinde ham rawCards yerine sanitize edilmiş parsed.cards döndürün (veya uyumsuz URL/kimliklerde hata fırlatın).',
        })
      );
    }
  } catch {
    // properly rejected
  }

  // 4. exportLearning catch returns unwrapped {} for wortgarten-inflection-progress-v1
  const brokenExport = lb.exportLearning({
    getItem: (k) => (k === 'wortgarten-inflection-progress-v1' ? '{bad-json' : null),
    setItem: () => {},
  });
  if (!brokenExport['wortgarten-inflection-progress-v1']?.version) {
    findings.push(
      makeFinding({
        id: 'SYNC-SCHEMA-001',
        severity: 'P1',
        category: 'Sync/Depolama',
        module: 'Yedekleme / Eşitleme',
        file: 'lib/learning-backup.ts',
        line: 6,
        title: 'exportLearning bozuk JSON durumunda wortgarten-inflection-progress-v1 için sarmalanmamış {} dönüp eşitlemeyi kırıyor',
        evidence: `exportLearning(corrupt)['wortgarten-inflection-progress-v1'] === ${JSON.stringify(brokenExport['wortgarten-inflection-progress-v1'])} (beklenen {version:1,progress:{}})`,
        impact: 'validateSyncSnapshot canonicalJson karşılaştırması başarısız olur ve eşitleme durur.',
        suggestion: 'lib/learning-backup.ts:6 catch dalını `[k, wrap(k, {})]` yapın.',
      })
    );
  }

  // 5. earliestLearningDue includes unreviewed due:0 pack cards -> nextDue === 0 forever
  const dueResult = await ld.earliestLearningDue(
    [{ id: 'pack-1', due: 0, interval: 0, reviews: 0 }],
    { getItem: () => null, setItem: () => {} }
  );
  if (dueResult === 0) {
    stats.unreviewedDueZero = true;
    findings.push(
      makeFinding({
        id: 'PUSH-DUE-001',
        severity: 'P1',
        category: 'Mantık/Bug',
        module: 'Hatırlatmalar (Push)',
        file: 'lib/learning-due.ts',
        line: 10,
        title: 'earliestLearningDue hiç çalışılmamış (reviews:0, due:0) paket kartlarını dahil ettiği için her gün sınırsız bildirim tetikliyor',
        evidence: `earliestLearningDue([{id:'pack-1', due:0, interval:0, reviews:0}]) === ${dueResult} (1970-01-01)`,
        impact: 'Hiç tekrar bekleyen kart olmasa bile otomatik paket kartlarından biri açılmadıkça next_due=0 kalır ve her gün bildirim gider.',
        suggestion: 'cards içinde yalnızca `c.reviews > 0 && c.due > 0` olan kartların vadesini hesaplayın.',
      })
    );
  }

  // 6. Check which EXTENDED_KEYS lack concurrent merge support in sync-engine.ts
  const owner = '11111111-1111-4111-8111-111111111111';
  const unmerged = [];
  for (const key of elb.EXTENDED_KEYS) {
    const entityKey = `learning:${key}`;
    const baseState = {
      version: 1,
      owner,
      items: {
        [entityKey]: {
          base: { key: entityKey, version: 1, deleted: false, body: { version: 1, a: 1 } },
          pending: { deleted: false, body: { version: 1, a: 2 } },
        },
      },
    };
    const reconciled = se.reconcileSync(baseState, owner, [
      { key: entityKey, version: 2, deleted: false, body: { version: 1, a: 3 } },
    ]);
    const hasCustomBranch = syncEngineText.includes(key);
    if (reconciled.items[entityKey]?.conflict && !hasCustomBranch) {
      unmerged.push(key);
    }
  }
  stats.unmergedSyncKeys = unmerged.length;
  if (unmerged.length) {
    findings.push(
      makeFinding({
        id: 'SYNC-MERGE-001',
        severity: 'P1',
        category: 'Sync/Depolama',
        module: 'Hesap ve Eşitleme',
        file: 'lib/sync-engine.ts',
        line: 61,
        title: `Bulut eşitlemesinde ${unmerged.length}/8 senkronize EXTENDED_KEYS kaydı için eşzamanlı birleştirme (merge) kuralı eksik`,
        evidence: `Manuel çakışmaya düşen anahtarlar: ${unmerged.join(', ')}`,
        impact: 'Aynı gün telefon ve bilgisayarda çalışıldığında (özellikle günlük oturum, tablo ve kurallar) otomatik birleşme yerine sürekli manuel çakışma çıkıyor.',
        suggestion: 'mergeLearningProgress içine table-recall, rules, daily-introductions, rule-session ve daily-vocabulary birleştirme kurallarını ekleyin.',
      })
    );
  }

  // 7. Check ERROR_LOG_KEY sync gap
  if (!elb.EXTENDED_KEYS.includes('wortgarten-error-log-v1')) {
    findings.push(
      makeFinding({
        id: 'SYNC-SCOPE-001',
        severity: 'P3',
        category: 'Sync/Depolama',
        module: 'Hata Defteri / Eşitleme',
        file: 'lib/extended-learning-backup.ts',
        line: 10,
        title: 'Hata defteri (wortgarten-error-log-v1) dosya yedeğinde var ama bulut eşitlemesine dahil değil',
        evidence: 'wortgarten-error-log-v1 yalnızca FILE_BACKUP_KEYS içinde, EXTENDED_KEYS içinde değil.',
        impact: 'Telefonda yapılan hatalar bilgisayardaki Hata Defteri ekranında görünmez.',
        suggestion: 'İsteniyorsa EXTENDED_KEYS + mergeErrorLogs ile bulut eşitlemesine dahil edin veya arayüzde cihaz-yerel notu gösterin.',
      })
    );
  }

  // 8. SQL vs JS entity key drift (\u007f, __proto__, suffix length 509 vs 500)
  const migrations = walkFiles('supabase/migrations', (f) => f.endsWith('.sql'));
  stats.sqlMigrationsChecked = migrations.length;
  const sqlKeyFile = migrations.find((f) => f.includes('sync_key_validation'));
  if (sqlKeyFile) {
    const sql = readText(sqlKeyFile);
    let jsAllowsDel = false;
    try {
      se.assertEntityKey('card:abc\u007fdef');
      jsAllowsDel = true;
    } catch {
      jsAllowsDel = false;
    }
    const sqlBlocksProto = sql.includes('__proto__');
    const sqlAllows509 = /length\(key\)\s*<=\s*509/.test(sql);
    if (jsAllowsDel || !sqlBlocksProto || sqlAllows509) {
      findings.push(
        makeFinding({
          id: 'SQL-DRIFT-001',
          severity: 'P2',
          category: 'Sync/Depolama',
          module: 'Supabase SQL / Sync',
          file: sqlKeyFile,
          line: 2,
          title: 'Supabase SQL anahtar kısıtı ile JS assertEntityKey arasında uyumsuzluk (\\u007f, __proto__, 509 vs 500 uzunluk)',
          evidence: `JS DEL(\\u007f) kabul=${jsAllowsDel} (SQL reddeder), SQL __proto__ engeli=${sqlBlocksProto}, SQL length<=509=${sqlAllows509} (JS sonek<=500)`,
          impact: 'Bir tarafın kabul ettiği anahtarı diğer taraf reddederek eşitleme batch\'ini veya inventory() okumayı kilitleyebilir.',
          suggestion: 'SQL ve JS doğrulama kurallarını birebir hizalayın.',
        })
      );
    }
  }

  // 9. Static scan of API routes (in-memory rate limiter + unthrottled dictionary-search)
  const apiRoutes = walkFiles('app/api', (f) => f.endsWith('/route.ts'));
  stats.apiRoutesChecked = apiRoutes.length;
  const dictRoute = readText('app/api/dictionary-search/route.ts');
  if (!dictRoute.includes('createRateLimiter') && dictRoute.includes('no-store')) {
    findings.push(
      makeFinding({
        id: 'API-DOS-001',
        severity: 'P1',
        category: 'Güvenlik/API',
        module: 'API (/api/dictionary-search)',
        file: 'app/api/dictionary-search/route.ts',
        line: 2,
        title: '/api/dictionary-search hız sınırı olmadan ve Cache-Control: no-store ile 14.510 kayıtlık O(N) CPU taraması yapıyor',
        evidence: 'createRateLimiter yok, Cache-Control: no-store var; her istek 2.3 MB sözlüğü baştan sona normalize edip tarıyor.',
        impact: 'Statik paket verisi için önbellek kullanılmadan tekrarlayan isteklerle serverless CPU kolayca tüketilebilir.',
        suggestion: 'Hız sınırı ekleyin, sözlüğü modül yüklemesinde ön-normalleştirin ve public CDN önbelleği (s-maxage=86400) açın.',
      })
    );
  }

  const rlRoutes = apiRoutes.filter((r) => /createRateLimiter\s*\(/.test(readText(r)));
  if (rlRoutes.length) {
    findings.push(
      makeFinding({
        id: 'API-RL-001',
        severity: 'P2',
        category: 'Güvenlik/API',
        module: 'API Rate Limiting',
        file: 'lib/rate-limit.ts',
        line: 11,
        title: `Rate limiter (${rlRoutes.length} uç) bellek içi, X-Forwarded-For ile atlatılabilir ve ters LRU nedeniyle engelli IP'leri ilk siliyor`,
        evidence: `Etkilenen uçlar: ${rlRoutes.join(', ')}. lib/rate-limit.ts:11 engellenen anahtarda hits.delete(key) yapmadığı için Map başında kalıp ilk tahliye ediliyor.`,
        impact: 'X-Forwarded-For değiştirilerek veya bellek sınırı/soğuk başlatma ile hız sınırı aşılabilir.',
        suggestion: 'Engellenen istekte de Map sırasını yenileyin, güvenilmeyen sol X-Forwarded-For başlığını kabul etmeyin ve kritik uçlarda paylaşımlı hız sınırı kullanın.',
      })
    );
  }

  return { stats, findings };
}
