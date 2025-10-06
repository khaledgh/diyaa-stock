-- Add van_id column to locations table
-- This allows locations of type 'van' to reference an actual van

ALTER TABLE locations 
ADD COLUMN van_id INT NULL AFTER type,
ADD CONSTRAINT fk_locations_van 
    FOREIGN KEY (van_id) REFERENCES vans(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;

-- Add index for better performance
CREATE INDEX idx_van_id ON locations(van_id);
