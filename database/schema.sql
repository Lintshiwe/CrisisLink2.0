-- CrisisLink Database Schema
-- PostgreSQL with PostGIS extension for spatial data

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    emergency_contact VARCHAR(20),
    blood_type VARCHAR(5),
    medical_conditions TEXT,
    is_active BOOLEAN DEFAULT true,
    last_location GEOMETRY(Point, 4326),
    fcm_token VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agents table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    badge_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_plate VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    specialization VARCHAR(20) CHECK (specialization IN ('medical', 'fire', 'police', 'search_rescue', 'general')) DEFAULT 'general',
    status VARCHAR(20) CHECK (status IN ('available', 'busy', 'offline')) DEFAULT 'offline',
    current_location GEOMETRY(Point, 4326),
    is_active BOOLEAN DEFAULT true,
    rating DECIMAL(3,2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
    total_rescues INTEGER DEFAULT 0,
    fcm_token VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SOS Alerts table
CREATE TABLE sos_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    address TEXT,
    emergency_type VARCHAR(20) CHECK (emergency_type IN ('medical', 'fire', 'police', 'natural_disaster', 'accident', 'other')) DEFAULT 'other',
    priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status VARCHAR(20) CHECK (status IN ('pending', 'assigned', 'en_route', 'arrived', 'completed', 'cancelled')) DEFAULT 'pending',
    description TEXT,
    weather_conditions JSONB,
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    actual_arrival TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Weather Alerts table
CREATE TABLE weather_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location GEOMETRY(Point, 4326) NOT NULL,
    province VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    alert_type VARCHAR(20) CHECK (alert_type IN ('storm', 'flood', 'heatwave', 'cold_snap', 'wind', 'rain', 'snow', 'drought')) NOT NULL,
    severity VARCHAR(10) CHECK (severity IN ('low', 'moderate', 'high', 'extreme')) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    weather_data JSONB,
    affected_radius INTEGER DEFAULT 50, -- in kilometers
    is_active BOOLEAN DEFAULT true,
    sent_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sos_alert_id UUID NOT NULL REFERENCES sos_alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    status VARCHAR(10) CHECK (status IN ('active', 'ended')) DEFAULT 'active',
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_type VARCHAR(10) CHECK (sender_type IN ('user', 'agent')) NOT NULL,
    message_type VARCHAR(10) CHECK (message_type IN ('text', 'image', 'location', 'voice')) DEFAULT 'text',
    content TEXT NOT NULL,
    metadata JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Calls table
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    initiator_id UUID NOT NULL,
    initiator_type VARCHAR(10) CHECK (initiator_type IN ('user', 'agent')) NOT NULL,
    status VARCHAR(10) CHECK (status IN ('initiated', 'ringing', 'answered', 'ended', 'missed')) DEFAULT 'initiated',
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in seconds
    twilio_call_sid VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agent Location History table (for tracking and analytics)
CREATE TABLE agent_location_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    status VARCHAR(20) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Admin Users table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'supervisor', 'operator')) DEFAULT 'operator',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System Logs table
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_level VARCHAR(10) CHECK (log_level IN ('error', 'warn', 'info', 'debug')) NOT NULL,
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    user_id UUID,
    agent_id UUID,
    sos_alert_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_location ON users USING GIST(last_location);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_agents_email ON agents(email);
CREATE INDEX idx_agents_badge ON agents(badge_number);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_location ON agents USING GIST(current_location);
CREATE INDEX idx_agents_specialization ON agents(specialization);
CREATE INDEX idx_agents_active ON agents(is_active);

CREATE INDEX idx_sos_alerts_user_id ON sos_alerts(user_id);
CREATE INDEX idx_sos_alerts_agent_id ON sos_alerts(agent_id);
CREATE INDEX idx_sos_alerts_status ON sos_alerts(status);
CREATE INDEX idx_sos_alerts_priority ON sos_alerts(priority);
CREATE INDEX idx_sos_alerts_location ON sos_alerts USING GIST(location);
CREATE INDEX idx_sos_alerts_created_at ON sos_alerts(created_at);
CREATE INDEX idx_sos_alerts_emergency_type ON sos_alerts(emergency_type);

CREATE INDEX idx_weather_alerts_location ON weather_alerts USING GIST(location);
CREATE INDEX idx_weather_alerts_type ON weather_alerts(alert_type);
CREATE INDEX idx_weather_alerts_severity ON weather_alerts(severity);
CREATE INDEX idx_weather_alerts_active ON weather_alerts(is_active);
CREATE INDEX idx_weather_alerts_time ON weather_alerts(start_time, end_time);

CREATE INDEX idx_conversations_sos_alert_id ON conversations(sos_alert_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX idx_conversations_status ON conversations(status);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id, sender_type);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_read ON messages(is_read);

