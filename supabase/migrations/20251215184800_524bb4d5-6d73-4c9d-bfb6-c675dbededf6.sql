-- Criar função de limpeza automática de logs antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_page_views INTEGER;
  deleted_email_logs INTEGER;
  deleted_webhook_logs INTEGER;
  deleted_collection_views INTEGER;
  deleted_arte_clicks INTEGER;
  deleted_import_logs INTEGER;
BEGIN
  -- Limpar page_views > 90 dias
  DELETE FROM page_views WHERE viewed_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_page_views = ROW_COUNT;
  
  -- Limpar email_campaign_logs > 90 dias
  DELETE FROM email_campaign_logs WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_email_logs = ROW_COUNT;
  
  -- Limpar webhook_logs > 90 dias
  DELETE FROM webhook_logs WHERE received_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_webhook_logs = ROW_COUNT;
  
  -- Limpar collection_views > 90 dias
  DELETE FROM collection_views WHERE viewed_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_collection_views = ROW_COUNT;
  
  -- Limpar arte_clicks > 90 dias
  DELETE FROM arte_clicks WHERE clicked_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_arte_clicks = ROW_COUNT;
  
  -- Limpar import_log > 90 dias
  DELETE FROM import_log WHERE processed_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_import_logs = ROW_COUNT;
  
  RAISE NOTICE 'Cleanup completed: page_views=%, email_logs=%, webhook_logs=%, collection_views=%, arte_clicks=%, import_logs=%',
    deleted_page_views, deleted_email_logs, deleted_webhook_logs, 
    deleted_collection_views, deleted_arte_clicks, deleted_import_logs;
END;
$$;