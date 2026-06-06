CREATE TABLE public.study_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  topic TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_notes TO authenticated;
GRANT ALL ON public.study_notes TO service_role;
ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notes all" ON public.study_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX study_notes_user_course_idx ON public.study_notes(user_id, course_id, created_at DESC);