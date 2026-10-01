-- ============================================================================================================================
-- CAMBRIDGE LEARNING SERVICES — MASTER DATABASE SETUP SCRIPT
-- Application: Cambridge Learning Services | Examination & Assessment Portal
-- Description: Complete, consolidated, idempotent, 1-click bootstrap script for Supabase PostgreSQL.
-- Instructions: Paste this ENTIRE file into the Supabase SQL Editor and click "Run".
-- ============================================================================================================================


-- ============================================================================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- Required for crypt(), gen_salt(), gen_random_uuid()


-- ============================================================================================================================
-- SECTION 2: TABLES DEFINITION & SCHEMA
-- ============================================================================================================================

-- ------------------------------------------------------------
-- TABLE: profiles
-- Central user profile table linked 1:1 with auth.users.
-- Covers all roles: 'candidate', 'admin', 'super_admin'
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID        REFERENCES auth.users NOT NULL PRIMARY KEY,
  email                 TEXT,
  full_name             TEXT,
  phone                 TEXT,
  address               TEXT,
  state                 TEXT,
  city                  TEXT,
  role                  TEXT        DEFAULT 'candidate',
  profile_completed     BOOLEAN     DEFAULT FALSE,
  disclaimer_accepted   BOOLEAN     DEFAULT FALSE,
  allotted_exam_ids     UUID[]      DEFAULT '{}'::UUID[],
  is_exam_locked        BOOLEAN     DEFAULT FALSE,
  can_register          BOOLEAN     DEFAULT TRUE,
  profile_photo_url     TEXT,
  live_photo_url        TEXT,
  aadhaar_front_url     TEXT,
  aadhaar_back_url      TEXT,
  pan_card_url          TEXT,
  signature_url         TEXT,
  video_url             TEXT,
  ip_address            TEXT,
  service_delivery_step INTEGER     DEFAULT 9,
  created_at            TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Ensure all columns exist idempotently
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email                 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name             TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone                 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address               TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state                 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city                  TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role                  TEXT        DEFAULT 'candidate';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed     BOOLEAN     DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disclaimer_accepted   BOOLEAN     DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allotted_exam_ids     UUID[]      DEFAULT '{}'::UUID[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_exam_locked        BOOLEAN     DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_register          BOOLEAN     DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_photo_url     TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS live_photo_url        TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aadhaar_front_url     TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aadhaar_back_url      TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pan_card_url          TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_url         TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS video_url             TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ip_address            TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS service_delivery_step INTEGER     DEFAULT 9;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at            TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW());

-- Enforce valid roles constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'candidate'));

-- Enforce unique phone numbers only for actual provided numbers
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;
DROP INDEX IF EXISTS public.profiles_phone_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_key ON public.profiles (phone)
  WHERE phone IS NOT NULL AND phone != '' AND phone NOT LIKE 'NO_PHONE%';

-- Clean any array discrepancies
ALTER TABLE public.profiles ALTER COLUMN allotted_exam_ids TYPE UUID[] USING
  CASE
    WHEN allotted_exam_ids IS NULL THEN '{}'::UUID[]
    WHEN allotted_exam_ids = ARRAY[NULL]::UUID[] THEN '{}'::UUID[]
    ELSE allotted_exam_ids
  END;


-- ------------------------------------------------------------
-- TABLE: exams
-- Stores examination modules and duration definitions.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exams (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title              TEXT        NOT NULL,
  description        TEXT,
  duration           INTEGER     NOT NULL,   -- Duration in minutes
  marks_per_question INTEGER     DEFAULT 5,
  created_at         TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS description        TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS marks_per_question INTEGER DEFAULT 5;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS created_at         TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW());


-- ------------------------------------------------------------
-- TABLE: questions
-- Stores question sets linked to exams. Cascades on exam delete.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id        UUID        REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  question_text  TEXT        NOT NULL,
  options        JSONB       NOT NULL,   -- JSON array of string options
  correct_option INTEGER     NOT NULL,   -- 0-based index of correct option
  created_at     TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW());


-- ------------------------------------------------------------
-- TABLE: submissions
-- Stores candidate exam attempts, score evaluation, and manual overrides.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.submissions (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID        REFERENCES auth.users(id) NOT NULL,
  exam_id              UUID        REFERENCES public.exams(id) NOT NULL,
  score                INTEGER     NOT NULL,
  total_questions      INTEGER     NOT NULL,
  answers              JSONB       NOT NULL,   -- question index -> chosen option index
  is_released          BOOLEAN     DEFAULT FALSE,
  admin_score_override INTEGER,
  submitted_at         TIMESTAMPTZ,
  marks_per_question   INTEGER     DEFAULT 5,
  question_marks       JSONB       DEFAULT '{}'::jsonb,
  final_score_override INTEGER     DEFAULT NULL,
  calculated_score     INTEGER     DEFAULT NULL,
  calculated_total     INTEGER     DEFAULT NULL,
  created_at           TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS is_released          BOOLEAN     DEFAULT FALSE;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS admin_score_override INTEGER;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS submitted_at         TIMESTAMPTZ;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS marks_per_question   INTEGER     DEFAULT 5;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS question_marks       JSONB       DEFAULT '{}'::jsonb;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS final_score_override INTEGER     DEFAULT NULL;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS calculated_score     INTEGER     DEFAULT NULL;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS calculated_total     INTEGER     DEFAULT NULL;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS created_at           TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW());


