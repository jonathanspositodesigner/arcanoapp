-- Create rate_limits table for IP-based rate limiting
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ip_address, endpoint)
);

-- Create index for fast lookups
CREATE INDEX idx_rate_limits_ip_endpoint ON public.rate_limits(ip_address, endpoint);
CREATE INDEX idx_rate_limits_window_start ON public.rate_limits(window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow edge functions (service role) full access
CREATE POLICY "Service role full access" 
ON public.rate_limits 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _ip_address TEXT,
  _endpoint TEXT,
  _max_requests INTEGER DEFAULT 60,
  _window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, reset_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _now TIMESTAMP WITH TIME ZONE := now();
  _window_start TIMESTAMP WITH TIME ZONE;
  _request_count INTEGER;
  _reset_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate window start
  _window_start := _now - (_window_seconds || ' seconds')::INTERVAL;
  
  -- Try to get existing record
  SELECT request_count, rate_limits.window_start INTO _request_count, _window_start
  FROM rate_limits
  WHERE ip_address = _ip_address AND endpoint = _endpoint
  FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Create new record
    INSERT INTO rate_limits (ip_address, endpoint, request_count, window_start)
    VALUES (_ip_address, _endpoint, 1, _now);
    
    RETURN QUERY SELECT TRUE, 1, _now + (_window_seconds || ' seconds')::INTERVAL;
    RETURN;
  END IF;
  
  -- Check if window has expired
  IF _window_start < _now - (_window_seconds || ' seconds')::INTERVAL THEN
    -- Reset the window
    UPDATE rate_limits 
    SET request_count = 1, window_start = _now, updated_at = _now
    WHERE ip_address = _ip_address AND endpoint = _endpoint;
    
    RETURN QUERY SELECT TRUE, 1, _now + (_window_seconds || ' seconds')::INTERVAL;
    RETURN;
  END IF;
  
  -- Check if limit exceeded
  IF _request_count >= _max_requests THEN
    _reset_time := _window_start + (_window_seconds || ' seconds')::INTERVAL;
    RETURN QUERY SELECT FALSE, _request_count, _reset_time;
    RETURN;
  END IF;
  
  -- Increment counter
  UPDATE rate_limits 
  SET request_count = request_count + 1, updated_at = _now
  WHERE ip_address = _ip_address AND endpoint = _endpoint
  RETURNING request_count INTO _request_count;
  
  _reset_time := _window_start + (_window_seconds || ' seconds')::INTERVAL;
  RETURN QUERY SELECT TRUE, _request_count, _reset_time;
END;
$$;

-- Cleanup function for old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;