CREATE INDEX idx_calls_conversation_id ON calls(conversation_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_created_at ON calls(created_at);

CREATE INDEX idx_agent_location_history_agent_id ON agent_location_history(agent_id);
CREATE INDEX idx_agent_location_history_recorded_at ON agent_location_history(recorded_at);
CREATE INDEX idx_agent_location_history_location ON agent_location_history USING GIST(location);

CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_category ON system_logs(category);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sos_alerts_updated_at BEFORE UPDATE ON sos_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weather_alerts_updated_at BEFORE UPDATE ON weather_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create some utility functions
-- Function to find nearest agents
CREATE OR REPLACE FUNCTION find_nearest_agents(
    user_lat DOUBLE PRECISION,
    user_lon DOUBLE PRECISION,
    emergency_type_param VARCHAR DEFAULT NULL,
    max_distance_km INTEGER DEFAULT 50,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    agent_id UUID,
    first_name VARCHAR,
    last_name VARCHAR,
    badge_number VARCHAR,
    vehicle_plate VARCHAR,
    specialization VARCHAR,
    distance_km DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.first_name,
        a.last_name,
        a.badge_number,
        a.vehicle_plate,
        a.specialization,
        ST_Distance(
            ST_GeomFromText('POINT(' || user_lon || ' ' || user_lat || ')', 4326)::geography,
            a.current_location::geography
        ) / 1000 AS distance_km
    FROM agents a
    WHERE 
        a.status = 'available'
        AND a.is_active = true
        AND a.current_location IS NOT NULL
        AND ST_DWithin(
            ST_GeomFromText('POINT(' || user_lon || ' ' || user_lat || ')', 4326)::geography,
            a.current_location::geography,
            max_distance_km * 1000
        )
        AND (
            emergency_type_param IS NULL 
            OR a.specialization = emergency_type_param 
            OR a.specialization = 'general'
        )
    ORDER BY distance_km
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get active weather alerts for location
CREATE OR REPLACE FUNCTION get_active_weather_alerts(
    user_lat DOUBLE PRECISION,
    user_lon DOUBLE PRECISION,
    radius_km INTEGER DEFAULT 50
)
RETURNS TABLE (
    alert_id UUID,
    alert_type VARCHAR,
    severity VARCHAR,
    title VARCHAR,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wa.id,
        wa.alert_type,
        wa.severity,
        wa.title,
        wa.description,
        wa.start_time,
        wa.end_time
    FROM weather_alerts wa
    WHERE 
        wa.is_active = true
        AND wa.start_time <= CURRENT_TIMESTAMP
        AND (wa.end_time IS NULL OR wa.end_time >= CURRENT_TIMESTAMP)
        AND ST_DWithin(
            ST_GeomFromText('POINT(' || user_lon || ' ' || user_lat || ')', 4326)::geography,
            wa.location::geography,
            radius_km * 1000
        )
    ORDER BY wa.severity DESC, wa.start_time ASC;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data (for development/testing)
-- Sample admin user (password: admin123)
INSERT INTO admin_users (email, password, first_name, last_name, role) VALUES
('admin@crisislink.co.za', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVMpYd7TtqOW7Bx.', 'System', 'Administrator', 'admin');

-- Sample agents for testing
INSERT INTO agents (email, password, first_name, last_name, phone_number, badge_number, vehicle_plate, vehicle_type, specialization, status, current_location) VALUES
('agent1@crisislink.co.za', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVMpYd7TtqOW7Bx.', 'John', 'Smith', '+27821234567', 'A001', 'CA 123-456', 'Ambulance', 'medical', 'available', ST_GeomFromText('POINT(18.4241 -33.9249)', 4326)),
('agent2@crisislink.co.za', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVMpYd7TtqOW7Bx.', 'Sarah', 'Johnson', '+27821234568', 'F001', 'CA 789-012', 'Fire Truck', 'fire', 'available', ST_GeomFromText('POINT(28.0473 -26.2041)', 4326)),
('agent3@crisislink.co.za', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVMpYd7TtqOW7Bx.', 'Mike', 'Williams', '+27821234569', 'P001', 'CA 345-678', 'Police Vehicle', 'police', 'available', ST_GeomFromText('POINT(31.0218 -29.8587)', 4326));

-- Sample weather alert
INSERT INTO weather_alerts (location, province, city, alert_type, severity, title, description, start_time, end_time) VALUES
(ST_GeomFromText('POINT(18.4241 -33.9249)', 4326), 'Western Cape', 'Cape Town', 'wind', 'high', 'Strong Wind Warning', 'Strong winds expected with gusts up to 80 km/h. Secure loose objects and avoid outdoor activities.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '6 hours');

COMMIT;