-- ------------------------------------------------------------
-- TABLE: admissions
-- Online candidate registration, document submission, & approval queue.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admissions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name         TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  phone             TEXT        NOT NULL,
  course_name       TEXT,
  pincode           TEXT,
  state             TEXT,
  city              TEXT,
  address           TEXT,
  aadhaar_front_url TEXT,
  aadhaar_back_url  TEXT,
  pan_url           TEXT,
  signature_url     TEXT,
  profile_photo_url TEXT,
  video_url         TEXT,
  ip_address        TEXT,
  status            TEXT        DEFAULT 'pending',
  created_at        TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS course_name       TEXT;
ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS pincode           TEXT;
ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS state             TEXT;
ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS city              TEXT;
ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS address           TEXT;
ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS aadhaar_front_url TEXT;
ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS aadhaar_back_url  TEXT;
ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS pan_url           TEXT;
ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS signature_url     TEXT;
ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS video_url         TEXT;
ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS ip_address        TEXT;
ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'pending';


-- ============================================================================================================================
-- SECTION 3: STORAGE BUCKETS
-- ============================================================================================================================

-- Bucket 1: aadhaar_cards
INSERT INTO storage.buckets (id, name, public)
VALUES ('aadhaar_cards', 'aadhaar_cards', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

-- Bucket 2: candidate_documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate_documents', 'candidate_documents', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;


-- ============================================================================================================================
-- SECTION 4: STORAGE POLICIES
-- ============================================================================================================================

DROP POLICY IF EXISTS "Public view aadhaar_cards"              ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload aadhaar_cards"     ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update aadhaar_cards"     ON storage.objects;
DROP POLICY IF EXISTS "Public anonymous upload aadhaar_cards"  ON storage.objects;

CREATE POLICY "Public view aadhaar_cards"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'aadhaar_cards');

CREATE POLICY "Allow upload aadhaar_cards"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'aadhaar_cards');

CREATE POLICY "Allow update aadhaar_cards"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'aadhaar_cards');


DROP POLICY IF EXISTS "Public view candidate_documents"             ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload candidate_documents"    ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update candidate_documents"    ON storage.objects;
DROP POLICY IF EXISTS "Public anonymous upload candidate_documents" ON storage.objects;

CREATE POLICY "Public view candidate_documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'candidate_documents');

CREATE POLICY "Allow upload candidate_documents"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'candidate_documents');

CREATE POLICY "Allow update candidate_documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'candidate_documents');


-- ============================================================================================================================
-- SECTION 5: HELPER FUNCTIONS
-- ============================================================================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;


-- ============================================================================================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================================================================

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions  ENABLE ROW LEVEL SECURITY;

-- Drop legacy policies
DROP POLICY IF EXISTS "Public profiles"                          ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone"    ON public.profiles;
DROP POLICY IF EXISTS "Profile self-update"                      ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile"       ON public.profiles;
DROP POLICY IF EXISTS "Admin can update any profile"             ON public.profiles;

DROP POLICY IF EXISTS "Exams viewable"                           ON public.exams;
DROP POLICY IF EXISTS "Anyone can view exams"                    ON public.exams;
DROP POLICY IF EXISTS "Exams admin"                              ON public.exams;
DROP POLICY IF EXISTS "Admins can manage exams"                  ON public.exams;

DROP POLICY IF EXISTS "Questions viewable"                       ON public.questions;
DROP POLICY IF EXISTS "Anyone can view questions"                ON public.questions;
DROP POLICY IF EXISTS "Questions admin"                          ON public.questions;
DROP POLICY IF EXISTS "Admins can manage questions"              ON public.questions;

DROP POLICY IF EXISTS "Submissions insert"                       ON public.submissions;
DROP POLICY IF EXISTS "Users can insert their own submissions"   ON public.submissions;
DROP POLICY IF EXISTS "Submissions view"                         ON public.submissions;
DROP POLICY IF EXISTS "Users can view their own submissions"     ON public.submissions;
DROP POLICY IF EXISTS "Submissions admin"                        ON public.submissions;
DROP POLICY IF EXISTS "Admins can manage submissions"            ON public.submissions;
DROP POLICY IF EXISTS "Admins can update submissions"            ON public.submissions;

