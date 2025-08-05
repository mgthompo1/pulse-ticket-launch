import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LandingPageContent {
  id: string;
  section: string;
  key: string;
  value: string;
  description?: string;
  content_type: string;
  updated_at: string;
}

export const useLandingPageContent = () => {
  const [content, setContent] = useState<LandingPageContent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from("landing_page_content")
        .select("*")
        .order("section", { ascending: true })
        .order("key", { ascending: true });

      if (error) throw error;
      setContent((data || []).map(item => ({
        ...item,
        description: item.description || undefined,
        content_type: item.content_type || 'text',
        updated_at: item.updated_at || new Date().toISOString()
      })));
    } catch (error) {
      console.error("Error fetching landing page content:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateContent = async (id: string, newValue: string) => {
    try {
      const { error } = await supabase
        .from("landing_page_content")
        .update({ value: newValue })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setContent(prev => 
        prev.map(item => 
          item.id === id ? { ...item, value: newValue } : item
        )
      );

      return { success: true };
    } catch (error) {
      console.error("Error updating content:", error);
      return { success: false, error };
    }
  };

  const getContentByKey = (section: string, key: string) => {
    return content.find(item => item.section === section && item.key === key)?.value || "";
  };

  useEffect(() => {
    fetchContent();
  }, []);

  return {
    content,
    loading,
    updateContent,
    getContentByKey,
    refreshContent: fetchContent
  };
};