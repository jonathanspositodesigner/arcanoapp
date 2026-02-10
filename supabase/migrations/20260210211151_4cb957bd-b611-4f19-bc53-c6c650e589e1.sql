INSERT INTO ai_tool_settings (tool_name, credit_cost, has_api_cost, api_cost)
VALUES ('Refinar Avatar', 75, true, 0.12)
ON CONFLICT (tool_name) DO NOTHING;