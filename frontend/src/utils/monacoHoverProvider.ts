import { getHoverExplanation } from '../services/api';

const registeredLanguages = new Set<string>();

/**
 * Registers Gemini AI Hover Provider for Monaco Editor across ANY programming language.
 */
export function registerMonacoHoverProvider(monaco: any, languageId: string) {
  if (!monaco) return;

  const targetLang = (languageId || 'javascript').toLowerCase();
  const normalizedLang = targetLang === 'c++' ? 'cpp' : targetLang === 'python3' ? 'python' : targetLang;
  const langKey = `${normalizedLang}-hover-registered`;

  if (registeredLanguages.has(langKey)) return;
  registeredLanguages.add(langKey);

  // Register for normalized language and common language aliases
  const monacoLangs = normalizedLang === 'cpp' || normalizedLang === 'c' 
    ? ['c', 'cpp'] 
    : normalizedLang === 'javascript' || normalizedLang === 'typescript'
    ? ['javascript', 'typescript']
    : [normalizedLang];

  monacoLangs.forEach(lang => {
    try {
      monaco.languages.registerHoverProvider(lang, {
        provideHover: async (model: any, position: any) => {
          const wordInfo = model.getWordAtPosition(position);
          
          let targetWord = '';
          const lineContent = model.getLineContent(position.lineNumber) || '';

          if (wordInfo && wordInfo.word) {
            targetWord = wordInfo.word;
          } else {
            // Check for preprocessor directives (#include), variables ($var), decorators (@def)
            const match = lineContent.match(/(#[a-zA-Z0-9_]+|\$[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/);
            if (match) {
              targetWord = match[1];
            } else {
              return null;
            }
          }

          // Ignore single character tokens unless special symbols like #, $, @
          if (targetWord.length < 2 && !targetWord.startsWith('#') && !targetWord.startsWith('$') && !targetWord.startsWith('@')) {
            return null;
          }

          try {
            const data = await getHoverExplanation(targetWord, lineContent, lang);
            if (!data || !data.explanation) return null;

            const contents = [
              { value: `**✨ Gemini AI IntelliSense (${lang.toUpperCase()})**  \n### \`${data.title || targetWord}\`` },
              { value: `_${data.category || 'Code Symbol'}_  \n${data.explanation}` }
            ];

            if (data.signature) {
              contents.push({ value: `\`\`\`${lang}\n${data.signature}\n\`\`\`` });
            }

            const startCol = wordInfo ? wordInfo.startColumn : 1;
            const endCol = wordInfo ? wordInfo.endColumn : lineContent.length + 1;

            return {
              range: new monaco.Range(position.lineNumber, startCol, position.lineNumber, endCol),
              contents
            };
          } catch (e) {
            return null;
          }
        }
      });
    } catch (e) {
      // Keep going if already registered for language
    }
  });
}
