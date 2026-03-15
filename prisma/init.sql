PRAGMA foreign_keys = ON;

create table if not exists Baby (
  id text primary key,
  name text not null,
  birthDate datetime not null,
  sex text not null,
  latestWeightKg real,
  latestHeightCm real,
  latestMeasurementAt datetime
);

create table if not exists Caregiver (
  id text primary key,
  babyId text not null,
  name text not null,
  role text not null,
  messengerPlatform text not null,
  createdAt datetime not null default current_timestamp,
  foreign key (babyId) references Baby(id) on delete cascade
);

create table if not exists RawMessage (
  id text primary key,
  babyId text not null,
  caregiverId text,
  sourceType text not null,
  rawText text,
  rawImageUrl text,
  receivedAt datetime not null default current_timestamp,
  foreign key (babyId) references Baby(id) on delete cascade,
  foreign key (caregiverId) references Caregiver(id) on delete set null
);

create table if not exists IntakeLog (
  id text primary key,
  babyId text not null,
  rawMessageId text,
  sourceType text not null,
  intakeType text not null,
  occurredAt datetime not null,
  amountMl integer,
  amountG integer,
  consumedRatio real,
  foodName text,
  notes text,
  createdBy text not null,
  parseConfidence real not null,
  createdAt datetime not null default current_timestamp,
  foreign key (babyId) references Baby(id) on delete cascade,
  foreign key (rawMessageId) references RawMessage(id) on delete set null
);

create table if not exists SleepLog (
  id text primary key,
  babyId text not null,
  rawMessageId text,
  startedAt datetime not null,
  endedAt datetime not null,
  durationMin integer not null,
  createdBy text not null,
  createdAt datetime not null default current_timestamp,
  foreign key (babyId) references Baby(id) on delete cascade,
  foreign key (rawMessageId) references RawMessage(id) on delete set null
);

create table if not exists NoteLog (
  id text primary key,
  babyId text not null,
  rawMessageId text,
  category text not null,
  note text not null,
  occurredAt datetime not null,
  createdBy text not null,
  createdAt datetime not null default current_timestamp,
  foreign key (babyId) references Baby(id) on delete cascade,
  foreign key (rawMessageId) references RawMessage(id) on delete set null
);

create table if not exists GrowthMeasurement (
  id text primary key,
  babyId text not null,
  measuredAt datetime not null,
  weightKg real,
  heightCm real,
  weightPercentile real,
  heightPercentile real,
  sourceStandard text not null,
  createdAt datetime not null default current_timestamp,
  foreign key (babyId) references Baby(id) on delete cascade
);

create index if not exists IntakeLog_babyId_occurredAt_idx on IntakeLog (babyId, occurredAt desc);
create index if not exists SleepLog_babyId_startedAt_idx on SleepLog (babyId, startedAt desc);
create index if not exists NoteLog_babyId_occurredAt_idx on NoteLog (babyId, occurredAt desc);
