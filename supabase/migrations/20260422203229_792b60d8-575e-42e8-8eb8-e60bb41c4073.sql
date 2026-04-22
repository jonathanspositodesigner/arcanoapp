INSERT INTO public.ai_tool_registry (
  tool_name, table_name, enabled, media_type, expiry_hours,
  engine_filter_column, engine_filter_value,
  credit_column, cost_column, output_column,
  input_image_column, storage_folder,
  has_started_at, has_failed_at_step, has_queue_tracking,
  display_name, badge_color, display_order
) VALUES (
  'GPT Image Evolink', 'image_generator_jobs', true, 'image', 24,
  'engine', 'gpt_image_evolink',
  'user_credit_cost', 'rh_cost', 'output_url',
  'input_urls', 'image-generator',
  true, true, false,
  'GPT Image Evolink', '#10B981', 15
)
ON CONFLICT DO NOTHING;