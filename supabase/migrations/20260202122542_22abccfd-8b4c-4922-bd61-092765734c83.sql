-- Criar função para atualizar posições da fila em batch (elimina loop N+1)
CREATE OR REPLACE FUNCTION update_queue_positions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE upscaler_jobs AS uj
  SET position = ranked.new_position
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS new_position
    FROM upscaler_jobs
    WHERE status = 'queued'
  ) AS ranked
  WHERE uj.id = ranked.id AND uj.status = 'queued';
END;
$$;