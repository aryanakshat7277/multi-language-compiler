import React, { createContext, useContext, useState, ReactNode } from "react";

const DEFAULT_GENETIC_CODE = `class GeneticAlgorithm:
    def __init__(self, target):
        self.target = target
        self.population_size = 100

    def start_genetic_read(self, result):
        match = True
        while match:
            if result == self.target:
                return result
            else:
                result = "Optimized"
`;

interface CodeContextType {
  code: string;
  setCode: (code: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
}

const CodeContext = createContext<CodeContextType | undefined>(undefined);

export function CodeProvider({ children }: { children: ReactNode }) {
  const [code, setCodeState] = useState(() => {
    try {
      return localStorage.getItem('codeforge_active_code') || DEFAULT_GENETIC_CODE;
    } catch {
      return DEFAULT_GENETIC_CODE;
    }
  });

  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem('codeforge_active_lang') || 'python';
    } catch {
      return 'python';
    }
  });

  const setCode = (newCode: string) => {
    setCodeState(newCode);
    try {
      localStorage.setItem('codeforge_active_code', newCode);
    } catch {}
  };

  const setLanguage = (newLang: string) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('codeforge_active_lang', newLang);
    } catch {}
  };

  return (
    <CodeContext.Provider value={{ code, setCode, language, setLanguage }}>
      {children}
    </CodeContext.Provider>
  );
}

export function useCode() {
  const context = useContext(CodeContext);
  if (context === undefined) {
    // Safe fallback so no page crashes even if used outside provider
    return {
      code: DEFAULT_GENETIC_CODE,
      setCode: () => {},
      language: "python",
      setLanguage: () => {}
    };
  }
  return context;
}

