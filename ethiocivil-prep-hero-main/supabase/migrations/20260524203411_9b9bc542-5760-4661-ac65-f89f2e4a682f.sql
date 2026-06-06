
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  university text,
  exam_date date not null default '2026-06-12',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "select own profile" on public.profiles for select using (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

-- Courses
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  short_name text,
  description text,
  topics jsonb not null default '[]'::jsonb,
  weight numeric not null default 1,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.courses enable row level security;
create policy "anyone authed can read courses" on public.courses for select to authenticated using (true);

-- Questions
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  topic text,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer char(1) not null check (correct_answer in ('A','B','C','D')),
  explanation text,
  source text,
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  year int,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index questions_course_idx on public.questions(course_id);
alter table public.questions enable row level security;
create policy "authed read questions" on public.questions for select to authenticated using (true);
create policy "authed insert questions" on public.questions for insert to authenticated with check (auth.uid() = created_by);
create policy "update own questions" on public.questions for update to authenticated using (auth.uid() = created_by);
create policy "delete own questions" on public.questions for delete to authenticated using (auth.uid() = created_by);

-- Attempts
create table public.user_question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  selected_answer char(1),
  is_correct boolean not null default false,
  time_seconds int,
  mark text check (mark in ('easy','hard','review')),
  attempted_at timestamptz not null default now()
);
create index attempts_user_idx on public.user_question_attempts(user_id);
create index attempts_user_course_idx on public.user_question_attempts(user_id, course_id);
alter table public.user_question_attempts enable row level security;
create policy "own attempts read" on public.user_question_attempts for select using (auth.uid() = user_id);
create policy "own attempts insert" on public.user_question_attempts for insert with check (auth.uid() = user_id);
create policy "own attempts update" on public.user_question_attempts for update using (auth.uid() = user_id);
create policy "own attempts delete" on public.user_question_attempts for delete using (auth.uid() = user_id);

-- Course progress (aggregated)
create table public.user_course_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  questions_attempted int not null default 0,
  questions_correct int not null default 0,
  mastery numeric not null default 0,
  last_practiced timestamptz,
  weak_topics jsonb not null default '[]'::jsonb,
  primary key (user_id, course_id)
);
alter table public.user_course_progress enable row level security;
create policy "own progress all" on public.user_course_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Study plan days
create table public.study_plan_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  tasks jsonb not null default '[]'::jsonb,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, plan_date)
);
alter table public.study_plan_days enable row level security;
create policy "own plan all" on public.study_plan_days for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Mock exams
create table public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  taken_at timestamptz not null default now(),
  duration_seconds int,
  total_questions int not null,
  correct_count int not null,
  score numeric not null,
  breakdown jsonb not null default '{}'::jsonb
);
alter table public.mock_exams enable row level security;
create policy "own mocks all" on public.mock_exams for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Streaks
create table public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_study_date date
);
alter table public.user_streaks enable row level security;
create policy "own streak all" on public.user_streaks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed courses
insert into public.courses (slug, name, short_name, weight, sort_order, topics) values
('construction-materials','Construction Materials','Materials',1.0,1,'["Cement","Aggregates","Concrete","Steel","Timber","Bituminous Materials","Admixtures"]'::jsonb),
('building-construction-qs','Building Construction and Quantity Surveying','Building & QS',1.2,2,'["Substructure","Superstructure","Finishes","Quantity Take-off","Rate Analysis","BoQ"]'::jsonb),
('contract-spec-qs','Contract, Specification and Quantity Surveying','Contracts',0.8,3,'["FIDIC","Contract Types","Specifications","Claims","Tendering"]'::jsonb),
('construction-management','Construction Management','Mgmt',1.0,4,'["Planning","Scheduling (CPM/PERT)","Resource Mgmt","Safety","Cost Control"]'::jsonb),
('reinforced-concrete','Reinforced Concrete Structures (I & II)','RC',1.5,5,'["Limit State Design","Beams","Slabs","Columns","Footings","Shear & Torsion","Serviceability"]'::jsonb),
('steel-timber','Steel & Timber Structures','Steel',1.2,6,'["Tension Members","Compression","Beams","Connections","Timber Design"]'::jsonb),
('bridge-design','Fundamentals of Bridge Design','Bridges',1.0,7,'["Loads","Superstructure Types","Substructure","Bearings","Bridge Hydraulics"]'::jsonb),
('structural-design','Structural Design','Structural',1.3,8,'["Load Analysis","Frames","Wind & Seismic","Codes (ES EN)"]'::jsonb),
('soil-mechanics','Soil Mechanics (I & II)','Soil',1.3,9,'["Index Properties","Permeability","Stress Distribution","Consolidation","Shear Strength","Slope Stability"]'::jsonb),
('foundation-engineering','Foundation Engineering (I & II)','Foundations',1.3,10,'["Bearing Capacity","Shallow Foundations","Pile Foundations","Retaining Walls","Settlement"]'::jsonb),
('highway-engineering','Highway Engineering (I & II)','Highway',1.2,11,'["Geometric Design","Pavement Design","Highway Materials","Drainage","Traffic"]'::jsonb),
('transport-engineering','Transport Engineering','Transport',0.9,12,'["Traffic Studies","Intersections","Public Transit","Transport Planning"]'::jsonb),
('hydraulic-structures','Hydraulic Structures (I)','Hydraulics',1.0,13,'["Dams","Spillways","Weirs","Energy Dissipators","Canals"]'::jsonb);
