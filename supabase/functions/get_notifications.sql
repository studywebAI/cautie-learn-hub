-- Function to get user notifications
CREATE OR REPLACE FUNCTION public.get_notifications(_user_id uuid, _limit integer DEFAULT 50, _offset integer DEFAULT 0, _unread_only boolean DEFAULT false)
RETURNS TABLE (
    id uuid,
    type text,
    title text,
    message text,
    data jsonb,
    read boolean,
    read_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id,
        type,
        title,
        message,
        data,
        read,
        read_at,
        expires_at,
        created_at
    FROM public.notifications
    WHERE user_id = _user_id
    AND (NOT _unread_only OR read = false)
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
    LIMIT _limit
    OFFSET _offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;