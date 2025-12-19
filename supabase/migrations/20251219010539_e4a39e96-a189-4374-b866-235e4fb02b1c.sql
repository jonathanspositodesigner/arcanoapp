-- First, remove duplicate entries keeping only the first one
DELETE FROM daily_musicos_downloads a
USING daily_musicos_downloads b
WHERE a.id > b.id 
  AND a.user_id = b.user_id 
  AND a.arte_id = b.arte_id 
  AND a.download_date = b.download_date;

-- Now add the unique constraint
ALTER TABLE daily_musicos_downloads 
ADD CONSTRAINT unique_user_arte_date UNIQUE (user_id, arte_id, download_date);