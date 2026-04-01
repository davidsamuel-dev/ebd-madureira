import React, { createContext, useContext, useMemo, useState } from 'react';

const ClassesContext = createContext(undefined);

export function ClassesProvider({ children }) {
  const [classes, setClasses] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  /** Turma selecionada (ex.: lista de alunos / chamada futura). */
  const [selectedClass, setSelectedClass] = useState(null);

  const value = useMemo(
    () => ({
      classes,
      setClasses,
      activeLesson,
      setActiveLesson,
      selectedClass,
      setSelectedClass,
    }),
    [classes, activeLesson, selectedClass],
  );

  return (
    <ClassesContext.Provider value={value}>{children}</ClassesContext.Provider>
  );
}

export function useClassesContext() {
  const ctx = useContext(ClassesContext);
  if (!ctx) {
    throw new Error('useClassesContext must be used within ClassesProvider');
  }
  return ctx;
}
