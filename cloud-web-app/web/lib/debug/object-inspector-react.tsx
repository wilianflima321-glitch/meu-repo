/**
 * React hooks and provider for the object inspector runtime.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { InspectedObject, InspectorConfig, PropertyDescriptor } from './object-inspector-contracts';
import { ObjectInspector } from './object-inspector';

interface InspectorContextValue {
  inspector: ObjectInspector;
}

const InspectorContext = createContext<InspectorContextValue | null>(null);

export function InspectorProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config?: Partial<InspectorConfig>;
}) {
  const value = useMemo(() => ({
    inspector: new ObjectInspector(config),
  }), [config]);

  useEffect(() => {
    return () => {
      value.inspector.dispose();
    };
  }, [value]);

  return (
    <InspectorContext.Provider value={value}>
      {children}
    </InspectorContext.Provider>
  );
}

export function useObjectInspector() {
  const context = useContext(InspectorContext);
  return context?.inspector || ObjectInspector.getInstance();
}

export function useInspectedObject(id: string) {
  const inspector = useObjectInspector();
  const [object, setObject] = useState<InspectedObject | null>(null);

  useEffect(() => {
    const updateObject = () => {
      const inspected = inspector['inspectedObjects'].get(id);
      setObject(inspected ? { ...inspected } : null);
    };

    updateObject();

    inspector.on('objectRefreshed', (obj: InspectedObject) => {
      if (obj.id === id) updateObject();
    });

    return () => {
      inspector.removeAllListeners('objectRefreshed');
    };
  }, [inspector, id]);

  const setValue = useCallback((path: string, value: unknown) => {
    return inspector.setValue(id, path, value);
  }, [inspector, id]);

  const refresh = useCallback(() => {
    inspector.refresh(id);
  }, [inspector, id]);

  return { object, setValue, refresh };
}

export function useInspectorSelection() {
  const inspector = useObjectInspector();
  const [selected, setSelected] = useState<InspectedObject | null>(null);

  useEffect(() => {
    const update = () => {
      setSelected(inspector.getSelected());
    };

    update();
    inspector.on('selectionChanged', update);

    return () => {
      inspector.off('selectionChanged', update);
    };
  }, [inspector]);

  const select = useCallback((id: string | null) => {
    inspector.select(id);
  }, [inspector]);

  return { selected, select };
}

export function usePropertyEditor(id: string, path: string) {
  const inspector = useObjectInspector();
  const [value, setValue] = useState<unknown>(null);

  useEffect(() => {
    const obj = inspector['inspectedObjects'].get(id);
    if (obj) {
      const prop = findProperty(obj.properties, path);
      setValue(prop?.value);
    }
  }, [inspector, id, path]);

  const update = useCallback((newValue: unknown) => {
    inspector.setValue(id, path, newValue);
    setValue(newValue);
  }, [inspector, id, path]);

  return { value, update };
}

function findProperty(props: PropertyDescriptor[], path: string): PropertyDescriptor | null {
  for (const prop of props) {
    if (prop.path === path) return prop;
    if (prop.children) {
      const found = findProperty(prop.children, path);
      if (found) return found;
    }
  }
  return null;
}

export function useInspectorSearch(id: string) {
  const inspector = useObjectInspector();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PropertyDescriptor[]>([]);

  useEffect(() => {
    if (query.length > 1) {
      setResults(inspector.search(id, query));
    } else {
      setResults([]);
    }
  }, [inspector, id, query]);

  return { query, setQuery, results };
}
