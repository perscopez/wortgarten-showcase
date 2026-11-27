import catalog from './reviewed-art.json';
import photos from './reviewed-photos.json';
import scenes from './teaching-scenes.json';
import newScenes from './new-word-scenes.json';
import lessonArt from './lesson-20261108-art.json';
import auditArt from './audit-20261109-art.json';
import wikiPhotos from './wiki-photos.json';

export type ReviewedArtArchive = 'openmoji' | 'twemoji' | 'wortgarten' | 'wikimedia';
export type ReviewedArt = {
  assetId: string;
  conceptId: string;
  url: string;
  source: string;
  title: string;
  author: string;
  attribution: string;
  license: string;
  licenseUrl: string;
  kind: 'illustration' | 'image';
  archive: ReviewedArtArchive;
  match: 'curated';
  explanationTR?: string;
};

type CatalogAsset = {
  assetId: string;
  conceptId: string;
  word: string;
  aliases: string[];
  path: string;
  source: string;
  archive: ReviewedArtArchive;
  version: string;
  sha256: string;
  license: string;
  licenseUrl: string;
  author: string;
  sourceAttribution: string;
  kind: 'illustration' | 'image';
  reviewStatus: 'reviewed';
  senseIds?: string[];
  meaning?: string;
  meanings?: string[];
  explanationTR?: string;
};

const assets = catalog.reviewedAssets as CatalogAsset[];
const normalizeWord = (word: string) => word.normalize('NFC').trim().replace(/^(?:der|die|das|den|dem|des)\s+/i, '').toLocaleLowerCase('de-DE');
/** Real, freely licensed photographs (Wikimedia Commons). Where one exists it replaces schematic drawings and emoji for the same word. */
const wiki = wikiPhotos.reviewedAssets as unknown as CatalogAsset[];
const hasPhoto = new Set(wiki.map((a) => normalizeWord(a.word)));
const wikiFor = (word: string) => wiki.filter((a) => normalizeWord(a.word) === normalizeWord(word));
const allContextual = [...photos.reviewedAssets,...scenes.reviewedAssets,...newScenes.reviewedAssets,...lessonArt.reviewedAssets,...auditArt.reviewedAssets] as CatalogAsset[];
const contextual = allContextual.filter((a) => a.archive !== 'wortgarten' || !hasPhoto.has(normalizeWord(a.word)));
const ambiguousWithoutSense = new Set(['fisch', 'fische']);
const normalize = (word: string) => word.normalize('NFC').trim().replace(/^(?:der|die|das|den|dem|des)\s+/i, '').toLocaleLowerCase('de-DE');

/** Return only finite, locally bundled, reviewed illustrations for an exact German noun match. */
export function reviewedArtFor(word: string, senseId?: string): ReviewedArt[] {
  const query = normalize(word);
  if (!query || (ambiguousWithoutSense.has(query) && !senseId)) return [];
  const generic = wikiFor(query).filter((a) => !a.meanings?.length);
  if (generic.length && !senseId) return generic.map(asReviewedArt);
  const matching = assets.filter((asset) => {
    if (normalize(asset.word) !== query && !asset.aliases.some((alias) => normalize(alias) === query)) return false;
    if (senseId && asset.senseIds && !asset.senseIds.includes(normalize(senseId))) return false;
    // Fisch can mean animal or food. It is exposed only when the caller confirms the animal sense.
    if (query === 'fisch' && !['animal', 'tier', 'fish-animal'].includes(normalize(senseId ?? ''))) return false;
    return true;
  });
  // A real photo takes the place of emoji drawings for the same word.
  if (matching.length && !senseId && wikiFor(query).length) return wikiFor(query).map(asReviewedArt);
  return matching.map(asReviewedArt);
}

function asReviewedArt(asset: CatalogAsset): ReviewedArt {
  return {
    assetId: asset.assetId,
    conceptId: asset.conceptId,
    url: asset.path,
    source: asset.source,
    title: asset.archive==='wortgarten'?`${asset.word} — eğitsel çağrışım şeması`:asset.archive==='wikimedia'?`${asset.word} — Wikimedia görseli`:`${asset.word} – ${asset.archive} illustration`,
    author: asset.author,
    attribution: asset.sourceAttribution,
    license: asset.license,
    licenseUrl: asset.licenseUrl,
    kind: asset.kind,
    ...(asset.explanationTR?{explanationTR:asset.explanationTR}:{}),
    archive: asset.archive,
    match: 'curated',
  };
}

/** Resolve a backup's artwork only when both stable asset ID and canonical local URL agree. */
export function reviewedArtByIdentity(assetId: string, url: string): ReviewedArt | undefined {
  const asset = [...assets,...allContextual,...wiki].find((candidate) => candidate.reviewStatus==='reviewed' && candidate.assetId === assetId && candidate.path === url);
  return asset ? asReviewedArt(asset) : undefined;
}


/** Context-bound originals/media never leak into another sense merely because the lemma matches. */
export function reviewedVisualFor(word:string,meaning?:string):ReviewedArt[]{
 if(!meaning)return [];
 const photo=wikiFor(word).filter(a=>!a.meanings?.length||a.meanings.some(m=>m.normalize('NFC').trim()===meaning.normalize('NFC').trim()));
 if(photo.length)return photo.map(asReviewedArt);
 return contextual.filter(a=>a.reviewStatus==='reviewed'&&normalize(a.word)===normalize(word)&&a.meaning?.normalize('NFC').trim()===meaning.normalize('NFC').trim()).map(asReviewedArt);
}

/** A reviewed drawing can still be the wrong sense. Nonmatching glosses are manual usage examples only. */
export function reviewedUsageExamplesFor(word:string,meaning?:string){
 if(!meaning)return [];
 const photos=wikiFor(word).filter(a=>a.meanings?.length&&!a.meanings.some(m=>m.normalize('NFC').trim()===meaning.normalize('NFC').trim())).map(a=>({...asReviewedArt(a),usageMeaning:a.meanings![0]}));
 if(photos.length)return photos.slice(0,2);
 return contextual.filter(a=>a.reviewStatus==='reviewed'&&normalize(a.word)===normalize(word)&&a.meaning&&a.meaning.normalize('NFC').trim()!==meaning.normalize('NFC').trim()).slice(0,2).map(a=>({...asReviewedArt(a),usageMeaning:a.meaning}));
}
