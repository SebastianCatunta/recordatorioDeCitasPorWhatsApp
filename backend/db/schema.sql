CREATE TABLE IF NOT EXISTS reminders_sent (
  event_uid  text        NOT NULL,
  event_date date        NOT NULL,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_uid, event_date)
);

CREATE TABLE IF NOT EXISTS followups_sent (
  patient_id      text        NOT NULL,
  last_visit_date date        NOT NULL,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, last_visit_date)
);
