import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AIDebugContextType {
  isDebugEnabled: boolean;
  setDebugEnabled: (enabled: boolean) => void;
  toggleDebug: () => void;
}

const AIDebugContext = createContext<AIDebugContextType | undefined>(undefined);

export const useAIDebug = () => {
  const context = useContext(AIDebugContext);
  if (context === undefined) {
    throw new Error('useAIDebug must be used within an AIDebugProvider');
  }
  return context;
};

interface AIDebugProviderProps {
  children: ReactNode;
}

export const AIDebugProvider = ({ children }: AIDebugProviderProps) => {
  const [isDebugEnabled, setIsDebugEnabled] = useState(() => {
    // Persist in localStorage
    const stored = localStorage.getItem('ai_debug_mode');
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem('ai_debug_mode', String(isDebugEnabled));
  }, [isDebugEnabled]);

  const setDebugEnabled = (enabled: boolean) => {
    setIsDebugEnabled(enabled);
  };

  const toggleDebug = () => {
    setIsDebugEnabled(prev => !prev);
  };

  return (
    <AIDebugContext.Provider value={{ isDebugEnabled, setDebugEnabled, toggleDebug }}>
      {children}
    </AIDebugContext.Provider>
  );
};
