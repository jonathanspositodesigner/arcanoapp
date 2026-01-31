-- Add column to track RunningHub bonus claim
ALTER TABLE profiles 
ADD COLUMN runninghub_bonus_claimed BOOLEAN DEFAULT false;