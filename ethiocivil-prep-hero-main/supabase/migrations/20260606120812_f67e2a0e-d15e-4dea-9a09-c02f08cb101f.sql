-- 1. course_materials: owner-only SELECT
DROP POLICY IF EXISTS "authed read materials" ON public.course_materials;
CREATE POLICY "read own materials"
  ON public.course_materials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. storage.objects for course-materials bucket: owner-only via folder prefix
-- Existing policies were created by the storage bucket helper; drop and recreate scoped to user folder.
DROP POLICY IF EXISTS "authed read course-materials" ON storage.objects;
DROP POLICY IF EXISTS "authed insert course-materials" ON storage.objects;
DROP POLICY IF EXISTS "authed update course-materials" ON storage.objects;
DROP POLICY IF EXISTS "authed delete course-materials" ON storage.objects;
DROP POLICY IF EXISTS "course-materials read" ON storage.objects;
DROP POLICY IF EXISTS "course-materials insert" ON storage.objects;
DROP POLICY IF EXISTS "course-materials update" ON storage.objects;
DROP POLICY IF EXISTS "course-materials delete" ON storage.objects;

CREATE POLICY "course-materials owner read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'course-materials' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "course-materials owner insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'course-materials' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "course-materials owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'course-materials' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "course-materials owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'course-materials' AND (storage.foldername(name))[1] = auth.uid()::text);