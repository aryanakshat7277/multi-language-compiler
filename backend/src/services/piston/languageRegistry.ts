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

const DEFAULT_OFFLINE_LANGUAGES: LanguageDefinition[] = [
  { id: 'python', pistonLanguage: 'python3', pistonVersion: '3.10.0', displayName: 'Python 3', fileExtension: '.py', defaultFilename: 'main.py', supportsCompilation: false, supportsStdin: true, defaultCompileTimeout: 10000, defaultRunTimeout: 10000, enabled: true },
  { id: 'cpp', pistonLanguage: 'c++', pistonVersion: '17.0.0', displayName: 'C++ 17', fileExtension: '.cpp', defaultFilename: 'main.cpp', supportsCompilation: true, supportsStdin: true, defaultCompileTimeout: 10000, defaultRunTimeout: 10000, enabled: true },
  { id: 'c', pistonLanguage: 'c', pistonVersion: '10.2.0', displayName: 'C (GCC)', fileExtension: '.c', defaultFilename: 'main.c', supportsCompilation: true, supportsStdin: true, defaultCompileTimeout: 10000, defaultRunTimeout: 10000, enabled: true },
  { id: 'java', pistonLanguage: 'java', pistonVersion: '15.0.2', displayName: 'Java 15', fileExtension: '.java', defaultFilename: 'Main.java', supportsCompilation: true, supportsStdin: true, defaultCompileTimeout: 10000, defaultRunTimeout: 10000, enabled: true },
  { id: 'javascript', pistonLanguage: 'javascript', pistonVersion: '18.15.0', displayName: 'JavaScript (Node.js)', fileExtension: '.js', defaultFilename: 'index.js', supportsCompilation: false, supportsStdin: true, defaultCompileTimeout: 10000, defaultRunTimeout: 10000, enabled: true },
  { id: 'typescript', pistonLanguage: 'typescript', pistonVersion: '5.0.0', displayName: 'TypeScript', fileExtension: '.ts', defaultFilename: 'index.ts', supportsCompilation: false, supportsStdin: true, defaultCompileTimeout: 10000, defaultRunTimeout: 10000, enabled: true },
  { id: 'go', pistonLanguage: 'go', pistonVersion: '1.16.2', displayName: 'Go', fileExtension: '.go', defaultFilename: 'main.go', supportsCompilation: true, supportsStdin: true, defaultCompileTimeout: 10000, defaultRunTimeout: 10000, enabled: true },
  { id: 'rust', pistonLanguage: 'rust', pistonVersion: '1.68.2', displayName: 'Rust', fileExtension: '.rs', defaultFilename: 'main.rs', supportsCompilation: true, supportsStdin: true, defaultCompileTimeout: 10000, defaultRunTimeout: 10000, enabled: true }
];

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

    if (mapped.length > 0) {
      cachedLanguages = mapped;
      lastFetchTime = now;
      logger.info(`Successfully cached ${mapped.length} Piston languages`);
      return mapped;
    }
  } catch (error) {
    logger.warn('Failed to fetch Piston runtimes, falling back to local registry', error);
  }

  if (cachedLanguages && cachedLanguages.length > 0) return cachedLanguages;
  
  // Fallback to database languages
  try {
    const prisma = (await import('../../config/database')).default;
    const dbLangs = await prisma.language.findMany({ where: { enabled: true } });
    if (dbLangs && dbLangs.length > 0) {
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
      cachedLanguages = fallbackMapped;
      lastFetchTime = now;
      return fallbackMapped;
    }
  } catch {
    // ignore
  }

  cachedLanguages = DEFAULT_OFFLINE_LANGUAGES;
  lastFetchTime = now;
  return DEFAULT_OFFLINE_LANGUAGES;
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
  if (!appId || typeof appId !== 'string') return DEFAULT_OFFLINE_LANGUAGES[0];
  
  const lower = appId.trim().toLowerCase();
  let cleanId = lower;

  if (lower.includes('typescript') || lower.includes('ts')) cleanId = 'typescript';
  else if (lower.includes('python') || lower.includes('py')) cleanId = 'python';
  else if (lower.includes('c++') || lower.includes('cpp')) cleanId = 'cpp';
  else if (lower === 'c' || lower.startsWith('c ') || lower.startsWith('gcc')) cleanId = 'c';
  else if (lower.includes('java') && !lower.includes('script')) cleanId = 'java';
  else if (lower.includes('javascript') || lower.includes('node') || lower.includes('js')) cleanId = 'javascript';
  else if (lower.includes('go')) cleanId = 'go';
  else if (lower.includes('rust') || lower.includes('rs')) cleanId = 'rust';

  return languages.find(l => 
    l.id.toLowerCase() === cleanId || 
    l.id.toLowerCase() === lower || 
    l.pistonLanguage.toLowerCase() === cleanId ||
    APP_TO_PISTON_MAP[cleanId] === l.pistonLanguage ||
    l.displayName.toLowerCase().includes(cleanId) ||
    l.displayName.toLowerCase().includes(lower)
  ) || DEFAULT_OFFLINE_LANGUAGES.find(l => l.id === cleanId) || DEFAULT_OFFLINE_LANGUAGES[0];
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
