INSERT INTO app_settings (id, value)
VALUES ('app_version', '{"min_version": "5.0.0", "force_update": true, "message": "Nova versão disponível! Clique para atualizar."}')
ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value;