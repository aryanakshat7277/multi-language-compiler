import { logger } from '../../utils/logger';
import { pistonClient } from './pistonClient';
import { LanguageDefinition, PistonRuntime } from './pistonTypes';

let cachedLanguages: LanguageDefinition[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const APP_TO_PISTON_MAP: Record<string, string> = {
  python: 'python3',
  cpp: 'c++',
  c: 'c',
  java: 'java',
  javascript: 'javascript',
  typescript: 'typescript',
  go: 'go',
  rust: 'rust'
};

const mapRuntimeToLanguageDef = (appId: string, runtime: PistonRuntime): LanguageDefinition => {
  return {
    id: appId,
    pistonLanguage: runtime.language,
    pistonVersion: runtime.version,
    displayName: `${appId} (${runtime.version})`,
    fileExtension: getFileExtension(appId),
    defaultFilename: getDefaultFilename(appId),
    supportsCompilation: ['c', 'cpp', 'java', 'rust', 'go'].includes(appId),
    supportsStdin: true,
    defaultCompileTimeout: 10000,
    defaultRunTimeout: 10000,
    enabled: true
  };
};

const getFileExtension = (appId: string): string => {
  const map: Record<string, string> = {
    python: '.py',
    cpp: '.cpp',
    c: '.c',
    java: '.java',
    javascript: '.js',
    typescript: '.ts',
    go: '.go',
    rust: '.rs'
  };
  return map[appId] || '.txt';
};

const getDefaultFilename = (appId: string): string => {
  const map: Record<string, string> = {
    python: 'main.py',
    cpp: 'main.cpp',
    c: 'main.c',
    java: 'Main.java',
    javascript: 'index.js',
    typescript: 'index.ts',
    go: 'main.go',
    rust: 'main.rs'
  };
  return map[appId] || 'main.txt';
};

const getLanguages = async (): Promise<LanguageDefinition[]> => {
  const now = Date.now();
  
  if (cachedLanguages && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedLanguages;
  }

  try {
    const runtimes = await pistonClient.getRuntimes();
    const mapped: LanguageDefinition[] = [];

    for (const [appId, pistonLang] of Object.entries(APP_TO_PISTON_MAP)) {
      const runtime = runtimes.find(r => r.language === pistonLang || r.aliases.includes(pistonLang));
      if (runtime) {
        mapped.push(mapRuntimeToLanguageDef(appId, runtime));
      }
    }

    cachedLanguages = mapped;
    lastFetchTime = now;
    logger.info(`Successfully cached ${mapped.length} Piston languages`);
    
    return mapped;
  } catch (error) {
    logger.warn('Failed to fetch Piston runtimes, falling back to database languages', error);
    if (cachedLanguages && cachedLanguages.length > 0) return cachedLanguages;
    
    // Fallback to database languages
    try {
      const prisma = (await import('../../config/database')).default;
      const dbLangs = await prisma.language.findMany({ where: { enabled: true } });
      const fallbackMapped: LanguageDefinition[] = dbLangs.map((l: any) => ({
        id: l.id,
        pistonLanguage: APP_TO_PISTON_MAP[l.id] || l.id,
        pistonVersion: l.version || '*',
        displayName: l.displayName,
        fileExtension: `.${l.extension}`,
        defaultFilename: getDefaultFilename(l.id),
        supportsCompilation: l.compileRequired,
        supportsStdin: true,
        defaultCompileTimeout: l.timeLimitMs || 10000,
        defaultRunTimeout: l.timeLimitMs || 10000,
        enabled: true
      }));
      return fallbackMapped;
    } catch {
      return [];
    }
  }
};

const getLanguageByPistonId = async (pistonLang: string, pistonVersion?: string): Promise<LanguageDefinition | null> => {
  const languages = await getLanguages();
  return languages.find(l => 
    l.pistonLanguage === pistonLang && 
    (!pistonVersion || l.pistonVersion === pistonVersion)
  ) || null;
};

const getLanguageByAppId = async (appId: string): Promise<LanguageDefinition | null> => {
  const languages = await getLanguages();
  const lower = appId.toLowerCase();
  return languages.find(l => 
    l.id.toLowerCase() === lower || 
    l.pistonLanguage.toLowerCase() === lower ||
    APP_TO_PISTON_MAP[lower] === l.pistonLanguage ||
    l.displayName.toLowerCase() === lower
  ) || null;
};

const isLanguageAvailable = async (appId: string): Promise<boolean> => {
  const lang = await getLanguageByAppId(appId);
  return lang !== null;
};

const refreshCache = async (): Promise<void> => {
  lastFetchTime = 0;
  await getLanguages();
};

export const languageRegistry = {
  getLanguages,
  getLanguageByPistonId,
  getLanguageByAppId,
  isLanguageAvailable,
  refreshCache
};
