-- Remove the manually created test student account.

DELETE FROM auth.users
WHERE id IN (
  SELECT id
  FROM public.profiles
  WHERE role = 'student'
    AND (
      id = '7478c1d5-a286-46ff-a3c6-60f9829800e4'::uuid
      OR email = 'aluno@teste.com'
    )
);