DROP POLICY IF EXISTS "Allow public insert admissions"           ON public.admissions;
DROP POLICY IF EXISTS "Allow admin read admissions"              ON public.admissions;
DROP POLICY IF EXISTS "Allow admin update admissions"            ON public.admissions;
DROP POLICY IF EXISTS "Allow admin delete admissions"            ON public.admissions;

-- Profiles Policies
CREATE POLICY "Public profiles"
  ON public.profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "Profile self-update"
  ON public.profiles FOR UPDATE
  USING     (auth.uid() = id)
  WITH CHECK(auth.uid() = id);

CREATE POLICY "Admin can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- Exams Policies
CREATE POLICY "Exams viewable"
  ON public.exams FOR SELECT
  USING (TRUE);

CREATE POLICY "Exams admin"
  ON public.exams FOR ALL
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- Questions Policies
CREATE POLICY "Questions viewable"
  ON public.questions FOR SELECT
  USING (TRUE);

CREATE POLICY "Questions admin"
  ON public.questions FOR ALL
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- Submissions Policies
CREATE POLICY "Submissions insert"
  ON public.submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Submissions view"
  ON public.submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Submissions admin"
  ON public.submissions FOR ALL
  USING (public.get_user_role() IN ('admin', 'super_admin'));

-- Admissions Policies
CREATE POLICY "Allow public insert admissions" 
  ON public.admissions FOR INSERT 
  TO anon, authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Allow admin read admissions" 
  ON public.admissions FOR SELECT 
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Allow admin update admissions" 
  ON public.admissions FOR UPDATE 
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Allow admin delete admissions" 
  ON public.admissions FOR DELETE 
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'super_admin'));


-- ============================================================================================================================
-- SECTION 7: RPC FUNCTIONS
-- ============================================================================================================================

