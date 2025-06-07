import { useState, useEffect } from 'react';

interface Template {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  type: string;
  tags: string[];
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch('/template-overview.json');
        if (!response.ok) {
          throw new Error('Failed to load templates');
        }
        const data = await response.json();
        setTemplates(data.templates);
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, []);

  return { templates, isLoading };
}
