
-- Update GPT Image registry to point to image_generator_jobs with engine filter
UPDATE public.ai_tool_registry 
SET table_name = 'image_generator_jobs',
    engine_filter_column = 'engine',
    engine_filter_value = 'gpt_image_2',
    credit_column = 'user_credit_cost',
    cost_column = 'rh_cost',
    has_started_at = true,
    has_failed_at_step = true,
    has_queue_tracking = true,
    input_image_column = 'input_urls'
WHERE tool_name = 'GPT Image';