-- ------------------------------------------------------------
-- 1. create_candidate()
-- Creates Supabase Auth User + Identity + Profile atomically
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_candidate(TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.create_candidate(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_candidate(
  p_email     TEXT,
  p_password  TEXT,
  p_full_name TEXT,
  p_exam_id   UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  new_user_id := gen_random_uuid();

  -- Auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
    phone, phone_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated',
    p_email, crypt(p_password, gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name), FALSE, NOW(), NOW(),
    NULL, NULL, '', '', '', ''
  );

  -- Auth identity
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), new_user_id,
    format('{"sub":"%s","email":"%s"}', new_user_id::TEXT, p_email)::JSONB,
    'email', new_user_id::TEXT, NOW(), NOW(), NOW()
  );

  -- Profile
  INSERT INTO public.profiles (
    id, email, full_name, role, profile_completed, disclaimer_accepted,
    allotted_exam_ids, pan_card_url, signature_url, service_delivery_step
  )
  VALUES (
    new_user_id, p_email, p_full_name, 'candidate', FALSE, FALSE,
    CASE WHEN p_exam_id IS NOT NULL THEN ARRAY[p_exam_id]::UUID[] ELSE '{}'::UUID[] END,
    NULL, NULL, 9
  );

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_candidate(TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_candidate(TEXT, TEXT, TEXT, UUID) TO service_role;


-- ------------------------------------------------------------
-- 2. create_user_from_admission()
-- Approves an admission application and creates the student account
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_user_from_admission(
  p_admission_id UUID,
  p_password     TEXT,
  p_exam_id      UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_admission RECORD;
  new_user_id UUID;
BEGIN
  SELECT * INTO v_admission FROM public.admissions WHERE id = p_admission_id;
  IF v_admission IS NULL THEN
    RAISE EXCEPTION 'Admission record not found';
  END IF;

  IF v_admission.status = 'approved' THEN
    RAISE EXCEPTION 'Admission has already been approved';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_admission.email) THEN
    RAISE EXCEPTION 'User account with email % already exists.', v_admission.email;
  END IF;

  IF v_admission.phone IS NOT NULL AND v_admission.phone != '' AND v_admission.phone != '+91' AND v_admission.phone NOT LIKE 'NO_PHONE%' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE phone = v_admission.phone) THEN
      RAISE EXCEPTION 'Candidate with phone number % already exists.', v_admission.phone;
    END IF;
  END IF;

  new_user_id := gen_random_uuid();

  -- Auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
    phone, phone_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated',
    v_admission.email, crypt(p_password, gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', v_admission.full_name), FALSE, NOW(), NOW(),
    CASE WHEN v_admission.phone LIKE 'NO_PHONE%' OR v_admission.phone = '' OR v_admission.phone = '+91' THEN NULL ELSE v_admission.phone END,
    NOW(), '', '', '', ''
  );

  -- Auth identity
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), new_user_id,
    format('{"sub":"%s","email":"%s"}', new_user_id::TEXT, v_admission.email)::JSONB,
    'email', new_user_id::TEXT, NOW(), NOW(), NOW()
  );

  -- Public profile
  INSERT INTO public.profiles (
    id, email, full_name, phone, address,
    aadhaar_front_url, aadhaar_back_url, profile_photo_url, signature_url,
    pan_card_url, video_url, ip_address, profile_completed, role, allotted_exam_ids, disclaimer_accepted,
    service_delivery_step
  )
  VALUES (
    new_user_id, v_admission.email, v_admission.full_name,
    CASE WHEN v_admission.phone LIKE 'NO_PHONE%' OR v_admission.phone = '' OR v_admission.phone = '+91' THEN NULL ELSE v_admission.phone END,
    v_admission.address,
    v_admission.aadhaar_front_url, v_admission.aadhaar_back_url,
    COALESCE(v_admission.profile_photo_url, v_admission.video_url),
    v_admission.signature_url, v_admission.pan_url,
    v_admission.video_url, v_admission.ip_address,
    TRUE, 'candidate',
    CASE WHEN p_exam_id IS NOT NULL THEN ARRAY[p_exam_id]::UUID[] ELSE '{}'::UUID[] END,
    TRUE, 9
  );

  -- Update admission status
  UPDATE public.admissions
  SET status = 'approved'
  WHERE id = p_admission_id;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_user_from_admission(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_from_admission(UUID, TEXT, UUID) TO service_role;


-- ------------------------------------------------------------
-- 3. delete_user_by_id()
-- Cascades candidate/admin account removal safely
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_by_id(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_caller_role TEXT;
  v_target_email TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can delete accounts.';
  END IF;

  SELECT email INTO v_target_email FROM auth.users WHERE id = p_user_id;
  IF v_target_email IN (
    'kabirhaldar4444@gmail.com',
    'admin@cambridgelearningservices.com',
    'admin@cls.com',
    'admin@pmi.com'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Protected Administrator accounts cannot be deleted.';
  END IF;

  DELETE FROM public.submissions WHERE user_id = p_user_id;
  DELETE FROM public.profiles    WHERE id = p_user_id;
  DELETE FROM auth.identities    WHERE user_id = p_user_id;
  DELETE FROM auth.users         WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.delete_user_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_by_id(UUID) TO service_role;


-- ============================================================================================================================
-- SECTION 8: RETROACTIVE IDENTITY REPAIR
-- Ensures all existing auth.users have matching auth.identities
-- ============================================================================================================================
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(), u.id,
  format('{"sub":"%s","email":"%s"}', u.id::TEXT, u.email)::JSONB,
  'email', u.id::TEXT, NOW(), u.created_at, u.updated_at
FROM auth.users u
WHERE u.id NOT IN (SELECT user_id FROM auth.identities);


-- ============================================================================================================================
-- SECTION 9: SEED ADMINISTRATOR ACCOUNTS
-- Configures Super Admin and Admin credentials
-- ============================================================================================================================

-- Kabir Haldar (Super Admin - Password: '123456')
DO $$
DECLARE
  v_user_id UUID := '23769efc-5975-41f9-a389-4c6521bda10b';
  v_email TEXT := 'kabirhaldar4444@gmail.com';
  v_password TEXT := '123456';
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = v_email) INTO v_exists;
  
  IF v_exists THEN
    UPDATE auth.users 
    SET encrypted_password = crypt(v_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE email = v_email
    RETURNING id INTO v_user_id;
  ELSE
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
      phone, phone_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, crypt(v_password, gen_salt('bf')), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Kabir Haldar"}'::JSONB,
      FALSE, NOW(), NOW(), NULL, NULL, '', '', '', ''
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id) THEN
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id::TEXT, v_email)::JSONB,
      'email', v_user_id::TEXT, NOW(), NOW(), NOW()
    );
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, role, profile_completed, disclaimer_accepted, allotted_exam_ids
  )
  VALUES (
    v_user_id, v_email, 'Kabir Haldar', 'super_admin', TRUE, TRUE, '{}'::UUID[]
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    email = EXCLUDED.email,
    profile_completed = TRUE,
    disclaimer_accepted = TRUE;
END;
$$;


-- ============================================================================================================================
-- SECTION 10: SCHEMA CACHE RELOAD
-- Forces PostgREST API to instantly refresh and serve all new tables & columns
-- ============================================================================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================================================================
-- SETUP COMPLETE!
-- To connect your React application, update .env with:
--   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
--   VITE_SUPABASE_ANON_KEY=<your-anon-key>
-- ============================================================================================================================
