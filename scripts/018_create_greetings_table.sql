-- Create greetings table
CREATE TABLE IF NOT EXISTS public.greetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    birthday_id UUID NOT NULL REFERENCES public.birthdays(id) ON DELETE CASCADE,
    text TEXT,
    audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, birthday_id)
);

-- Enable RLS
ALTER TABLE public.greetings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own greetings"
    ON public.greetings
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own greetings"
    ON public.greetings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own greetings"
    ON public.greetings
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own greetings"
    ON public.greetings
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create storage bucket for greetings audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('greetings', 'greetings', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for greetings bucket
CREATE POLICY "Users can view their own greeting audio"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'greetings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload their own greeting audio"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'greetings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own greeting audio"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'greetings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own greeting audio"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'greetings' AND (storage.foldername(name))[1] = auth.uid()::text);
