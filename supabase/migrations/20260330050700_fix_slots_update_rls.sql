DROP POLICY IF EXISTS slots_update ON public.slots;

CREATE POLICY slots_update ON public.slots
  FOR UPDATE TO authenticated
  USING (mentor_id = auth.uid());
