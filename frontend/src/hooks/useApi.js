import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useMaterials() {
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getMaterials();
      setMaterials(data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return { materials, isLoading, error, refresh: fetchMaterials };
}

export function useProgress() {
  const [progress, setProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getProgressAnalytics();
        setProgress(data);
      } catch (e) {
        console.warn("Failed to load progress", e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return { progress, isLoading };
}
