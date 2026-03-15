create table babies (
  id text primary key,
  name text not null,
  birth_date date not null,
  sex text not null,
  latest_weight_kg numeric(4,1),
  latest_height_cm numeric(4,1),
  latest_measurement_at timestamptz
);

create table caregivers (
  id text primary key,
  baby_id text not null references babies(id) on delete cascade,
  name text not null,
  role text not null,
  messenger_platform text not null,
  created_at timestamptz not null default now()
);

create table raw_messages (
  id text primary key,
  baby_id text not null references babies(id) on delete cascade,
  caregiver_id text references caregivers(id) on delete set null,
  source_type text not null,
  raw_text text,
  raw_image_url text,
  received_at timestamptz not null default now()
);

create table intake_logs (
  id text primary key,
  baby_id text not null references babies(id) on delete cascade,
  raw_message_id text references raw_messages(id) on delete set null,
  source_type text not null,
  intake_type text not null,
  occurred_at timestamptz not null,
  amount_ml integer,
  amount_g integer,
  consumed_ratio numeric(4,2),
  food_name text,
  notes text,
  created_by text not null,
  parse_confidence numeric(3,2) not null,
  created_at timestamptz not null default now()
);

create table sleep_logs (
  id text primary key,
  baby_id text not null references babies(id) on delete cascade,
  raw_message_id text references raw_messages(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_min integer not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table note_logs (
  id text primary key,
  baby_id text not null references babies(id) on delete cascade,
  raw_message_id text references raw_messages(id) on delete set null,
  category text not null,
  note text not null,
  occurred_at timestamptz not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table growth_measurements (
  id text primary key,
  baby_id text not null references babies(id) on delete cascade,
  measured_at timestamptz not null,
  weight_kg numeric(4,1),
  height_cm numeric(4,1),
  weight_percentile numeric(5,2),
  height_percentile numeric(5,2),
  source_standard text not null,
  created_at timestamptz not null default now()
);

create index intake_logs_baby_occurred_idx on intake_logs (baby_id, occurred_at desc);
create index sleep_logs_baby_started_idx on sleep_logs (baby_id, started_at desc);
create index note_logs_baby_occurred_idx on note_logs (baby_id, occurred_at desc);
