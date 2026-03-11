UPDATE bg_remover_jobs 
SET status = 'failed', 
    error_message = 'Webhook missed - job auto-failed', 
    credits_refunded = true,
    completed_at = now()
WHERE id = '609a53f9-c2f7-4c73-b8ad-634840097577' 
  AND status = 'running';

UPDATE upscaler_credits 
SET balance = balance + 5 
WHERE user_id = '8f5fb835-2c26-400e-8826-2639eb1e0521';