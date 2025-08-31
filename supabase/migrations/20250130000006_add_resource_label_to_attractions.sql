-- Add resource_label field to attractions table for user-configurable resource terminology
ALTER TABLE attractions 
ADD COLUMN resource_label VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN attractions.resource_label IS 'User-configurable label for resources (e.g., "Simulator", "Room", "Lane", "Court")';

-- Update existing golf simulator attractions with a default label as an example
UPDATE attractions 
SET resource_label = 'Simulator' 
WHERE attraction_type = 'golf_simulator' AND resource_label IS NULL;
