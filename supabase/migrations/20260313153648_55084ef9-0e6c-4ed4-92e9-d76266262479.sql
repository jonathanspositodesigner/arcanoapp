
CREATE TABLE public.subscription_billing_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  plan_slug TEXT NOT NULL,
  due_date DATE NOT NULL,
  day_offset INTEGER NOT NULL CHECK (day_offset >= 0 AND day_offset <= 5),
  email_sent_to TEXT NOT NULL,
  checkout_url TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, day_offset, due_date)
);

ALTER TABLE public.subscription_billing_reminders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_billing_reminders_subscription ON public.subscription_billing_reminders (subscription_id, due_date);
CREATE INDEX idx_billing_reminders_user ON public.subscription_billing_reminders (user_id);
