-- Create declarations table
CREATE TABLE IF NOT EXISTS declarations (
    id UUID PRIMARY KEY,
    number VARCHAR(20) NOT NULL,
    date VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    recipient JSONB NOT NULL,
    equipment JSONB NOT NULL,
    sender JSONB NOT NULL,
    carrier JSONB NOT NULL,
    signature_sender TEXT,
    signature_carrier TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by number
CREATE INDEX IF NOT EXISTS idx_declarations_number ON declarations(number);
